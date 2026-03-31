import type { Server, Socket } from "socket.io";
import {
  SOCKET_EVENTS,
  MAX_PLAYER_NAME_LENGTH,
  MAX_ROOM_PLAYERS,
  BPM_MIN,
  BPM_MAX,
  randomBpm,
  seedToBpm,
  generateShareCode,
} from "@repo/shared";
import type {
  RoomCreatePayload,
  RoomJoinPayload,
  GameStartSoloPayload,
  GameSubmitPayload,
  PlayerInfo,
} from "@repo/shared";
import { logger } from "@repo/shared/logger";
import { prisma } from "../db.js";
import {
  createRoom,
  getRoom,
  getRoomBySocket,
  addPlayerToRoom,
  removePlayerFromRoom,
  getSoloGame,
  deleteSoloGame,
} from "./rooms.js";
import { generateUniqueRoomCode } from "../game/room-codes.js";
import { startGameForRoom, startSoloGame, finalizeSoloGame } from "../game/state-machine.js";
import { getDailyBpm } from "../game/daily.js";
import { createSocketAbuseProtection } from "../middleware/rate-limit.js";

const socketRateLimit = createSocketAbuseProtection(30);

function getSocketIp(socket: Socket): string {
  return socket.handshake.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim()
    || socket.handshake.address
    || socket.id;
}

function emitError(socket: Socket, message: string, code: string): void {
  socket.emit(SOCKET_EVENTS.ERROR, { message, code });
}

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_PLAYER_NAME_LENGTH) return trimmed.slice(0, MAX_PLAYER_NAME_LENGTH);
  return trimmed;
}

function isValidDifficulty(d: unknown): d is "easy" | "hard" {
  return d === "easy" || d === "hard";
}

export function registerHandlers(io: Server, socket: Socket): void {
  socket.on(SOCKET_EVENTS.ROOM_CREATE, async (payload: RoomCreatePayload) => {
    if (!socketRateLimit(getSocketIp(socket))) return;

    const name = validateName(payload.playerName);
    if (!name) return emitError(socket, "Name is required", "INVALID_NAME");
    if (!isValidDifficulty(payload.difficulty)) return emitError(socket, "Invalid difficulty", "INVALID_DIFFICULTY");

    const code = generateUniqueRoomCode();
    const bpm = randomBpm();
    const shareCode = generateShareCode();

    try {
      const game = await prisma.game.create({
        data: {
          code,
          shareCode,
          mode: "multiplayer",
          difficulty: payload.difficulty,
          targetBpm: bpm,
          status: "waiting",
        },
      });

      const player = await prisma.player.create({
        data: {
          gameId: game.id,
          name,
          sessionId: socket.id,
          isHost: true,
        },
      });

      createRoom(code, game.id, shareCode, payload.difficulty, bpm, socket.id, player.id, name);
      socket.join(code);

      socket.emit(SOCKET_EVENTS.ROOM_CREATED, { code, gameId: game.id });
      logger.info(`Room ${code} created by ${name}`);
    } catch (err) {
      logger.error("Failed to create room", err);
      emitError(socket, "Failed to create room", "CREATE_FAILED");
    }
  });

  socket.on(SOCKET_EVENTS.ROOM_JOIN, async (payload: RoomJoinPayload) => {
    if (!socketRateLimit(getSocketIp(socket))) return;

    const name = validateName(payload.playerName);
    if (!name) return emitError(socket, "Name is required", "INVALID_NAME");

    const code = payload.code.toUpperCase().replace(/^DRIFT-/, "").replace(/[\s\-]/g, "").trim();
    const room = getRoom(code);

    if (!room) return emitError(socket, "Room not found", "ROOM_NOT_FOUND");
    if (room.status !== "waiting") return emitError(socket, "Game already started", "GAME_STARTED");
    if (room.players.size >= MAX_ROOM_PLAYERS) return emitError(socket, "Room is full (max 4 players)", "ROOM_FULL");

    try {
      const player = await prisma.player.create({
        data: {
          gameId: room.gameId,
          name,
          sessionId: socket.id,
          isHost: false,
        },
      });

      addPlayerToRoom(code, socket.id, player.id, name);
      socket.join(code);

      const players: PlayerInfo[] = [];
      for (const p of room.players.values()) {
        players.push({ id: p.id, name: p.name, isHost: p.isHost });
      }

      io.to(code).emit(SOCKET_EVENTS.ROOM_JOINED, { players });
      logger.info(`${name} joined room ${code}`);
    } catch (err) {
      logger.error("Failed to join room", err);
      emitError(socket, "Failed to join room", "JOIN_FAILED");
    }
  });

  socket.on(SOCKET_EVENTS.GAME_START, () => {
    if (!socketRateLimit(getSocketIp(socket))) return;

    const room = getRoomBySocket(socket.id);
    if (!room) return emitError(socket, "Not in a room", "NOT_IN_ROOM");

    const player = room.players.get(socket.id);
    if (!player?.isHost) return emitError(socket, "Only host can start", "NOT_HOST");
    if (room.status !== "waiting") return emitError(socket, "Game already started", "GAME_STARTED");

    startGameForRoom(io, room.code);
  });

  socket.on(SOCKET_EVENTS.GAME_START_SOLO, async (payload: GameStartSoloPayload) => {
    if (!socketRateLimit(getSocketIp(socket))) return;

    const name = validateName(payload.playerName);
    if (!name) return emitError(socket, "Name is required", "INVALID_NAME");
    if (!isValidDifficulty(payload.difficulty)) return emitError(socket, "Invalid difficulty", "INVALID_DIFFICULTY");

    const previousGame = getSoloGame(socket.id);
    if (previousGame) {
      deleteSoloGame(socket.id);
      prisma.game.update({
        where: { id: previousGame.gameId },
        data: { status: "abandoned" },
      }).catch((err) => logger.error("Failed to mark abandoned game", err));
    }

    let bpm: number;
    let difficulty = payload.difficulty;
    let seed: number | undefined;
    let mode: "solo" | "daily" | "challenge" = "solo";
    let dailyDate: string | undefined;
    let challengeSourceId: string | undefined;

    if (payload.challengeSourceId) {
      mode = "challenge";
      challengeSourceId = payload.challengeSourceId;
      let sourceGame = await prisma.game.findUnique({
        where: { id: challengeSourceId },
        select: { id: true, targetBpm: true, seed: true, difficulty: true },
      });
      if (!sourceGame) {
        sourceGame = await prisma.game.findUnique({
          where: { shareCode: challengeSourceId.toUpperCase() },
          select: { id: true, targetBpm: true, seed: true, difficulty: true },
        });
      }
      if (!sourceGame) return emitError(socket, "Challenge source not found", "SOURCE_NOT_FOUND");
      challengeSourceId = sourceGame.id;
      bpm = sourceGame.targetBpm;
      seed = sourceGame.seed ?? undefined;
      difficulty = isValidDifficulty(sourceGame.difficulty) ? sourceGame.difficulty : difficulty;
    } else if (payload.seed !== undefined) {
      seed = payload.seed;
      const dailyInfo = getDailyBpm();
      if (seed === dailyInfo.seed) {
        mode = "daily";
        dailyDate = dailyInfo.date;
        bpm = dailyInfo.bpm;
      } else {
        bpm = seedToBpm(seed);
      }
    } else if (
      typeof payload.clientBpm === "number" &&
      Number.isInteger(payload.clientBpm) &&
      payload.clientBpm >= BPM_MIN &&
      payload.clientBpm <= BPM_MAX
    ) {
      bpm = payload.clientBpm;
    } else {
      bpm = randomBpm();
    }

    try {
      const shareCode = generateShareCode();
      const game = await prisma.game.create({
        data: {
          mode,
          difficulty,
          targetBpm: bpm,
          seed: seed ?? null,
          dailyDate: dailyDate ?? null,
          challengeSourceId: challengeSourceId ?? null,
          shareCode,
          status: "waiting",
        },
      });

      await prisma.player.create({
        data: {
          gameId: game.id,
          name,
          sessionId: socket.id,
          isHost: true,
        },
      });

      startSoloGame(io, socket.id, game.id, shareCode, bpm, difficulty);
      logger.info(`Solo game ${game.id} started by ${name} at ${bpm} BPM`);
    } catch (err) {
      logger.error("Failed to start solo game", err);
      emitError(socket, "Failed to start game", "START_FAILED");
    }
  });

  socket.on(SOCKET_EVENTS.GAME_SUBMIT, (payload: GameSubmitPayload) => {
    if (!socketRateLimit(getSocketIp(socket))) return;

    if (
      !payload ||
      !Array.isArray(payload.tapTimestamps) ||
      payload.tapTimestamps.length > 10_000 ||
      !payload.tapTimestamps.every((t) => typeof t === "number" && Number.isFinite(t))
    ) {
      return emitError(socket, "Invalid submission", "INVALID_PAYLOAD");
    }

    try {
      const room = getRoomBySocket(socket.id);
      if (room) {
        room.submittedResults.set(socket.id, payload);
        return;
      }

      finalizeSoloGame(io, socket.id, payload);
    } catch (err) {
      logger.error("Failed to process game submission", err);
      emitError(socket, "Failed to submit results", "SUBMIT_FAILED");
    }
  });

  socket.on("disconnect", () => {
    deleteSoloGame(socket.id);

    const result = removePlayerFromRoom(socket.id);
    if (result) {
      const { room, player } = result;
      io.to(room.code).emit(SOCKET_EVENTS.ROOM_PLAYER_LEFT, {
        playerId: player.id,
        name: player.name,
      });
      logger.info(`${player.name} left room ${room.code}`);
    }
  });
}
