import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { motion } from "framer-motion";
import type { GetServerSideProps } from "next";
import {
  SOCKET_EVENTS,
  calculateScore,
} from "@repo/shared";
import { getRandomMessage } from "@repo/shared/messages";
import type {
  PlayerInfo,
  RoomJoinedPayload,
  RoomPlayerLeftPayload,
  GamePhase1Payload,
  GamePhase2Payload,
  GameCountdownPayload,
  GameFinishedPayload,
  GameResult,
  GamePhase,
  SocketErrorPayload,
  Difficulty,
} from "@repo/shared";
import { useSocket } from "@/hooks/useSocket";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { useTapRecorder } from "@/hooks/useTapRecorder";
import { useHaptics } from "@/hooks/useHaptics";
import { useUISound } from "@/hooks/useUISound";
import { PlayerChips } from "@/components/ui/PlayerChips";
import { getStoredName, setStoredName, getStoredDifficulty } from "@/lib/storage";
import { NameInput } from "@/components/ui/NameInput";
import { API_URL, SITE_URL } from "@/lib/env";
import { RoomLobby } from "@/components/multiplayer/RoomLobby";
import { VsResults } from "@/components/multiplayer/VsResults";
import { BeatVisualizer } from "@/components/game/BeatVisualizer";
import { Countdown } from "@/components/game/Countdown";
import { PhaseLabel } from "@/components/game/PhaseLabel";
import { TapArea } from "@/components/game/TapArea";
import { GameTimer } from "@/components/game/GameTimer";
import { TimerBar } from "@/components/game/TimerBar";

interface RoomPageProps {
  hostName: string | null;
}

export const getServerSideProps: GetServerSideProps<RoomPageProps> = async (
  context,
) => {
  const rawCode =
    typeof context.params?.code === "string" ? context.params.code : "";
  const code = rawCode.toUpperCase().replace(/[^A-Z]/g, "");

  if (!code) return { props: { hostName: null } };

  const apiUrl = API_URL;
  try {
    const res = await fetch(`${apiUrl}/api/rooms/${code}`);
    if (!res.ok) return { props: { hostName: null } };
    const data = await res.json();
    return { props: { hostName: data.hostName ?? null } };
  } catch {
    return { props: { hostName: null } };
  }
};

function formatCode(code: string): string {
  if (code.length <= 3) return code;
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

export default function RoomPage({ hostName }: RoomPageProps) {
  const router = useRouter();
  const rawCode =
    typeof router.query.code === "string" ? router.query.code : "";
  const code = rawCode.toUpperCase().replace(/[^A-Z]/g, "");
  const isHostParam = router.query.h === "1";

  const apiUrl = API_URL;
  const siteUrl = SITE_URL;

  const { emit, on } = useSocket();
  const audio = useAudioEngine();
  const tapRecorder = useTapRecorder();
  const { hapticTap } = useHaptics();
  const { playClick } = useUISound();

  const [joined, setJoined] = useState(false);
  const [autoJoining, setAutoJoining] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [bpm, setBpm] = useState(0);
  const [difficulty] = useState<Difficulty>(getStoredDifficulty("hard"));
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [results, setResults] = useState<GameResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timerRafRef = useRef<number | null>(null);
  const serverRespondedRef = useRef(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (!router.isReady || !code || initRef.current) return;
    initRef.current = true;

    if (isHostParam) {
      const name = getStoredName() || "Player";
      setJoined(true);
      setIsHost(true);
      setPlayers([{ id: "self", name, isHost: true }]);
      return;
    }

    setJoinName(getStoredName());
  }, [router.isReady, code, isHostParam]);

  const stopTimerRaf = useCallback(() => {
    if (timerRafRef.current) {
      cancelAnimationFrame(timerRafRef.current);
      timerRafRef.current = null;
    }
  }, []);

  const startTimerRaf = useCallback((durationMs: number) => {
    const endTime = Date.now() + durationMs;
    const tick = () => {
      const rem = Math.max(0, endTime - Date.now());
      setTimeRemaining(rem);
      if (rem > 0) {
        timerRafRef.current = requestAnimationFrame(tick);
      }
    };
    timerRafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!code) return;

    const unsubs: (() => void)[] = [];
    const countdownTimers: ReturnType<typeof setTimeout>[] = [];

    unsubs.push(
      on<RoomJoinedPayload>(SOCKET_EVENTS.ROOM_JOINED, (data) => {
        setPlayers(data.players);
        setJoined(true);
        setAutoJoining(false);
        setError(null);
        const storedName = getStoredName();
        const me = data.players.find((p) => p.name === storedName);
        if (me?.isHost) setIsHost(true);
      }),
    );

    unsubs.push(
      on<RoomPlayerLeftPayload>(SOCKET_EVENTS.ROOM_PLAYER_LEFT, (data) => {
        setPlayers((prev) => prev.filter((p) => p.id !== data.playerId));
      }),
    );

    unsubs.push(
      on<GameCountdownPayload>(SOCKET_EVENTS.GAME_COUNTDOWN, (data) => {
        countdownTimers.forEach(clearTimeout);
        countdownTimers.length = 0;

        setPhase("countdown");
        setCountdownValue(3);
        audio.playCountdownTone(0);
        const interval = data.startsIn / 3;

        countdownTimers.push(setTimeout(() => {
          setCountdownValue(2);
          audio.playCountdownTone(1);
        }, interval));

        countdownTimers.push(setTimeout(() => {
          setCountdownValue(1);
          audio.playCountdownTone(2);
        }, interval * 2));
      }),
    );

    unsubs.push(
      on<GamePhase1Payload>(SOCKET_EVENTS.GAME_PHASE1, (data) => {
        setPhase("phase1");
        setCountdownValue(null);
        setBpm(data.bpm);
        setTimeRemaining(data.duration);
        setTotalDuration(data.duration);
        audio.start(data.bpm);
        startTimerRaf(data.duration);
      }),
    );

    unsubs.push(
      on<GamePhase2Payload>(SOCKET_EVENTS.GAME_PHASE2, (data) => {
        audio.stop();
        stopTimerRaf();
        serverRespondedRef.current = false;

        tapRecorder.startPhase2();
        setPhase("phase2");
        setTimeRemaining(data.duration);
        setTotalDuration(data.duration);
        startTimerRaf(data.duration);

        setTimeout(() => {
          stopTimerRaf();
          const timestamps = tapRecorder.getPhase2Timestamps();
          emit(SOCKET_EVENTS.GAME_SUBMIT, { tapTimestamps: timestamps });

          setTimeout(() => {
            if (serverRespondedRef.current) return;
            setPhase((prev) => {
              if (prev === "results") return prev;

              const scoreResult = calculateScore({
                targetBpm: bpm,
                tapTimestamps: timestamps,
                difficulty,
              });
              const message = getRandomMessage(scoreResult.score);

              audio.cleanup();
              setResults({
                gameId: "",
                mode: "multiplayer",
                difficulty,
                targetBpm: bpm,
                players: [
                  {
                    name: getStoredName() || "Player",
                    score: scoreResult.score,
                    driftMs: scoreResult.driftMs,
                    achievedBpm: scoreResult.achievedBpm,
                    stdDevMs: scoreResult.stdDevMs,
                    tapCount: scoreResult.tapCount,
                    message,
                  },
                ],
              });
              return "results";
            });
          }, 3000);
        }, data.duration);
      }),
    );

    unsubs.push(
      on<GameFinishedPayload>(SOCKET_EVENTS.GAME_FINISHED, (data) => {
        serverRespondedRef.current = true;
        audio.cleanup();
        stopTimerRaf();
        setPhase("results");
        setResults({
          gameId: data.gameId,
          shareCode: data.shareCode,
          mode: "multiplayer",
          difficulty,
          targetBpm: bpm,
          players: data.results,
        });
      }),
    );

    unsubs.push(
      on<SocketErrorPayload>(SOCKET_EVENTS.ERROR, (data) => {
        setError(data.message);
        setAutoJoining(false);
      }),
    );

    return () => {
      unsubs.forEach((fn) => fn());
      countdownTimers.forEach(clearTimeout);
    };
  }, [
    code,
    on,
    emit,
    audio,
    tapRecorder,
    bpm,
    difficulty,
    startTimerRaf,
    stopTimerRaf,
  ]);

  const handleJoinRoom = useCallback(() => {
    playClick();
    audio.warmUp();
    const trimmed = joinName.trim();
    if (!trimmed) {
      setError("Enter your name to join");
      return;
    }
    setStoredName(trimmed);
    setError(null);
    setAutoJoining(true);
    emit(SOCKET_EVENTS.ROOM_JOIN, { code, playerName: trimmed });
  }, [joinName, code, emit, playClick, audio]);

  const handleStart = useCallback(() => {
    playClick();
    audio.warmUp();
    emit(SOCKET_EVENTS.GAME_START, {});
  }, [emit, audio, playClick]);

  const handleTap = useCallback(
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

  const handleNewGame = useCallback(() => {
    router.push("/multiplayer");
  }, [router]);

  const tapActive =
    phase === "phase1" || phase === "phase2" || phase === "transition";
  const showTimerBar =
    (phase === "phase1" || phase === "phase2" || phase === "transition") &&
    totalDuration > 0;
  const isSubmitting = phase === "phase2" && timeRemaining <= 0;

  const myName = getStoredName() || "Player";

  return (
    <>
      <Head>
        <title>
          {hostName
            ? `${hostName} challenged you — Drift.gg`
            : `Room ${code ? formatCode(code) : ""} — Drift.gg`}
        </title>
        <meta
          name="description"
          content={
            hostName
              ? `${hostName} challenged you to a rhythm battle on Drift.gg. Think you can keep the beat?`
              : "Join a multiplayer rhythm battle on Drift.gg."
          }
        />
        <meta
          property="og:title"
          content={
            hostName
              ? `${hostName} challenged you on Drift.gg`
              : `Room ${code ? formatCode(code) : ""} — Drift.gg`
          }
        />
        <meta
          property="og:description"
          content={
            hostName
              ? "Join the rhythm battle. Think you can keep the beat?"
              : "Join a multiplayer rhythm battle on Drift.gg."
          }
        />
        <meta
          property="og:image"
          content={
            hostName
              ? `${apiUrl}/api/rooms/${code}/og`
              : `${siteUrl}/og-default.png`
          }
        />
        <meta property="og:url" content={`${siteUrl}/room/${code}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={`${siteUrl}/room/${code}`} />
      </Head>

      <div className="flex-1 flex flex-col items-center justify-center mx-auto w-full max-w-[600px] px-4">
        {error && !joined && !autoJoining && (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-[var(--error)] mb-4">{error}</p>
            <button
              onClick={() => {
                playClick();
                router.push("/multiplayer");
              }}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              Back to multiplayer
            </button>
          </motion.div>
        )}

        {!joined && autoJoining && !error && (
          <motion.div
            className="flex flex-col items-center justify-center gap-4 py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-10 h-10 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
            <p className="text-sm text-[var(--text-muted)]">
              Joining room {formatCode(code)}…
            </p>
          </motion.div>
        )}

        {!joined && !autoJoining && !error && code && (
          <motion.div
            className="flex flex-col items-center gap-5 py-12 w-full max-w-xs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="text-center">
              {hostName ? (
                <>
                  <p className="text-2xl sm:text-3xl font-bold">
                    {hostName} challenged you
                  </p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    to a rhythm battle
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-3 tracking-[0.15em] opacity-50">
                    {formatCode(code)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-[var(--text-muted)] mb-1">
                    Joining room
                  </p>
                  <p className="text-3xl font-bold tracking-[0.15em]">
                    {formatCode(code)}
                  </p>
                </>
              )}
            </div>

            <NameInput
              value={joinName}
              onChange={setJoinName}
              onSubmit={handleJoinRoom}
              onErrorClear={() => setError(null)}
            />

            <button
              onClick={handleJoinRoom}
              className="w-full rounded-xl bg-[var(--accent)] py-3.5 text-base font-medium text-white hover:opacity-90 transition-opacity"
            >
              {hostName ? "Accept Challenge" : "Join Game"}
            </button>
          </motion.div>
        )}

        {joined && !error && phase === "idle" && (
          <RoomLobby
            code={code}
            players={players}
            isHost={isHost}
            onStart={handleStart}
          />
        )}

        {joined && phase === "countdown" && (
          <div className="flex flex-col items-center justify-center min-h-[60dvh] gap-6">
            <PlayerChips players={players} currentName={myName} />
            <Countdown value={countdownValue} />
          </div>
        )}

        {joined && tapActive && !isSubmitting && (
          <div
            className="relative w-full overflow-hidden"
            style={{ height: 480 }}
          >
            <PlayerChips players={players} currentName={myName} className="mb-3" />

            <div
              className="relative w-full overflow-hidden"
              style={{ height: 420 }}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--border)] z-10 rounded-full overflow-hidden">
                {showTimerBar && (
                  <TimerBar totalDuration={totalDuration} phase={phase} />
                )}
              </div>
              <div className="flex flex-col items-center w-full h-full">
                <div className="h-8 flex items-center justify-center shrink-0">
                  <PhaseLabel phase={phase} />
                </div>
                <div className="h-[80px] sm:h-[96px] flex items-center justify-center shrink-0">
                  <GameTimer timeRemaining={timeRemaining} />
                </div>
                <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden">
                  <BeatVisualizer isBeat={audio.isBeat} phase={phase} />
                  <TapArea onTap={handleTap} active={tapActive} />
                </div>
              </div>
            </div>
          </div>
        )}

        {joined && isSubmitting && (
          <motion.div
            className="flex flex-col items-center justify-center gap-4"
            style={{ height: 420 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-12 h-12 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
            <p className="text-sm font-medium text-[var(--text-muted)]">
              Waiting for everyone…
            </p>
          </motion.div>
        )}

        {joined && phase === "results" && results && (
          <VsResults
            players={results.players}
            targetBpm={results.targetBpm}
            shareCode={results.shareCode ?? ""}
            onPlayAgain={handleNewGame}
          />
        )}
      </div>
    </>
  );
}
