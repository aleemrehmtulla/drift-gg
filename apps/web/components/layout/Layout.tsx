import { type ReactNode, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Footer } from "./Footer";
import { useUISound } from "@/hooks/useUISound";
import { useHaptics } from "@/hooks/useHaptics";
import { getStoredMute, setStoredMute } from "@/lib/storage";

export function Layout({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(false);
  const { playClick, playHover, playToggle } = useUISound();
  const { hapticToggle } = useHaptics();

  useEffect(() => {
    setMuted(getStoredMute());
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      setStoredMute(next);
      window.dispatchEvent(new CustomEvent("drift:mute", { detail: next }));
      hapticToggle();
      if (!next) playToggle(true);
      return next;
    });
  }, [playToggle, hapticToggle]);

  return (
    <div className="flex min-h-[100dvh] w-screen flex-col">
      <header className="mx-auto max-w-6xl px-4 py-3 sm:px-6 flex w-full items-center justify-between text-xs sm:text-sm text-[var(--text-muted)]">
        <Link href="/" onClick={playClick} onMouseEnter={playHover} className="text-lg font-semibold text-[var(--text)] no-underline">
          drift.gg
        </Link>
        <motion.button
          onClick={toggleMute}
          onMouseEnter={playHover}
          className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors p-2 rounded-lg hover:bg-[var(--bg-subtle)]"
          aria-label={muted ? "Unmute sounds" : "Mute sounds"}
          whileTap={{ scale: 0.9 }}
        >
          {muted ? (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </motion.button>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </div>
  );
}
