import { describe, it, expect } from "vitest";
import {
  getDailySeed,
  seedToBpm,
  randomBpm,
  generateRoomCode,
  generateShareCode,
  todayDateString,
  formatBpm,
  toBpmX100,
  toStdDevX100,
} from "../utils";
import { BPM_MIN, BPM_MAX, ROOM_CODE_LENGTH, SHARE_CODE_LENGTH } from "../constants";

describe("getDailySeed", () => {
  it("returns the same seed for the same date", () => {
    expect(getDailySeed("2026-03-30")).toBe(getDailySeed("2026-03-30"));
  });

  it("returns different seeds for different dates", () => {
    expect(getDailySeed("2026-03-30")).not.toBe(getDailySeed("2026-03-31"));
  });

  it("returns a non-negative number", () => {
    expect(getDailySeed("2026-01-01")).toBeGreaterThanOrEqual(0);
  });
});

describe("seedToBpm", () => {
  it("returns a BPM in the valid range", () => {
    for (let seed = 0; seed < 1000; seed++) {
      const bpm = seedToBpm(seed);
      expect(bpm).toBeGreaterThanOrEqual(BPM_MIN);
      expect(bpm).toBeLessThanOrEqual(BPM_MAX);
    }
  });

  it("is deterministic", () => {
    expect(seedToBpm(42)).toBe(seedToBpm(42));
  });
});

describe("randomBpm", () => {
  it("returns a BPM in the valid range", () => {
    for (let i = 0; i < 100; i++) {
      const bpm = randomBpm();
      expect(bpm).toBeGreaterThanOrEqual(BPM_MIN);
      expect(bpm).toBeLessThanOrEqual(BPM_MAX);
    }
  });
});

describe("generateRoomCode", () => {
  it("generates a code of the correct length", () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(ROOM_CODE_LENGTH);
  });

  it("generates uppercase letters only", () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^[A-Z]+$/);
  });
});

describe("generateShareCode", () => {
  it("generates a code of the correct length", () => {
    const code = generateShareCode();
    expect(code).toHaveLength(SHARE_CODE_LENGTH);
  });

  it("generates alphanumeric characters", () => {
    const code = generateShareCode();
    expect(code).toMatch(/^[A-Z2-9]+$/);
  });
});

describe("todayDateString", () => {
  it("returns a YYYY-MM-DD formatted string", () => {
    const date = todayDateString();
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("formatBpm", () => {
  it("converts BPM x100 back to BPM", () => {
    expect(formatBpm(12050)).toBe(120.5);
    expect(formatBpm(12000)).toBe(120);
  });
});

describe("toBpmX100 / toStdDevX100", () => {
  it("round-trips correctly", () => {
    expect(formatBpm(toBpmX100(120.5))).toBe(120.5);
    expect(formatBpm(toStdDevX100(3.14))).toBe(3.14);
  });
});

describe("score-colors", () => {
  it("returns correct colors for different score ranges", async () => {
    const { scoreColorHex, ogScoreColorHex } = await import("../score-colors");
    expect(scoreColorHex(10)).toBe("#10B981");
    expect(scoreColorHex(8)).toBe("#10B981");
    expect(scoreColorHex(3)).toBe("#EF4444");
    expect(scoreColorHex(1)).toBe("#EF4444");
    expect(scoreColorHex(5)).toBe("#2563EB");

    expect(ogScoreColorHex(10)).toBe("#34D399");
    expect(ogScoreColorHex(3)).toBe("#F87171");
    expect(ogScoreColorHex(5)).toBe("#60A5FA");
  });
});
