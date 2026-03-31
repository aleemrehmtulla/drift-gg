import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { motion } from "framer-motion";
import type { GetServerSideProps } from "next";
import type { Difficulty, GameResponse } from "@repo/shared";
import { useGameState } from "@/hooks/useGameState";
import { useUISound } from "@/hooks/useUISound";
import { NameInput } from "@/components/ui/NameInput";
import { GameContainer } from "@/components/game/GameContainer";
import { cn } from "@/lib/cn";
import { scoreColorClass } from "@/lib/score-colors";
import { getStoredName, setStoredName } from "@/lib/storage";
import { API_URL, SITE_URL } from "@/lib/env";

interface PlayPageProps {
  og: {
    title: string;
    description: string;
    imageUrl: string;
    url: string;
  } | null;
  challenge: {
    gameId: string;
    playerName: string;
    score: number;
    targetBpm: number;
    difficulty: "easy" | "hard";
  } | null;
}

export const getServerSideProps: GetServerSideProps<PlayPageProps> = async (context) => {
  const { challengeSourceId } = context.query;
  if (typeof challengeSourceId !== "string") {
    return { props: { og: null, challenge: null } };
  }

  const apiUrl = API_URL;
  const siteUrl = SITE_URL;

  try {
    const res = await fetch(`${apiUrl}/api/games/${challengeSourceId}`);
    if (!res.ok) return { props: { og: null, challenge: null } };
    const game: GameResponse = await res.json();
    const player = game.players[0];
    if (!player) return { props: { og: null, challenge: null } };

    return {
      props: {
        og: {
          title: `${player.name} challenges you — Drift.gg`,
          description: `Can you beat ${player.score ?? 0}/10 at ${game.targetBpm} BPM? How much will you drift off the beat?`,
          imageUrl: `${apiUrl}/api/games/${game.shareCode ?? game.id}/challenge-og`,
          url: `${siteUrl}/c/${game.shareCode ?? challengeSourceId}`,
        },
        challenge: {
          gameId: game.id,
          playerName: player.name,
          score: player.score ?? 0,
          targetBpm: game.targetBpm,
          difficulty: game.difficulty === "easy" ? "easy" : "hard",
        },
      },
    };
  } catch {
    return { props: { og: null, challenge: null } };
  }
};

export default function PlayPage({ og, challenge }: PlayPageProps) {
  const router = useRouter();
  const { difficulty: diffParam, seed, challengeSourceId } = router.query;

  const diff: Difficulty = challenge
    ? challenge.difficulty
    : diffParam === "easy"
      ? "easy"
      : "hard";
  const game = useGameState(diff);
  const { playClick, playHover } = useUISound();
  const [started, setStarted] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(getStoredName());
  }, []);

  const handleStart = useCallback(async () => {
    playClick();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter your name to play");
      return;
    }
    setStoredName(trimmed);
    const seedNum = typeof seed === "string" ? parseInt(seed, 10) : undefined;
    const challengeId =
      challenge?.gameId ?? (typeof challengeSourceId === "string" ? challengeSourceId : undefined);
    const ok = await game.startSolo(trimmed, {
      seed: seedNum,
      challengeSourceId: challengeId,
      bpm: challenge?.targetBpm,
    });
    if (!ok) {
      setError("Couldn't start audio. Tap to try again.");
      return;
    }
    setStarted(true);
  }, [game, seed, challengeSourceId, challenge, name, playClick]);

  const handlePlayAgain = useCallback(() => {
    game.reset();
    setStarted(false);
  }, [game]);

  const challengeScoreColor = challenge ? scoreColorClass(challenge.score) : "";

  return (
    <>
      <Head>
        <title>{og ? og.title : "Play — Drift.gg"}</title>
        <meta
          name="description"
          content={
            og
              ? og.description
              : "Play Drift.gg — tap along with the beat, then keep going from memory."
          }
        />
        {og ? (
          <>
            <meta property="og:title" content={og.title} />
            <meta property="og:description" content={og.description} />
            <meta property="og:image" content={og.imageUrl} />
            <meta property="og:url" content={og.url} />
            <meta name="twitter:card" content="summary_large_image" />
          </>
        ) : (
          <>
            <meta property="og:title" content="Play — Drift.gg" />
            <meta
              property="og:description"
              content="Play Drift.gg — tap along with the beat, then keep going from memory."
            />
            <meta property="og:image" content={`${SITE_URL}/og-default.png`} />
            <meta property="og:url" content={`${SITE_URL}/play`} />
            <meta name="twitter:card" content="summary_large_image" />
          </>
        )}
        <link rel="canonical" href={og?.url || `${SITE_URL}/play`} />
      </Head>

      <div className="flex-1 flex flex-col items-center justify-center mx-auto w-full max-w-[600px] px-4">
        {!started ? (
          challenge ? (
            <motion.div
              className="flex flex-col items-center gap-5 py-12 w-full max-w-xs"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="w-16 h-16 rounded-full bg-[var(--accent-light)] flex items-center justify-center text-2xl font-bold text-[var(--accent)]">
                {challenge.playerName[0]?.toUpperCase()}
              </div>

              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold">{challenge.playerName}</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">challenges you to beat</p>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)] p-5 text-center w-full">
                <p
                  className={cn(
                    "text-[56px] font-bold tabular-nums leading-none",
                    challengeScoreColor,
                  )}
                >
                  {challenge.score}
                  <span className="text-2xl font-semibold text-[var(--text-muted)]">/10</span>
                </p>
                <p className="text-sm text-[var(--text-muted)] mt-3">{challenge.targetBpm} BPM</p>
              </div>

              <NameInput
                value={name}
                onChange={setName}
                onSubmit={handleStart}
                error={error}
                onErrorClear={() => setError(null)}
              />

              <button
                onClick={handleStart}
                onMouseEnter={playHover}
                className="w-full rounded-xl bg-[var(--accent)] py-3.5 text-lg font-medium text-white hover:opacity-90 transition-opacity"
              >
                Accept Challenge
              </button>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center gap-5 py-12 w-full max-w-xs">
              <h1 className="text-3xl font-bold">Ready?</h1>
              <p className="text-sm text-[var(--text-muted)] text-center">
                Tap along with the beat. When it stops, keep going.
              </p>

              <NameInput
                value={name}
                onChange={setName}
                onSubmit={handleStart}
                error={error}
                onErrorClear={() => setError(null)}
              />

              <button
                onClick={handleStart}
                onMouseEnter={playHover}
                className="w-full rounded-xl bg-[var(--accent)] py-3.5 text-lg font-medium text-white hover:opacity-90 transition-opacity"
              >
                Start
              </button>
              <p className="text-xs text-[var(--text-muted)]">
                {diff === "easy" ? "Easy — 6s each phase" : "Hard — 3s each phase"}
              </p>
            </div>
          )
        ) : (
          <GameContainer
            phase={game.phase}
            countdownValue={game.countdownValue}
            timeRemaining={game.timeRemaining}
            totalDuration={game.totalDuration}
            results={game.results}
            isBeat={game.isBeat}
            onTap={game.recordTap}
            onPlayAgain={handlePlayAgain}
            playScoreTick={game.playScoreTick}
            playScoreReveal={game.playScoreReveal}
            difficulty={diff}
          />
        )}
      </div>
    </>
  );
}
