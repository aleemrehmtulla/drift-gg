import { useCallback } from "react";
import { useHaptics } from "./useHaptics";
import { playTone } from "@/lib/audio";

function tone(freq: number, durationS: number, gain: number) {
  playTone({
    freq,
    durationS,
    gain,
  });
}

export function useUISound() {
  const { hapticClick, hapticToggle, hapticKeystroke, hapticDelete } = useHaptics();

  const playClick = useCallback(() => {
    tone(880, 0.028, 0.12);
    hapticClick();
  }, [hapticClick]);

  const playHover = useCallback(() => tone(660, 0.015, 0.05), []);

  const playToggle = useCallback((on: boolean) => {
    tone(on ? 520 : 440, 0.03, 0.1);
    hapticToggle();
  }, [hapticToggle]);

  const playKeystroke = useCallback(() => {
    const freq = 600 + Math.random() * 200;
    tone(freq, 0.012, 0.05);
    hapticKeystroke();
  }, [hapticKeystroke]);

  const playDelete = useCallback(() => {
    tone(350, 0.03, 0.08);
    hapticDelete();
  }, [hapticDelete]);

  return { playClick, playHover, playToggle, playKeystroke, playDelete };
}
