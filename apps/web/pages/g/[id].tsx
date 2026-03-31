import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { motion } from "framer-motion";
import type { GameResponse } from "@repo/shared";
import { getRandomMessage } from "@repo/shared/messages";
import { useUISound } from "@/hooks/useUISound";
import { cn } from "@/lib/cn";
import { scoreColorClass } from "@/lib/score-colors";
import { API_URL, SITE_URL } from "@/lib/env";

interface GamePageProps {
  game: GameResponse | null;
}

export const getStaticPaths: GetStaticPaths = () => {
  return { paths: [], fallback: "blocking" };
};

export const getStaticProps: GetStaticProps<GamePageProps> = async (context) => {
  const id = context.params?.id;
  if (typeof id !== "string") {
    return { props: { game: null } };
  }

  const apiUrl = API_URL;
  try {
    const res = await fetch(`${apiUrl}/api/games/${id}`);
    if (!res.ok) return { props: { game: null } };
    const game: GameResponse = await res.json();
    return { props: { game } };
  } catch {
    return { props: { game: null } };
  }
};

export default function GameResultPage({ game }: GamePageProps) {
  const { playClick } = useUISound();

  if (!game) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center mx-auto w-full max-w-[600px] px-4 text-center">
        <Head>
          <title>Game not found — Drift.gg</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <h1 className="text-2xl font-bold mb-4">Game not found</h1>
        <p className="text-[var(--text-muted)] mb-6">
          This game doesn&apos;t exist or hasn&apos;t finished yet.
        </p>
        <Link
          href="/"
          onClick={() => playClick()}
          className="text-[var(--accent)] hover:underline"
        >
          Play solo instead?
        </Link>
      </div>
    );
  }

  const player = game.players[0];
  const siteUrl = SITE_URL;
  const apiUrl = API_URL;

  const ogTitle = player
    ? `${player.name} scored ${player.score ?? 0}/10 — can you beat it?`
    : "Drift.gg";
  const ogDescription = player
    ? `${game.targetBpm} BPM challenge on Drift.gg. Think you can keep the beat better?`
    : "How much will you drift off the beat?";

  const challengePlayer = game.challengeSource?.players?.[0];

  return (
    <>
      <Head>
        <title>{ogTitle}</title>
        <meta name="description" content={ogDescription} />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={`${apiUrl}/api/games/${game.shareCode ?? game.id}/og`} />
        <meta property="og:url" content={`${siteUrl}/g/${game.shareCode ?? game.id}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={`${siteUrl}/g/${game.shareCode ?? game.id}`} />
      </Head>

      <div className="flex-1 flex flex-col items-center justify-center mx-auto w-full max-w-[600px] px-4 py-12">
        {player && (
          <motion.div
            className="flex flex-col items-center gap-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-sm text-[var(--text-muted)]">{player.name}</p>

            <p
              className={cn("text-[64px] font-bold tabular-nums leading-none", scoreColorClass(player.score ?? 0))}
            >
              {player.score ?? 0}/10
            </p>

            <p className="text-2xl font-medium tabular-nums text-[var(--accent)] font-mono">
              drift: {player.driftMs ?? 0}ms
            </p>

            <p className="text-base text-[var(--text-muted)] tabular-nums">
              Target: {game.targetBpm} BPM → You: {player.achievedBpm ?? 0} BPM
            </p>

            <p className="text-lg italic text-[var(--text-muted)] text-center max-w-sm">
              &ldquo;{getRandomMessage(player.score ?? 1)}&rdquo;
            </p>
          </motion.div>
        )}

        {challengePlayer && (
          <motion.div
            className="mt-8 rounded-xl border border-[var(--border)] p-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-sm text-[var(--text-muted)] mb-2">Challenged by</p>
            <p className="font-medium">{challengePlayer.name}</p>
            <p className="text-2xl font-bold tabular-nums mt-1">
              {challengePlayer.score ?? 0}/10
            </p>
            <p className="text-sm text-[var(--text-muted)] tabular-nums">
              drift: {challengePlayer.driftMs ?? 0}ms
            </p>
          </motion.div>
        )}

        <motion.div
          className="flex flex-col items-center gap-4 mt-8 w-full max-w-sm"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)] p-5 w-full text-center">
            <p className="text-base font-semibold mb-1">
              Think you can do better?
            </p>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Same BPM, same beat. Show them what you&apos;ve got.
            </p>
            <Link
              href={`/c/${game.shareCode ?? game.id}`}
              onClick={() => playClick()}
              className="block w-full rounded-xl bg-[var(--accent)] py-3.5 text-base font-medium text-white hover:opacity-90 transition-opacity no-underline text-center"
            >
              Beat This Score
            </Link>
          </div>
          <Link
            href="/"
            onClick={() => playClick()}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors no-underline"
          >
            Back to home
          </Link>
        </motion.div>
      </div>
    </>
  );
}
