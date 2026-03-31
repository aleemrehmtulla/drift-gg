import { forwardRef } from "react";
import type { PlayerResult } from "@repo/shared";
import { scoreColorHex } from "@/lib/score-colors";

interface VsShareCardProps {
  players: PlayerResult[];
  targetBpm: number;
  shareCode: string;
}

export const VsShareCard = forwardRef<HTMLDivElement, VsShareCardProps>(
  function VsShareCard({ players, targetBpm, shareCode }, ref) {
    const sorted = [...players].sort(
      (a, b) => b.score - a.score || a.driftMs - b.driftMs,
    );
    const useGrid = players.length > 2;

    return (
      <div
        ref={ref}
        style={{
          width: useGrid ? 520 : 480,
          padding: "32px 28px 24px",
          borderRadius: 20,
          border: "1px solid #E5E7EB",
          backgroundColor: "#FFFFFF",
          fontFamily: "Inter, system-ui, sans-serif",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <p
          style={{
            fontSize: 13,
            color: "#6B7280",
            textAlign: "center",
            margin: 0,
          }}
        >
          {targetBpm} BPM
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: useGrid ? "1fr 1fr" : `repeat(${players.length}, 1fr)`,
            gap: 12,
          }}
        >
          {sorted.map((player, index) => {
            const isWinner = index === 0 && players.length > 1;
            const color = scoreColorHex(player.score);

            return (
              <div
                key={player.name}
                style={{
                  borderRadius: 14,
                  border: isWinner
                    ? "2px solid #2563EB"
                    : "1px solid #E5E7EB",
                  backgroundColor: isWinner ? "#EFF6FF" : "#FFFFFF",
                  padding: useGrid ? "16px 10px" : "20px 12px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <p style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>
                  {player.name}
                  {isWinner ? " \u{1F451}" : ""}
                </p>
                <p
                  style={{
                    fontSize: useGrid ? 36 : 48,
                    fontWeight: 700,
                    lineHeight: 1,
                    margin: 0,
                    color,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {player.score}
                  <span
                    style={{
                      fontSize: useGrid ? 20 : 28,
                      fontWeight: 600,
                      color: "#6B7280",
                    }}
                  >
                    /10
                  </span>
                </p>
                <p
                  style={{
                    fontSize: useGrid ? 13 : 16,
                    fontWeight: 500,
                    color,
                    fontFamily: "monospace",
                    fontVariantNumeric: "tabular-nums",
                    margin: 0,
                  }}
                >
                  drift: {player.driftMs}ms
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: "#9CA3AF",
                    fontStyle: "italic",
                    lineHeight: 1.4,
                    margin: "4px 0 0",
                    maxWidth: 180,
                  }}
                >
                  &ldquo;{player.message}&rdquo;
                </p>
              </div>
            );
          })}
        </div>

        <div
          style={{
            borderTop: "1px solid #E5E7EB",
            paddingTop: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>drift.gg</span>
          {shareCode && (
            <span style={{ fontSize: 11, color: "#D1D5DB" }}>
              drift.gg/g/{shareCode}
            </span>
          )}
        </div>
      </div>
    );
  },
);
