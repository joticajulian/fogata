import {
  Arrays,
  System,
  authority,
  Storage,
  pob,
  Token,
  Protobuf,
  Base58,
} from "@koinos/sdk-as";
import { PoB } from "./IPoB";
import { Ownable } from "./Ownable";
import { fogata } from "./proto/fogata";
import { common } from "./proto/common";

export class Fogata extends Ownable {
  callArgs: System.getArgumentsReturn | null;

  koinContract: Token | null;

  vhpContract: Token | null;

  poolStake: Storage.Obj<common.uint64>;

  stakes: Storage.Map<Uint8Array, common.uint64>;

  lastPoolVirtual: Storage.Obj<common.uint64>;

  poolParams: Storage.Obj<fogata.pool_params>;

  constructor() {
    super();

    this.poolStake = new Storage.Obj(
      this.contractId,
      0,
      common.uint64.decode,
      common.uint64.encode,
      () => new common.uint64(0)
    );
    this.stakes = new Storage.Map(
      this.contractId,
      1,
      common.uint64.decode,
      common.uint64.encode,
      () => new common.uint64(0)
    );
    this.lastPoolVirtual = new Storage.Obj(
      this.contractId,
      2,
      common.uint64.decode,
      common.uint64.encode,
      () => new common.uint64(0)
    );
    this.poolParams = new Storage.Obj(
      this.contractId,
      3,
      fogata.pool_params.decode,
      fogata.pool_params.encode,
      () =>
        new fogata.pool_params([
          new fogata.beneficiary(Base58.decode("todo: address sponsors"), 3000),
        ])
    );
  }

  getKoinContract(): Token {
    if (!this.koinContract) {
      this.koinContract = new Token(System.getContractAddress("koin"));
    }
    return this.koinContract!;
  }

  getVhpContract(): Token {
    if (!this.vhpContract) {
      this.vhpContract = new Token(System.getContractAddress("vhp"));
    }
    return this.vhpContract!;
  }

  /**
   * Function to update the fees taken by the operator
   * if any, based on the virtual balance of the pool.
   *
   * This function is done in a way that if it's called
   * twice, the second call will not have effect because the
   * fees will be already taken
   */
  payBeneficiaries(poolVirtual: u64, saveLastPoolVirtual: boolean): u64 {
    const lastPoolVirtual = this.lastPoolVirtual.get()!;

    // check how much this virtual balance has increased
    System.require(
      poolVirtual >= lastPoolVirtual.value,
      `internal error: current balance (koin + vhp) should be greater than ${poolVirtual}`
    );
    const deltaPoolVirtual = poolVirtual - lastPoolVirtual.value;

    // calculate new fees earned and transfer them to the beneficiaries
    const poolParams = this.poolParams.get()!;
    let totalFeesCollected = 0;
    for (let i = 0; i < poolParams.beneficiaries.length; i += 1) {
      const beneficiary = poolParams.beneficiaries[i];
      // todo: use bigint
      const fee = (deltaPoolVirtual * beneficiary.percetage) / 1e5;
      if (fee > 0) {
        const statusTransfer = this.getKoinContract().transfer(
          this.contractId,
          beneficiary.address!,
          fee
        );
        System.require(
          statusTransfer == true,
          `transfer to beneficiary number ${i} was rejected`
        );
        totalFeesCollected += fee;
      }
    }

    // calculate the new virtual balance of the pool
    const poolVirtualUpdated = poolVirtual - totalFeesCollected;

    // option indicating if lastPoolVirtual should be updated
    // now or if it will be done later (to reduce calls to the
    // system)
    if (saveLastPoolVirtual) {
      lastPoolVirtual.value = poolVirtualUpdated;
      this.lastPoolVirtual.put(lastPoolVirtual);
    }
    return poolVirtualUpdated;
  }

  /**
   * Deposit koin or vhp into the pool
   * @external
   */
  stake(args: fogata.stake_args): common.boole {
    System.require(
      args.koin_amount > 0 || args.vhp_amount > 0,
      "either koin amount or vhp amount must be greater than 0"
    );

    // get the virtual balance of pool before making the transfer
    const contractBalance =
      this.getKoinContract().balanceOf(this.contractId) +
      this.getVhpContract().balanceOf(this.contractId);
    const poolVirtualOld = this.payBeneficiaries(contractBalance, false);

    // burn KOINs in the same account to get VHP
    new PoB().burn(
      new pob.burn_arguments(args.koin_amount, args.account, args.account)
    );

    // transfer all VHP to the pool
    const deltaUserVirtual = args.koin_amount + args.vhp_amount;
    const transferStatus = this.getVhpContract().transfer(
      args.account!,
      this.contractId,
      deltaUserVirtual
    );
    System.require(
      transferStatus == true,
      "the transfer of tokens was rejected"
    );

    // calculate stake of the user
    let deltaUserStake: u64;
    const poolStake = this.poolStake.get()!;
    if (poolStake.value == 0) {
      // this is the first stake in the pool
      deltaUserStake = deltaUserVirtual;
    } else {
      // the user is adding stake and virtual balance to the pool. The
      // following relation must be preserved to not affect previous users:
      //
      // poolStake_new / poolVirtual_new = poolStake_old / poolVirtual_old
      //
      // where:
      // poolStake_new = poolStake_old + delta_userStake
      // poolVirtual_new = poolVirtual_old + delta_userVirtual
      //
      // after some math the new stake for the user is calculated as:
      // delta_userStake = delta_userVirtual * poolStake_old / poolVirtual_old
      deltaUserStake = (deltaUserVirtual * poolStake.value) / poolVirtualOld;
      // todo: use bigint
    }

    // add new stake to the user
    const userStake = this.stakes.get(args.account!)!;
    userStake.value += deltaUserStake;
    this.stakes.put(args.account!, userStake);

    // update the total pool stake
    poolStake.value += deltaUserStake;
    this.poolStake.put(poolStake);

    // update last pool virtual
    const poolVirtualNew = poolVirtualOld + deltaUserVirtual;
    this.lastPoolVirtual.put(new common.uint64(poolVirtualNew));

    System.event(
      "fogata.stake",
      Protobuf.encode(
        new fogata.stake_event(args.account!, deltaUserVirtual, deltaUserStake),
        fogata.stake_event.encode
      ),
      [args.account!]
    );
    return new common.boole(true);
  }

  /**
   * Withdraw koin or vhp from the pool
   * @external
   */
  unstake(args: fogata.stake_args): common.boole {
    // get the virtual balance of pool before making the transfer
    const contractBalance =
      this.getKoinContract().balanceOf(this.contractId) +
      this.getVhpContract().balanceOf(this.contractId);
    const poolVirtualOld = this.payBeneficiaries(contractBalance, false);

    // get current stake of the user
    const userStake = this.stakes.get(args.account!)!;

    // calculate virtual amount of the user
    //
    // note: same maths applied as in the stake function. Check there
    // for more details
    const poolStake = this.poolStake.get()!;
    const userVirtual = (userStake.value * poolVirtualOld) / poolStake.value;
    // todo: use bigint

    const deltaUserVirtual = args.koin_amount + args.vhp_amount;
    System.require(
      userVirtual >= deltaUserVirtual,
      "insufficient virtual balance"
    );

    const deltaUserStake =
      (deltaUserVirtual * poolStake.value) / poolVirtualOld;

    // todo: check limits KOIN

    if (args.koin_amount > 0) {
      const transferStatus1 = this.getKoinContract().transfer(
        this.contractId,
        args.account!,
        args.koin_amount
      );
      System.require(transferStatus1 == true, "transfer of koins rejected");
    }
    if (args.vhp_amount > 0) {
      const transferStatus2 = this.getVhpContract().transfer(
        this.contractId,
        args.account!,
        args.vhp_amount
      );
      System.require(transferStatus2 == true, "transfer of vhp rejected");
    }

    // remove stake from the user
    userStake.value -= deltaUserStake;
    this.stakes.put(args.account!, userStake);

    // update the total pool stake
    poolStake.value -= deltaUserStake;
    this.poolStake.put(poolStake);

    // update last pool virtual
    const poolVirtualNew = poolVirtualOld - deltaUserVirtual;
    this.lastPoolVirtual.put(new common.uint64(poolVirtualNew));

    return new common.boole(true);
  }
}
