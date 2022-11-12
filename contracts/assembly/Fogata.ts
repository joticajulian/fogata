import { Arrays, System, authority, Storage, pob, Token } from "@koinos/sdk-as";
import { PoB } from "./IPoB";
import { fogata } from "./proto/fogata";
import { common } from "./proto/common";

export class Fogata {
  callArgs: System.getArgumentsReturn | null;

  contractId: Uint8Array;

  poolStake: Storage.Obj<common.uint64>;

  stakes: Storage.Map<Uint8Array, common.uint64>;

  constructor() {
    this.contractId = System.getContractId();

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
  }

  /**
   * Deposit koin or vhp into the pool
   * @external
   */
  stake(args: fogata.stake_args): common.boole {
    System.require(args.amount, "no amounts defined to stake");
    System.require(
      args.amount!.koin > 0 || args.amount!.vhp > 0,
      "either koin amount or vhp amount must be greater than 0"
    );
    // contract definitions
    const koinContract = new Token(System.getContractAddress("koin"));
    const vhpContract = new Token(System.getContractAddress("vhp"));

    // get the virtual balance of pool before making the transfer
    const poolVirtual =
      koinContract.balanceOf(this.contractId) +
      vhpContract.balanceOf(this.contractId);

    // burn KOINs in the same account to get VHP
    new PoB().burn(
      new pob.burn_arguments(args.amount!.koin, args.account, args.account)
    );

    // transfer all VHP to the pool
    const userVirtual = args.amount!.vhp + args.amount!.koin;
    const transferStatus = vhpContract.transfer(
      args.account!,
      this.contractId,
      userVirtual
    );
    System.require(
      transferStatus == true,
      "the transfer of tokens was rejected"
    );

    // calculate stake of the user
    let userStake: u64;
    const poolStake = this.poolStake.get()!;
    if (poolStake.value == 0) {
      // this is the first stake in the pool
      userStake = userVirtual;
    } else {
      // the user is adding stake and virtual balance to the pool. The
      // following relation must be preserved to not affect previous users:
      //
      // poolStake_new / poolVirtual_new = poolStake_old / poolVirtual_old
      //
      // where:
      // poolStake_new = poolStake_old + userStake
      // poolVirtual_new = poolVirtual_old + userVirtual
      //
      // after some math the new stake for the user is calculated as:
      // userStake = userVirtual * poolStake_old / poolVirtual_old
      userStake = (userVirtual * poolStake.value) / poolVirtual;
      // todo: use bigint
    }

    // add new stake to the user
    const userStakeInstace = this.stakes.get(args.account!)!;
    userStakeInstace.value += userStake;
    this.stakes.put(args.account!, userStakeInstace);

    // update the total pool stake
    poolStake.value += userStake;
    this.poolStake.put(poolStake);

    return new common.boole(true);
  }
}
