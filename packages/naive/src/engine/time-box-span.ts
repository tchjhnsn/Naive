/** Why a start and an end cannot be a time box, or null when the end is after the start. */
export function timeBoxSpan(starts: unknown, ends: unknown): string | null {
  const a = typeof starts === "string" ? Date.parse(starts) : Number.NaN;
  const b = typeof ends === "string" ? Date.parse(ends) : Number.NaN;
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return `a time box must end after it starts: ${String(ends)} is not after ${String(starts)}`;
  return null;
}
