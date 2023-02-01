import { System, Protobuf, StringBytes } from "@koinos/sdk-as";
import { common } from "./proto/common";
import { token } from "./proto/token";

export class Sponsors {
  _contractId: Uint8Array;

  /**
   * Create an instance of a Sponsors contract
   * @example
   * ```ts
   *   const contract = new Sponsors(Base58.decode("1DQzuCcTKacbs9GGScFTU1Hc8BsyARTPqe"));
   * ```
   */
  constructor(contractId: Uint8Array) {
    this._contractId = contractId;
  }

  /**
   * Get name of the token
   * @external
   * @readonly
   */
  name(): common.str {
    const argsBuffer = new Uint8Array(0);
    const callRes = System.call(this._contractId, 0x82a3537f, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Sponsors.name': ${
        callRes.res.error && callRes.res.error!.message
          ? callRes.res.error!.message!
          : ""
      }`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    if (!callRes.res.object) return new common.str();
    return Protobuf.decode<common.str>(callRes.res.object!, common.str.decode);
  }

  /**
   * Get the symbol of the token
   * @external
   * @readonly
   */
  symbol(): common.str {
    const argsBuffer = new Uint8Array(0);
    const callRes = System.call(this._contractId, 0xb76a7ca1, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Sponsors.symbol': ${
        callRes.res.error && callRes.res.error!.message
          ? callRes.res.error!.message!
          : ""
      }`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    if (!callRes.res.object) return new common.str();
    return Protobuf.decode<common.str>(callRes.res.object!, common.str.decode);
  }

  /**
   * Get the decimals of the token
   * @external
   * @readonly
   */
  decimals(): common.uint32 {
    const argsBuffer = new Uint8Array(0);
    const callRes = System.call(this._contractId, 0xee80fd2f, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Sponsors.decimals': ${
        callRes.res.error && callRes.res.error!.message
          ? callRes.res.error!.message!
          : ""
      }`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    if (!callRes.res.object) return new common.uint32();
    return Protobuf.decode<common.uint32>(
      callRes.res.object!,
      common.uint32.decode
    );
  }

  /**
   * Get name, symbol and decimals
   * @external
   * @readonly
   */
  get_info(): token.info {
    const argsBuffer = new Uint8Array(0);
    const callRes = System.call(this._contractId, 0xbd7f6850, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Sponsors.get_info': ${
        callRes.res.error && callRes.res.error!.message
          ? callRes.res.error!.message!
          : ""
      }`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    if (!callRes.res.object) return new token.info();
    return Protobuf.decode<token.info>(callRes.res.object!, token.info.decode);
  }

  /**
   * Get total supply
   * @external
   * @readonly
   */
  total_supply(): common.uint64 {
    const argsBuffer = new Uint8Array(0);
    const callRes = System.call(this._contractId, 0xb0da3934, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Sponsors.total_supply': ${
        callRes.res.error && callRes.res.error!.message
          ? callRes.res.error!.message!
          : ""
      }`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    if (!callRes.res.object) return new common.uint64();
    return Protobuf.decode<common.uint64>(
      callRes.res.object!,
      common.uint64.decode
    );
  }

  /**
   * Get balance of an account
   * @external
   * @readonly
   */
  balance_of(args: token.balance_of_args): common.uint64 {
    const argsBuffer = Protobuf.encode(args, token.balance_of_args.encode);
    const callRes = System.call(this._contractId, 0x5c721497, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Sponsors.balance_of': ${
        callRes.res.error && callRes.res.error!.message
          ? callRes.res.error!.message!
          : ""
      }`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    if (!callRes.res.object) return new common.uint64();
    return Protobuf.decode<common.uint64>(
      callRes.res.object!,
      common.uint64.decode
    );
  }

  /**
   * Transfer tokens
   * @external
   */
  transfer(args: token.transfer_args): common.boole {
    const argsBuffer = Protobuf.encode(args, token.transfer_args.encode);
    const callRes = System.call(this._contractId, 0x27f576ca, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Sponsors.transfer': ${
        callRes.res.error && callRes.res.error!.message
          ? callRes.res.error!.message!
          : ""
      }`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    if (!callRes.res.object) return new common.boole();
    return Protobuf.decode<common.boole>(
      callRes.res.object!,
      common.boole.decode
    );
  }

  /**
   * Burn tokens
   * @external
   */
  burn(args: token.burn_args): common.boole {
    const argsBuffer = Protobuf.encode(args, token.burn_args.encode);
    const callRes = System.call(this._contractId, 0x859facc5, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Sponsors.burn': ${
        callRes.res.error && callRes.res.error!.message
          ? callRes.res.error!.message!
          : ""
      }`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    if (!callRes.res.object) return new common.boole();
    return Protobuf.decode<common.boole>(
      callRes.res.object!,
      common.boole.decode
    );
  }

  /**
   * Contribute with koin to the sponsors program, and get back
   * governance tokens
   * @external
   */
  contribute(args: token.contribute_args): common.boole {
    const argsBuffer = Protobuf.encode(args, token.contribute_args.encode);
    const callRes = System.call(this._contractId, 0x8aa73cb6, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Sponsors.contribute': ${
        callRes.res.error && callRes.res.error!.message
          ? callRes.res.error!.message!
          : ""
      }`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    if (!callRes.res.object) return new common.boole();
    return Protobuf.decode<common.boole>(
      callRes.res.object!,
      common.boole.decode
    );
  }
}
