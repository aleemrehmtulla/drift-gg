import { useEffect, useRef, useState, useCallback } from "react";
import { TapFeedback } from "./TapFeedback";

interface TapAreaProps {
  onTap: (playSound?: boolean) => boolean;
  active: boolean;
  showFeedback?: boolean;
}

export function TapArea({ onTap, active, showFeedback = true }: TapAreaProps) {
  const [tapIds, setTapIds] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(true);
  const idCounterRef = useRef(0);
  const lastTouchRef = useRef(0);

  const handleTap = useCallback(() => {
    if (!active) return;
    const recorded = onTap(showFeedback);
    if (!recorded) return;

    setShowHint(false);
    if (showFeedback) {
      const id = idCounterRef.current++;
      setTapIds((prev) => [...prev, id]);
      setTimeout(() => {
        setTapIds((prev) => prev.filter((t) => t !== id));
      }, 400);
    }
  }, [active, onTap, showFeedback]);

  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      handleTap();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active, handleTap]);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center cursor-pointer select-none touch-none overflow-hidden"
      onMouseDown={(e) => {
        if (Date.now() - lastTouchRef.current < 500) return;
        e.preventDefault();
        handleTap();
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        lastTouchRef.current = Date.now();
        handleTap();
      }}
      role="button"
      tabIndex={0}
    >
      {showHint && active && (
        <p className="absolute bottom-4 left-0 right-0 text-center text-xs text-[var(--text-muted)] animate-pulse pointer-events-none">
          tap anywhere or press any key
        </p>
      )}
      <TapFeedback taps={tapIds} />
    </div>
  );
}
