import { useState, useCallback } from "react";
import { useUISound } from "@/hooks/useUISound";

interface CopyShareButtonsProps {
  url: string;
  copyLabel?: string;
}

export function CopyShareButtons({
  url,
  copyLabel = "Copy Link",
}: CopyShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const { playClick, playHover } = useUISound();

  const handleCopy = useCallback(async () => {
    playClick();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [url, playClick]);

  const handleShare = useCallback(async () => {
    playClick();
    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch {}
    } else {
      handleCopy();
    }
  }, [url, handleCopy, playClick]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCopy}
        onMouseEnter={playHover}
        className="flex-1 rounded-xl bg-[var(--accent)] py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
      >
        {copied ? (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {copyLabel}
          </>
        )}
      </button>
      <button
        onClick={handleShare}
        onMouseEnter={playHover}
        className="rounded-xl border border-[var(--border)] py-3 px-4 text-sm font-medium text-[var(--text)] hover:bg-[var(--bg)] transition-colors flex items-center justify-center"
        aria-label="Share"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      </button>
    </div>
  );
}
