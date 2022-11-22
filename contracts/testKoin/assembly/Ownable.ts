import {
  System,
  Storage,
  authority,
  Arrays,
  Protobuf,
  value,
  Crypto,
} from "@koinos/sdk-as";
import { ownable } from "./proto/ownable";
import { common } from "./proto/common";

// make sure to not use this id in the contract childs
const OWNER_SPACE_ID = 100;

export class Ownable {
  callArgs: System.getArgumentsReturn | null;

  contractId: Uint8Array;
  owner: Storage.Obj<ownable.owner>;

  constructor() {
    this.contractId = System.getContractId();
    this.owner = new Storage.Obj(
      this.contractId,
      OWNER_SPACE_ID,
      ownable.owner.decode,
      ownable.owner.encode,
      null
    );
  }

  only_owner(): boolean {
    const owner = this.owner.get();
    if (!owner) {
      // any account can take the ownership at the beginning.
      // This means that the ownership must be set just
      // after the contract is uploaded
      return true;
    }

    /**
     * if the owner is the contract itself then check the
     * signatures (do not call System.checkAuthority to
     * avoid an infitine loop in case the contract has overriden
     * the authorize function)
     */
    if (Arrays.equal(owner.account, this.contractId)) {
      const sigBytes =
        System.getTransactionField("signatures")!.message_value!.value!;
      const signatures = Protobuf.decode<value.list_type>(
        sigBytes,
        value.list_type.decode
      );
      const txId = System.getTransactionField("id")!.bytes_value!;

      for (let i = 0; i < signatures.values.length; i++) {
        const publicKey = System.recoverPublicKey(
          signatures.values[i].bytes_value!,
          txId
        );
        const address = Crypto.addressFromPublicKey(publicKey!);
        if (Arrays.equal(address, this.contractId)) {
          return true;
        }
      }
      return false;
    }

    // call the authority of the owner
    return System.checkAuthority(
      authority.authorization_type.contract_call,
      owner.account!,
      this.callArgs!.args
    );
  }

  /**
   * Set owner
   * @external
   */
  set_owner(newOwner: ownable.owner): common.boole {
    System.require(
      this.only_owner(),
      "owner has not authorized to change the owner"
    );
    this.owner.put(newOwner);
    System.event("set_owner", this.callArgs!.args, [newOwner.account!]);
    return new common.boole(true);
  }

  /**
   * Get owner
   * @external
   * @readonly
   */
  get_owner(): ownable.owner {
    const owner = this.owner.get();
    if (!owner) return new ownable.owner();
    return owner;
  }
}
