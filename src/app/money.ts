/**
 * Money projection. The canonical column is `cargo_entries.shipment_value_cents`
 * (integer cents); the API field is `shipment_value_usd`, a decimal STRING such
 * as "85000.00". Convert with integer maths — never `(cents/100).toFixed(2)` on a
 * float, and never emit a JS number for money.
 */

export function centsToUsdString(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.trunc(cents));
  const dollars = Math.trunc(abs / 100);
  const remainder = String(abs % 100).padStart(2, '0');
  return `${negative ? '-' : ''}${dollars}.${remainder}`;
}
