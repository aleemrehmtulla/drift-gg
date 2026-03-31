import { describe, it, expect } from "vitest";
import { calculateScore } from "../scoring";

function generateTaps(bpm: number, count: number, startMs = 1000): number[] {
  const interval = 60_000 / bpm;
  return Array.from({ length: count }, (_, i) => startMs + i * interval);
}

function generateTapsWithJitter(
  bpm: number,
  count: number,
  jitterPattern: number[],
  startMs = 1000,
): number[] {
  const interval = 60_000 / bpm;
  return Array.from({ length: count }, (_, i) => {
    const jitter = jitterPattern[i % jitterPattern.length]!;
    return startMs + i * interval + jitter;
  });
}

describe("calculateScore", () => {
  it("returns minimum score when fewer than MIN_TAPS_TO_SCORE taps", () => {
    const result = calculateScore({
      targetBpm: 120,
      tapTimestamps: [100, 200],
      difficulty: "hard",
    });
    expect(result.score).toBe(1);
    expect(result.tapCount).toBe(2);
    expect(result.driftMs).toBe(9999);
  });

  it("returns minimum score for zero taps", () => {
    const result = calculateScore({
      targetBpm: 120,
      tapTimestamps: [],
      difficulty: "easy",
    });
    expect(result.score).toBe(1);
    expect(result.tapCount).toBe(0);
  });

  it("gives a perfect score for perfectly timed taps on easy", () => {
    const taps = generateTaps(120, 10);
    const result = calculateScore({
      targetBpm: 120,
      tapTimestamps: taps,
      difficulty: "easy",
    });
    expect(result.score).toBe(10);
    expect(result.driftMs).toBe(0);
    expect(result.achievedBpm).toBeCloseTo(120, 0);
  });

  it("gives a perfect score for perfectly timed taps on hard", () => {
    const taps = generateTaps(100, 8);
    const result = calculateScore({
      targetBpm: 100,
      tapTimestamps: taps,
      difficulty: "hard",
    });
    expect(result.score).toBe(10);
    expect(result.driftMs).toBe(0);
  });

  it("hard mode: zero drift with good consistency scores 9+", () => {
    const taps = [1000, 1485, 2000, 2490, 3000, 3495, 4000, 4488, 5000];
    const result = calculateScore({
      targetBpm: 120,
      tapTimestamps: taps,
      difficulty: "hard",
    });
    expect(result.driftMs).toBe(0);
    expect(result.score).toBeGreaterThanOrEqual(9);
  });

  it("hard mode: 3% deviation with realistic jitter lands mid-range", () => {
    const offBpm = 120 * 1.03;
    const taps = generateTapsWithJitter(
      offBpm, 8,
      [0, -10, 12, -15, 8, -12, 10, -8],
    );
    const result = calculateScore({
      targetBpm: 120,
      tapTimestamps: taps,
      difficulty: "hard",
    });
    expect(result.score).toBeGreaterThanOrEqual(4);
    expect(result.score).toBeLessThanOrEqual(7);
  });

  it("hard mode: 5%+ deviation with jitter is tough but not a 1", () => {
    const offBpm = 120 * 1.05;
    const taps = generateTapsWithJitter(
      offBpm, 8,
      [0, -15, 15, -20, 20, -10, 10, -5],
    );
    const result = calculateScore({
      targetBpm: 120,
      tapTimestamps: taps,
      difficulty: "hard",
    });
    expect(result.score).toBeGreaterThanOrEqual(3);
    expect(result.score).toBeLessThanOrEqual(6);
  });

  it("hard mode: 10%+ deviation with jitter scores low", () => {
    const offBpm = 120 * 1.10;
    const taps = generateTapsWithJitter(
      offBpm, 8,
      [0, -20, 25, -30, 20, -15, 18, -10],
    );
    const result = calculateScore({
      targetBpm: 120,
      tapTimestamps: taps,
      difficulty: "hard",
    });
    expect(result.score).toBeLessThanOrEqual(5);
    expect(result.score).toBeGreaterThanOrEqual(2);
  });

  it("penalizes incorrect BPM", () => {
    const taps = generateTaps(150, 8);
    const result = calculateScore({
      targetBpm: 120,
      tapTimestamps: taps,
      difficulty: "hard",
    });
    expect(result.score).toBeLessThan(10);
    expect(result.achievedBpm).toBeCloseTo(150, 0);
  });

  it("returns tapIntervalOffsets for each interval", () => {
    const taps = generateTaps(120, 6);
    const result = calculateScore({
      targetBpm: 120,
      tapTimestamps: taps,
      difficulty: "easy",
    });
    expect(result.tapIntervalOffsets).toHaveLength(5);
    result.tapIntervalOffsets.forEach((offset) => {
      expect(Math.abs(offset)).toBeLessThan(1);
    });
  });

  it("score is always at least 1", () => {
    const taps = generateTaps(300, 4);
    const result = calculateScore({
      targetBpm: 80,
      tapTimestamps: taps,
      difficulty: "hard",
    });
    expect(result.score).toBeGreaterThanOrEqual(1);
  });

  it("computes stdDevMs correctly for uniform taps", () => {
    const taps = generateTaps(120, 10);
    const result = calculateScore({
      targetBpm: 120,
      tapTimestamps: taps,
      difficulty: "easy",
    });
    expect(result.stdDevMs).toBe(0);
  });

  it("returns minimum score for 3 taps (below MIN_TAPS_TO_SCORE)", () => {
    const result = calculateScore({
      targetBpm: 120,
      tapTimestamps: [1000, 1500, 2000],
      difficulty: "hard",
    });
    expect(result.score).toBe(1);
    expect(result.tapCount).toBe(3);
  });

  it("hard mode: tap bonus rewards full engagement", () => {
    const fewTaps = generateTaps(120, 5);
    const manyTaps = generateTaps(120, 9);
    const few = calculateScore({ targetBpm: 120, tapTimestamps: fewTaps, difficulty: "hard" });
    const many = calculateScore({ targetBpm: 120, tapTimestamps: manyTaps, difficulty: "hard" });
    expect(many.tapBonus).toBeGreaterThan(few.tapBonus);
    expect(many.score).toBeGreaterThanOrEqual(few.score);
  });

  it("easy mode: no tap bonus applied", () => {
    const taps = generateTaps(120, 10);
    const result = calculateScore({ targetBpm: 120, tapTimestamps: taps, difficulty: "easy" });
    expect(result.tapBonus).toBe(0);
  });
});
