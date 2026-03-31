import { motion } from "framer-motion";
import type { PlayerInfo } from "@repo/shared";
import { MAX_ROOM_PLAYERS } from "@repo/shared";
import { CopyShareButtons } from "@/components/ui/CopyShareButtons";
import { useUISound } from "@/hooks/useUISound";
import { SITE_URL } from "@/lib/env";

interface RoomLobbyProps {
  code: string;
  players: PlayerInfo[];
  isHost: boolean;
  onStart: () => void;
}

export function RoomLobby({ code, players, isHost, onStart }: RoomLobbyProps) {
  const { playClick } = useUISound();

  const displayUrl = `${SITE_URL.replace(/^https?:\/\//, "")}/room/${code}`;
  const roomUrl = `${SITE_URL}/room/${code}`;
  const emptySlots = MAX_ROOM_PLAYERS - players.length;

  return (
    <motion.div
      className="flex flex-col items-center gap-6 py-8 w-full max-w-md mx-auto"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="w-full">
        <p className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-3 text-center">
          Challenge your friends
        </p>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)] p-4 sm:p-5">
          <p className="text-lg sm:text-xl font-semibold text-[var(--text)] text-center break-all leading-relaxed tracking-wide">
            {displayUrl}
          </p>
          <div className="mt-4">
            <CopyShareButtons url={roomUrl} />
          </div>
        </div>
      </div>

      <div className="w-full border-t border-[var(--border)] pt-5">
        <p className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-3 text-center">
          Players ({players.length}/{MAX_ROOM_PLAYERS})
        </p>
        <div className="grid grid-cols-2 gap-2">
          {players.map((p) => (
            <motion.div
              key={p.id}
              className="rounded-xl select-none border border-[var(--border)] bg-[var(--bg)] p-3 flex items-center gap-2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-8 h-8 rounded-full bg-[var(--accent-light)] flex items-center justify-center text-sm font-bold text-[var(--accent)] shrink-0">
                {p.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.name}</p>
                {p.isHost && (
                  <p className="text-[10px] text-[var(--accent)] font-medium uppercase">
                    Host
                  </p>
                )}
              </div>
            </motion.div>
          ))}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="rounded-xl select-none border border-dashed border-[var(--border)] p-3 flex items-center gap-2 opacity-40"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] border border-[var(--border)] shrink-0" />
              <p className="text-sm text-[var(--text-muted)]">Waiting…</p>
            </div>
          ))}
        </div>
      </div>

      {isHost && players.length >= 2 && (
        <motion.button
          onClick={() => { playClick(); onStart(); }}
          className="rounded-xl bg-[var(--accent)] px-10 py-3.5 text-base font-medium text-white hover:opacity-90 transition-opacity"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          whileTap={{ scale: 0.97 }}
        >
          Start Game
        </motion.button>
      )}

      {isHost && players.length < 2 && (
        <p className="text-sm text-[var(--text-muted)]">
          Share the link to invite friends!
        </p>
      )}

      {!isHost && (
        <p className="text-sm text-[var(--text-muted)] animate-pulse">
          Waiting for host to start the game…
        </p>
      )}
    </motion.div>
  );
}
