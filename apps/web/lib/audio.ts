let sharedCtx: AudioContext | null = null;
let muted = false;
let resumePromise: Promise<void> | null = null;
const AUDIO_UNLOCK_EVENTS = ["pointerdown", "touchstart", "touchend", "click"] as const;

try {
  muted = localStorage.getItem("drift_muted") === "true";
} catch {}

if (typeof window !== "undefined") {
  window.addEventListener("drift:mute", (e: Event) => {
    muted = (e as CustomEvent<boolean>).detail;
  });
}

function getAudioConstructor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  );
}

function primeAudioContext(ctx: AudioContext): void {
  try {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.00001;
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.001);
  } catch {}
}

export function getAudioContext(): AudioContext {
  if (!sharedCtx) {
    const Ctx = getAudioConstructor();
    if (!Ctx) {
      throw new Error("Web Audio API is not supported in this browser.");
    }
    sharedCtx = new Ctx();
  }
  return sharedCtx;
}

/** Resolves once the AudioContext is in "running" state (idempotent, deduped). */
export function resumeAudioContext(): Promise<void> {
  let ctx: AudioContext;

  try {
    ctx = getAudioContext();
  } catch {
    return Promise.resolve();
  }

  if (ctx.state === "running") return Promise.resolve();
  if (resumePromise) return resumePromise;

  resumePromise = (async () => {
    try {
      await ctx.resume();
      if (ctx.state === "running") {
        primeAudioContext(ctx);
      }
    } catch {
      // Allow a future user gesture to retry unlocking audio.
    } finally {
      resumePromise = null;
    }
  })();

  return resumePromise;
}

/** Calls `fn` immediately if the context is running, otherwise after resume. */
export function withRunningContext(fn: (ctx: AudioContext) => void): void {
  let ctx: AudioContext;

  try {
    ctx = getAudioContext();
  } catch {
    return;
  }

  if (ctx.state === "running") {
    fn(ctx);
  } else {
    void resumeAudioContext().then(() => {
      if (ctx.state === "running") {
        fn(ctx);
      }
    });
  }
}

export function isAudioMuted(): boolean {
  return muted;
}

if (typeof window !== "undefined") {
  AUDIO_UNLOCK_EVENTS.forEach((evt) =>
    document.addEventListener(evt, () => {
      void resumeAudioContext();
    }, { passive: true }),
  );
  document.addEventListener("keydown", () => {
    void resumeAudioContext();
  });
}
