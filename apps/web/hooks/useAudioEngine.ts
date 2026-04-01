import { useRef, useCallback, useState } from "react";
import { AUDIO } from "@repo/shared";
import { useHaptics } from "./useHaptics";
import { getAudioTime, playTone, playToneAt, warmUpAudio } from "@/lib/audio";

export function useAudioEngine() {
  const schedulerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextBeatTimeRef = useRef(0);
  const beatIntervalRef = useRef(0);
  const isRunningRef = useRef(false);
  const nextVisualBeatRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const beatOffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isBeat, setIsBeat] = useState(false);
  const { hapticTap, hapticBeat, hapticCountdown, hapticScoreTick, hapticSuccess, hapticError, trigger } = useHaptics();

  const scheduleClick = useCallback((time: number, freq: number, duration: number, gain: number) => {
    playToneAt(time, {
      freq,
      durationS: duration,
      gain,
    });
  }, []);

  const startVisualSync = useCallback(() => {
    const tick = () => {
      if (!isRunningRef.current) return;
      const now = performance.now() / 1000;
      while (nextVisualBeatRef.current > 0 && nextVisualBeatRef.current <= now) {
        setIsBeat(true);
        hapticBeat();
        if (beatOffTimerRef.current) clearTimeout(beatOffTimerRef.current);
        beatOffTimerRef.current = setTimeout(() => setIsBeat(false), 100);
        nextVisualBeatRef.current += beatIntervalRef.current;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [hapticBeat]);

  const start = useCallback((bpm: number) => {
    beatIntervalRef.current = 60 / bpm;
    isRunningRef.current = true;

    nextVisualBeatRef.current = performance.now() / 1000 + 0.05;
    startVisualSync();

    nextBeatTimeRef.current = getAudioTime() + 0.05;
    schedulerRef.current = setInterval(() => {
      if (!isRunningRef.current) return;
      const now = getAudioTime();
      while (nextBeatTimeRef.current < now + AUDIO.SCHEDULE_AHEAD_S) {
        scheduleClick(
          nextBeatTimeRef.current,
          AUDIO.BEAT_FREQ,
          AUDIO.BEAT_DURATION,
          AUDIO.BEAT_GAIN
        );
        nextBeatTimeRef.current += beatIntervalRef.current;
      }
    }, AUDIO.CHECK_INTERVAL_MS);
  }, [scheduleClick, startVisualSync]);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    if (schedulerRef.current) {
      clearInterval(schedulerRef.current);
      schedulerRef.current = null;
    }
    nextVisualBeatRef.current = 0;
    setIsBeat(false);
  }, []);

  const playTapSound = useCallback(() => {
    hapticTap();
    scheduleClick(getAudioTime(), AUDIO.TAP_FREQ, AUDIO.TAP_DURATION, AUDIO.TAP_GAIN);
  }, [scheduleClick, hapticTap]);

  const playCountdownTone = useCallback((index: number) => {
    hapticCountdown();

    const freq = AUDIO.COUNTDOWN_FREQS[index] ?? AUDIO.COUNTDOWN_FREQS[0]!;
    const gain = index === 2 ? 0.25 : 0.2;
    playTone({
      freq,
      durationS: AUDIO.COUNTDOWN_DURATION,
      gain,
      type: "sine",
    });
  }, [hapticCountdown]);

  const playScoreTick = useCallback((current: number, target: number) => {
    hapticScoreTick();
    const progress = target > 0 ? current / target : 0;
    const freq = 300 + progress * 500;
    const gain = 0.06 + progress * 0.04;
    scheduleClick(getAudioTime(), freq, 0.025, gain);
  }, [scheduleClick, hapticScoreTick]);

  const playScoreReveal = useCallback((score: number) => {
    if (score >= 7) hapticSuccess();
    else if (score <= 3) hapticError();
    else trigger("nudge");

    const now = getAudioTime();
    if (score === 10) {
      [262, 330, 392, 523].forEach((freq, i) => {
        scheduleClick(now + i * 0.12, freq, 0.15, 0.2);
      });
    } else if (score <= 3) {
      scheduleClick(now, 300, 0.3, 0.15);
      playToneAt(now, {
        freq: 300,
        endFreq: 100,
        durationS: 0.3,
        gain: 0.15,
      });
    } else {
      [262, 330, 392].forEach((freq, i) => {
        scheduleClick(now + i * 0.1, freq, 0.1, 0.15);
      });
    }
  }, [scheduleClick, hapticSuccess, hapticError, trigger]);

  const cleanup = useCallback(() => {
    stop();
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (beatOffTimerRef.current) {
      clearTimeout(beatOffTimerRef.current);
      beatOffTimerRef.current = null;
    }
  }, [stop]);

  return {
    start,
    stop,
    playTapSound,
    playCountdownTone,
    playScoreTick,
    playScoreReveal,
    isBeat,
    cleanup,
    warmUp: warmUpAudio,
  };
}
