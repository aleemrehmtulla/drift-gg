export const BPM_MIN = 80;
export const BPM_MAX = 160;

export const PHASE_DURATIONS = {
  easy: { phase1: 6_000, phase2: 6_000 },
  hard: { phase1: 4_000, phase2: 4_000 },
} as const;

export const COUNTDOWN_DURATION = 3_000;
export const TRANSITION_DURATION = 500;
export const SUBMIT_TIMEOUT = 5_000;
export const ROOM_CLEANUP_DELAY = 5 * 60 * 1000;

export const MIN_TAPS_TO_SCORE = 4;
export const MAX_PLAYER_NAME_LENGTH = 20;
export const ROOM_CODE_LENGTH = 6;
export const SHARE_CODE_LENGTH = 7;
export const MAX_ROOM_PLAYERS = 4;

export const TAP_DEBOUNCE_MS = 50;

export const SOCKET_EVENTS = {
  ROOM_CREATE: "room:create",
  ROOM_CREATED: "room:created",
  ROOM_JOIN: "room:join",
  ROOM_JOINED: "room:joined",
  ROOM_PLAYER_LEFT: "room:player-left",
  GAME_START: "game:start",
  GAME_START_SOLO: "game:start-solo",
  GAME_COUNTDOWN: "game:countdown",
  GAME_PHASE1: "game:phase1",
  GAME_PHASE2: "game:phase2",
  GAME_SUBMIT: "game:submit",
  GAME_FINISHED: "game:finished",
  ERROR: "error",
} as const;

export const ACCURACY_THRESHOLDS = {
  easy: [
    { maxDeviation: 0.025, points: 5 },
    { maxDeviation: 0.06, points: 4 },
    { maxDeviation: 0.11, points: 3 },
    { maxDeviation: 0.20, points: 2 },
    { maxDeviation: 0.35, points: 1 },
  ],
} as const;

export const CONSISTENCY_THRESHOLDS = {
  easy: [
    { maxStdDev: 25, points: 5 },
    { maxStdDev: 50, points: 4 },
    { maxStdDev: 80, points: 3 },
    { maxStdDev: 130, points: 2 },
    { maxStdDev: 200, points: 1 },
  ],
} as const;

export const HARD_SCORING = {
  ACCURACY_WEIGHT: 7,
  ACCURACY_DECAY: 12,
  CONSISTENCY_WEIGHT: 3,
  CONSISTENCY_DECAY: 0.02,
  TAP_BONUS_MAX: 0.5,
} as const;

export const AUDIO = {
  SCHEDULE_AHEAD_S: 0.1,
  CHECK_INTERVAL_MS: 25,
  BEAT_FREQ: 960,
  BEAT_DURATION: 0.05,
  BEAT_GAIN: 0.45,
  TAP_FREQ: 800,
  TAP_DURATION: 0.035,
  TAP_GAIN: 0.22,
  COUNTDOWN_FREQS: [262, 330, 392],
  COUNTDOWN_DURATION: 0.28,
} as const;
