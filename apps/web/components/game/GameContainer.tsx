import { Component, type ReactNode, useCallback } from "react";
import { motion } from "framer-motion";
import type { Difficulty, GamePhase, GameResult } from "@repo/shared";
import { Countdown } from "./Countdown";
import { BeatVisualizer } from "./BeatVisualizer";
import { TapArea } from "./TapArea";
import { PhaseLabel } from "./PhaseLabel";
import { TimerBar } from "./TimerBar";
import { GameTimer } from "./GameTimer";
import { ScoreReveal } from "../results/ScoreReveal";

interface GameContainerProps {
  phase: GamePhase;
  countdownValue: number | null;
  timeRemaining: number;
  totalDuration: number;
  results: GameResult | null;
  isBeat: boolean;
  onTap: (playSound?: boolean) => boolean;
  onPlayAgain: () => void;
  playScoreTick: (current: number, target: number) => void;
  playScoreReveal: (score: number) => void;
  difficulty: Difficulty;
  secondaryAction?: { label: string; onClick: () => void };
}

class ErrorBoundary extends Component<
  { children: ReactNode; onReset: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; onReset: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <p className="text-lg font-medium">Something went wrong</p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onReset();
            }}
            className="rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            Play again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function GameContainer(props: GameContainerProps) {
  const {
    phase,
    countdownValue,
    timeRemaining,
    totalDuration,
    results,
    isBeat,
    onTap,
    onPlayAgain,
    playScoreTick,
    playScoreReveal,
    difficulty,
    secondaryAction,
  } = props;

  const tapActive =
    phase === "phase1" || phase === "phase2" || phase === "transition";

  const suppressFeedback = difficulty === "hard" && phase === "phase2";

  const handleTap = useCallback(
    (playSound?: boolean) => onTap(playSound && phase !== "phase1" && !suppressFeedback),
    [onTap, phase, suppressFeedback],
  );
  const showTimerBar =
    (phase === "phase1" || phase === "phase2" || phase === "transition") &&
    totalDuration > 0;
  const isSubmitting = phase === "phase2" && timeRemaining <= 0;

  return (
    <ErrorBoundary onReset={onPlayAgain}>
      <div className="flex flex-col items-center justify-center flex-1 w-full relative overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-1 bg-[var(--border)] z-10 rounded-full overflow-hidden transition-opacity duration-500"
          style={{ opacity: phase === "results" ? 0 : 1 }}
        >
          {showTimerBar && (
            <TimerBar totalDuration={totalDuration} phase={phase} />
          )}
        </div>

        <p
          className="absolute top-2.5 left-0 right-0 text-center text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] z-10 select-none transition-opacity duration-500"
          style={{ opacity: phase === "results" ? 0 : 1 }}
        >
          {difficulty === "easy" ? "Easy Mode" : "Hard Mode"}
        </p>

        {phase === "countdown" && (
          <div
            className="flex items-center justify-center w-full"
            style={{ height: 320 }}
          >
            <Countdown value={countdownValue} />
          </div>
        )}

        {tapActive && !isSubmitting && (
          <div
            className="flex flex-col items-center w-full"
            style={{ height: 420 }}
          >
            <div className="h-8 flex items-center justify-center shrink-0">
              <PhaseLabel phase={phase} />
            </div>
            <div className="h-[80px] sm:h-[96px] flex items-center justify-center shrink-0">
              <GameTimer timeRemaining={timeRemaining} />
            </div>
            <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden">
              <BeatVisualizer isBeat={isBeat} phase={phase} />
              <TapArea onTap={handleTap} active={tapActive} showFeedback={!suppressFeedback} />
            </div>
          </div>
        )}

        {isSubmitting && (
          <motion.div
            className="flex flex-col items-center justify-center gap-4"
            style={{ height: 420 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-12 h-12 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
            <p className="text-sm select-none font-medium text-[var(--text-muted)]">
              Calculating your drift…
            </p>
          </motion.div>
        )}

        {phase === "results" && results && (
          <ScoreReveal
            results={results}
            onPlayAgain={onPlayAgain}
            playScoreTick={playScoreTick}
            playScoreReveal={playScoreReveal}
            secondaryAction={secondaryAction}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
