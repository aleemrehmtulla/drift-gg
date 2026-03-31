import { useRef, useCallback } from "react";
import { TAP_DEBOUNCE_MS } from "@repo/shared";

export function useTapRecorder() {
  const phase2TapsRef = useRef<number[]>([]);
  const isPhase2Ref = useRef(false);
  const lastTapRef = useRef(0);

  const recordTap = useCallback((): boolean => {
    const now = performance.now();
    if (now - lastTapRef.current < TAP_DEBOUNCE_MS) return false;
    lastTapRef.current = now;

    if (isPhase2Ref.current) {
      phase2TapsRef.current.push(now);
    }
    return true;
  }, []);

  const startPhase2 = useCallback(() => {
    isPhase2Ref.current = true;
    phase2TapsRef.current = [];
  }, []);

  const getPhase2Timestamps = useCallback((): number[] => {
    return [...phase2TapsRef.current];
  }, []);

  const reset = useCallback(() => {
    phase2TapsRef.current = [];
    isPhase2Ref.current = false;
    lastTapRef.current = 0;
  }, []);

  return {
    recordTap,
    startPhase2,
    getPhase2Timestamps,
    reset,
  };
}
