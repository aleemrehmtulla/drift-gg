import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameResult } from "@repo/shared";
import { ShareCard } from "./ShareCard";
import { DriftChart } from "./DriftChart";
import { CopyShareButtons } from "@/components/ui/CopyShareButtons";
import { captureElement, downloadImage } from "@/lib/screenshot";
import { useUISound } from "@/hooks/useUISound";
import { cn } from "@/lib/cn";
import { scoreColorClass, scoreColorRaw } from "@/lib/score-colors";
import { SITE_URL } from "@/lib/env";

interface SecondaryAction {
  label: string;
  onClick: () => void;
}

interface ScoreRevealProps {
  results: GameResult;
  onPlayAgain: () => void;
  playScoreTick: (current: number, target: number) => void;
  playScoreReveal: (score: number) => void;
  secondaryAction?: SecondaryAction;
}

export function ScoreReveal({
  results,
  onPlayAgain,
  playScoreTick,
  playScoreReveal,
  secondaryAction,
}: ScoreRevealProps) {
  const player = results.players[0];
  const { playClick, playHover } = useUISound();
  const [displayScore, setDisplayScore] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const lastTickRef = useRef(-1);
  const hiddenCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!player) return;

    setDisplayScore(0);
    setShowDetails(false);
    setShowChart(false);
    lastTickRef.current = -1;

    const target = player.score;
    const duration = 1500;
    let rafId: number;

    const timer = setTimeout(() => {
      const start = performance.now();

      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(1, elapsed / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(eased * target);

        if (current !== lastTickRef.current && current > 0) {
          lastTickRef.current = current;
          playScoreTick(current, target);
        }

        setDisplayScore(current);

        if (progress < 1) {
          rafId = requestAnimationFrame(animate);
        } else {
          setDisplayScore(target);
          setShowDetails(true);
          playScoreReveal(target);
        }
      };

      rafId = requestAnimationFrame(animate);
    }, 500);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafId);
    };
  }, [player, playScoreTick, playScoreReveal]);

  const handleDownload = useCallback(async () => {
    if (!hiddenCardRef.current || !player) return;
    try {
      const dataUrl = await captureElement(hiddenCardRef.current);
      const slug = player.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      downloadImage(dataUrl, `drift-${slug}-${results.targetBpm}bpm.png`);
    } catch {}
  }, [results.targetBpm, player]);

  const challengeUrl = results.shareCode ? `${SITE_URL}/c/${results.shareCode}` : "";

  useEffect(() => {
    if (!showChart) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowChart(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [showChart]);

  if (!player) return null;

  const scoreColor = scoreColorClass(player.score);

  return (
    <div className="flex select-none flex-col items-center gap-4 sm:gap-6 w-full max-w-md mx-auto">
      <div className="fixed -left-[9999px] -top-[9999px]">
        <ShareCard
          ref={hiddenCardRef}
          playerName={player.name}
          result={player}
          targetBpm={results.targetBpm}
          difficulty={results.difficulty}
        />
      </div>

      <motion.div
        className="w-full rounded-xl sm:rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 sm:p-8"
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex flex-col items-center text-center gap-2 sm:gap-3">
          <motion.div
            className={cn(
              "text-[56px] sm:text-[80px] font-bold tabular-nums leading-none",
              scoreColor,
            )}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            {displayScore}
            <span className="text-[22px] sm:text-[48px] font-semibold text-[var(--text-muted)]">
              /10
            </span>
          </motion.div>

          {showDetails && (
            <>
              <motion.p
                className="text-base sm:text-2xl font-medium tabular-nums font-mono"
                style={{ color: scoreColorRaw(player.score) }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                drift: {player.driftMs}ms
              </motion.p>

              <motion.p
                className="text-xs sm:text-sm text-[var(--text-muted)] tabular-nums"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                Target: {results.targetBpm} BPM → You: {player.achievedBpm} BPM
              </motion.p>

              <motion.p
                className="text-sm sm:text-base italic text-[var(--text-muted)] mt-2 max-w-xs leading-relaxed"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.4 }}
              >
                &ldquo;{player.message}&rdquo;
              </motion.p>
            </>
          )}
        </div>

        {showDetails && (
          <motion.div
            className="flex items-center justify-between mt-5 sm:mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.4 }}
          >
            <span className="text-xs text-[var(--text-muted)] select-none">drift.gg</span>

            <span
              className={cn(
                "text-[11px] font-semibold uppercase tracking-wide",
                results.difficulty === "hard" ? "text-red-500" : "text-[var(--text-muted)]"
              )}
            >
              {results.difficulty} mode
            </span>

            <button
              onClick={() => {
                playClick();
                handleDownload();
              }}
              onMouseEnter={playHover}
              className="p-1.5 sm:p-2 -m-1.5 sm:-m-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-subtle)] transition-colors"
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
        )}
      </motion.div>

      {showDetails && (
        <motion.div
          className="flex flex-col items-center gap-4 w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.4 }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                playClick();
                onPlayAgain();
              }}
              onMouseEnter={playHover}
              className="rounded-xl bg-[var(--accent)] px-6 py-2.5 sm:px-8 sm:py-3 text-base font-medium text-white hover:opacity-90 transition-opacity"
            >
              Play again
            </button>

            {secondaryAction && (
              <button
                onClick={() => {
                  playClick();
                  secondaryAction.onClick();
                }}
                onMouseEnter={playHover}
                className="rounded-xl border border-[var(--border)] px-6 py-2.5 sm:px-8 sm:py-3 text-base font-medium text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
              >
                {secondaryAction.label}
              </button>
            )}
          </div>

          {challengeUrl && (
            <div className="w-full max-w-sm">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)] p-4 sm:p-5">
                <p className="text-base font-semibold text-center mb-1">Challenge a friend</p>
                <p className="text-sm text-[var(--text-muted)] text-center mb-4">
                  Think they can keep the beat better?
                </p>
                <CopyShareButtons url={challengeUrl} copyLabel="Copy Challenge Link" />
              </div>
            </div>
          )}

          {player.tapIntervalOffsets?.length ? (
            <button
              onClick={() => {
                playClick();
                setShowChart(true);
              }}
              onMouseEnter={playHover}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
            >
              Where did I go wrong?
            </button>
          ) : null}
        </motion.div>
      )}

      <AnimatePresence>
        {showChart && player.tapIntervalOffsets?.length ? (
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                playClick();
                setShowChart(false);
              }}
            />

            <div className="relative flex h-full sm:items-center sm:justify-center sm:p-6 pointer-events-none">
              <motion.div
                className="pointer-events-auto flex flex-col w-full h-full bg-[var(--bg)] sm:h-auto sm:max-w-xl sm:rounded-2xl sm:border sm:border-[var(--border)] sm:shadow-2xl"
                initial={{ y: 24 }}
                animate={{ y: 0 }}
                exit={{ y: 24 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex items-center justify-between p-5 sm:p-6 pb-0 shrink-0">
                  <h3 className="text-base font-semibold text-[var(--text)]">
                    Where did I go wrong?
                  </h3>
                  <button
                    onClick={() => {
                      playClick();
                      setShowChart(false);
                    }}
                    onMouseEnter={playHover}
                    className="p-2 -m-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-subtle)] transition-colors"
                    aria-label="Close"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 sm:p-6 pt-5">
                  <DriftChart offsets={player.tapIntervalOffsets} />
                </div>
              </motion.div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
