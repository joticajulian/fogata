import { System, Protobuf, StringBytes, pob } from "@koinos/sdk-as";

export class PoB {
  _contractId: Uint8Array;

  constructor() {
    this._contractId = System.getContractAddress("pob");
  }

  /**
   * Burn KOIN to receive VHP
   */
  burn(args: pob.burn_arguments): pob.burn_result {
    const argsBuffer = Protobuf.encode(args, pob.burn_arguments.encode);
    const callRes = System.call(this._contractId, 0x859facc5, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'PoB.burn': ${
        callRes.res.error && callRes.res.error!.message
          ? callRes.res.error!.message!
          : ""
      }`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    return Protobuf.decode<pob.burn_result>(
      callRes.res.object!,
      pob.burn_result.decode
    );
  }
}
