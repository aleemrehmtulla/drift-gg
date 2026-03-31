import { useRef, useCallback } from "react";
import { motion } from "framer-motion";
import type { PlayerResult } from "@repo/shared";
import { VsShareCard } from "./VsShareCard";
import { CopyShareButtons } from "@/components/ui/CopyShareButtons";
import { captureElement, downloadImage } from "@/lib/screenshot";
import { useUISound } from "@/hooks/useUISound";
import { cn } from "@/lib/cn";
import { scoreColorClass, scoreColorRaw } from "@/lib/score-colors";
import { SITE_URL } from "@/lib/env";

interface VsResultsProps {
  players: PlayerResult[];
  targetBpm: number;
  shareCode: string;
  onPlayAgain: () => void;
}

function getRankLabel(index: number): string {
  const labels = ["1st", "2nd", "3rd", "4th"];
  return labels[index] ?? `${index + 1}th`;
}

export function VsResults({
  players,
  targetBpm,
  shareCode,
  onPlayAgain,
}: VsResultsProps) {
  const sorted = [...players].sort(
    (a, b) => b.score - a.score || a.driftMs - b.driftMs,
  );
  const hiddenCardRef = useRef<HTMLDivElement>(null);
  const { playClick } = useUISound();

  const hasShareCode = shareCode.length > 0;
  const shareUrl = hasShareCode ? `${SITE_URL}/g/${shareCode}` : "";

  const handleDownload = useCallback(async () => {
    playClick();
    if (!hiddenCardRef.current) return;
    try {
      const dataUrl = await captureElement(hiddenCardRef.current);
      const names = players
        .map((p) =>
          p.name
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, ""),
        )
        .join("-vs-");
      downloadImage(dataUrl, `drift-${names}-${targetBpm}bpm.png`);
    } catch {}
  }, [players, targetBpm, playClick]);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      <div className="fixed -left-[9999px] -top-[9999px]">
        <VsShareCard
          ref={hiddenCardRef}
          players={players}
          targetBpm={targetBpm}
          shareCode={shareCode}
        />
      </div>

      <motion.div
        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5 sm:p-7"
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-sm text-[var(--text-muted)] text-center mb-4">
          {targetBpm} BPM
        </p>

        <div
          className={cn(
            "grid gap-3",
            players.length <= 2
              ? "grid-cols-1 sm:grid-cols-2"
              : "grid-cols-2",
          )}
        >
          {sorted.map((player, index) => {
            const isWinner = index === 0 && players.length > 1;

            return (
              <motion.div
                key={player.name}
                className={cn(
                  "rounded-xl border p-4 text-center",
                  isWinner
                    ? "border-[var(--accent)] bg-[var(--accent-light)]"
                    : "border-[var(--border)]",
                )}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                {players.length > 1 && (
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    {getRankLabel(index)}
                  </p>
                )}
                <p className="text-sm font-medium text-[var(--text-muted)] mb-1">
                  {player.name}
                  {isWinner && " \u{1F451}"}
                </p>
                <p
                  className={cn("text-4xl sm:text-5xl font-bold tabular-nums leading-none mb-2", scoreColorClass(player.score))}
                >
                  {player.score}
                  <span className="text-xl sm:text-2xl font-semibold text-[var(--text-muted)]">
                    /10
                  </span>
                </p>
                <p
                  className="text-sm sm:text-base font-medium tabular-nums font-mono mb-1"
                  style={{ color: scoreColorRaw(player.score) }}
                >
                  drift: {player.driftMs}ms
                </p>
                <p className="text-[11px] text-[var(--text-muted)] italic mt-1 leading-relaxed">
                  &ldquo;{player.message}&rdquo;
                </p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="flex items-center justify-between mt-5 pt-4 border-t border-[var(--border)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <span className="text-xs text-[var(--text-muted)] select-none">
            drift.gg
          </span>

          <button
            onClick={handleDownload}
            className="p-2 -m-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-subtle)] transition-colors"
            aria-label="Download image"
            title="Download image"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </motion.div>
      </motion.div>

      <motion.div
        className="flex flex-col items-center gap-4 w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        <button
          onClick={() => { playClick(); onPlayAgain(); }}
          className="rounded-xl bg-[var(--accent)] px-8 py-3 text-base font-medium text-white hover:opacity-90 transition-opacity"
        >
          New Game
        </button>

        {hasShareCode && (
          <div className="w-full max-w-sm">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)] p-5">
              <p className="text-base font-semibold text-center mb-1">
                Share this battle
              </p>
              <p className="text-sm text-[var(--text-muted)] text-center mb-4">
                Challenge your friends to beat both of you
              </p>
              <CopyShareButtons url={shareUrl} />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
