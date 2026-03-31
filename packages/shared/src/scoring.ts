import {
  ACCURACY_THRESHOLDS,
  CONSISTENCY_THRESHOLDS,
  HARD_SCORING,
  MIN_TAPS_TO_SCORE,
  PHASE_DURATIONS,
} from "./constants";
import type { Difficulty } from "./types";

export interface ScoreInput {
  targetBpm: number;
  tapTimestamps: number[];
  difficulty: Difficulty;
}

export interface ScoreResult {
  score: number;
  achievedBpm: number;
  driftMs: number;
  stdDevMs: number;
  tapCount: number;
  accuracyPoints: number;
  consistencyPoints: number;
  tapBonus: number;
  tapIntervalOffsets: number[];
}

export function calculateScore(input: ScoreInput): ScoreResult {
  const { targetBpm, tapTimestamps, difficulty } = input;
  const tapCount = tapTimestamps.length;

  if (tapCount < MIN_TAPS_TO_SCORE) {
    return {
      score: 1,
      achievedBpm: 0,
      driftMs: 9999,
      stdDevMs: 9999,
      tapCount,
      accuracyPoints: 0,
      consistencyPoints: 0,
      tapBonus: 0,
      tapIntervalOffsets: [],
    };
  }

  const intervals = tapTimestamps.slice(1).map((t, i) => t - tapTimestamps[i]!);

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const achievedBpm = Math.round((60_000 / avgInterval) * 100) / 100;

  const targetInterval = 60_000 / targetBpm;
  const driftMs = Math.round(Math.abs(targetInterval - avgInterval));

  const tapIntervalOffsets = intervals.map(
    (iv) => Math.round((iv - targetInterval) * 10) / 10,
  );

  const variance =
    intervals.reduce((sum, iv) => sum + (iv - avgInterval) ** 2, 0) /
    intervals.length;
  const stdDevMs = Math.round(Math.sqrt(variance) * 100) / 100;

  const deviation = Math.abs(avgInterval - targetInterval) / targetInterval;

  let accuracyPoints: number;
  let consistencyPoints: number;
  let tapBonus = 0;

  if (difficulty === "hard") {
    accuracyPoints =
      HARD_SCORING.ACCURACY_WEIGHT *
      Math.exp(-HARD_SCORING.ACCURACY_DECAY * deviation);
    consistencyPoints =
      HARD_SCORING.CONSISTENCY_WEIGHT *
      Math.exp(-HARD_SCORING.CONSISTENCY_DECAY * stdDevMs);

    const expectedIntervals = Math.floor(
      PHASE_DURATIONS.hard.phase2 / targetInterval,
    );
    const tapRatio = Math.min(1, intervals.length / expectedIntervals);
    tapBonus =
      Math.round(tapRatio * HARD_SCORING.TAP_BONUS_MAX * 100) / 100;
  } else {
    accuracyPoints = 0;
    for (const t of ACCURACY_THRESHOLDS[difficulty]) {
      if (deviation < t.maxDeviation) {
        accuracyPoints = t.points;
        break;
      }
    }

    consistencyPoints = 0;
    for (const t of CONSISTENCY_THRESHOLDS[difficulty]) {
      if (stdDevMs < t.maxStdDev) {
        consistencyPoints = t.points;
        break;
      }
    }
  }

  const raw = accuracyPoints + consistencyPoints + tapBonus;
  const score = Math.max(1, Math.min(10, Math.round(raw)));

  return {
    score,
    achievedBpm,
    driftMs,
    stdDevMs,
    tapCount,
    accuracyPoints,
    consistencyPoints,
    tapBonus,
    tapIntervalOffsets,
  };
}
