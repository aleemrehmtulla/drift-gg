export type GameMode = "solo" | "multiplayer" | "daily" | "challenge";
export type Difficulty = "easy" | "hard";
export type GameStatus = "waiting" | "countdown" | "playing" | "finished";
export type GamePhase = "idle" | "countdown" | "phase1" | "transition" | "phase2" | "results";

export interface PlayerInfo {
  id: string;
  name: string;
  isHost: boolean;
}

export interface PlayerResult {
  name: string;
  score: number;
  driftMs: number;
  achievedBpm: number;
  stdDevMs: number;
  tapCount: number;
  message: string;
  tapIntervalOffsets?: number[];
}

export interface GameConfig {
  bpm: number;
  difficulty: Difficulty;
  phase1Duration: number;
  phase2Duration: number;
}

export interface GameResult {
  gameId: string;
  shareCode?: string;
  mode: GameMode;
  difficulty: Difficulty;
  targetBpm: number;
  players: PlayerResult[];
  challengeSourceId?: string;
}

export interface RoomCreatePayload {
  playerName: string;
  difficulty: Difficulty;
}

export interface RoomJoinPayload {
  code: string;
  playerName: string;
}

export interface GameStartSoloPayload {
  playerName: string;
  difficulty: Difficulty;
  seed?: number;
  challengeSourceId?: string;
  clientBpm?: number;
}

export interface GameSubmitPayload {
  tapTimestamps: number[];
}

export interface RoomCreatedPayload {
  code: string;
  gameId: string;
}

export interface RoomJoinedPayload {
  players: PlayerInfo[];
}

export interface RoomPlayerLeftPayload {
  playerId: string;
  name: string;
}

export interface GameCountdownPayload {
  startsIn: number;
}

export interface GamePhase1Payload {
  bpm: number;
  duration: number;
}

export interface GamePhase2Payload {
  duration: number;
}

export interface GameFinishedPayload {
  gameId: string;
  shareCode?: string;
  results: PlayerResult[];
}

export interface SocketErrorPayload {
  message: string;
  code: string;
}

export interface GameResponse {
  id: string;
  shareCode: string | null;
  mode: GameMode;
  difficulty: Difficulty;
  targetBpm: number;
  status: GameStatus;
  seed: number | null;
  challengeSourceId: string | null;
  dailyDate: string | null;
  createdAt: string;
  finishedAt: string | null;
  players: {
    id: string;
    name: string;
    isHost: boolean;
    score: number | null;
    achievedBpm: number | null;
    driftMs: number | null;
    stdDevMs: number | null;
    tapCount: number | null;
  }[];
  challengeSource?: {
    id: string;
    players: {
      name: string;
      score: number | null;
      driftMs: number | null;
      achievedBpm: number | null;
    }[];
  } | null;
}

export interface DailyLeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  driftMs: number;
  achievedBpm: number;
}

export interface DailyLeaderboardResponse {
  date: string;
  bpm: number;
  entries: DailyLeaderboardEntry[];
  totalPlayers: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
