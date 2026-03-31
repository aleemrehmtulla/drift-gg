import type { PlayerInfo } from "@repo/shared";
import { cn } from "@/lib/cn";

interface PlayerChipsProps {
  players: PlayerInfo[];
  currentName: string;
  className?: string;
}

export function PlayerChips({ players, currentName, className }: PlayerChipsProps) {
  return (
    <div className={cn("flex items-center gap-2 flex-wrap justify-center", className)}>
      {players.map((p) => (
        <span
          key={p.id}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium transition-all",
            p.name === currentName
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-muted)]",
          )}
        >
          {p.name}
        </span>
      ))}
    </div>
  );
}
