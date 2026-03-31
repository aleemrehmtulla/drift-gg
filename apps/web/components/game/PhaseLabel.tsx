import type { GamePhase } from "@repo/shared";

interface PhaseLabelProps {
  phase: GamePhase;
}

const LABELS: Partial<Record<GamePhase, string>> = {
  phase1: "TAP ALONG",
  transition: "YOU'RE ON YOUR OWN",
  phase2: "YOU'RE ON YOUR OWN",
};

export function PhaseLabel({ phase }: PhaseLabelProps) {
  const label = LABELS[phase];
  if (!label) return null;

  return (
    <p className="text-sm select-none font-medium uppercase tracking-widest text-[var(--text-muted)]">
      {label}
    </p>
  );
}
