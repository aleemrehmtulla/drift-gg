import { Router, Response } from "express";
import { prisma } from "../db.js";
import type { Prisma } from "@repo/db";
import { formatBpm, getRandomMessage, ogScoreColorHex } from "@repo/shared";
import type { GameResponse } from "@repo/shared";
import { logger } from "@repo/shared/logger";
import satori from "satori";
import sharp from "sharp";

const router = Router();

let fontBuffer: ArrayBuffer | null = null;
let fontBoldBuffer: ArrayBuffer | null = null;

async function loadFont(): Promise<ArrayBuffer> {
  if (fontBuffer) return fontBuffer;
  const response = await fetch(
    "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf",
  );
  fontBuffer = await response.arrayBuffer();
  return fontBuffer;
}

async function loadBoldFont(): Promise<ArrayBuffer> {
  if (fontBoldBuffer) return fontBoldBuffer;
  try {
    const response = await fetch(
      "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf",
    );
    if (!response.ok) return loadFont();
    fontBoldBuffer = await response.arrayBuffer();
    return fontBoldBuffer;
  } catch {
    return loadFont();
  }
}

async function getFonts() {
  const [regular, bold] = await Promise.all([loadFont(), loadBoldFont()]);
  return [
    { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: bold, weight: 700 as const, style: "normal" as const },
  ];
}

function normalizeRoomCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, "");
}

async function renderOgImage(
  element: unknown,
  res: Response,
  cacheControl = "public, max-age=31536000, immutable",
) {
  const fonts = await getFonts();
  const svg = await satori(element as React.ReactNode, { width: 1200, height: 630, fonts });
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", cacheControl);
  res.send(png);
}

async function findGameByIdOrShareCode<T extends Prisma.GameInclude>(
  id: string,
  include: T,
): Promise<Prisma.GameGetPayload<{ include: T }> | null> {
  let game = await prisma.game.findUnique({ where: { id }, include } as never);
  if (!game) {
    game = await prisma.game.findUnique({
      where: { shareCode: id.toUpperCase() },
      include,
    } as never);
  }
  return game as Prisma.GameGetPayload<{ include: T }> | null;
}

router.get("/games/:id", async (req, res) => {
  try {
    const includeOpts = {
      players: {
        select: {
          id: true,
          name: true,
          isHost: true,
          score: true,
          achievedBpmX100: true,
          driftMs: true,
          stdDevMsX100: true,
          tapCount: true,
        },
      },
      challengeSource: {
        select: {
          id: true,
          players: { select: { name: true, score: true, driftMs: true, achievedBpmX100: true } },
        },
      },
    } as const;

    const game = await findGameByIdOrShareCode(req.params.id, includeOpts);
    if (!game) return res.status(404).json({ error: "Game not found" });

    const response: GameResponse = {
      id: game.id,
      shareCode: game.shareCode,
      mode: game.mode as GameResponse["mode"],
      difficulty: game.difficulty as GameResponse["difficulty"],
      targetBpm: game.targetBpm,
      status: game.status as GameResponse["status"],
      seed: game.seed,
      challengeSourceId: game.challengeSourceId,
      dailyDate: game.dailyDate,
      createdAt: game.createdAt.toISOString(),
      finishedAt: game.finishedAt?.toISOString() ?? null,
      players: game.players.map((p) => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        score: p.score,
        achievedBpm: p.achievedBpmX100 ? formatBpm(p.achievedBpmX100) : null,
        driftMs: p.driftMs,
        stdDevMs: p.stdDevMsX100 ? formatBpm(p.stdDevMsX100) : null,
        tapCount: p.tapCount,
      })),
      challengeSource: game.challengeSource
        ? {
            id: game.challengeSource.id,
            players: game.challengeSource.players.map((p) => ({
              name: p.name,
              score: p.score,
              driftMs: p.driftMs,
              achievedBpm: p.achievedBpmX100 ? formatBpm(p.achievedBpmX100) : null,
            })),
          }
        : null,
    };

    res.json(response);
  } catch (err) {
    logger.error("Failed to fetch game", err);
    res.status(500).json({ error: "Failed to fetch game" });
  }
});

router.get("/games/:id/og", async (req, res) => {
  try {
    const ogInclude = {
      players: {
        where: { isHost: true },
        select: { name: true, score: true, driftMs: true, achievedBpmX100: true },
        take: 1,
      },
    } as const;

    const game = await findGameByIdOrShareCode(req.params.id, ogInclude);
    if (!game || game.players.length === 0)
      return res.status(404).json({ error: "Game not found" });

    const player = game.players[0]!;
    const achievedBpm = player.achievedBpmX100 ? formatBpm(player.achievedBpmX100) : 0;
    const message = player.score ? getRandomMessage(player.score) : "";
    const scoreColor = ogScoreColorHex(player.score ?? 0);

    await renderOgImage(
      {
        type: "div",
        props: {
          style: {
            width: "1200px",
            height: "630px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0A0A0A",
            fontFamily: "Inter",
            padding: "60px",
          },
          children: [
            {
              type: "div",
              props: {
                style: { fontSize: "20px", color: "#4B5563", marginBottom: "12px" },
                children: "drift.gg",
              },
            },
            {
              type: "div",
              props: {
                style: { fontSize: "22px", color: "#9CA3AF", marginBottom: "28px" },
                children: player.name,
              },
            },
            {
              type: "div",
              props: {
                style: {
                  fontSize: "100px",
                  fontWeight: 700,
                  color: scoreColor,
                  lineHeight: 1,
                  marginBottom: "20px",
                },
                children: `${player.score ?? 0}/10`,
              },
            },
            {
              type: "div",
              props: {
                style: { fontSize: "32px", color: scoreColor, marginBottom: "16px" },
                children: `drift: ${player.driftMs ?? 0}ms`,
              },
            },
            {
              type: "div",
              props: {
                style: { fontSize: "18px", color: "#6B7280", marginBottom: "20px" },
                children: `Target: ${game.targetBpm} BPM → You: ${achievedBpm} BPM`,
              },
            },
            {
              type: "div",
              props: {
                style: {
                  fontSize: "16px",
                  color: "#4B5563",
                  fontStyle: "italic",
                  textAlign: "center",
                  maxWidth: "600px",
                  marginBottom: "32px",
                },
                children: `"${message}"`,
              },
            },
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#2563EB",
                  color: "#FFFFFF",
                  fontSize: "16px",
                  fontWeight: 600,
                  padding: "10px 32px",
                  borderRadius: "12px",
                },
                children: "Can you beat this score?",
              },
            },
          ],
        },
      },
      res,
    );
  } catch (err) {
    logger.error("Failed to generate OG image", err);
    res.status(500).json({ error: "Failed to generate image" });
  }
});

router.get("/games/:id/challenge-og", async (req, res) => {
  try {
    const challengeInclude = {
      players: { where: { isHost: true }, select: { name: true, score: true }, take: 1 },
    } as const;

    const game = await findGameByIdOrShareCode(req.params.id, challengeInclude);
    if (!game || game.players.length === 0)
      return res.status(404).json({ error: "Game not found" });

    const player = game.players[0]!;
    const scoreColor = ogScoreColorHex(player.score ?? 0);

    await renderOgImage(
      {
        type: "div",
        props: {
          style: {
            width: "1200px",
            height: "630px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0A0A0A",
            fontFamily: "Inter",
            padding: "60px",
          },
          children: [
            {
              type: "div",
              props: {
                style: { fontSize: "20px", color: "#4B5563", marginBottom: "40px" },
                children: "drift.gg",
              },
            },
            {
              type: "div",
              props: {
                style: {
                  width: "80px",
                  height: "80px",
                  borderRadius: "40px",
                  backgroundColor: "#1E3A5F",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "32px",
                  fontWeight: 700,
                  color: "#60A5FA",
                  marginBottom: "20px",
                },
                children: player.name[0]?.toUpperCase() ?? "?",
              },
            },
            {
              type: "div",
              props: {
                style: {
                  fontSize: "52px",
                  fontWeight: 700,
                  color: "#FFFFFF",
                  lineHeight: 1.2,
                  marginBottom: "8px",
                },
                children: player.name,
              },
            },
            {
              type: "div",
              props: {
                style: { fontSize: "24px", color: "#6B7280", marginBottom: "28px" },
                children: "challenges you to beat",
              },
            },
            {
              type: "div",
              props: {
                style: {
                  fontSize: "80px",
                  fontWeight: 700,
                  color: scoreColor,
                  lineHeight: 1,
                  marginBottom: "12px",
                },
                children: `${player.score ?? 0}/10`,
              },
            },
            {
              type: "div",
              props: {
                style: { fontSize: "20px", color: "#4B5563", marginBottom: "36px" },
                children: `at ${game.targetBpm} BPM`,
              },
            },
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#2563EB",
                  color: "#FFFFFF",
                  fontSize: "20px",
                  fontWeight: 600,
                  padding: "14px 40px",
                  borderRadius: "14px",
                },
                children: "Think you can keep the beat?",
              },
            },
          ],
        },
      },
      res,
    );
  } catch (err) {
    logger.error("Failed to generate challenge OG image", err);
    res.status(500).json({ error: "Failed to generate image" });
  }
});

router.get("/rooms/:code", async (req, res) => {
  try {
    const code = normalizeRoomCode(req.params.code);
    const game = await prisma.game.findUnique({
      where: { code },
      include: { players: { where: { isHost: true }, select: { name: true }, take: 1 } },
    });

    if (!game || game.players.length === 0)
      return res.status(404).json({ error: "Room not found" });

    res.json({
      hostName: game.players[0]!.name,
      code: game.code,
      targetBpm: game.targetBpm,
      status: game.status,
    });
  } catch (err) {
    logger.error("Failed to fetch room", err);
    res.status(500).json({ error: "Failed to fetch room" });
  }
});

router.get("/rooms/:code/og", async (req, res) => {
  try {
    const code = normalizeRoomCode(req.params.code);
    const game = await prisma.game.findUnique({
      where: { code },
      include: { players: { where: { isHost: true }, select: { name: true }, take: 1 } },
    });

    if (!game || game.players.length === 0)
      return res.status(404).json({ error: "Room not found" });

    const hostName = game.players[0]!.name;

    await renderOgImage(
      {
        type: "div",
        props: {
          style: {
            width: "1200px",
            height: "630px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0A0A0A",
            fontFamily: "Inter",
            padding: "60px",
          },
          children: [
            {
              type: "div",
              props: {
                style: { fontSize: "20px", color: "#4B5563", marginBottom: "40px" },
                children: "drift.gg",
              },
            },
            {
              type: "div",
              props: {
                style: {
                  width: "80px",
                  height: "80px",
                  borderRadius: "40px",
                  backgroundColor: "#1E3A5F",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "32px",
                  fontWeight: 700,
                  color: "#60A5FA",
                  marginBottom: "20px",
                },
                children: hostName[0]?.toUpperCase() ?? "?",
              },
            },
            {
              type: "div",
              props: {
                style: {
                  fontSize: "56px",
                  fontWeight: 700,
                  color: "#FFFFFF",
                  lineHeight: 1.2,
                  textAlign: "center",
                  marginBottom: "12px",
                },
                children: hostName,
              },
            },
            {
              type: "div",
              props: {
                style: { fontSize: "28px", color: "#6B7280", marginBottom: "48px" },
                children: "challenged you to a rhythm battle",
              },
            },
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#2563EB",
                  color: "#FFFFFF",
                  fontSize: "22px",
                  fontWeight: 600,
                  padding: "16px 48px",
                  borderRadius: "16px",
                },
                children: "Think you can keep the beat?",
              },
            },
          ],
        },
      },
      res,
      "public, max-age=3600",
    );
  } catch (err) {
    logger.error("Failed to generate room OG image", err);
    res.status(500).json({ error: "Failed to generate image" });
  }
});

export default router;
