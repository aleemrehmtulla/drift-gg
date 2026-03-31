import type { Difficulty, GameStatus, GameSubmitPayload } from "@repo/shared";
import { ROOM_CLEANUP_DELAY } from "@repo/shared";
import { logger } from "@repo/shared/logger";

interface RoomPlayer {
  id: string;
  name: string;
  isHost: boolean;
  socketId: string;
}

interface GameRoom {
  gameId: string;
  shareCode: string;
  code: string;
  difficulty: Difficulty;
  bpm: number;
  status: GameStatus;
  players: Map<string, RoomPlayer>;
  submittedResults: Map<string, GameSubmitPayload>;
  cleanupTimer?: ReturnType<typeof setTimeout>;
  gameTimers: ReturnType<typeof setTimeout>[];
}

const rooms = new Map<string, GameRoom>();
const socketToRoom = new Map<string, string>();

export function createRoom(
  code: string,
  gameId: string,
  shareCode: string,
  difficulty: Difficulty,
  bpm: number,
  hostSocketId: string,
  hostPlayerId: string,
  hostName: string
): GameRoom {
  const room: GameRoom = {
    gameId,
    shareCode,
    code,
    difficulty,
    bpm,
    status: "waiting",
    players: new Map(),
    submittedResults: new Map(),
    gameTimers: [],
  };
  room.players.set(hostSocketId, {
    id: hostPlayerId,
    name: hostName,
    isHost: true,
    socketId: hostSocketId,
  });
  rooms.set(code, room);
  socketToRoom.set(hostSocketId, code);
  return room;
}

export function getRoom(code: string): GameRoom | undefined {
  return rooms.get(code);
}

export function getRoomBySocket(socketId: string): GameRoom | undefined {
  const code = socketToRoom.get(socketId);
  if (!code) return undefined;
  return rooms.get(code);
}

export function addPlayerToRoom(
  code: string,
  socketId: string,
  playerId: string,
  name: string
): GameRoom | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;
  if (room.cleanupTimer) {
    clearTimeout(room.cleanupTimer);
    room.cleanupTimer = undefined;
  }
  room.players.set(socketId, {
    id: playerId,
    name,
    isHost: false,
    socketId,
  });
  socketToRoom.set(socketId, code);
  return room;
}

export function removePlayerFromRoom(socketId: string): {
  room: GameRoom;
  player: RoomPlayer;
} | undefined {
  const code = socketToRoom.get(socketId);
  if (!code) return undefined;
  const room = rooms.get(code);
  if (!room) return undefined;
  const player = room.players.get(socketId);
  if (!player) return undefined;

  room.players.delete(socketId);
  socketToRoom.delete(socketId);

  if (room.players.size === 0) {
    scheduleCleanup(code);
  }

  return { room, player };
}

export function scheduleCleanup(code: string): void {
  const room = rooms.get(code);
  if (!room) return;

  if (room.cleanupTimer) clearTimeout(room.cleanupTimer);

  room.gameTimers.forEach(clearTimeout);
  room.gameTimers = [];

  room.cleanupTimer = setTimeout(() => {
    for (const [socketId, roomCode] of socketToRoom) {
      if (roomCode === code) socketToRoom.delete(socketId);
    }
    rooms.delete(code);
    logger.debug(`Room ${code} cleaned up`);
  }, ROOM_CLEANUP_DELAY);
}

interface SoloGameEntry {
  gameId: string;
  shareCode: string;
  bpm: number;
  difficulty: Difficulty;
  timers: ReturnType<typeof setTimeout>[];
  createdAt: number;
}

const soloGames = new Map<string, SoloGameEntry>();

const SOLO_GAME_TTL_MS = 5 * 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of soloGames) {
    if (now - entry.createdAt > SOLO_GAME_TTL_MS) {
      entry.timers.forEach(clearTimeout);
      soloGames.delete(key);
      logger.debug(`Solo game for socket ${key} expired after TTL`);
    }
  }
}, 60_000);

export function setSoloGame(socketId: string, gameId: string, shareCode: string, bpm: number, difficulty: Difficulty): void {
  const existing = soloGames.get(socketId);
  if (existing) {
    existing.timers.forEach(clearTimeout);
  }
  soloGames.set(socketId, { gameId, shareCode, bpm, difficulty, timers: [], createdAt: Date.now() });
}

export function addSoloGameTimer(socketId: string, timer: ReturnType<typeof setTimeout>): void {
  const entry = soloGames.get(socketId);
  if (entry) entry.timers.push(timer);
}

export function getSoloGame(socketId: string): SoloGameEntry | undefined {
  return soloGames.get(socketId);
}

export function deleteSoloGame(socketId: string): void {
  const entry = soloGames.get(socketId);
  if (entry) {
    entry.timers.forEach(clearTimeout);
    soloGames.delete(socketId);
  }
}
