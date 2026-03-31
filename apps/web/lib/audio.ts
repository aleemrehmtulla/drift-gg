let sharedCtx: AudioContext | null = null;
let muted = false;
let resumePromise: Promise<void> | null = null;
let stateListenerAttached = false;
let playbackSessionConfigured = false;
const pendingCallbacks: Array<(ctx: AudioContext) => void> = [];
const AUDIO_UNLOCK_EVENTS = ["pointerup", "touchend", "click", "mouseup"] as const;

export interface ToneOptions {
  freq: number;
  durationS: number;
  gain: number;
  type?: OscillatorType;
  endFreq?: number;
}

try {
  muted = localStorage.getItem("drift_muted") === "true";
} catch {}

if (typeof window !== "undefined") {
  window.addEventListener("drift:mute", (e: Event) => {
    muted = (e as CustomEvent<boolean>).detail;
  });
}

function configurePlaybackAudioSession(): void {
  if (playbackSessionConfigured || typeof navigator === "undefined") return;

  try {
    const nav = navigator as Navigator & {
      audioSession?: {
        type: "auto" | "ambient" | "playback" | "transient" | "play-and-record";
      };
    };

    if (nav.audioSession) {
      nav.audioSession.type = "playback";
      playbackSessionConfigured = true;
    }
  } catch {}
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

function flushPendingCallbacks(ctx: AudioContext): void {
  if (ctx.state !== "running" || pendingCallbacks.length === 0) return;

  const callbacks = pendingCallbacks.splice(0, pendingCallbacks.length);
  callbacks.forEach((callback) => {
    try {
      callback(ctx);
    } catch {}
  });
}

function attachStateListener(ctx: AudioContext): void {
  if (stateListenerAttached) return;
  ctx.addEventListener("statechange", () => {
    if (ctx.state === "running") {
      flushPendingCallbacks(ctx);
    }
  });
  stateListenerAttached = true;
}

function unlockAudio(): void {
  configurePlaybackAudioSession();
  void resumeAudioContext();
}

export function getAudioContext(): AudioContext {
  if (!sharedCtx) {
    const Ctx = getAudioConstructor();
    if (!Ctx) {
      throw new Error("Web Audio API is not supported in this browser.");
    }

    configurePlaybackAudioSession();
    sharedCtx = new Ctx();
    attachStateListener(sharedCtx);
  }

  return sharedCtx;
}

export function getAudioTime(): number {
  try {
    return getAudioContext().currentTime;
  } catch {
    return performance.now() / 1000;
  }
}

export function warmUpAudio(): Promise<void> {
  configurePlaybackAudioSession();
  return resumeAudioContext();
}

/** Resolves once the AudioContext is in "running" state (idempotent, deduped). */
export function resumeAudioContext(): Promise<void> {
  let ctx: AudioContext;

  try {
    ctx = getAudioContext();
  } catch {
    return Promise.resolve();
  }

  if (ctx.state === "running") {
    flushPendingCallbacks(ctx);
    return Promise.resolve();
  }

  if (resumePromise) return resumePromise;

  resumePromise = (async () => {
    try {
      await ctx.resume();
      if (ctx.state === "running") {
        primeAudioContext(ctx);
        flushPendingCallbacks(ctx);
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
    pendingCallbacks.push(fn);
    unlockAudio();
  }
}

export function playToneAt(
  time: number,
  { freq, durationS, gain, type = "sine", endFreq }: ToneOptions,
): void {
  if (isAudioMuted()) return;

  withRunningContext((ctx) => {
    const startTime = Math.max(time, ctx.currentTime);
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (endFreq !== undefined) {
      osc.frequency.linearRampToValueAtTime(endFreq, startTime + durationS);
    }

    gainNode.gain.setValueAtTime(gain, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + durationS);

    osc.start(startTime);
    osc.stop(startTime + durationS);
  });
}

export function playTone(options: ToneOptions): void {
  playToneAt(getAudioTime(), options);
}

export function isAudioMuted(): boolean {
  return muted;
}

if (typeof window !== "undefined") {
  AUDIO_UNLOCK_EVENTS.forEach((evt) =>
    document.addEventListener(evt, unlockAudio, { capture: true, passive: true }),
  );
  document.addEventListener("keydown", unlockAudio, { capture: true });
  window.addEventListener("focus", unlockAudio);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      unlockAudio();
    }
  });
}
