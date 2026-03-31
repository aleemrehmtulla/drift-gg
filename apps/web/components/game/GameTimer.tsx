interface GameTimerProps {
  timeRemaining: number;
}

export function GameTimer({ timeRemaining }: GameTimerProps) {
  const clamped = Math.max(0, timeRemaining);
  const seconds = Math.floor(clamped / 1000);
  const centiseconds = Math.floor((clamped % 1000) / 10);

  return (
    <div className="flex items-baseline justify-center select-none">
      <span className="text-[56px] sm:text-[72px] font-bold tabular-nums leading-none tracking-tight">
        {seconds}
      </span>
      <span className="text-[56px] sm:text-[72px] font-bold tabular-nums leading-none tracking-tight text-[var(--text-muted)]">
        .{String(centiseconds).padStart(2, "0")}
      </span>
    </div>
  );
}
