import { useEffect, useRef, useState } from "react";

interface TimerBarProps {
  totalDuration: number;
  phase: string;
}

export function TimerBar({ totalDuration, phase }: TimerBarProps) {
  const [started, setStarted] = useState(false);
  const rafRef = useRef(0);

  useEffect(() => {
    setStarted(false);
    cancelAnimationFrame(rafRef.current);

    if (phase === "transition") return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => setStarted(true));
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, [totalDuration, phase]);

  return (
    <div
      className="h-full bg-[var(--accent)]"
      style={{
        width: started ? "0%" : "100%",
        transition: started ? `width ${totalDuration}ms linear` : "none",
      }}
    />
  );
}
