import { generateRoomCode } from "@repo/shared";
import { getRoom } from "../socket/rooms.js";

export function generateUniqueRoomCode(): string {
  for (let i = 0; i < 100; i++) {
    const code = generateRoomCode();
    if (!getRoom(code)) return code;
  }
  throw new Error("Failed to generate unique room code after 100 attempts");
}
