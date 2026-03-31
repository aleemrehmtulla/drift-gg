import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { motion } from "framer-motion";
import type { Difficulty } from "@repo/shared";
import { useUISound } from "@/hooks/useUISound";
import { cn } from "@/lib/cn";
import { getStoredDifficulty, setStoredDifficulty } from "@/lib/storage";
import { SITE_URL } from "@/lib/env";

export default function Home() {
  const router = useRouter();
  const { playClick, playHover, playToggle } = useUISound();

  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

  useEffect(() => {
    setDifficulty(getStoredDifficulty());
  }, []);

  const handleToggleDifficulty = useCallback(() => {
    setDifficulty((prev) => {
      const next = prev === "easy" ? "hard" : "easy";
      setStoredDifficulty(next);
      playToggle(next === "easy");
      return next;
    });
  }, [playToggle]);

  const handleSolo = useCallback(() => {
    playClick();
    router.push(`/play?difficulty=${difficulty}`);
  }, [difficulty, router, playClick]);

  const handleDaily = useCallback(() => {
    playClick();
    router.push("/daily");
  }, [router, playClick]);

  const handleMultiplayer = useCallback(() => {
    playClick();
    router.push("/multiplayer");
  }, [router, playClick]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Drift.gg",
    url: SITE_URL,
    description:
      "A rhythm game that tests how well you can keep a beat. Tap along, then keep going from memory.",
    applicationCategory: "Game",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    author: {
      "@type": "Person",
      name: "Aleem Rehmtulla",
      url: "https://aleemrehmtulla.com",
      sameAs: ["https://aleemrehmtulla.com", "https://github.com/aleemrehmtulla"],
    },
  };

  return (
    <>
      <Head>
        <title>Drift — How much will you drift off the beat?</title>
        <meta
          name="description"
          content="A rhythm game that tests how well you can keep a beat. Tap along, then keep going from memory."
        />
        <meta property="og:title" content="Drift — How much will you drift off the beat?" />
        <meta
          property="og:description"
          content="A rhythm game that tests how well you can keep a beat."
        />
        <meta property="og:image" content={`${SITE_URL}/og-default.png`} />
        <meta property="og:url" content={SITE_URL} />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={SITE_URL} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>

      <div className="flex-1 flex items-center justify-center px-4 py-4">
        <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg)] shadow-lg">
          <div className="p-6 sm:p-8 md:p-10">
            <h1 className="flex select-none items-baseline gap-2 text-5xl sm:text-6xl md:text-7xl font-bold text-[var(--text)] tracking-tight">
              drift
              <span
                className="text-lg sm:text-2xl font-semibold text-[var(--text-muted)] opacity-70"
                style={{ lineHeight: "1.1" }}
              >
                .gg
              </span>
            </h1>

            <h2 className="mt-3 text-[var(--text-muted)] text-base font-semibold opacity-70">
              How much will you drift off the beat?
            </h2>
            <p className="mt-3 text-[var(--text-muted)] text-sm opacity-60">
              We play a beat. You tap along. It stops, then you keep going. The goal is to tap as
              close to the original beat speed as possible.
            </p>

            <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-4">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="group flex flex-col items-center gap-2">
                  <motion.button
                    onClick={handleSolo}
                    onMouseEnter={playHover}
                    className="w-14 h-14 rounded-2xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:border-[var(--accent)] group-hover:bg-[var(--accent-light)] transition-all"
                    whileTap={{ scale: 0.9 }}
                    aria-label="Solo"
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </motion.button>
                  <span className="text-[11px] font-medium text-[var(--text-muted)] sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    Solo
                  </span>
                </div>

                <div className="group flex flex-col items-center gap-2">
                  <motion.button
                    onClick={handleMultiplayer}
                    onMouseEnter={playHover}
                    className="w-14 h-14 rounded-2xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:border-[var(--accent)] group-hover:bg-[var(--accent-light)] transition-all"
                    whileTap={{ scale: 0.9 }}
                    aria-label="Multiplayer"
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </motion.button>
                  <span className="text-[11px] font-medium text-[var(--text-muted)] sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    Multiplayer
                  </span>
                </div>

                <div className="group flex flex-col items-center gap-2">
                  <motion.button
                    onClick={handleDaily}
                    onMouseEnter={playHover}
                    className="w-14 h-14 rounded-2xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:border-[var(--accent)] group-hover:bg-[var(--accent-light)] transition-all"
                    whileTap={{ scale: 0.9 }}
                    aria-label="Global Daily Challenge"
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  </motion.button>
                  <span className="text-[11px] font-medium text-[var(--text-muted)] sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    Daily
                  </span>
                </div>
              </div>

              {/* toggle buttons behaving as toggle and not direct selection is intentional  */}
              {/* i like it, it's fun :-) */}
              <div className="sm:ml-auto relative inline-flex rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 w-1/2 rounded-md bg-[var(--accent)]"
                  layout
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
                  style={{
                    left: difficulty === "easy" ? "0%" : "50%",
                  }}
                />
                <button
                  className={cn(
                    "relative z-10 px-4 py-2 text-xs font-medium transition-colors",
                    difficulty === "easy"
                      ? "text-white"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]",
                  )}
                  onClick={handleToggleDifficulty}
                >
                  Easy
                </button>
                <button
                  className={cn(
                    "relative z-10 px-4 py-2 text-xs font-medium transition-colors",
                    difficulty === "hard"
                      ? "text-white"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]",
                  )}
                  onClick={handleToggleDifficulty}
                >
                  Hard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
