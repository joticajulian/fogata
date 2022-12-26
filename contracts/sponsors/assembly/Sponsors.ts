import {
  Arrays,
  System,
  authority,
  Storage,
  Token as TokenKoinos,
  Protobuf,
} from "@koinos/sdk-as";
import { token } from "./proto/token";
import { common } from "./proto/common";
import { multiplyAndDivide } from "./utils";

const SUPPLY_ID = 0;
const BALANCES_SPACE_ID = 1;

const TIME_1: u64 = 1672531200000; // Sunday, January 1, 2023 12:00:00 AM
const TIME_2: u64 = 1704067200000; // Monday, January 1, 2024 12:00:00 AM
const DECAY_PERIOD: u64 = 31536000000; // TIME_2 - TIME_1 = 1 year
const MAX_MINT_FACTOR: u64 = 20;

export class Sponsors {
  callArgs: System.getArgumentsReturn | null;
  contractId: Uint8Array;

  _name: string = "Vapor";
  _symbol: string = "VAPOR";
  _decimals: u32 = 8;

  supply: Storage.Obj<common.uint64>;
  balances: Storage.Map<Uint8Array, common.uint64>;

  constructor() {
    this.contractId = System.getContractId();
    this.supply = new Storage.Obj(
      this.contractId,
      SUPPLY_ID,
      common.uint64.decode,
      common.uint64.encode,
      () => new common.uint64(0)
    );
    this.balances = new Storage.Map(
      this.contractId,
      BALANCES_SPACE_ID,
      common.uint64.decode,
      common.uint64.encode,
      () => new common.uint64(0)
    );
  }

  /**
   * Get name of the token
   * @external
   * @readonly
   */
  name(): common.str {
    return new common.str(this._name);
  }

  /**
   * Get the symbol of the token
   * @external
   * @readonly
   */
  symbol(): common.str {
    return new common.str(this._symbol);
  }

  /**
   * Get the decimals of the token
   * @external
   * @readonly
   */
  decimals(): common.uint32 {
    return new common.uint32(this._decimals);
  }

  /**
   * Get name, symbol and decimals
   * @external
   * @readonly
   */
  get_info(): token.info {
    return new token.info(
      this._name,
      this._symbol,
      this._decimals,
      [
        "Sponsors contract aims to fund any type of proposal/project",
        "with KOIN. The selection of the proposals is defined by the contributors",
        "of KOIN, that is, the holders of the token VAPOR. The more VAPOR",
        "you have the more weight you have in the vote.",
      ].join(" ")
    );
  }

  /**
   * Get total supply
   * @external
   * @readonly
   */
  total_supply(): common.uint64 {
    return this.supply.get()!;
  }

  /**
   * Get balance of an account
   * @external
   * @readonly
   */
  balance_of(args: token.balance_of_args): common.uint64 {
    return this.balances.get(args.owner!)!;
  }

  /**
   * Transfer tokens
   * @external
   */
  transfer(args: token.transfer_args): common.boole {
    const from = args.from!;
    const to = args.to!;
    const value = args.value;

    const caller = System.getCaller();
    System.require(
      Arrays.equal(from, caller.caller) ||
        System.checkAuthority(
          authority.authorization_type.contract_call,
          from,
          this.callArgs!.args
        ),
      "from has not authorized transfer"
    );

    let fromBalance = this.balances.get(from)!;
    System.require(
      fromBalance.value >= value,
      "'from' has insufficient balance"
    );

    fromBalance.value -= value;
    this.balances.put(from, fromBalance);

    let toBalance = this.balances.get(to)!;
    toBalance.value += value;
    this.balances.put(to, toBalance);

    const impacted = [to, from];
    System.event("token.transfer", this.callArgs!.args, impacted);

    return new common.boole(true);
  }

  /**
   * Mint new tokens
   * Internal function
   */
  mint(args: token.mint_args): void {
    const to = args.to!;
    const value = args.value;

    const supply = this.supply.get()!;
    System.require(
      supply.value <= u64.MAX_VALUE - value,
      "Mint would overflow supply"
    );

    let toBalance = this.balances.get(to)!;
    toBalance.value += value;
    this.balances.put(to, toBalance);
    supply.value += value;
    this.supply.put(supply);

    const impacted = [to];
    System.event(
      "token.mint",
      Protobuf.encode(args, token.mint_args.encode),
      impacted
    );
  }

  /**
   * Burn tokens
   * @external
   */
  burn(args: token.burn_args): common.boole {
    const from = args.from!;
    const value = args.value;

    const caller = System.getCaller();
    System.require(
      Arrays.equal(from, caller.caller) ||
        System.checkAuthority(
          authority.authorization_type.contract_call,
          from,
          this.callArgs!.args
        ),
      "from has not authorized the burn"
    );

    let fromBalance = this.balances.get(from)!;
    System.require(
      fromBalance.value >= value,
      "'from' has insufficient balance"
    );

    const supply = this.supply.get()!;
    fromBalance.value -= value;
    this.balances.put(from, fromBalance);
    supply.value -= value;
    this.supply.put(supply);

    const impacted = [from];
    System.event("token.burn", this.callArgs!.args, impacted);

    return new common.boole(true);
  }

  /**
   * Contribute with koins to the sponsors program, and get back
   * governance tokens
   * @external
   */
  contribute(args: token.contribute_args): common.boole {
    const koinContract = new TokenKoinos(System.getContractAddress("koin"));
    System.require(
      koinContract.transfer(args.from!, this.contractId, args.value),
      "transfer to contribute rejected"
    );

    const now = System.getBlockField("header.timestamp")!.uint64_value;
    let newTokens: u64 = 0;
    if (now < TIME_1) {
      // max mint factor at the beginning
      newTokens = MAX_MINT_FACTOR * args.value;
    } else if (TIME_1 <= now && now <= TIME_2) {
      // the factor decreases over time until 1
      const dt = now - TIME_1;
      newTokens = multiplyAndDivide(
        args.value,
        MAX_MINT_FACTOR * DECAY_PERIOD - (MAX_MINT_FACTOR - 1) * dt,
        DECAY_PERIOD
      );
    } else {
      // finally the factor continues to be 1
      newTokens = args.value;
    }

    this.mint(new token.mint_args(args.from!, newTokens));
    return new common.boole(true);
  }
}
