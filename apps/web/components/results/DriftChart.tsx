import { motion } from "framer-motion";

interface DriftChartProps {
  offsets: number[];
}

function getOffsetColor(offsetMs: number): string {
  const t = Math.min(1, Math.abs(offsetMs) / 80);
  const eased = Math.pow(t, 0.6);
  const hue = Math.round(130 * (1 - eased));
  return `hsl(${hue}, 65%, 50%)`;
}

export function DriftChart({ offsets }: DriftChartProps) {
  if (!offsets.length) return null;

  const maxAbs = Math.max(50, ...offsets.map((o) => Math.abs(o)));
  const range = Math.ceil(maxAbs / 25) * 25;

  return (
    <div>
      <div className="flex justify-between items-end text-xs text-[var(--text-muted)] mb-4 select-none">
        <span>Too early</span>
        <span className="text-sm font-medium text-[var(--text)]">Perfect</span>
        <span>Too late</span>
      </div>

      <div className="relative py-1">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[var(--border)] opacity-60" />

        {offsets.map((offset, i) => {
          const pct = (offset / range) * 45;
          const clamped = Math.max(-45, Math.min(45, pct));
          const nearCenter = Math.abs(clamped) < 1.5;
          const color = getOffsetColor(offset);

          return (
            <motion.div
              key={i}
              className="relative h-7 flex items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 + i * 0.04, duration: 0.25 }}
            >
              {nearCenter ? (
                <div
                  className="absolute rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    backgroundColor: color,
                    left: "50%",
                    transform: "translateX(-50%)",
                  }}
                />
              ) : (
                <>
                  <div
                    className="absolute h-[2px]"
                    style={{
                      backgroundColor: color,
                      left: `${Math.min(50, 50 + clamped)}%`,
                      width: `${Math.abs(clamped)}%`,
                    }}
                  />
                  <div
                    className="absolute rounded-full"
                    style={{
                      width: 8,
                      height: 8,
                      backgroundColor: color,
                      left: `${50 + clamped}%`,
                      transform: "translateX(-50%)",
                    }}
                  />
                </>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-3 tabular-nums select-none">
        <span>{range}ms</span>
        <span>0ms</span>
        <span>{range}ms</span>
      </div>
    </div>
  );
}
