import type { Server } from "socket.io";
import {
  SOCKET_EVENTS,
  COUNTDOWN_DURATION,
  PHASE_DURATIONS,
  SUBMIT_TIMEOUT,
  TRANSITION_DURATION,
  calculateScore,
  toBpmX100,
  toStdDevX100,
} from "@repo/shared";
import type { Difficulty, GameSubmitPayload, PlayerResult } from "@repo/shared";
import { getRandomMessage } from "@repo/shared/messages";
import { prisma } from "../db.js";
import { logger } from "@repo/shared/logger";
import {
  getRoom,
  scheduleCleanup,
  setSoloGame,
  addSoloGameTimer,
  getSoloGame,
  deleteSoloGame,
} from "../socket/rooms.js";

export function startGameForRoom(io: Server, code: string): void {
  const room = getRoom(code);
  if (!room) return;

  room.status = "countdown";

  io.to(code).emit(SOCKET_EVENTS.GAME_COUNTDOWN, {
    startsIn: COUNTDOWN_DURATION,
  });

  const durations = PHASE_DURATIONS[room.difficulty];

  const t1 = setTimeout(() => {
    const r = getRoom(code);
    if (!r || r.status === "finished") return;
    r.status = "playing";
    io.to(code).emit(SOCKET_EVENTS.GAME_PHASE1, {
      bpm: r.bpm,
      duration: durations.phase1,
    });

    const t2 = setTimeout(() => {
      if (!getRoom(code)) return;
      io.to(code).emit(SOCKET_EVENTS.GAME_PHASE2, {
        duration: durations.phase2,
      });

      const t3 = setTimeout(() => {
        if (!getRoom(code)) return;
        waitForSubmissions(io, code);
      }, durations.phase2 + TRANSITION_DURATION);
      room.gameTimers.push(t3);
    }, durations.phase1);
    room.gameTimers.push(t2);
  }, COUNTDOWN_DURATION);
  room.gameTimers.push(t1);
}

function waitForSubmissions(io: Server, code: string): void {
  const room = getRoom(code);
  if (!room) return;

  const fallbackTimeout = setTimeout(() => {
    clearInterval(checkInterval);
    finalizeRoom(io, code);
  }, SUBMIT_TIMEOUT);
  room.gameTimers.push(fallbackTimeout);

  const checkInterval = setInterval(() => {
    if (room.submittedResults.size >= room.players.size) {
      clearInterval(checkInterval);
      clearTimeout(fallbackTimeout);
      finalizeRoom(io, code);
    }
  }, 200);
  room.gameTimers.push(checkInterval);
}

async function finalizeRoom(io: Server, code: string): Promise<void> {
  const room = getRoom(code);
  if (!room || room.status === "finished") return;

  room.status = "finished";

  const results: PlayerResult[] = [];

  for (const [socketId, player] of room.players) {
    const submission = room.submittedResults.get(socketId);
    const scoreResult = submission
      ? calculateScore({
          targetBpm: room.bpm,
          tapTimestamps: submission.tapTimestamps,
          difficulty: room.difficulty,
        })
      : null;

    const message = scoreResult ? getRandomMessage(scoreResult.score) : getRandomMessage(1);

    const playerResult: PlayerResult = {
      name: player.name,
      score: scoreResult?.score ?? 1,
      driftMs: scoreResult?.driftMs ?? 9999,
      achievedBpm: scoreResult?.achievedBpm ?? 0,
      stdDevMs: scoreResult?.stdDevMs ?? 9999,
      tapCount: scoreResult?.tapCount ?? 0,
      message,
      tapIntervalOffsets: scoreResult?.tapIntervalOffsets ?? [],
    };
    results.push(playerResult);

    try {
      await prisma.player.updateMany({
        where: { gameId: room.gameId, sessionId: socketId },
        data: {
          score: playerResult.score,
          achievedBpmX100: toBpmX100(playerResult.achievedBpm),
          driftMs: playerResult.driftMs,
          stdDevMsX100: toStdDevX100(playerResult.stdDevMs),
          tapCount: playerResult.tapCount,
          tapTimestamps: submission?.tapTimestamps ?? [],
        },
      });
    } catch (err) {
      logger.error("Failed to save player results", err);
    }
  }

  try {
    await prisma.game.update({
      where: { id: room.gameId },
      data: { status: "finished", finishedAt: new Date() },
    });
  } catch (err) {
    logger.error("Failed to finalize game", err);
  }

  io.to(code).emit(SOCKET_EVENTS.GAME_FINISHED, {
    gameId: room.gameId,
    shareCode: room.shareCode,
    results,
  });

  scheduleCleanup(code);
}

export function startSoloGame(
  io: Server,
  socketId: string,
  gameId: string,
  shareCode: string,
  bpm: number,
  difficulty: Difficulty,
): void {
  setSoloGame(socketId, gameId, shareCode, bpm, difficulty);

  const socket = io.sockets.sockets.get(socketId);
  if (!socket) return;

  socket.emit(SOCKET_EVENTS.GAME_COUNTDOWN, {
    startsIn: COUNTDOWN_DURATION,
  });

  const durations = PHASE_DURATIONS[difficulty];

  const t1 = setTimeout(() => {
    socket.emit(SOCKET_EVENTS.GAME_PHASE1, {
      bpm,
      duration: durations.phase1,
    });

    const t2 = setTimeout(() => {
      socket.emit(SOCKET_EVENTS.GAME_PHASE2, {
        duration: durations.phase2,
      });
    }, durations.phase1);
    addSoloGameTimer(socketId, t2);
  }, COUNTDOWN_DURATION);
  addSoloGameTimer(socketId, t1);
}

export async function finalizeSoloGame(
  io: Server,
  socketId: string,
  submission: GameSubmitPayload,
): Promise<void> {
  const soloGame = getSoloGame(socketId);
  if (!soloGame) return;

  const { gameId, shareCode, bpm, difficulty } = soloGame;
  deleteSoloGame(socketId);

  const scoreResult = calculateScore({
    targetBpm: bpm,
    tapTimestamps: submission.tapTimestamps,
    difficulty,
  });

  const message = getRandomMessage(scoreResult.score);

  try {
    await prisma.player.updateMany({
      where: { gameId, sessionId: socketId },
      data: {
        score: scoreResult.score,
        achievedBpmX100: toBpmX100(scoreResult.achievedBpm),
        driftMs: scoreResult.driftMs,
        stdDevMsX100: toStdDevX100(scoreResult.stdDevMs),
        tapCount: scoreResult.tapCount,
        tapTimestamps: submission.tapTimestamps,
      },
    });

    await prisma.game.update({
      where: { id: gameId },
      data: { status: "finished", finishedAt: new Date() },
    });
  } catch (err) {
    logger.error("Failed to save solo game results", err);
  }

  const socket = io.sockets.sockets.get(socketId);
  if (!socket) return;

  const playerResult: PlayerResult = {
    name: "Player",
    score: scoreResult.score,
    driftMs: scoreResult.driftMs,
    achievedBpm: scoreResult.achievedBpm,
    stdDevMs: scoreResult.stdDevMs,
    tapCount: scoreResult.tapCount,
    message,
    tapIntervalOffsets: scoreResult.tapIntervalOffsets,
  };

  try {
    const player = await prisma.player.findFirst({
      where: { gameId, sessionId: socketId },
      select: { name: true },
    });
    if (player) playerResult.name = player.name;
  } catch (err) {
    logger.error("Failed to get player name", err);
  }

  socket.emit(SOCKET_EVENTS.GAME_FINISHED, {
    gameId,
    shareCode,
    results: [playerResult],
  });
}
