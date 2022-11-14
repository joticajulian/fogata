import { u128 } from "as-bignum";

export function multiplyAndDivide(
  multiplier1: u64,
  multiplier2: u64,
  divider1: u64
): u64 {
  return (
    // @ts-ignore
    (
      (u128.fromU64(multiplier1) * u128.fromU64(multiplier2)) /
      u128.fromU64(divider1)
    ).toU64()
  );
}
