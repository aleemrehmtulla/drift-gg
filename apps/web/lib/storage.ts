import type { Difficulty } from "@repo/shared";

export function getStoredName(fallback = ""): string {
  try {
    return localStorage.getItem("drift_name") || fallback;
  } catch {
    return fallback;
  }
}

export function setStoredName(name: string): void {
  try {
    localStorage.setItem("drift_name", name);
  } catch {}
}

export function getStoredDifficulty(fallback: Difficulty = "easy"): Difficulty {
  try {
    const stored = localStorage.getItem("drift_difficulty");
    if (stored === "easy" || stored === "hard") return stored;
  } catch {}
  return fallback;
}

export function setStoredDifficulty(d: Difficulty): void {
  try {
    localStorage.setItem("drift_difficulty", d);
  } catch {}
}

export function getStoredMute(): boolean {
  try {
    return localStorage.getItem("drift_muted") === "true";
  } catch {
    return false;
  }
}

export function setStoredMute(muted: boolean): void {
  try {
    localStorage.setItem("drift_muted", String(muted));
  } catch {}
}
