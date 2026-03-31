export function scoreColorHex(score: number): string {
  if (score >= 8) return "#10B981";
  if (score <= 3) return "#EF4444";
  return "#2563EB";
}

export function ogScoreColorHex(score: number): string {
  if (score >= 8) return "#34D399";
  if (score <= 3) return "#F87171";
  return "#60A5FA";
}
