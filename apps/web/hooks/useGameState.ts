import { useState, useEffect, useCallback, useRef } from "react";
import {
  SOCKET_EVENTS,
  PHASE_DURATIONS,
  COUNTDOWN_DURATION,
  calculateScore,
  randomBpm,
  seedToBpm,
} from "@repo/shared";
import { getRandomMessage } from "@repo/shared/messages";
import type {
  GamePhase,
  Difficulty,
  GameResult,
  GameStartSoloPayload,
  GameFinishedPayload,
} from "@repo/shared";
import { useSocket } from "./useSocket";
import { useAudioEngine } from "./useAudioEngine";
import { useHaptics } from "./useHaptics";
import { useTapRecorder } from "./useTapRecorder";
import { ensureAudioReady } from "@/lib/audio";
import { getStoredName } from "@/lib/storage";
import { getSocket } from "@/lib/socket";

interface GameState {
  phase: GamePhase;
  bpm: number | null;
  difficulty: Difficulty;
  results: GameResult | null;
  timeRemaining: number;
  totalDuration: number;
  countdownValue: number | null;
}

export function useGameState(difficulty: Difficulty = "hard") {
  const [state, setState] = useState<GameState>({
    phase: "idle",
    bpm: null,
    difficulty,
    results: null,
    timeRemaining: 0,
    totalDuration: 0,
    countdownValue: null,
  });

  const { emit, on } = useSocket();
  const audio = useAudioEngine();
  const { hapticTap } = useHaptics();
  const tapRecorder = useTapRecorder();

  const phaseEndTimeRef = useRef(0);
  const timerRafRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const serverRespondedRef = useRef(false);
  const gameTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pendingRetryRef = useRef<{
    startPayload: GameStartSoloPayload;
    tapTimestamps: number[];
  } | null>(null);

  const requestWakeLock = useCallback(async () => {
    try {
      wakeLockRef.current = await navigator.wakeLock?.request("screen");
    } catch {
      // wake lock not supported or denied
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release();
    wakeLockRef.current = null;
  }, []);

  const startTimer = useCallback((durationMs: number) => {
    phaseEndTimeRef.current = Date.now() + durationMs;

    const tick = () => {
      const remaining = Math.max(0, phaseEndTimeRef.current - Date.now());
      setState((prev) => ({ ...prev, timeRemaining: remaining }));
      if (remaining > 0) {
        timerRafRef.current = requestAnimationFrame(tick);
      }
    };
    timerRafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRafRef.current) {
      cancelAnimationFrame(timerRafRef.current);
      timerRafRef.current = null;
    }
  }, []);

  const clearGameTimers = useCallback(() => {
    gameTimersRef.current.forEach(clearTimeout);
    gameTimersRef.current = [];
  }, []);

  useEffect(() => {
    const unsub = on<GameFinishedPayload>(SOCKET_EVENTS.GAME_FINISHED, (data) => {
      serverRespondedRef.current = true;
      pendingRetryRef.current = null;
      stopTimer();
      audio.cleanup();
      releaseWakeLock();
      setState((prev) => {
        if (prev.phase === "results" && prev.results) {
          return {
            ...prev,
            results: { ...prev.results, gameId: data.gameId, shareCode: data.shareCode },
          };
        }
        return {
          ...prev,
          phase: "results",
          results: {
            gameId: data.gameId,
            shareCode: data.shareCode,
            mode: "solo",
            difficulty: prev.difficulty,
            targetBpm: prev.bpm ?? 0,
            players: data.results,
          },
        };
      });
    });

    return unsub;
  }, [on, stopTimer, audio, releaseWakeLock]);

  useEffect(() => {
    return () => {
      gameTimersRef.current.forEach(clearTimeout);
      stopTimer();
      audio.cleanup();
      releaseWakeLock();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // on socket reconnect, retry pending submission so the user gets a share code
  // even if the connection blipped during submit. reconnect gives a new socket id,
  // so we re-create the game record on the server before re-submitting.
  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => {
      const pending = pendingRetryRef.current;
      if (!pending || serverRespondedRef.current) return;
      if (pending.tapTimestamps.length === 0) return;

      emit(SOCKET_EVENTS.GAME_START_SOLO, pending.startPayload);
      setTimeout(() => {
        if (serverRespondedRef.current) return;
        emit(SOCKET_EVENTS.GAME_SUBMIT, { tapTimestamps: pending.tapTimestamps });
      }, 2000);
    };

    socket.on("connect", handleConnect);
    return () => {
      socket.off("connect", handleConnect);
    };
  }, [emit]);

  const startSolo = useCallback(
    async (playerName: string, opts?: { seed?: number; challengeSourceId?: string; bpm?: number }): Promise<boolean> => {
      await ensureAudioReady().catch(() => {});

      tapRecorder.reset();
      serverRespondedRef.current = false;
      clearGameTimers();

      // resolve bpm locally — no server round-trip needed
      let bpm: number;
      if (opts?.bpm) {
        bpm = opts.bpm;
      } else if (opts?.seed !== undefined) {
        bpm = seedToBpm(opts.seed);
      } else {
        bpm = randomBpm();
      }

      setState((prev) => ({
        ...prev,
        phase: "idle",
        bpm,
        results: null,
        timeRemaining: 0,
        totalDuration: 0,
        countdownValue: null,
      }));

      // notify server in the background for db persistence
      const startPayload: GameStartSoloPayload = {
        playerName,
        difficulty: state.difficulty,
        seed: opts?.seed,
        challengeSourceId: opts?.challengeSourceId,
        clientBpm: bpm,
      };
      pendingRetryRef.current = { startPayload, tapTimestamps: [] };
      emit(SOCKET_EVENTS.GAME_START_SOLO, startPayload);

      const durations = PHASE_DURATIONS[state.difficulty];

      // client-driven game loop
      requestWakeLock();
      const interval = COUNTDOWN_DURATION / 3;
      const steps = [3, 2, 1] as const;

      const fireCountdown = (step: number) => {
        setState((prev) => ({
          ...prev,
          phase: "countdown",
          countdownValue: steps[step]!,
        }));
        audio.playCountdownTone(step);
      };

      fireCountdown(0);
      gameTimersRef.current.push(setTimeout(() => fireCountdown(1), interval));
      gameTimersRef.current.push(setTimeout(() => fireCountdown(2), interval * 2));

      // phase 1: audible beat
      gameTimersRef.current.push(
        setTimeout(() => {
          setState((prev) => ({
            ...prev,
            phase: "phase1",
            bpm,
            countdownValue: null,
            timeRemaining: durations.phase1,
            totalDuration: durations.phase1,
          }));
          audio.start(bpm);
          startTimer(durations.phase1);
        }, COUNTDOWN_DURATION),
      );

      // phase 2: silence / memory
      gameTimersRef.current.push(
        setTimeout(() => {
          audio.stop();
          stopTimer();
          serverRespondedRef.current = false;

          tapRecorder.startPhase2();
          setState((prev) => ({
            ...prev,
            phase: "phase2",
            timeRemaining: durations.phase2,
            totalDuration: durations.phase2,
          }));
          startTimer(durations.phase2);
        }, COUNTDOWN_DURATION + durations.phase1),
      );

      gameTimersRef.current.push(
        setTimeout(
          () => {
            stopTimer();
            setState((prev) => ({ ...prev, timeRemaining: 0 }));
            const timestamps = tapRecorder.getPhase2Timestamps();
            if (pendingRetryRef.current) {
              pendingRetryRef.current.tapTimestamps = timestamps;
            }
            emit(SOCKET_EVENTS.GAME_SUBMIT, { tapTimestamps: timestamps });

            // if server doesn't respond within 1.5s, show local results
            gameTimersRef.current.push(
              setTimeout(() => {
                if (serverRespondedRef.current) return;

                setState((prev) => {
                  if (prev.phase === "results") return prev;

                  const targetBpm = prev.bpm ?? 120;
                  const scoreResult = calculateScore({
                    targetBpm,
                    tapTimestamps: timestamps,
                    difficulty: prev.difficulty,
                  });
                  const message = getRandomMessage(scoreResult.score);

                  audio.cleanup();
                  releaseWakeLock();

                  return {
                    ...prev,
                    phase: "results",
                    results: {
                      gameId: "",
                      mode: "solo",
                      difficulty: prev.difficulty,
                      targetBpm,
                      players: [
                        {
                          name: getStoredName("Player"),
                          score: scoreResult.score,
                          driftMs: scoreResult.driftMs,
                          achievedBpm: scoreResult.achievedBpm,
                          stdDevMs: scoreResult.stdDevMs,
                          tapCount: scoreResult.tapCount,
                          message,
                          tapIntervalOffsets: scoreResult.tapIntervalOffsets,
                        },
                      ],
                    },
                  };
                });
              }, 1500),
            );
          },
          COUNTDOWN_DURATION + durations.phase1 + durations.phase2,
        ),
      );

      return true;
    },
    [
      emit,
      state.difficulty,
      tapRecorder,
      audio,
      startTimer,
      stopTimer,
      requestWakeLock,
      releaseWakeLock,
      clearGameTimers,
    ],
  );

  const recordTap = useCallback(
    (playSound: boolean = false) => {
      const recorded = tapRecorder.recordTap();
      if (recorded) {
        if (playSound) audio.playTapSound();
        else hapticTap();
      }
      return recorded;
    },
    [tapRecorder, audio, hapticTap],
  );

  const reset = useCallback(() => {
    audio.cleanup();
    tapRecorder.reset();
    stopTimer();
    clearGameTimers();
    releaseWakeLock();
    serverRespondedRef.current = false;
    pendingRetryRef.current = null;
    setState((prev) => ({
      ...prev,
      phase: "idle",
      bpm: null,
      results: null,
      timeRemaining: 0,
      totalDuration: 0,
      countdownValue: null,
    }));
  }, [audio, tapRecorder, stopTimer, clearGameTimers, releaseWakeLock]);

  return {
    ...state,
    startSolo,
    recordTap,
    reset,
    isBeat: audio.isBeat,
    playScoreTick: audio.playScoreTick,
    playScoreReveal: audio.playScoreReveal,
  };
}
