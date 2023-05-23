import { System, Storage, Arrays } from "@koinos/sdk-as";
import { KoinReservable } from "./KoinReservable";
import { fogata } from "./proto/fogata";
import { common } from "./proto/common";

export const ONE_HUNDRED_PERCENT: u64 = 100000;
export const ONE_MONTH: u64 = 2592000000;

export class ConfigurablePool extends KoinReservable {
  callArgs: System.getArgumentsReturn | null;

  poolParams: Storage.Obj<fogata.pool_params>;

  constructor() {
    super();

    this.poolParams = new Storage.Obj(
      this.contractId,
      0,
      fogata.pool_params.decode,
      fogata.pool_params.encode,
      () => new fogata.pool_params()
    );
  }

  /**
   * Set mining pool parameters
   * @external
   * @event fogata.set_pool_params fogata.pool_params
   */
  set_pool_params(args: fogata.pool_params): common.boole {
    System.require(
      this.only_owner(),
      "owner has not authorized to update params"
    );
    System.require(
      args.payment_period <= ONE_MONTH, "the payment period cannot be greater than 1 month"
    );
    let totalPercentage: u32 = 0;
    for (let i = 0; i < args.beneficiaries.length; i += 1) {
      totalPercentage += args.beneficiaries[i].percentage;
      System.require(
        args.beneficiaries[i].percentage <= ONE_HUNDRED_PERCENT &&
          totalPercentage <= ONE_HUNDRED_PERCENT,
        "the percentages for beneficiaries exceeded 100%"
      );
      System.require(
        !Arrays.equal(
          args.beneficiaries[i].address,
          System.getContractAddress("koin")
        ),
        "the beneficiary cannot be the koin contract"
      );
      System.require(
        !Arrays.equal(
          args.beneficiaries[i].address,
          System.getContractAddress("vhp")
        ),
        "the beneficiary cannot be the vhp contract"
      );
    }
    this.poolParams.put(args);
    System.event("fogata.set_pool_params", this.callArgs!.args, []);
    return new common.boole(true);
  }

  /**
   * Get mining pool parameters
   * @external
   * @readonly
   */
  get_pool_params(): fogata.pool_params {
    return this.poolParams.get()!;
  }
}
