import { System, Protobuf, StringBytes } from "@koinos/sdk-as";
import { ownable } from "./proto/ownable";
import { common } from "./proto/common";

export class Ownable {
  _contractId: Uint8Array;

  /**
   * Create an instance of a Ownable contract
   * @example
   * ```ts
   *   const contract = new Ownable(Base58.decode("1DQzuCcTKacbs9GGScFTU1Hc8BsyARTPqe"));
   * ```
   */
  constructor(contractId: Uint8Array) {
    this._contractId = contractId;
  }

  /**
   * Set owner
   * @external
   * @event set_owner ownable.owner
   */
  set_owner(args: ownable.owner): common.boole {
    const argsBuffer = Protobuf.encode(args, ownable.owner.encode);
    const callRes = System.call(this._contractId, 0x0e3c7f5b, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Ownable.set_owner': ${
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
   * Get owner
   * @external
   * @readonly
   */
  get_owner(): ownable.owner {
    const argsBuffer = new Uint8Array(0);
    const callRes = System.call(this._contractId, 0xecabdcbb, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Ownable.get_owner': ${
        callRes.res.error && callRes.res.error!.message
          ? callRes.res.error!.message!
          : ""
      }`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    if (!callRes.res.object) return new ownable.owner();
    return Protobuf.decode<ownable.owner>(
      callRes.res.object!,
      ownable.owner.decode
    );
  }
}
