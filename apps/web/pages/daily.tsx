import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import type {
  DailyLeaderboardResponse,
  DailyLeaderboardEntry,
} from "@repo/shared";
import {
  getDailySeed,
  todayDateString,
} from "@repo/shared";
import { useGameState } from "@/hooks/useGameState";
import { useUISound } from "@/hooks/useUISound";
import { NameInput } from "@/components/ui/NameInput";
import { GameContainer } from "@/components/game/GameContainer";
import { motion } from "framer-motion";
import { getStoredName, setStoredName } from "@/lib/storage";
import { API_URL, SITE_URL } from "@/lib/env";

function getDailyGameId(): string | null {
  try {
    return localStorage.getItem(`drift_daily_${todayDateString()}`);
  } catch {
    return null;
  }
}

function setDailyGameId(gameId: string): void {
  try {
    localStorage.setItem(`drift_daily_${todayDateString()}`, gameId);
  } catch {}
}

const PAGE_SIZE = 20;

function fetchLeaderboardPage(page: number) {
  return fetch(
    `${API_URL}/api/daily?date=${todayDateString()}&page=${page}&pageSize=${PAGE_SIZE}`,
  ).then((res) => res.json()) as Promise<DailyLeaderboardResponse>;
}

export default function DailyPage() {
  const game = useGameState("hard");
  const [started, setStarted] = useState(false);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [entries, setEntries] = useState<DailyLeaderboardEntry[]>([]);
  const [meta, setMeta] = useState<{
    bpm: number;
    totalPlayers: number;
    hasMore: boolean;
    page: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const { playClick, playHover } = useUISound();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (page: number, reset = false) => {
    if (reset) setLoadingMore(false);
    else setLoadingMore(true);

    try {
      const data = await fetchLeaderboardPage(page);
      setMeta({
        bpm: data.bpm,
        totalPlayers: data.totalPlayers,
        hasMore: data.hasMore,
        page: data.page,
      });
      setEntries((prev) => (reset ? data.entries : [...prev, ...data.entries]));
    } catch {
    } finally {
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setName(getStoredName());
    const existingId = getDailyGameId();
    if (existingId) setAlreadyPlayed(true);
    setLoading(false);
    loadPage(1, true);
  }, [loadPage]);

  useEffect(() => {
    if (game.results?.gameId) {
      setDailyGameId(game.results.gameId);
      setAlreadyPlayed(true);
      loadPage(1, true);
    }
  }, [game.results?.gameId, loadPage]);

  const handleStart = useCallback(() => {
    playClick();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter your name to play");
      return;
    }
    setStoredName(trimmed);
    const seed = getDailySeed(todayDateString());
    game.startSolo(trimmed, { seed });
    setStarted(true);
  }, [game, name, playClick]);

  const handlePlayAgain = useCallback(() => {
    game.reset();
    setStarted(false);
  }, [game]);

  const handleViewLeaderboard = useCallback(() => {
    loadPage(1, true);
    setStarted(false);
  }, [loadPage]);

  const handleLoadMore = useCallback(() => {
    if (!meta || !meta.hasMore || loadingMore) return;
    loadPage(meta.page + 1);
  }, [meta, loadingMore, loadPage]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 mx-auto bg-[var(--border)] rounded" />
          <div className="h-4 w-32 mx-auto bg-[var(--border)] rounded" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Daily Challenge — Drift.gg</title>
        <meta
          name="description"
          content="Play today's daily rhythm challenge on Drift.gg. Same BPM for everyone. Compare your score on the leaderboard."
        />
        <meta property="og:title" content="Daily Challenge — Drift.gg" />
        <meta
          property="og:description"
          content="Play today's daily rhythm challenge. Same BPM for everyone."
        />
        <meta property="og:image" content={`${SITE_URL}/og-default.png`} />
        <meta property="og:url" content={`${SITE_URL}/daily`} />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={`${SITE_URL}/daily`} />
      </Head>

      <div className="flex-1 flex flex-col items-center justify-center mx-auto w-full max-w-[600px] px-4 py-12">
        {!started ? (
          <div className="flex flex-col items-center gap-5 w-full max-w-sm">
            <h1 className="text-3xl font-bold whitespace-nowrap">
              Global Daily Challenge
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              {todayDateString()}
            </p>

            {meta && (
              <p className="text-sm text-[var(--text-muted)]">
                {meta.bpm} BPM · {meta.totalPlayers} player
                {meta.totalPlayers !== 1 ? "s" : ""}
              </p>
            )}

            {!alreadyPlayed && (
              <>
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
                  Play
                </button>
              </>
            )}

            {alreadyPlayed && (
              <p className="text-sm text-[var(--success)] font-medium">
                You&apos;ve already played today&apos;s challenge
              </p>
            )}

            {entries.length > 0 && (
              <motion.div
                className="w-full mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--text-muted)] mb-3">
                  Leaderboard
                </h2>
                <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                  <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)]">
                          <th className="px-4 py-2 text-left font-medium text-[var(--text-muted)] w-10">
                            #
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-[var(--text-muted)]">
                            Name
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-[var(--text-muted)] w-16">
                            Score
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-[var(--text-muted)] w-16">
                            Drift
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry) => (
                          <tr
                            key={entry.rank}
                            className="border-b border-[var(--border)] last:border-0"
                          >
                            <td className="px-4 py-2 tabular-nums text-[var(--text-muted)]">
                              {entry.rank}
                            </td>
                            <td className="px-4 py-2 font-medium truncate max-w-[160px]">
                              {entry.name}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums whitespace-nowrap">
                              {entry.score}/10
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums text-[var(--text-muted)] whitespace-nowrap">
                              {entry.driftMs}ms
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {meta?.hasMore && (
                    <div className="border-t border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-2.5 flex items-center justify-center">
                      <button
                        onClick={() => {
                          playClick();
                          handleLoadMore();
                        }}
                        onMouseEnter={playHover}
                        disabled={loadingMore}
                        className="text-sm font-medium text-[var(--accent)] hover:opacity-80 transition-opacity disabled:opacity-50"
                      >
                        {loadingMore ? "Loading…" : "Load more"}
                      </button>
                    </div>
                  )}
                </div>
                {meta && entries.length < meta.totalPlayers && (
                  <p className="text-xs text-[var(--text-muted)] text-center mt-2">
                    Showing {entries.length} of {meta.totalPlayers}
                  </p>
                )}
              </motion.div>
            )}
          </div>
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
            difficulty="hard"
            secondaryAction={{
              label: "View leaderboard",
              onClick: handleViewLeaderboard,
            }}
          />
        )}
      </div>
    </>
  );
}
