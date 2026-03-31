import { BPM_MIN, BPM_MAX, ROOM_CODE_LENGTH, SHARE_CODE_LENGTH } from "./constants";

export function getDailySeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function seedToBpm(seed: number): number {
  return BPM_MIN + (seed % (BPM_MAX - BPM_MIN + 1));
}

export function randomBpm(): number {
  return Math.floor(Math.random() * (BPM_MAX - BPM_MIN + 1)) + BPM_MIN;
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

const SHARE_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateShareCode(): string {
  let code = "";
  for (let i = 0; i < SHARE_CODE_LENGTH; i++) {
    code += SHARE_CODE_CHARS[Math.floor(Math.random() * SHARE_CODE_CHARS.length)];
  }
  return code;
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatBpm(bpmX100: number): number {
  return Math.round(bpmX100) / 100;
}

export function toBpmX100(bpm: number): number {
  return Math.round(bpm * 100);
}

export function toStdDevX100(stdDev: number): number {
  return Math.round(stdDev * 100);
}
