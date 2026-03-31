import { motion } from "framer-motion";
import type { GamePhase } from "@repo/shared";

interface BeatVisualizerProps {
  isBeat: boolean;
  phase: GamePhase;
}

export function BeatVisualizer({ isBeat, phase }: BeatVisualizerProps) {
  const isActive = phase === "phase1";
  const isPhase2 = phase === "phase2";

  return (
    <div className="flex items-center justify-center">
      <motion.div
        className="rounded-full border-2 w-[120px] h-[120px] sm:w-[160px] sm:h-[160px] lg:w-[180px] lg:h-[180px]"
        animate={{
          scale: isBeat && isActive ? 1.3 : 1,
          backgroundColor: isBeat && isActive
            ? "var(--accent)"
            : "transparent",
          borderColor: isPhase2
            ? "var(--border)"
            : isBeat && isActive
              ? "var(--accent)"
              : "var(--border)",
          boxShadow: isBeat && isActive
            ? "0 0 40px var(--accent-glow)"
            : "none",
        }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      />
    </div>
  );
}
