import { System, Storage, pob, Token, Protobuf } from "@koinos/sdk-as";
import { PoB } from "./IPoB";
import { Ownable } from "./Ownable";
import { fogata } from "./proto/fogata";
import { common } from "./proto/common";
import { multiplyAndDivide } from "./utils";

export class Fogata extends Ownable {
  callArgs: System.getArgumentsReturn | null;

  // System contracts

  koinContract: Token | null;

  vhpContract: Token | null;

  // Configuration

  poolParams: Storage.Obj<fogata.pool_params>;

  // Current state of the pool

  stakes: Storage.Map<Uint8Array, common.uint64>;

  poolState: Storage.Obj<fogata.pool_state>;

  // Previous state of the pool (snapshot)

  previousStakes: Storage.Map<Uint8Array, common.uint64>;

  previousPoolState: Storage.Obj<fogata.pool_state>;

  koinWithdrawn: Storage.Obj<common.uint64>;

  nextPayment: Storage.Obj<common.uint64>;

  constructor() {
    super();

    this.poolParams = new Storage.Obj(
      this.contractId,
      0,
      fogata.pool_params.decode,
      fogata.pool_params.encode,
      () => new fogata.pool_params()
    );

    this.stakes = new Storage.Map(
      this.contractId,
      1,
      common.uint64.decode,
      common.uint64.encode,
      () => new common.uint64(0)
    );

    this.poolState = new Storage.Obj(
      this.contractId,
      2,
      fogata.pool_state.decode,
      fogata.pool_state.encode,
      () => new fogata.pool_state(0, 0, 0)
    );

    this.previousStakes = new Storage.Map(
      this.contractId,
      3,
      common.uint64.decode,
      common.uint64.encode,
      () => new common.uint64(0)
    );

    this.previousPoolState = new Storage.Obj(
      this.contractId,
      4,
      fogata.pool_state.decode,
      fogata.pool_state.encode,
      () => new fogata.pool_state(0, 0, 0)
    );

    this.koinWithdrawn = new Storage.Obj(
      this.contractId,
      5,
      common.uint64.decode,
      common.uint64.encode,
      () => new common.uint64(0)
    );

    this.nextPayment = new Storage.Obj(
      this.contractId,
      6,
      common.uint64.decode,
      common.uint64.encode,
      () => new common.uint64(0)
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
   * Set mining pool parameters
   * @external
   */
  set_pool_params(args: fogata.pool_params): common.boole {
    System.require(
      this.only_owner(),
      "owner has not authorized to update params"
    );
    this.poolParams.put(args);
    System.event("fogata.set_pool_params", this.callArgs!.args, []);
    return new common.boole(true);
  }

  /**
   * Get mining pool parameters
   * @external
   * @readonly
   */
  get_pool_params(): fogata.pool_params {
    return this.poolParams.get()!;
  }

  /**
   * Function to take snapshot of koin balances
   */
  take_snapshot(): common.boole {
    const now = System.getBlockField("header.timestamp")!.uint64_value;
    const nextPayment = this.nextPayment.get()!;
    const paymentPeriod = this.poolParams.get()!.payment_period;
    const poolState = this.poolState.get()!;

    if (now < nextPayment.value) {
      // it is not yet time to pay
      return new common.boole(false);
    }

    if (nextPayment.value == 0) {
      nextPayment.value = now + paymentPeriod;
      this.nextPayment.put(nextPayment);
      return new common.boole(false);
    }

    poolState.koin = this.getKoinContract().balanceOf(this.contractId);

    // calculate the maximum amount of KOIN that each address
    // can withdraw in the next period
    let account = new Uint8Array(0);
    while (true) {
      const obj = this.stakes.getNext(account);
      if (!obj) break;
      account = obj.key!;
      const userStake = obj.value;
      this.previousStakes.put(account, userStake);
    }

    // burn the amount that was not withdrawn in the previous period
    const koinWithdrawn = this.koinWithdrawn.get()!;
    const previousPoolState = this.previousPoolState.get()!;
    System.require(
      previousPoolState.koin >= koinWithdrawn.value,
      "internal error: previousPoolState.koin < koinWithdrawn.value"
    );
    const amountToBurn = previousPoolState.koin - koinWithdrawn.value;
    if (amountToBurn > 0) {
      new PoB().burn(
        new pob.burn_arguments(amountToBurn, this.contractId, this.contractId)
      );
    }

    // reset koinWithdrawn counter, update previous pool state,
    // and set time for the next payment
    this.koinWithdrawn.put(new common.uint64(0));
    this.previousPoolState.put(poolState);
    nextPayment.value += paymentPeriod;
    this.nextPayment.put(nextPayment);

    return new common.boole(true);
  }

  /**
   * Function to update the fees distributed to beneficiaries
   * (like node operator or sponsors program) based on the
   * virtual balance of the pool.
   *
   * This function is done in a way that if it's called
   * twice, the second call will not have effect because the
   * fees will be already taken.
   *
   * Note: this function doesn't update the storage to reduce calls
   * to it. So, the poolState must be updated outside of this
   * function.
   */
  payBeneficiaries(lastPoolVirtual: u64): u64 {
    // get the virtual balance of pool
    const poolVirtual =
      this.getKoinContract().balanceOf(this.contractId) +
      this.getVhpContract().balanceOf(this.contractId);

    // check how much this virtual balance has increased
    System.require(
      poolVirtual >= lastPoolVirtual,
      `internal error: current balance (koin + vhp) should be greater than ${poolVirtual}`
    );
    const deltaPoolVirtual = poolVirtual - lastPoolVirtual;

    // calculate new fees earned and transfer them to the beneficiaries
    const poolParams = this.poolParams.get()!;
    let totalFeesCollected: u64 = 0;
    for (let i = 0; i < poolParams.beneficiaries.length; i += 1) {
      const beneficiary = poolParams.beneficiaries[i];
      // fee = deltaPoolVirtual * beneficiary.percentage / 1e5
      const fee = multiplyAndDivide(
        deltaPoolVirtual,
        beneficiary.percetage,
        1e5 as u64
      );
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
    return poolVirtual - totalFeesCollected;
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

    const poolState = this.poolState.get()!;

    // distribute pending payments and get the virtual balance
    // before making the transfer
    poolState.virtual = this.payBeneficiaries(poolState.virtual);

    // burn KOINs in the same account to get VHP
    if (args.koin_amount > 0) {
      new PoB().burn(
        new pob.burn_arguments(args.koin_amount, args.account, args.account)
      );
    }

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
    if (poolState.stake == 0) {
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
      deltaUserStake = multiplyAndDivide(
        deltaUserVirtual,
        poolState.stake,
        poolState.virtual
      );
      // todo: division 0 when poolState.stake = 0
    }

    // add new stake to the user
    const userStake = this.stakes.get(args.account!)!;
    userStake.value += deltaUserStake;
    this.stakes.put(args.account!, userStake);

    // update pool state
    poolState.stake += deltaUserStake;
    poolState.virtual += deltaUserVirtual;
    this.poolState.put(poolState);

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
    const poolState = this.poolState.get()!;

    // distribute pending payments and get the virtual balance
    poolState.virtual = this.payBeneficiaries(poolState.virtual);

    // get current stake of the user
    const userStake = this.stakes.get(args.account!)!;

    // calculate virtual amount of the user
    //
    // note: same maths applied as in the stake function. Check there
    // for more details
    // userVirtual = (userStake * poolVirtual_old) / poolStake_old;
    const userVirtual = multiplyAndDivide(
      userStake.value,
      poolState.virtual,
      poolState.stake
    );
    // todo: division 0 when poolState.stake = 0

    const deltaUserVirtual = args.koin_amount + args.vhp_amount;
    System.require(
      userVirtual >= deltaUserVirtual,
      "insufficient virtual balance"
    );

    // deltaUserStake = (delta_userVirtual * poolStake_old) / poolVirtual_old
    const deltaUserStake = multiplyAndDivide(
      deltaUserVirtual,
      poolState.stake,
      poolState.virtual
    );

    const userPreviousStake = this.previousStakes.get(args.account!)!;
    const previousPoolState = this.previousPoolState.get()!;
    const maxKoin = multiplyAndDivide(
      userPreviousStake.value,
      previousPoolState.koin,
      previousPoolState.stake
    );
    // todo: division 0 when poolState.stake = 0

    System.require(
      args.koin_amount <= maxKoin,
      `you can withdraw max ${maxKoin} satoshis of koin for this period. Requested ${args.koin_amount}`
    );

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

    // update pool state
    poolState.stake -= deltaUserStake;
    poolState.virtual -= deltaUserVirtual;
    this.poolState.put(poolState);

    System.event(
      "fogata.unstake",
      Protobuf.encode(
        new fogata.stake_event(args.account!, deltaUserVirtual, deltaUserStake),
        fogata.stake_event.encode
      ),
      [args.account!]
    );
    return new common.boole(true);
  }
}
