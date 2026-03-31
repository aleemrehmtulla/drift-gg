import { prisma } from "../db.js";
import { getDailySeed, seedToBpm, todayDateString } from "@repo/shared";
import type { DailyLeaderboardResponse, DailyLeaderboardEntry } from "@repo/shared";
import { formatBpm } from "@repo/shared";

export function getDailyBpm(dateStr?: string): { seed: number; bpm: number; date: string } {
  const date = dateStr || todayDateString();
  const seed = getDailySeed(date);
  const bpm = seedToBpm(seed);
  return { seed, bpm, date };
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export async function getDailyLeaderboard(
  dateStr?: string,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<DailyLeaderboardResponse> {
  const { bpm, date } = getDailyBpm(dateStr);
  const safePage = Math.max(1, page);
  const safeSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
  const skip = (safePage - 1) * safeSize;

  const whereClause = {
    game: {
      dailyDate: date,
      status: "finished" as const,
      mode: "daily" as const,
    },
    score: { not: null },
  };

  const [players, totalPlayers] = await Promise.all([
    prisma.player.findMany({
      where: whereClause,
      orderBy: [
        { score: "desc" },
        { driftMs: "asc" },
      ],
      skip,
      take: safeSize,
      select: {
        name: true,
        score: true,
        driftMs: true,
        achievedBpmX100: true,
      },
    }),
    prisma.player.count({ where: whereClause }),
  ]);

  const entries: DailyLeaderboardEntry[] = players.map((p, i) => ({
    rank: skip + i + 1,
    name: p.name,
    score: p.score!,
    driftMs: p.driftMs ?? 0,
    achievedBpm: p.achievedBpmX100 ? formatBpm(p.achievedBpmX100) : 0,
  }));

  return {
    date,
    bpm,
    entries,
    totalPlayers,
    page: safePage,
    pageSize: safeSize,
    hasMore: skip + players.length < totalPlayers,
  };
}
