import { System, Storage, Arrays, authority, Base58 } from "@koinos/sdk-as";
import { Ownable } from "./Ownable";
import { Ownable as IOwnable } from "./IOwnable";
import { common } from "./proto/common";
import { pools } from "./proto/pools";

const BOOLE_TRUE = new common.boole(true);
const BOOLE_FALSE = new common.boole(false);

export class Pools extends Ownable {
  callArgs: System.getArgumentsReturn | null;

  submittedPools: Storage.Map<Uint8Array, pools.pool>;

  approvedPools: Storage.Map<Uint8Array, pools.pool>;

  constructor() {
    super();

    this.submittedPools = new Storage.Map(
      this.contractId,
      1,
      pools.pool.decode,
      pools.pool.encode,
      null
    );

    this.approvedPools = new Storage.Map(
      this.contractId,
      2,
      pools.pool.decode,
      pools.pool.encode,
      null
    );
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
   * Submit a new pool to revision
   * @external
   * @event pools.submit_pool pools.pool
   */
  submit_pool(args: common.address): common.boole {
    //const poolOwner = new IOwnable(args.account!).get_owner().account!;
    //this.validateAuthority(poolOwner);

    const submittedPool = this.submittedPools.get(args.account!);
    System.require(
      !submittedPool,
      `the pool ${Base58.encode(args.account!)} is already submitted`
    );
    const approvedPool = this.approvedPools.get(args.account!);
    System.require(
      !approvedPool,
      `the pool ${Base58.encode(args.account!)} is already approved`
    );

    const now = System.getBlockField("header.timestamp")!.uint64_value;
    this.submittedPools.put(
      args.account!,
      new pools.pool(args.account!, now, 0)
    );
    System.event("pools.submit_pool", this.callArgs!.args, [args.account!]);
    return BOOLE_TRUE;
  }

  /**
   * Approve a pool
   * @external
   * @event pools.approve_pool common.address
   */
  approve_pool(args: common.address): common.boole {
    System.require(this.only_owner(), "operation not authorized by the owner");
    const submittedPool = this.submittedPools.get(args.account!);
    System.require(
      submittedPool,
      `the pool ${Base58.encode(args.account!)} is not submitted`
    );
    const now = System.getBlockField("header.timestamp")!.uint64_value;
    submittedPool!.approval_time = now;
    this.approvedPools.put(args.account!, submittedPool!);
    this.submittedPools.remove(args.account!);
    System.event("pools.approved_pool", this.callArgs!.args, [args.account!]);
    return BOOLE_TRUE;
  }

  /**
   * Remove an approved pool
   * @external
   * @event pools.revoke_pool common.address
   */
  remove_pool(args: common.address): common.boole {
    System.require(this.only_owner(), "operation not authorized by the owner");
    const submittedPool = this.submittedPools.get(args.account!);
    const approvedPool = this.approvedPools.get(args.account!);
    System.require(
      submittedPool || approvedPool,
      `pool ${Base58.encode(args.account!)} not found`
    );
    if (submittedPool) this.submittedPools.remove(args.account!);
    if (approvedPool) this.approvedPools.remove(args.account!);
    return BOOLE_TRUE;
  }

  /**
   * Get submitted pools
   * @external
   * @readonly
   */
  get_submitted_pools(args: pools.list_args): pools.pools {
    const direction =
      args.direction == pools.direction.ascending
        ? Storage.Direction.Ascending
        : Storage.Direction.Descending;
    const submittedPools = this.submittedPools.getManyValues(
      args.start ? args.start! : new Uint8Array(0),
      args.limit,
      direction
    );
    return new pools.pools(submittedPools);
  }

  /**
   * Get submitted pools
   * @external
   * @readonly
   */
  get_approved_pools(args: pools.list_args): pools.pools {
    const direction =
      args.direction == pools.direction.ascending
        ? Storage.Direction.Ascending
        : Storage.Direction.Descending;
    const approvedPools = this.approvedPools.getManyValues(
      args.start ? args.start! : new Uint8Array(0),
      args.limit,
      direction
    );
    return new pools.pools(approvedPools);
  }
}
