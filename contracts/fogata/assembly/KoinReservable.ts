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
 * KoinReservable is a contract that has a reserved amount of koin,
 * which is used to consume mana.
 * These koins can come from several accounts. Normally they are provided
 * by the pool owner. The contract has a registry for each contributor
 * and they can remove the koin whenever they want (as long as the mana
 * is recharged).
 */
// export class KoinReservable extends Pausable { // for testing
// prettier-ignore
export class KoinReservable extends Ownable { // for production
  callArgs: System.getArgumentsReturn | null;

  koinContract: Token | null;

  balancesReservedKoin: Storage.Map<Uint8Array, common.uint64>;

  allReservedKoin: Storage.Obj<common.uint64>;

  constructor() {
    super();

    this.balancesReservedKoin = new Storage.Map(
      this.contractId,
      200,
      common.uint64.decode,
      common.uint64.encode,
      () => new common.uint64(0)
    );

    this.allReservedKoin = new Storage.Obj(
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
   * Get reserved koin (for beneficiaries and mana supporters)
   * @external
   * @readonly
   */
  get_all_reserved_koin(): common.uint64 {
    return this.allReservedKoin.get()!;
  }

  /**
   * Get koin balance minus the reserved koin
   */
  get_available_koin(): u64 {
    const koinBalance = this.getKoinContract().balanceOf(this.contractId);
    const allReservedKoin = this.allReservedKoin.get()!;
    return sub(koinBalance, allReservedKoin.value, "get_available_koin");
  }

  /**
   * Get koin balance of mana supporter
   * @external
   * @readonly
   */
  get_reserved_koin(args: common.address): common.uint64 {
    return this.balancesReservedKoin.get(args.account!)!;
  }

  /**
   * Transfer KOINs to the pool to support the mana consumption.
   * This amount will not be burned
   * @external
   * @event fogata.add_reserved_koin fogata.koin_account
   */
  add_reserved_koin(args: fogata.koin_account): common.boole {
    // this.require_unpaused(); // for testing
    const balance = this.balancesReservedKoin.get(args.account!)!;
    const allReservedKoin = this.allReservedKoin.get()!;

    System.require(
      this.getKoinContract().transfer(
        args.account!,
        this.contractId,
        args.koin_amount
      ),
      "transfer rejected"
    );

    balance.value += args.koin_amount;
    allReservedKoin.value += args.koin_amount;
    this.balancesReservedKoin.put(args.account!, balance);
    this.allReservedKoin.put(allReservedKoin);

    System.event("fogata.add_reserved_koin", this.callArgs!.args, [
      args.account!,
    ]);
    return new common.boole(true);
  }

  /**
   * Withdraw KOINs used in the mana consumption.
   * @external
   * @event fogata.remove_reserved_koin fogata.koin_account
   */
  remove_reserved_koin(args: fogata.koin_account): common.boole {
    // this.require_unpaused(); // for testing
    const balance = this.balancesReservedKoin.get(args.account!)!;
    const allReservedKoin = this.allReservedKoin.get()!;

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
    allReservedKoin.value -= args.koin_amount;
    this.balancesReservedKoin.put(args.account!, balance);
    this.allReservedKoin.put(allReservedKoin);

    System.event("fogata.remove_reserved_koin", this.callArgs!.args, [
      args.account!,
    ]);
    return new common.boole(true);
  }
}
