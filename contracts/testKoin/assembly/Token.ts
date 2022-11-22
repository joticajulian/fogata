import { Arrays, System, authority, Storage } from "@koinos/sdk-as";
import { Ownable } from "./Ownable";
import { token } from "./proto/token";

const SUPPLY_ID = 0;
const BALANCES_SPACE_ID = 1;

export class Token extends Ownable {
  callArgs: System.getArgumentsReturn | null;

  _name: string = "test koin";
  _symbol: string = "T_KOIN";
  _decimals: u32 = 8;

  supply: Storage.Obj<token.uint64>;
  balances: Storage.Map<Uint8Array, token.uint64>;

  constructor() {
    super();
    this.supply = new Storage.Obj(
      this.contractId,
      SUPPLY_ID,
      token.uint64.decode,
      token.uint64.encode,
      () => new token.uint64(0)
    );
    this.balances = new Storage.Map(
      this.contractId,
      BALANCES_SPACE_ID,
      token.uint64.decode,
      token.uint64.encode,
      () => new token.uint64(0)
    );
  }

  /**
   * Get name of the token
   * @external
   * @readonly
   */
  name(): token.str {
    return new token.str(this._name);
  }

  /**
   * Get the symbol of the token
   * @external
   * @readonly
   */
  symbol(): token.str {
    return new token.str(this._symbol);
  }

  /**
   * Get the decimals of the token
   * @external
   * @readonly
   */
  decimals(): token.uint32 {
    return new token.uint32(this._decimals);
  }

  /**
   * Get name, symbol and decimals
   * @external
   * @readonly
   */
  get_info(): token.info {
    return new token.info(this._name, this._symbol, this._decimals);
  }

  /**
   * Get total supply
   * @external
   * @readonly
   */
  total_supply(): token.uint64 {
    return this.supply.get()!;
  }

  /**
   * Get balance of an account
   * @external
   * @readonly
   */
  balance_of(args: token.balance_of_args): token.uint64 {
    return this.balances.get(args.owner!)!;
  }

  /**
   * Transfer tokens
   * @external
   */
  transfer(args: token.transfer_args): token.boole {
    const from = args.from!;
    const to = args.to!;
    const value = args.value;

    const caller = System.getCaller();
    if (
      !Arrays.equal(from, caller.caller) &&
      !System.checkAuthority(
        authority.authorization_type.contract_call,
        from,
        this.callArgs!.args
      )
    ) {
      System.log("from has not authorized transfer");
      return new token.boole(false);
    }

    let fromBalance = this.balances.get(from)!;
    if (fromBalance.value < value) {
      System.log("'from' has insufficient balance");
      return new token.boole(false);
    }
    fromBalance.value -= value;
    this.balances.put(from, fromBalance);

    let toBalance = this.balances.get(to)!;
    toBalance.value += value;
    this.balances.put(to, toBalance);

    const impacted = [to, from];
    System.event("token.transfer", this.callArgs!.args, impacted);

    return new token.boole(true);
  }

  /**
   * Mint new tokens
   * @external
   */
  mint(args: token.mint_args): token.boole {
    System.require(this.only_owner(), "owner has not allowed the mint");
    const to = args.to!;
    const value = args.value;

    const supply = this.supply.get()!;
    if (supply.value > u64.MAX_VALUE - value) {
      System.log("Mint would overflow supply");
      return new token.boole(false);
    }

    let toBalance = this.balances.get(to)!;
    toBalance.value += value;
    this.balances.put(to, toBalance);
    supply.value += value;
    this.supply.put(supply);

    const impacted = [to];
    System.event("token.mint", this.callArgs!.args, impacted);

    return new token.boole(true);
  }

  /**
   * Burn tokens
   * @external
   */
  burn(args: token.burn_args): token.boole {
    const from = args.from!;
    const value = args.value;

    const caller = System.getCaller();
    if (
      !Arrays.equal(from, caller.caller) &&
      !System.checkAuthority(
        authority.authorization_type.contract_call,
        from,
        this.callArgs!.args
      ) &&
      // the owner authority can burn as well
      !this.only_owner()
    ) {
      System.log("neither from nor owner have authorized the burn");
      return new token.boole(false);
    }

    let fromBalance = this.balances.get(from)!;
    if (fromBalance.value < value) {
      System.log("'from' has insufficient balance");
      return new token.boole(false);
    }

    const supply = this.supply.get()!;
    fromBalance.value -= value;
    this.balances.put(from, fromBalance);
    supply.value -= value;
    this.supply.put(supply);

    const impacted = [from];
    System.event("token.burn", this.callArgs!.args, impacted);

    return new token.boole(true);
  }
}
