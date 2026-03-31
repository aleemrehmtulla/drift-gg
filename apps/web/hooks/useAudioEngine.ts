import { useRef, useCallback, useState } from "react";
import { AUDIO } from "@repo/shared";
import { useHaptics } from "./useHaptics";
import { getAudioContext, isAudioMuted, resumeAudioContext, withRunningContext } from "@/lib/audio";

export function useAudioEngine() {
  const schedulerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextBeatTimeRef = useRef(0);
  const beatIntervalRef = useRef(0);
  const isRunningRef = useRef(false);
  const beatQueueRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);
  const beatOffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isBeat, setIsBeat] = useState(false);
  const { hapticTap, hapticBeat, hapticCountdown, hapticScoreTick, hapticSuccess, hapticError, trigger } = useHaptics();

  const getContext = useCallback((): AudioContext => getAudioContext(), []);

  const scheduleClick = useCallback((time: number, freq: number, duration: number, gain: number) => {
    if (isAudioMuted()) return;
    const ctx = getContext();

    const play = (t: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.frequency.value = freq;
      gainNode.gain.setValueAtTime(gain, t);
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.start(t);
      osc.stop(t + duration);
    };

    if (ctx.state !== "running") {
      void resumeAudioContext().then(() => {
        if (ctx.state === "running") {
          play(Math.max(time, ctx.currentTime));
        }
      });
    } else {
      play(time);
    }
  }, []);

  const startVisualSync = useCallback(() => {
    const tick = () => {
      if (!isRunningRef.current) return;
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      while (beatQueueRef.current.length > 0 && beatQueueRef.current[0]! < now) {
        beatQueueRef.current.shift();
        setIsBeat(true);
        hapticBeat();
        if (beatOffTimerRef.current) clearTimeout(beatOffTimerRef.current);
        beatOffTimerRef.current = setTimeout(() => setIsBeat(false), 100);
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [hapticBeat]);

  const start = useCallback((bpm: number) => {
    const ctx = getContext();
    beatIntervalRef.current = 60 / bpm;
    nextBeatTimeRef.current = ctx.currentTime + 0.05;
    isRunningRef.current = true;
    beatQueueRef.current = [];

    schedulerRef.current = setInterval(() => {
      if (!isRunningRef.current) return;
      const ctx = getAudioContext();
      while (nextBeatTimeRef.current < ctx.currentTime + AUDIO.SCHEDULE_AHEAD_S) {
        scheduleClick(
          nextBeatTimeRef.current,
          AUDIO.BEAT_FREQ,
          AUDIO.BEAT_DURATION,
          AUDIO.BEAT_GAIN
        );
        beatQueueRef.current.push(nextBeatTimeRef.current);
        nextBeatTimeRef.current += beatIntervalRef.current;
      }
    }, AUDIO.CHECK_INTERVAL_MS);

    startVisualSync();
  }, [getContext, scheduleClick, startVisualSync]);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    if (schedulerRef.current) {
      clearInterval(schedulerRef.current);
      schedulerRef.current = null;
    }
    beatQueueRef.current = [];
    setIsBeat(false);
  }, []);

  const playTapSound = useCallback(() => {
    hapticTap();
    const ctx = getContext();
    scheduleClick(ctx.currentTime, AUDIO.TAP_FREQ, AUDIO.TAP_DURATION, AUDIO.TAP_GAIN);
  }, [getContext, scheduleClick, hapticTap]);

  const playCountdownTone = useCallback((index: number) => {
    hapticCountdown();
    if (isAudioMuted()) return;

    const freq = AUDIO.COUNTDOWN_FREQS[index] ?? AUDIO.COUNTDOWN_FREQS[0]!;
    const gain = index === 2 ? 0.25 : 0.2;

    withRunningContext((ctx) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gainNode.gain.setValueAtTime(gain, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + AUDIO.COUNTDOWN_DURATION);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + AUDIO.COUNTDOWN_DURATION);
    });
  }, [hapticCountdown]);

  const playScoreTick = useCallback((current: number, target: number) => {
    hapticScoreTick();
    if (isAudioMuted()) return;
    const ctx = getContext();
    const progress = target > 0 ? current / target : 0;
    const freq = 300 + progress * 500;
    const gain = 0.06 + progress * 0.04;
    scheduleClick(ctx.currentTime, freq, 0.025, gain);
  }, [getContext, scheduleClick, hapticScoreTick]);

  const playScoreReveal = useCallback((score: number) => {
    if (score >= 7) hapticSuccess();
    else if (score <= 3) hapticError();
    else trigger("nudge");

    if (isAudioMuted()) return;

    withRunningContext((ctx) => {
      if (score === 10) {
        [262, 330, 392, 523].forEach((freq, i) => {
          scheduleClick(ctx.currentTime + i * 0.12, freq, 0.15, 0.2);
        });
      } else if (score <= 3) {
        scheduleClick(ctx.currentTime, 300, 0.3, 0.15);
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else {
        [262, 330, 392].forEach((freq, i) => {
          scheduleClick(ctx.currentTime + i * 0.1, freq, 0.1, 0.15);
        });
      }
    });
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
    warmUp: resumeAudioContext,
  };
}
