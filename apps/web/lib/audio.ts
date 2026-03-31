let sharedCtx: AudioContext | null = null;
let muted = false;
let resumePromise: Promise<void> | null = null;
let stateListenerAttached = false;
let playbackSessionConfigured = false;
let mediaUnlockPromise: Promise<void> | null = null;
const pendingCallbacks: Array<(ctx: AudioContext) => void> = [];
const mediaToneCache = new Map<string, string>();
const AUDIO_UNLOCK_EVENTS = ["pointerup", "touchend", "click", "mouseup"] as const;
const MEDIA_SAMPLE_RATE = 44_100;

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

function shouldUseMediaElementFallback(): boolean {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent;
  const platform = navigator.platform;
  const isIOSDevice = /iPhone|iPad|iPod/i.test(ua);
  const isIPadOS = platform === "MacIntel" && navigator.maxTouchPoints > 1;

  return isIOSDevice || isIPadOS;
}

function writeAscii(view: DataView, offset: number, value: string): void {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function waveformSample(phase: number, type: OscillatorType): number {
  switch (type) {
    case "square":
      return Math.sign(Math.sin(phase)) || 1;
    case "triangle":
      return (2 / Math.PI) * Math.asin(Math.sin(phase));
    case "sawtooth":
      return 2 * (phase / (2 * Math.PI) - Math.floor(phase / (2 * Math.PI) + 0.5));
    case "sine":
    default:
      return Math.sin(phase);
  }
}

function createToneDataUri({
  freq,
  durationS,
  gain,
  type = "sine",
  endFreq,
}: ToneOptions): string {
  const key = `${freq}|${durationS}|${gain}|${type}|${endFreq ?? ""}`;
  const cached = mediaToneCache.get(key);
  if (cached) return cached;

  const sampleCount = Math.max(1, Math.ceil(durationS * MEDIA_SAMPLE_RATE));
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, MEDIA_SAMPLE_RATE, true);
  view.setUint32(28, MEDIA_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, sampleCount * 2, true);

  const attackS = Math.min(0.004, durationS * 0.25);
  const releaseS = Math.min(0.06, Math.max(durationS - attackS, durationS * 0.8));

  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / MEDIA_SAMPLE_RATE;
    const progress = durationS > 0 ? t / durationS : 1;
    const currentFreq = endFreq === undefined
      ? freq
      : freq + (endFreq - freq) * progress;

    let envelope = 1;
    if (attackS > 0 && t < attackS) {
      envelope = t / attackS;
    } else if (releaseS > 0 && t > durationS - releaseS) {
      envelope = Math.max(0, (durationS - t) / releaseS);
    }

    const phase = 2 * Math.PI * currentFreq * t;
    const amplitude = Math.min(0.6, gain * 1.75) * envelope;
    const sample = waveformSample(phase, type) * amplitude;
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample)) * 0x7fff, true);
  }

  let binary = "";
  const bytes = new Uint8Array(buffer);
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  const dataUri = `data:audio/wav;base64,${btoa(binary)}`;
  mediaToneCache.set(key, dataUri);
  return dataUri;
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

function createToneAudio(options: ToneOptions): HTMLAudioElement {
  const audio = new Audio(createToneDataUri(options));
  audio.preload = "auto";
  audio.setAttribute("playsinline", "true");
  return audio;
}

function warmUpMediaAudio(): Promise<void> {
  if (!shouldUseMediaElementFallback()) return Promise.resolve();
  if (mediaUnlockPromise) return mediaUnlockPromise;

  mediaUnlockPromise = (async () => {
    const audio = createToneAudio({
      freq: 440,
      durationS: 0.01,
      gain: 0.00001,
    });

    try {
      audio.muted = true;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // Allow the next real gesture to retry media playback unlock.
    } finally {
      mediaUnlockPromise = null;
    }
  })();

  return mediaUnlockPromise;
}

function unlockAudio(): void {
  configurePlaybackAudioSession();
  if (shouldUseMediaElementFallback()) {
    void warmUpMediaAudio();
    return;
  }
  void resumeAudioContext();
}

function getAudioConstructor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  );
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
  if (shouldUseMediaElementFallback()) {
    return performance.now() / 1000;
  }

  try {
    return getAudioContext().currentTime;
  } catch {
    return performance.now() / 1000;
  }
}

/** Resolves once the active audio backend is ready to play. */
export function warmUpAudio(): Promise<void> {
  configurePlaybackAudioSession();
  return shouldUseMediaElementFallback() ? warmUpMediaAudio() : resumeAudioContext();
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

function playWebAudioToneAt(time: number, { freq, durationS, gain, type = "sine", endFreq }: ToneOptions): void {
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

function playMediaToneAt(time: number, options: ToneOptions): void {
  configurePlaybackAudioSession();
  void warmUpMediaAudio();

  const play = () => {
    const audio = createToneAudio(options);
    void audio.play().catch(() => {});
  };

  const delayMs = Math.max(0, (time - performance.now() / 1000) * 1000);
  if (delayMs <= 12) {
    play();
  } else {
    window.setTimeout(play, delayMs);
  }
}

export function playToneAt(time: number, options: ToneOptions): void {
  if (isAudioMuted()) return;

  if (shouldUseMediaElementFallback()) {
    playMediaToneAt(time, options);
  } else {
    playWebAudioToneAt(time, options);
  }
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
