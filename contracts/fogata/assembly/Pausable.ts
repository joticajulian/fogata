import { System, Storage } from "@koinos/sdk-as";
import { Ownable } from "./Ownable";
import { common } from "./proto/common";

export class Pausable extends Ownable {
  callArgs: System.getArgumentsReturn | null;

  paused: Storage.Obj<common.boole>;

  constructor() {
    super();
    this.paused = new Storage.Obj(
      this.contractId,
      300,
      common.boole.decode,
      common.boole.encode,
      () => new common.boole(false)
    );
  }

  /**
   * Get if the contract is paused
   * @external
   * @readonly
   */
  get_paused(): common.boole {
    return this.paused.get()!;
  }

  /**
   * Function to be called by the functions
   * that need to be protected
   */
  require_unpaused(): void {
    const paused = this.paused.get()!;
    System.require(!paused.value, "the contract is currently paused");
  }

  /**
   * Pause contract
   * @external
   * @event pause
   */
  pause(): common.boole {
    System.require(
      this.only_owner(),
      "owner has not authorized to pause the contract"
    );
    this.paused.put(new common.boole(true));
    System.event("pause", new Uint8Array(0), []);
    return new common.boole(true);
  }

  /**
   * Unpause contract
   * @external
   * @event unpause
   */
  unpause(): common.boole {
    System.require(
      this.only_owner(),
      "owner has not authorized to unpause the contract"
    );
    this.paused.put(new common.boole(false));
    System.event("unpause", new Uint8Array(0), []);
    return new common.boole(true);
  }
}
