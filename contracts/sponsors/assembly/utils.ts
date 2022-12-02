import { u128 } from "as-bignum";
/**
 * result = multiplier1 * multiplier2 / divider1
 *
 * As in the rest of the division is always ignored, we use a
 * computation to round to the closest number. We just need to add
 * 0.5 to the result of the division.
 *
 * r = p/q + 0.5
 * r = (p + q/2) / q
 */
export function multiplyAndDivide(
  multiplier1: u64,
  multiplier2: u64,
  divisor: u64
): u64 {
  const div = u128.fromU64(divisor);
  return (
    // @ts-ignore
    (
      (u128.fromU64(multiplier1) * u128.fromU64(multiplier2) +
        div / u128.from(2)) /
      div
    ).toU64()
  );
}
