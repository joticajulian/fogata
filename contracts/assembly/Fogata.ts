import { Arrays, System, authority, Storage } from "@koinos/sdk-as";
import { fogata } from "./proto/fogata";

export class Fogata {
  callArgs: System.getArgumentsReturn | null;

  contractId: Uint8Array;

  constructor() {
    this.contractId = System.getContractId();
  }
}
