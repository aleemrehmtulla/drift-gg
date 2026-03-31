let sharedCtx: AudioContext | null = null;
let muted = false;
let resumePromise: Promise<void> | null = null;

try {
  muted = localStorage.getItem("drift_muted") === "true";
} catch {}

if (typeof window !== "undefined") {
  window.addEventListener("drift:mute", (e: Event) => {
    muted = (e as CustomEvent<boolean>).detail;
  });
}

export function getAudioContext(): AudioContext {
  if (!sharedCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    sharedCtx = new Ctx();
  }
  return sharedCtx;
}

/** Resolves once the AudioContext is in "running" state (idempotent, deduped). */
export function resumeAudioContext(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === "running") return Promise.resolve();
  if (resumePromise) return resumePromise;
  resumePromise = ctx.resume().then(() => {
    try {
      const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start();
    } catch {}
    resumePromise = null;
  });
  return resumePromise;
}

/** Calls `fn` immediately if the context is running, otherwise after resume. */
export function withRunningContext(fn: (ctx: AudioContext) => void): void {
  const ctx = getAudioContext();
  if (ctx.state === "running") {
    fn(ctx);
  } else {
    resumeAudioContext().then(() => fn(ctx));
  }
}

export function isAudioMuted(): boolean {
  return muted;
}

if (typeof window !== "undefined") {
  ["touchstart", "touchend", "click"].forEach((evt) =>
    document.addEventListener(evt, () => resumeAudioContext(), { passive: true }),
  );
}
