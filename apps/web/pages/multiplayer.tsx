import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { motion } from "framer-motion";
import { SOCKET_EVENTS } from "@repo/shared";
import type {
  RoomCreatedPayload,
  SocketErrorPayload,
} from "@repo/shared";
import { useSocket } from "@/hooks/useSocket";
import { useUISound } from "@/hooks/useUISound";
import { getStoredName, setStoredName, getStoredDifficulty } from "@/lib/storage";
import { NameInput } from "@/components/ui/NameInput";
import { SITE_URL } from "@/lib/env";

export default function MultiplayerPage() {
  const router = useRouter();
  const { emit, on } = useSocket();
  const { playClick, playHover } = useUISound();

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(getStoredName());
  }, []);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    unsubs.push(
      on<RoomCreatedPayload>(SOCKET_EVENTS.ROOM_CREATED, (data) => {
        router.push(`/room/${data.code}?h=1`);
      }),
    );
    unsubs.push(
      on<SocketErrorPayload>(SOCKET_EVENTS.ERROR, (data) => {
        setError(data.message);
        setLoading(false);
      }),
    );
    return () => unsubs.forEach((fn) => fn());
  }, [on, router]);

  const handleCreate = useCallback(() => {
    if (loading) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter your name to play");
      return;
    }
    setStoredName(trimmed);
    playClick();
    setLoading(true);
    const difficulty = getStoredDifficulty("hard");
    emit(SOCKET_EVENTS.ROOM_CREATE, { playerName: trimmed, difficulty });
  }, [name, emit, playClick, loading]);

  return (
    <>
      <Head>
        <title>Multiplayer — Drift.gg</title>
        <meta
          name="description"
          content="Play Drift.gg head-to-head with friends in real-time multiplayer."
        />
        <meta property="og:title" content="Multiplayer — Drift.gg" />
        <meta
          property="og:description"
          content="Play Drift.gg head-to-head with friends in real-time multiplayer."
        />
        <meta property="og:image" content={`${SITE_URL}/og-default.png`} />
        <meta property="og:url" content={`${SITE_URL}/multiplayer`} />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={`${SITE_URL}/multiplayer`} />
      </Head>

      <div className="flex-1 flex flex-col items-center justify-center mx-auto w-full max-w-[600px] px-4">
        <motion.div
          className="w-full max-w-sm flex flex-col items-center gap-5 py-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="text-center">
            <h1 className="text-3xl font-bold">Multiplayer</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Play with up to 4 friends
            </p>
          </div>

          <NameInput
            value={name}
            onChange={setName}
            onSubmit={handleCreate}
            error={error}
            onErrorClear={() => setError(null)}
          />

          <button
            onClick={handleCreate}
            onMouseEnter={loading ? undefined : playHover}
            disabled={loading}
            className={`w-full rounded-xl bg-[var(--accent)] py-3.5 text-base font-medium text-white transition-opacity flex items-center justify-center gap-2 ${loading ? "opacity-50 cursor-default" : "hover:opacity-90"}`}
          >
            {loading && (
              <svg
                className="animate-spin h-5 w-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="opacity-100"
                  d="M12 2a10 10 0 0 1 10 10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            )}
            {loading ? "Creating…" : "Create Room"}
          </button>

          <p className="text-xs text-[var(--text-muted)] text-center leading-relaxed opacity-60">
            You&apos;ll get a link to share with friends.
          </p>
        </motion.div>
      </div>
    </>
  );
}
