import { forwardRef } from "react";
import type { PlayerResult, Difficulty } from "@repo/shared";
import { scoreColorHex } from "@/lib/score-colors";

interface ShareCardProps {
  playerName: string;
  result: PlayerResult;
  targetBpm: number;
  difficulty: Difficulty;
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  function ShareCard({ playerName, result, targetBpm, difficulty }, ref) {
    const scoreColor = scoreColorHex(result.score);

    return (
      <div
        ref={ref}
        style={{
          width: 440,
          padding: "40px 36px 32px",
          backgroundColor: "#FFFFFF",
          fontFamily: "Inter, system-ui, sans-serif",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>
          {playerName}
        </p>
        <p
          style={{
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1,
            margin: 0,
            color: scoreColor,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {result.score}
          <span style={{ fontSize: 40, fontWeight: 600, color: "#6B7280" }}>
            /10
          </span>
        </p>
        <p
          style={{
            fontSize: 22,
            fontWeight: 500,
            color: scoreColor,
            fontFamily: "monospace",
            fontVariantNumeric: "tabular-nums",
            margin: 0,
          }}
        >
          drift: {result.driftMs}ms
        </p>
        <p
          style={{
            fontSize: 14,
            color: "#6B7280",
            fontVariantNumeric: "tabular-nums",
            margin: "4px 0 0",
          }}
        >
          Target: {targetBpm} BPM → You: {result.achievedBpm} BPM
        </p>
        <p
          style={{
            fontSize: 15,
            color: "#9CA3AF",
            fontStyle: "italic",
            maxWidth: 300,
            lineHeight: 1.5,
            margin: "8px 0 0",
          }}
        >
          &ldquo;{result.message}&rdquo;
        </p>
        <div
          style={{
            width: "100%",
            marginTop: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>drift.gg</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: difficulty === "hard" ? "#DC2626" : "#9CA3AF",
            }}
          >
            {difficulty} mode
          </span>
        </div>
      </div>
    );
  }
);
