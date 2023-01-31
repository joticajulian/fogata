import {
  System,
  Storage,
  Arrays,
  pob,
  Token,
  Protobuf,
  authority,
  Base58,
  token,
} from "@koinos/sdk-as";
import { PoB } from "./IPoB";
import { Sponsors } from "./ISponsors";
import { ConfigurablePool, ONE_HUNDRED_PERCENT } from "./ConfigurablePool";
import { fogata } from "./proto/fogata";
import { common } from "./proto/common";
import { token as tokenSponsors } from "./proto/token";
import { multiplyAndDivide, sub, sub0 } from "./utils";
import {
  sponsorsContractIdHarbinger,
  sponsorsContractIdMainnet,
  fogataVersion,
} from "./constants";

const BOOLE_TRUE = new common.boole(true);
const BOOLE_FALSE = new common.boole(false);

class ResultUnstake {
  poolState: fogata.pool_state;

  userStake: common.uint64;

  result: bool;

  constructor(
    poolState: fogata.pool_state,
    userStake: common.uint64,
    result: bool
  ) {
    this.poolState = poolState;
    this.userStake = userStake;
    this.result = result;
  }
}

export class Fogata extends ConfigurablePool {
  callArgs: System.getArgumentsReturn | null;

  // System contracts

  vhpContract: Token | null;

  // State of the pool

  poolState: Storage.Obj<fogata.pool_state>;

  stakes: Storage.Map<Uint8Array, common.uint64>;

  snapshotStakes: Storage.Map<Uint8Array, fogata.snapshot_stake>;

  vaporWithdrawn: Storage.Map<Uint8Array, common.uint64>;

  // Balances beneficiaries and mana supporters

  balancesBeneficiaries: Storage.Map<Uint8Array, common.uint64>;

  auxBeneficiary: fogata.beneficiary | null;

  // Temporal allowance of koin transfers

  allowance: Storage.Obj<fogata.allowance>;

  // collect preferences for users

  collectKoinPreferences: Storage.Map<
    Uint8Array,
    fogata.collect_koin_preferences
  >;

  constructor() {
    super();

    this.poolState = new Storage.Obj(
      this.contractId,
      1,
      fogata.pool_state.decode,
      fogata.pool_state.encode,
      () =>
        new fogata.pool_state(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, fogataVersion)
    );

    this.stakes = new Storage.Map(
      this.contractId,
      2,
      common.uint64.decode,
      common.uint64.encode,
      () => new common.uint64(0)
    );

    this.snapshotStakes = new Storage.Map(
      this.contractId,
      3,
      fogata.snapshot_stake.decode,
      fogata.snapshot_stake.encode,
      () => new fogata.snapshot_stake(0, 0, false)
    );

    this.balancesBeneficiaries = new Storage.Map(
      this.contractId,
      4,
      common.uint64.decode,
      common.uint64.encode,
      () => new common.uint64(0)
    );

    this.allowance = new Storage.Obj(
      this.contractId,
      5,
      fogata.allowance.decode,
      fogata.allowance.encode,
      () => new fogata.allowance()
    );

    this.collectKoinPreferences = new Storage.Map(
      this.contractId,
      6,
      fogata.collect_koin_preferences.decode,
      fogata.collect_koin_preferences.encode,
      () => new fogata.collect_koin_preferences()
    );

    this.vaporWithdrawn = new Storage.Map(
      this.contractId,
      7,
      common.uint64.decode,
      common.uint64.encode,
      () => new common.uint64(0)
    );
  }

  /**
   * Authorize function
   * @external
   */
  authorize(args: authority.authorize_arguments): common.boole {
    // check if it is a contract call
    if (args.type == authority.authorization_type.contract_call) {
      // authorizations for KOIN contract
      if (
        Arrays.equal(args.call!.contract_id, this.getKoinContract()._contractId)
      ) {
        const allowance = this.allowance.get()!;
        // authorizations to transfer KOINs
        if (allowance.type == fogata.allowance_type.TRANSFER_KOIN) {
          if (args.call!.entry_point != 0x27f576ca) {
            System.log("authorize failed for koin contract: not transfer");
            return BOOLE_FALSE;
          }
          if (!args.call!.data) {
            System.log("authorize failed for koin contract: no data");
            return BOOLE_FALSE;
          }
          const transferArgs = Protobuf.decode<token.transfer_arguments>(
            args.call!.data!,
            token.transfer_arguments.decode
          );
          if (allowance.koin_amount == 0) {
            System.log(
              "authorize failed for koin contract: no allowance defined for a transfer"
            );
            return BOOLE_FALSE;
          }
          if (
            !Arrays.equal(allowance.account, transferArgs.to) ||
            allowance.koin_amount < transferArgs.value
          ) {
            System.log(
              `authorize failed for koin contract: invalid recipient or amount for a transfer: (${Base58.encode(
                transferArgs.to!
              )}, ${transferArgs.value}). Expected (${allowance.account!}, ${
                allowance.koin_amount
              })`
            );
            return BOOLE_FALSE;
          }

          // removing the allowance as it is already consumed
          this.allowance.remove();
          return BOOLE_TRUE;
        }

        // authorizations to burn KOINs to get VHP
        if (allowance.type == fogata.allowance_type.BURN_KOIN) {
          if (args.call!.entry_point != 0x859facc5) {
            System.log("authorize failed for koin contract: not burn");
            return BOOLE_FALSE;
          }
          if (!Arrays.equal(args.call!.caller, new PoB()._contractId)) {
            System.log(
              "authorize failed for koin contract: the caller of the burn must be PoB contract"
            );
            return BOOLE_FALSE;
          }
          if (!args.call!.data) {
            System.log("authorize failed for koin contract: no data");
            return BOOLE_FALSE;
          }
          const burnArgs = Protobuf.decode<token.burn_arguments>(
            args.call!.data!,
            token.burn_arguments.decode
          );
          if (allowance.koin_amount == 0) {
            System.log(
              "authorize failed for koin contract: no allowance defined for burn"
            );
            return BOOLE_FALSE;
          }
          if (
            !Arrays.equal(allowance.account, burnArgs.from) ||
            allowance.koin_amount < burnArgs.value
          ) {
            System.log(
              `authorize failed for koin contract: invalid burn request: (${Base58.encode(
                burnArgs.from!
              )}, ${burnArgs.value}). Expected (${allowance.account!}, ${
                allowance.koin_amount
              })`
            );
            return BOOLE_FALSE;
          }

          // removing the allowance as it is already consumed
          this.allowance.remove();
          return BOOLE_TRUE;
        }

        System.log("authorize failed for koin contract: no allowance defined");
        return BOOLE_FALSE;
      }

      // authorizations for POB contract
      if (
        Arrays.equal(args.call!.contract_id, System.getContractAddress("pob"))
      ) {
        switch (args.call!.entry_point) {
          case 0x53192be1: {
            // register_public_key
            if (!this.only_owner()) {
              System.log("authorize failed for PoB contract: not owner");
              return BOOLE_FALSE;
            }
            return BOOLE_TRUE;
          }
          case 0x859facc5: {
            // burn
            System.log(
              "authorize failed for PoB contract: burn can only be called from compute_koin_balances"
            );
            return BOOLE_FALSE;
          }
          default: {
            System.log(
              "authorize failed for PoB contract: invalid entry point"
            );
            return BOOLE_FALSE;
          }
        }
      }

      System.log(
        `authorize failed: invalid contract ${Base58.encode(
          args.call!.contract_id!
        )}`
      );
      return BOOLE_FALSE;
    }

    /*
    // check it is for consumption of mana
    if (args.type == authority.authorization_type.transaction_application) {
      const operations = Protobuf.decode<value.list_type>(
        System.getTransactionField("operations")!.message_value!.value!,
        value.list_type.decode
      ).values;
      if (operations.length > 1) {
        System.log("mana delegation failed: only 1 operation allowed");
        return BOOLE_FALSE;
      }

      const operation = Protobuf.decode<protocol.operation>(
        operations[0].message_value!.value!,
        protocol.operation.decode
      );
      if (!operation.call_contract) {
        System.log("mana delegation failed: not call contract operation");
        return BOOLE_FALSE;
      }

      if (
        !Arrays.equal(operation.call_contract!.contract_id, this.contractId)
      ) {
        System.log("mana delegation failed: not correct contract id");
        return BOOLE_FALSE;
      }

      switch (operation.call_contract!.entry_point) {
        // pay_beneficiary
        case 0x399f9ad8: {
          System.log("mana delegation failed: not implemented");
          return BOOLE_FALSE;
        }

        // pay_beneficiaries
        case 0xe13acaa7: {
          System.log("mana delegation failed: not implemented");
          return BOOLE_FALSE;
        }

        // compute_payments_timeframe
        case 0x9ec7f405: {
          System.log("mana delegation failed: not implemented");
          return BOOLE_FALSE;
        }

        // stake
        case 0xf4caf4ff: {
          System.log("mana delegation failed: not implemented");
          return BOOLE_FALSE;
        }

        // unstake
        case 0x453c505b: {
          System.log("mana delegation failed: not implemented");
          return BOOLE_FALSE;
        }

        // collect_vapor
        case 0x2348d281: {
          System.log("mana delegation failed: not implemented");
          return BOOLE_FALSE;
        }

        default: {
          System.log(
            `mana delegation failed: invalid entry point ${
              operation.call_contract!.entry_point
            }`
          );
          return BOOLE_FALSE;
        }
      }
    }
    */

    // code for production
    // return false for the rest of the cases
    return BOOLE_FALSE; // for production

    // code for testing
    // System.require(this.only_owner(), "not authorized by the owner"); // for testing
    // return BOOLE_TRUE; // for testing
  }

  getVhpContract(): Token {
    if (!this.vhpContract) {
      this.vhpContract = new Token(System.getContractAddress("vhp"));
    }
    return this.vhpContract!;
  }

  getSponsorsContract(): Sponsors {
    return new Sponsors(
      Base58.decode(
        BUILD_FOR_HARBINGER
          ? sponsorsContractIdHarbinger
          : sponsorsContractIdMainnet
      )
    );
  }

  /**
   * Get koin balance of beneficiary
   * @external
   * @readonly
   */
  get_beneficiary_balance(args: common.address): common.uint64 {
    return this.balancesBeneficiaries.get(args.account!)!;
  }

  /**
   * Get stake of an account
   * @external
   * @readonly
   */
  get_stake(args: common.address): common.uint64 {
    return this.stakes.get(args.account!)!;
  }

  /**
   * Get vapor withdrawn from the virtual vapor for a specific account
   * @external
   * @readonly
   */
  get_vapor_withdrawn(args: common.address): common.uint64 {
    return this.vaporWithdrawn.get(args.account!)!;
  }

  /**
   * Get accounts
   * @external
   * @readonly
   */
  get_accounts(args: common.list_args): common.addresses {
    const direction =
      args.direction == common.direction.ascending
        ? Storage.Direction.Ascending
        : Storage.Direction.Descending;
    const accounts = this.stakes.getManyKeys(
      args.start ? args.start! : new Uint8Array(0),
      args.limit,
      direction
    );
    return new common.addresses(accounts);
  }

  /**
   * Get snapshot of an account taken in the
   * previous period and tokens withdrawn
   * @external
   * @readonly
   */
  get_snapshot_stake(args: common.address): fogata.snapshot_stake {
    return this.snapshotStakes.get(args.account!)!;
  }

  /**
   * Get the state of the pool updated
   * @external
   * @readonly
   */
  get_pool_state(): fogata.pool_state {
    return this.getPoolStateUpdated(true);
  }

  /**
   * Get the state of the pool not updated (use only for debug purposes)
   * @external
   * @readonly
   */
  get_pool_state_no_updated(): fogata.pool_state {
    return this.poolState.get()!;
  }

  /**
   * Get user preferences
   * @external
   * @readonly
   */
  get_collect_koin_preferences(
    args: common.address
  ): fogata.collect_koin_preferences {
    return this.collectKoinPreferences.get(args.account!)!;
  }

  /**
   * Set user preferences
   * @external
   */
  set_collect_koin_preferences(
    args: fogata.collect_koin_preferences
  ): common.boole {
    this.validateAuthority(args.account!);
    System.require(
      !args.percentage_koin || !args.all_after_virtual,
      "either percentage_koin or all_after_virtual must be 0"
    );
    System.require(
      !args.percentage_koin || args.percentage_koin <= ONE_HUNDRED_PERCENT,
      "the percentage exceeds 100%"
    );
    this.collectKoinPreferences.put(args.account!, args);
    return BOOLE_TRUE;
  }

  /**
   * Transfer earnings to a beneficiary. It can be called by anyone
   * @external
   */
  pay_beneficiary(args: common.address): common.boole {
    // this.require_unpaused(); // for testing
    const balance = this.balancesBeneficiaries.get(args.account!)!;
    if (balance.value == 0) {
      System.log(`beneficiary ${Base58.encode(args.account!)} has no balance`);
      return BOOLE_TRUE;
    }

    if (!this.auxBeneficiary) {
      const poolParams = this.poolParams.get()!;
      for (let i = 0; i < poolParams.beneficiaries.length; i += 1) {
        const beneficiary = poolParams.beneficiaries[i];
        if (Arrays.equal(beneficiary.address, args.account)) {
          this.auxBeneficiary = beneficiary;
          break;
        }
      }
    }

    const sponsorsContract = this.getSponsorsContract();
    if (Arrays.equal(args.account, sponsorsContract._contractId)) {
      // the beneficiary is the sponsors contract. Make the transfer
      // through the contribute function to receive governance tokens
      this.allowance.put(
        new fogata.allowance(
          fogata.allowance_type.TRANSFER_KOIN,
          balance.value,
          sponsorsContract._contractId
        )
      );
      sponsorsContract.contribute(
        new tokenSponsors.contribute_args(this.contractId, balance.value)
      );
    } else {
      // normal transfer
      System.require(
        this.getKoinContract().transfer(
          this.contractId,
          args.account!,
          balance.value
        ),
        "transfer rejected"
      );
    }

    this.balancesBeneficiaries.remove(args.account!);

    // remove this amount from the reserved koins
    const reservedKoins = this.reservedKoins.get()!;
    reservedKoins.value = sub0(reservedKoins.value, balance.value);
    this.reservedKoins.put(reservedKoins);

    return BOOLE_TRUE;
  }

  /**
   * Transfer earnings to all beneficiaries. It can be called by anyone
   * @external
   */
  pay_beneficiaries(): common.boole {
    // update virtual balance and balances of beneficiaries
    const poolState = this.getPoolStateUpdated();
    this.poolState.put(poolState);

    const poolParams = this.poolParams.get()!;
    for (let i = 0; i < poolParams.beneficiaries.length; i += 1) {
      this.auxBeneficiary = poolParams.beneficiaries[i];
      this.pay_beneficiary(new common.address(this.auxBeneficiary!.address!));
    }
    return BOOLE_TRUE;
  }

  /**
   * Internal function to update the fees distributed to beneficiaries
   * (like node operator or sponsors program) based on the
   * virtual balance of the pool.
   *
   * This function is done in a way that if it's called
   * twice, the second call will not have effect because the
   * fees will be already taken.
   *
   * Note: this function doesn't update the poolState to reduce
   * calls to the storage. So, the poolState must be updated
   * outside of this function.
   *
   * Note2: the distribution of these payments to beneficiaries
   * is not strictly linked to a timeframe. It can be done at any time
   * (unlike payments to users which require the definition of a
   * timeframe to avoid for cicles)
   */
  getPoolStateUpdated(readonly: boolean = false): fogata.pool_state {
    const reservedKoins = this.reservedKoins.get()!;
    const poolState = this.poolState.get()!;

    // get the virtual balance of pool
    const poolVirtual =
      this.get_available_koins() +
      this.getVhpContract().balanceOf(this.contractId);

    // check how much this virtual balance has increased
    const deltaPoolVirtual = sub0(poolVirtual, poolState.virtual);

    // calculate new fees earned and transfer them to the beneficiaries
    const poolParams = this.poolParams.get()!;
    let totalFeesCollected: u64 = 0;
    for (let i = 0; i < poolParams.beneficiaries.length; i += 1) {
      const beneficiary = poolParams.beneficiaries[i];
      // fee = deltaPoolVirtual * beneficiary.percentage / ONE_HUNDRED_PERCENT
      let fee = multiplyAndDivide(
        deltaPoolVirtual,
        beneficiary.percentage,
        ONE_HUNDRED_PERCENT
      );
      if (totalFeesCollected + fee > deltaPoolVirtual) {
        fee = deltaPoolVirtual - totalFeesCollected;
      }
      if (fee > 0 && !readonly) {
        const balance = this.balancesBeneficiaries.get(beneficiary.address!)!;
        balance.value += fee;
        this.balancesBeneficiaries.put(beneficiary.address!, balance);
      }
      totalFeesCollected += fee;
    }

    if (!readonly && totalFeesCollected > 0) {
      // update the reserved koins to not take them into account
      // in the get_available_koins() computation
      reservedKoins.value += totalFeesCollected;
      this.reservedKoins.put(reservedKoins);
    }

    // calculate the new virtual balance of the pool
    poolState.virtual = sub0(poolVirtual, totalFeesCollected);

    // update vapor balance and virtual vapor
    const vaporBalance = this.getSponsorsContract().balance_of(
      new tokenSponsors.balance_of_args(this.contractId)
    ).value;
    poolState.virtual_vapor += sub0(vaporBalance, poolState.vapor);
    poolState.vapor = vaporBalance;

    return poolState;
  }

  /**
   * Function to be called periodically by anyone to reburn the KOINs
   * that was not withdrawn in the previous snapshot and take a new
   * snapshot. The vapor that was not withdrawn is distributed to all
   * users.
   * @external
   * @event fogata.vapor_not_withdrawn common.uint64
   * @event fogata.reburn_and_snapshot
   */
  reburn_and_snapshot(): common.boole {
    // this.require_unpaused(); // for testing
    const now = System.getBlockField("header.timestamp")!.uint64_value;
    const poolState = this.getPoolStateUpdated();
    const poolParams = this.poolParams.get()!;

    System.require(now >= poolState.next_snapshot, "it is not time to reburn");

    if (poolState.next_snapshot == 0) {
      poolState.current_snapshot = now;
      poolState.next_snapshot = now + poolParams.payment_period;
      this.poolState.put(poolState);
      System.log("snapshot initialized");
      return BOOLE_TRUE;
    }

    let koinBalance = this.get_available_koins();

    // burn the amount that was not withdrawn in the previous snapshot
    const amountToBurn = sub0(
      poolState.snapshot_koin,
      poolState.koin_withdrawn
    );
    if (amountToBurn > 0) {
      koinBalance = sub(koinBalance, amountToBurn, "reburn_and_snapshot 1");

      this.allowance.put(
        new fogata.allowance(
          fogata.allowance_type.BURN_KOIN,
          amountToBurn,
          this.contractId
        )
      );
      new PoB().burn(
        new pob.burn_arguments(amountToBurn, this.contractId, this.contractId)
      );
    }

    // take snapshot: reset koinWithdrawn counter, take pool state,
    // and set time for the next snapshot
    poolState.koin_withdrawn = 0;
    poolState.snapshot_koin = koinBalance;
    poolState.snapshot_stake = poolState.stake;
    if (poolState.next_snapshot + poolParams.payment_period <= now) {
      poolState.current_snapshot = now;
      poolState.next_snapshot = now + poolParams.payment_period;
    } else {
      poolState.current_snapshot = poolState.next_snapshot;
      poolState.next_snapshot += poolParams.payment_period;
    }
    this.poolState.put(poolState);

    System.event("fogata.reburn_and_snapshot", new Uint8Array(0), []);
    return BOOLE_TRUE;
  }

  /**
   * Function to apply the snapshot to a user in case it is
   * not yet applied
   */
  updateSnapshotUser(
    account: Uint8Array,
    poolState: fogata.pool_state,
    userStake: common.uint64,
    readonly: boolean = false
  ): fogata.snapshot_stake {
    const snapshotUserStake = this.snapshotStakes.get(account)!;
    // update user if it is linked to a previous snapshot
    if (snapshotUserStake.current_snapshot < poolState.current_snapshot) {
      snapshotUserStake.current_snapshot = poolState.current_snapshot;
      snapshotUserStake.stake = userStake.value;
      // reset counters modified in the previous snapshot
      snapshotUserStake.koin_withdrawn = 0;
      if (!readonly) {
        this.snapshotStakes.put(account, snapshotUserStake);
      }
    }
    return snapshotUserStake;
  }

  /**
   * koin/vhp balance of an account
   * @external
   * @readonly
   */
  balance_of(args: common.address): fogata.balance {
    const poolState = this.getPoolStateUpdated(true);
    const userStake = this.stakes.get(args.account!)!;
    const userVirtual = multiplyAndDivide(
      userStake.value,
      poolState.virtual,
      poolState.stake
    );

    const snapshotUserStake = this.updateSnapshotUser(
      args.account!,
      poolState,
      userStake,
      true
    );

    let balanceKoin: u64 = 0;
    if (poolState.snapshot_stake > 0) {
      balanceKoin = multiplyAndDivide(
        snapshotUserStake.stake,
        poolState.snapshot_koin,
        poolState.snapshot_stake
      );
      balanceKoin = sub0(balanceKoin, snapshotUserStake.koin_withdrawn);
    }
    const balanceVhp = sub0(userVirtual, balanceKoin);

    let balanceVapor: u64 = 0;
    if (poolState.stake > 0) {
      balanceVapor = multiplyAndDivide(
        userStake.value,
        poolState.virtual_vapor,
        poolState.stake
      );
      const vaporWithdrawn = this.vaporWithdrawn.get(args.account!)!;
      balanceVapor = sub0(balanceVapor, vaporWithdrawn.value);
    }

    return new fogata.balance(balanceKoin, balanceVhp, balanceVapor);
  }

  /**
   * Deposit koin or vhp into the pool
   * @external
   * @event fogata.stake fogata.stake_event
   */
  stake(args: fogata.stake_args): common.boole {
    // this.require_unpaused(); // for testing
    System.require(
      args.koin_amount > 0 || args.vhp_amount > 0,
      "either koin amount or vhp amount must be greater than 0"
    );

    this.validateAuthority(args.account!);

    // get pool state, user stake, and virtual amount to deposit
    const poolState = this.getPoolStateUpdated();
    const userStake = this.stakes.get(args.account!)!;
    const deltaUserVirtual = args.koin_amount + args.vhp_amount;

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

    // calculate stake of the user and vapor
    let deltaUserStake: u64;
    let deltaUserVapor: u64;
    if (poolState.stake == 0) {
      // this is the first stake in the pool
      deltaUserStake = deltaUserVirtual;

      // no vapor is computed
      deltaUserVapor = 0;
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
      // after some maths the new stake for the user is calculated as:
      // delta_userStake = delta_userVirtual * poolStake_old / poolVirtual_old
      deltaUserStake = multiplyAndDivide(
        deltaUserVirtual,
        poolState.stake,
        poolState.virtual
        // division by 0 ? no because poolState.stake > 0, then
        // poolState.virtual should be greater than 0 as well
      );

      // the user is adding stake, then the following relation must be
      // preserved to not affect previous users when calculating vapor:
      //
      // poolStake_new / virtualVapor_new = poolStake_old / virtualVapor_old
      //
      // where:
      // poolStake_new = poolStake_old + delta_userStake
      // virtualVapor_new = virtualVapor_old + delta_userVapor
      //
      // after some maths the new vapor for the user is calculated as:
      // delta_userVapor = delta_userStake * virtualVapor_old / poolStake_old
      deltaUserVapor = multiplyAndDivide(
        deltaUserStake,
        poolState.virtual_vapor,
        poolState.stake
        // division by 0 ? no because poolState.stake > 0
      );
    }

    // apply updates in the snapshot before updating the stake
    this.updateSnapshotUser(args.account!, poolState, userStake);

    // update count
    if (userStake.value == 0) {
      poolState.user_count += 1;
    }

    // add new stake to the user
    userStake.value += deltaUserStake;
    this.stakes.put(args.account!, userStake);

    // update pool state
    poolState.stake += deltaUserStake;
    poolState.virtual += deltaUserVirtual;
    poolState.virtual_vapor += deltaUserVapor;
    this.poolState.put(poolState);

    // as new vapor is virtually created for the user, it is also computed
    // that this vapor was withdrawn by the user to have a zero sum result
    const vaporWithdrawn = this.vaporWithdrawn.get(args.account!)!;
    vaporWithdrawn.value += deltaUserVapor;
    this.vaporWithdrawn.put(args.account!, vaporWithdrawn);

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
    return BOOLE_TRUE;
  }

  /**
   * Internal function to unstake
   */
  _unstake(args: fogata.stake_args, collect: boolean = false): ResultUnstake {
    if (!collect) {
      this.validateAuthority(args.account!);
    }

    // get pool state, user stake, and virtual amount to withdraw
    const poolState = this.getPoolStateUpdated();
    const userStake = this.stakes.get(args.account!)!;

    // calculate virtual amount of the user
    //
    // note: same maths applied as in the stake function. Check there
    // for more details
    // userVirtual = (userStake * poolVirtual_old) / poolStake_old;
    System.require(poolState.stake > 0, "there is no stake in the pool");
    const userVirtual = multiplyAndDivide(
      userStake.value,
      poolState.virtual,
      poolState.stake
    );

    // apply updates in the snapshot before updating the stake
    const snapshotUserStake = this.updateSnapshotUser(
      args.account!,
      poolState,
      userStake
    );

    let balanceKoin: u64 = 0;
    if (poolState.snapshot_stake > 0) {
      balanceKoin = multiplyAndDivide(
        snapshotUserStake.stake,
        poolState.snapshot_koin,
        poolState.snapshot_stake
      );
      balanceKoin = sub0(balanceKoin, snapshotUserStake.koin_withdrawn);
    }
    const balanceVhp = sub0(userVirtual, balanceKoin);

    let koin_amount: u64 = 0;
    let vhp_amount: u64 = 0;

    if (collect) {
      // calculation based on collect koin preferences
      const collectKoinPreferences = this.collectKoinPreferences.get(
        args.account!
      )!;

      if (collectKoinPreferences.percentage_koin) {
        // calculation based on the available koin at the time
        // of the snapshot
        const balanceKoinAtSnapshot =
          balanceKoin + snapshotUserStake.koin_withdrawn;
        koin_amount = multiplyAndDivide(
          balanceKoinAtSnapshot,
          collectKoinPreferences.percentage_koin,
          ONE_HUNDRED_PERCENT
        );
      } else if (collectKoinPreferences.all_after_virtual) {
        // the desired amount is everything that exceeds a specific threshold
        if (userVirtual > collectKoinPreferences.all_after_virtual) {
          koin_amount = userVirtual - collectKoinPreferences.all_after_virtual;
        }
      }

      // remove the koin already withdrawn in the current period
      if (koin_amount > snapshotUserStake.koin_withdrawn) {
        koin_amount -= snapshotUserStake.koin_withdrawn;
      } else {
        koin_amount = 0;
      }

      // limit the result to the current balance
      if (koin_amount > balanceKoin) {
        koin_amount = balanceKoin;
      }

      if (koin_amount == 0) {
        System.log(
          `no koins to collect for address ${Base58.encode(args.account!)}`
        );
        // finish the work of refreshBalances
        this.poolState.put(poolState);
        return new ResultUnstake(poolState, userStake, false);
      }
    } else {
      // not "collect" function. Amounts taken from the arguments
      koin_amount = args.koin_amount;
      vhp_amount = args.vhp_amount;
      System.require(
        koin_amount > 0 || vhp_amount > 0,
        "either koin amount or vhp amount must be greater than 0"
      );
    }
    const deltaUserVirtual = koin_amount + vhp_amount;

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

    // calculate virtual vapor of the user
    //
    // note: same maths applied as in the stake function. Check there
    // for more details
    // deltaUserVapor = (deltaUserStake * virtualVapor_old) / poolStake_old;
    const deltaUserVapor = multiplyAndDivide(
      deltaUserStake,
      poolState.virtual_vapor,
      poolState.stake
      // division by 0 ? no because poolState.stake > 0
    );

    if (koin_amount > 0) {
      System.require(
        koin_amount <= balanceKoin,
        `you can withdraw max ${balanceKoin} satoshis of koin for this period. Requested ${koin_amount}`
      );
      snapshotUserStake.koin_withdrawn += koin_amount;
      poolState.koin_withdrawn += koin_amount;

      const transferStatus1 = this.getKoinContract().transfer(
        this.contractId,
        args.account!,
        koin_amount
      );
      System.require(transferStatus1 == true, "transfer of koins rejected");
      this.snapshotStakes.put(args.account!, snapshotUserStake);
    }

    if (vhp_amount > 0) {
      System.require(
        vhp_amount <= balanceVhp,
        `you can withdraw max ${balanceVhp} satoshis of vhp. Requested ${vhp_amount}`
      );
      const transferStatus2 = this.getVhpContract().transfer(
        this.contractId,
        args.account!,
        vhp_amount
      );
      System.require(transferStatus2 == true, "transfer of vhp rejected");
    }

    // remove stake from the user
    userStake.value = sub0(userStake.value, deltaUserStake);
    this.stakes.put(args.account!, userStake);

    // update count
    if (userStake.value == 0 && poolState.user_count > 0) {
      poolState.user_count -= 1;
    }

    // update pool state
    poolState.stake = sub0(poolState.stake, deltaUserStake);
    poolState.virtual = sub0(poolState.virtual, deltaUserVirtual);
    poolState.virtual_vapor = sub0(poolState.virtual_vapor, deltaUserVapor);
    this.poolState.put(poolState);

    // as some vapor is virtually removed from the user, it is also removed from
    // the withdrawn vapor of the user to have a zero sum result
    const vaporWithdrawn = this.vaporWithdrawn.get(args.account!)!;
    if (vaporWithdrawn.value > deltaUserVapor)
      vaporWithdrawn.value -= deltaUserVapor;
    else vaporWithdrawn.value = 0;
    this.vaporWithdrawn.put(args.account!, vaporWithdrawn);

    System.event(
      "fogata.unstake",
      Protobuf.encode(
        new fogata.stake_event(
          args.account!,
          koin_amount,
          vhp_amount,
          deltaUserStake
        ),
        fogata.stake_event.encode
      ),
      [args.account!]
    );
    return new ResultUnstake(poolState, userStake, true);
  }

  /**
   * Withdraw koin or vhp from the pool
   * @external
   * @event fogata.unstake fogata.stake_event
   */
  unstake(args: fogata.stake_args): common.boole {
    // this.require_unpaused(); // for testing
    const resultUnstake = this._unstake(args);
    return new common.boole(resultUnstake.result);
  }

  /**
   * Withdraw earnings of koin and vapor. Anyone can call this
   * method
   * @external
   */
  collect(args: common.address): common.boole {
    // this.require_unpaused(); // for testing

    // call unstake for collect koin
    const unstakeResult = this._unstake(
      new fogata.stake_args(args.account, 0, 0),
      true
    );
    const poolState = unstakeResult.poolState;
    const userStake = unstakeResult.userStake;

    // calc vapor balance
    let balanceVapor: u64 = 0;
    let vaporWithdrawn = new common.uint64(0);
    if (poolState.stake > 0) {
      balanceVapor = multiplyAndDivide(
        userStake.value,
        poolState.virtual_vapor,
        poolState.stake
      );
      vaporWithdrawn = this.vaporWithdrawn.get(args.account!)!;
      balanceVapor = sub0(balanceVapor, vaporWithdrawn.value);
    }

    if (balanceVapor == 0) {
      System.log(
        `no vapor to collect for address ${Base58.encode(args.account!)}`
      );
      return BOOLE_FALSE;
    }

    const transferStatus1 = this.getSponsorsContract().transfer(
      new tokenSponsors.transfer_args(
        this.contractId,
        args.account!,
        balanceVapor
      )
    ).value;
    System.require(transferStatus1 == true, "transfer of vapor rejected");
    vaporWithdrawn.value += balanceVapor;
    this.vaporWithdrawn.put(args.account!, vaporWithdrawn);
    // update vapor balance
    poolState.vapor = sub0(poolState.vapor, balanceVapor);
    this.poolState.put(poolState);

    return BOOLE_TRUE;
  }

  /**
   * Set pool state
   * @external
   * TODO: this function was added for testing purposes. It MUST
   * be removed in production
   */
  // set_pool_state(args: fogata.pool_state): common.boole { // for testing
  // System.require(                                         // for testing
  // this.only_owner(),                                      // for testing
  // "owner has not authorized to update pool state"         // for testing
  // );                                                      // for testing
  // this.poolState.put(args);                               // for testing
  // return BOOLE_TRUE;                                      // for testing
  // }                                                       // for testing

  /**
   * Set reserved koins
   * @external
   * TODO: this function was added to fix bugs. It MUST
   * be removed in production
   */
  // set_reserved_koins(args: common.uint64): common.boole { // for testing
  // System.require(                                         // for testing
  // this.only_owner(),                                      // for testing
  // "owner has not authorized to update reserved koins"     // for testing
  // );                                                      // for testing
  // this.reservedKoins.put(args);                           // for testing
  // return BOOLE_TRUE;                                      // for testing
  // }                                                       // for testing
}
