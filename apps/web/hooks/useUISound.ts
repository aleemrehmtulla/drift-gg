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
    tone(880, 0.012, 0.08);
    hapticClick();
  }, [hapticClick]);

  const playHover = useCallback(() => tone(660, 0.008, 0.04), []);

  const playToggle = useCallback((on: boolean) => {
    tone(on ? 520 : 440, 0.015, 0.06);
    hapticToggle();
  }, [hapticToggle]);

  const playKeystroke = useCallback(() => {
    const freq = 600 + Math.random() * 200;
    tone(freq, 0.008, 0.04);
    hapticKeystroke();
  }, [hapticKeystroke]);

  const playDelete = useCallback(() => {
    tone(350, 0.015, 0.05);
    hapticDelete();
  }, [hapticDelete]);

  return { playClick, playHover, playToggle, playKeystroke, playDelete };
}
