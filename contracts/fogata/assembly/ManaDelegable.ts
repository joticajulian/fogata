import {
  System,
  Storage,
  Arrays,
  Token,
  authority,
  Base58,
} from "@koinos/sdk-as";
import { fogata } from "./proto/fogata";
import { common } from "./proto/common";
import { sub } from "./utils";
// import { Pausable } from "./Pausable"; // for testing
import { Ownable } from "./Ownable"; // for production

/**
 * ManaDelegable is a contract that has a reserved amount of koins,
 * which is used to consume mana.
 * These koins are contributed by the community. The contract has a
 * registry for each contributor and they can remove the koins whenever
 * they want (as long as the mana is recharged).
 *
 * TODO: Think in a better name since "ManaDelegable" is not just mana
 * but also a transfer of koins to give this mana.
 */
// export class ManaDelegable extends Pausable { // for testing
export class ManaDelegable extends Ownable { // for production
  callArgs: System.getArgumentsReturn | null;

  koinContract: Token | null;

  balancesManaDelegators: Storage.Map<Uint8Array, common.uint64>;

  reservedKoins: Storage.Obj<common.uint64>;

  constructor() {
    super();

    this.balancesManaDelegators = new Storage.Map(
      this.contractId,
      200,
      common.uint64.decode,
      common.uint64.encode,
      () => new common.uint64(0)
    );

    this.reservedKoins = new Storage.Obj(
      this.contractId,
      201,
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

  /**
   * Internal function to validate if an account has authorized
   * to perform the operation
   */
  validateAuthority(account: Uint8Array): void {
    const caller = System.getCaller().caller;
    // the authority is successful if this contract is called by the
    // account's contract (caller), or if the account authorizes this
    // contract call (by checking the signature or by calling the
    // account's contract)
    System.require(
      Arrays.equal(account, caller) ||
        System.checkAuthority(
          authority.authorization_type.contract_call,
          account,
          this.callArgs!.args
        ),
      `${Base58.encode(account)} has not authorized the operation`
    );
  }

  /**
   * Get reserved koins (for beneficiaries and mana supporters)
   * @external
   * @readonly
   */
  get_reserved_koins(): common.uint64 {
    return this.reservedKoins.get()!;
  }

  /**
   * Get koin balance minus the reserved koins
   */
  get_available_koins(): u64 {
    const koinBalance = this.getKoinContract().balanceOf(this.contractId);
    const reservedKoins = this.reservedKoins.get()!;
    return sub(koinBalance, reservedKoins.value, "get_available_koins");
  }

  /**
   * Get koin balance of mana supporter
   * @external
   * @readonly
   */
  get_mana_delegation(args: common.address): common.uint64 {
    return this.balancesManaDelegators.get(args.account!)!;
  }

  /**
   * Transfer KOINs to the pool to support the mana consumption.
   * This amount will not be burned
   * @external
   * @event fogata.add_mana_delegation fogata.koin_account
   */
  add_mana_delegation(args: fogata.koin_account): common.boole {
    // this.require_unpaused(); // for testing
    const balance = this.balancesManaDelegators.get(args.account!)!;
    const reservedKoins = this.reservedKoins.get()!;

    System.require(
      this.getKoinContract().transfer(
        args.account!,
        this.contractId,
        args.koin_amount
      ),
      "transfer rejected"
    );

    balance.value += args.koin_amount;
    reservedKoins.value += args.koin_amount;
    this.balancesManaDelegators.put(args.account!, balance);
    this.reservedKoins.put(reservedKoins);

    System.event("fogata.add_mana_delegation", this.callArgs!.args, [
      args.account!,
    ]);
    return new common.boole(true);
  }

  /**
   * Withdraw KOINs used in the mana consumption.
   * @external
   * @event fogata.remove_mana_delegation fogata.koin_account
   */
  remove_mana_delegation(args: fogata.koin_account): common.boole {
    // this.require_unpaused(); // for testing
    const balance = this.balancesManaDelegators.get(args.account!)!;
    const reservedKoins = this.reservedKoins.get()!;

    this.validateAuthority(args.account!);
    System.require(balance.value >= args.koin_amount, "insufficient balance");
    System.require(
      this.getKoinContract().transfer(
        this.contractId,
        args.account!,
        args.koin_amount
      ),
      "transfer rejected"
    );

    balance.value -= args.koin_amount;
    reservedKoins.value -= args.koin_amount;
    this.balancesManaDelegators.put(args.account!, balance);
    this.reservedKoins.put(reservedKoins);

    System.event("fogata.remove_mana_support", this.callArgs!.args, [
      args.account!,
    ]);
    return new common.boole(true);
  }
}
