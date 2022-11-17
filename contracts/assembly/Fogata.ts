import { System, Storage, pob, Token, Protobuf } from "@koinos/sdk-as";
import { PoB } from "./IPoB";
import { Ownable } from "./Ownable";
import { fogata } from "./proto/fogata";
import { common } from "./proto/common";
import { multiplyAndDivide } from "./utils";

const ONE_HUNDRED_PERCENT: u64 = 100000;

export class Fogata extends Ownable {
  callArgs: System.getArgumentsReturn | null;

  // System contracts

  koinContract: Token | null;

  vhpContract: Token | null;

  // Configuration

  poolParams: Storage.Obj<fogata.pool_params>;

  // State of the pool

  poolState: Storage.Obj<fogata.pool_state>;

  stakes: Storage.Map<Uint8Array, common.uint64>;

  previousStakes: Storage.Map<Uint8Array, fogata.previous_stake>;

  constructor() {
    super();

    this.poolParams = new Storage.Obj(
      this.contractId,
      0,
      fogata.pool_params.decode,
      fogata.pool_params.encode,
      () => new fogata.pool_params()
    );

    this.poolState = new Storage.Obj(
      this.contractId,
      1,
      fogata.pool_state.decode,
      fogata.pool_state.encode,
      () => new fogata.pool_state(0, 0, 0)
    );

    this.stakes = new Storage.Map(
      this.contractId,
      2,
      common.uint64.decode,
      common.uint64.encode,
      () => new common.uint64(0)
    );

    this.previousStakes = new Storage.Map(
      this.contractId,
      3,
      fogata.previous_stake.decode,
      fogata.previous_stake.encode,
      () => new fogata.previous_stake(0, 0, false)
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
    // todo: check max percentage
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
    const poolState = this.poolState.get()!;
    const paymentPeriod = this.poolParams.get()!.payment_period;

    if (now < poolState.next_payment_time) {
      // it is not yet time to pay
      return new common.boole(false);
    }

    if (poolState.next_payment_time == 0) {
      poolState.current_payment_time = now;
      poolState.next_payment_time = now + paymentPeriod;
      this.poolState.put(poolState);
      return new common.boole(false);
    }

    const koinBalance = this.getKoinContract().balanceOf(this.contractId);

    // burn the amount that was not withdrawn in the previous period
    System.require(
      poolState.previous_koin >= poolState.koin_withdrawn,
      "internal error: poolState.previous_koin < poolState.koin_withdrawn"
    );
    const amountToBurn = poolState.previous_koin - poolState.koin_withdrawn;
    if (amountToBurn > 0) {
      System.require(
        koinBalance >= amountToBurn,
        "internal error: koin balance < amount to burn"
      );

      new PoB().burn(
        new pob.burn_arguments(amountToBurn, this.contractId, this.contractId)
      );
    }

    // reset koinWithdrawn counter, update previous pool state,
    // and set time for the next payment
    poolState.koin_withdrawn = 0;
    poolState.current_payment_time = poolState.next_payment_time;
    poolState.next_payment_time += paymentPeriod;
    poolState.previous_koin = koinBalance;
    poolState.previous_stake = poolState.stake;
    this.poolState.put(poolState);

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
      // fee = deltaPoolVirtual * beneficiary.percentage / ONE_HUNDRED_PERCENT
      const fee = multiplyAndDivide(
        deltaPoolVirtual,
        beneficiary.percetage,
        ONE_HUNDRED_PERCENT
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

    // get pool state, user stake, and virtual amount to deposit
    const poolState = this.poolState.get()!;
    const userStake = this.stakes.get(args.account!)!;
    const deltaUserVirtual = args.koin_amount + args.vhp_amount;

    // distribute pending payments and update the virtual balance
    // before making the transfer
    poolState.virtual = this.payBeneficiaries(poolState.virtual);

    // burn KOINs in the same account to convert it to VHP
    if (args.koin_amount > 0) {
      new PoB().burn(
        new pob.burn_arguments(args.koin_amount, args.account, args.account)
      );
    }

    // transfer all VHP to the pool
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
        // division by 0 ? no because poolState.stake > 0, then
        // poolState.virtual should be greater than 0 as well
      );
    }

    // update the previous stake of the user if it is not in the
    // current window of koin payments
    const previousUserStake = this.previousStakes.get(args.account!)!;
    if (previousUserStake.time < poolState.current_payment_time) {
      previousUserStake.stake = userStake.value;
      previousUserStake.time = poolState.current_payment_time;
      this.previousStakes.put(args.account!, previousUserStake);
    }

    // add new stake to the user
    userStake.value += deltaUserStake;
    this.stakes.put(args.account!, userStake);

    // update pool state
    poolState.stake += deltaUserStake;
    poolState.virtual += deltaUserVirtual;
    this.poolState.put(poolState);

    System.event(
      "fogata.stake",
      Protobuf.encode(
        new fogata.stake_event(
          args.account!,
          args.koin_amount,
          args.vhp_amount,
          deltaUserStake
        ),
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
    System.require(
      args.koin_amount > 0 || args.vhp_amount > 0,
      "either koin amount or vhp amount must be greater than 0"
    );

    // get pool state, user stake, and virtual amount to withdraw
    const poolState = this.poolState.get()!;
    const userStake = this.stakes.get(args.account!)!;
    const deltaUserVirtual = args.koin_amount + args.vhp_amount;

    // distribute pending payments and update the virtual balance
    // before making the transfer
    poolState.virtual = this.payBeneficiaries(poolState.virtual);

    System.require(poolState.stake > 0, "there is no stake in the pool");

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

    System.require(
      userVirtual >= deltaUserVirtual,
      "insufficient virtual balance"
    );

    // deltaUserStake = (delta_userVirtual * poolStake_old) / poolVirtual_old
    const deltaUserStake = multiplyAndDivide(
      deltaUserVirtual,
      poolState.stake,
      poolState.virtual
      // division by 0 ? no because userVirtual > 0, then poolState.virtual > 0
    );

    if (args.koin_amount > 0) {
      // the maximum amount of koin to withdraw is calculated from
      // the previous snapshot of koin balances
      const previousUserStake = this.previousStakes.get(args.account!)!;

      // update the previous stake of the user if it is not in the
      // current window of koin payments
      if (previousUserStake.time < poolState.current_payment_time) {
        previousUserStake.stake = userStake.value;
        previousUserStake.time = poolState.current_payment_time;
      }

      const maxKoin =
        poolState.previous_stake == 0
          ? 0
          : multiplyAndDivide(
              previousUserStake.stake,
              poolState.previous_koin,
              poolState.previous_stake
            );
      System.require(
        args.koin_amount <= maxKoin - previousUserStake.koin_withdrawn,
        `you can withdraw max ${
          maxKoin - previousUserStake.koin_withdrawn
        } satoshis of koin for this period. Requested ${args.koin_amount}`
      );
      previousUserStake.koin_withdrawn += args.koin_amount;
      poolState.koin_withdrawn += args.koin_amount;

      const transferStatus1 = this.getKoinContract().transfer(
        this.contractId,
        args.account!,
        args.koin_amount
      );
      System.require(transferStatus1 == true, "transfer of koins rejected");
      this.previousStakes.put(args.account!, previousUserStake);
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
        new fogata.stake_event(
          args.account!,
          args.koin_amount,
          args.vhp_amount,
          deltaUserStake
        ),
        fogata.stake_event.encode
      ),
      [args.account!]
    );
    return new common.boole(true);
  }
}
