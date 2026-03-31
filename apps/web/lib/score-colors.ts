export { scoreColorHex } from "@repo/shared/score-colors";

export function scoreColorClass(score: number): string {
  if (score >= 8) return "text-[var(--success)]";
  if (score <= 3) return "text-[var(--error)]";
  return "text-[var(--accent)]";
}

export function scoreColorRaw(score: number): string {
  if (score >= 8) return "var(--success)";
  if (score <= 3) return "var(--error)";
  return "var(--accent)";
}
