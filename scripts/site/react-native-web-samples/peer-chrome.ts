import type {
  AudioDiscoveryChannel,
  AudioInboundFrame,
  DiscoveryAvailability,
  DiscoverySession,
  ManualDiscoveryChannel,
  ManualInboundCode,
  PeerConnectRequest,
  QrDiscoveryChannel,
  QrInboundCode,
  UnconfirmedPeer
} from "../../../packages/peer-discovery/src/index.ts";
import { encodePeerAudioFsk, decodePeerAudioFskStream } from "../../../packages/protocol/src/index.ts";

export type PeerChromeExchangeKind =
  | "manual-present"
  | "manual-enter"
  | "qr-present"
  | "qr-scan"
  | "audio-transmit"
  | "audio-receive";

export type PeerChromeModal =
  | {
      readonly kind: "exchange";
      readonly exchange: PeerChromeExchangeKind;
      readonly sessionId: string;
      readonly service?: string;
      readonly code?: string;
      readonly codes?: ReadonlyArray<string>;
      readonly frames?: ReadonlyArray<Uint8Array>;
      readonly expectsResponse: boolean;
      readonly input: string;
    }
  | {
      readonly kind: "confirm";
      readonly appId: string;
      readonly purpose: string;
      readonly service: string;
      readonly peer: UnconfirmedPeer;
    };

type Pending =
  | {
      readonly type: "exchange";
      readonly sessionId: string;
      readonly resolve: (value: { readonly accepted: boolean; readonly code?: string; readonly frames?: ReadonlyArray<Uint8Array> }) => void;
      readonly reject: (error: Error) => void;
      readonly timer: ReturnType<typeof setTimeout>;
    }
  | {
      readonly type: "confirm";
      readonly resolve: (approved: boolean) => void;
      readonly reject: (error: Error) => void;
    };

function cryptoRandomId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function playPeerAudio(frames: ReadonlyArray<Uint8Array>): Promise<void> {
  const AudioContextClass =
    (globalThis as { AudioContext?: new () => AudioContext }).AudioContext ??
    (globalThis as { webkitAudioContext?: new () => AudioContext }).webkitAudioContext;
  if (AudioContextClass === undefined) throw new Error("Web Audio playback is unavailable");
  const context = new AudioContextClass();
  await context.resume();
  let at = context.currentTime + 0.1;
  for (const frame of frames) {
    const pcm = encodePeerAudioFsk(frame, { sampleRate: context.sampleRate });
    const buffer = context.createBuffer(1, pcm.length, context.sampleRate);
    buffer.copyToChannel(pcm, 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(at);
    at += pcm.length / context.sampleRate + 0.2;
  }
  await new Promise((resolve) => setTimeout(resolve, Math.ceil(Math.max(0, at - context.currentTime) * 1_000)));
  await context.close();
}

async function recordPeerAudio(durationMs = 15_000): Promise<ReadonlyArray<Uint8Array>> {
  const browser = globalThis as {
    navigator?: { mediaDevices?: { getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> } };
    AudioContext?: new () => AudioContext;
    webkitAudioContext?: new () => AudioContext;
  };
  const AudioContextClass = browser.AudioContext ?? browser.webkitAudioContext;
  if (AudioContextClass === undefined || browser.navigator?.mediaDevices?.getUserMedia === undefined) {
    throw new Error("Microphone recording is unavailable");
  }
  const stream = await browser.navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    video: false
  });
  const context = new AudioContextClass();
  await context.resume();
  const chunks: Float32Array[] = [];
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(4_096, 1, 1);
  const mute = context.createGain();
  mute.gain.value = 0;
  processor.onaudioprocess = (event) => {
    chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
  };
  source.connect(processor);
  processor.connect(mute);
  mute.connect(context.destination);
  await new Promise((resolve) => setTimeout(resolve, durationMs));
  stream.getTracks().forEach((track) => track.stop());
  source.disconnect();
  processor.disconnect();
  mute.disconnect();
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const pcm = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    pcm.set(chunk, offset);
    offset += chunk.length;
  }
  const frames = decodePeerAudioFskStream(pcm, { sampleRate: context.sampleRate });
  await context.close();
  if (frames.length === 0) throw new Error("No valid peer audio frames were detected");
  return frames;
}

function cameraAvailable(): boolean {
  return typeof globalThis.navigator?.mediaDevices?.getUserMedia === "function";
}

function audioAvailable(): boolean {
  const browser = globalThis as { AudioContext?: unknown; webkitAudioContext?: unknown };
  return cameraAvailable() && (browser.AudioContext !== undefined || browser.webkitAudioContext !== undefined);
}

/** In-page trusted peer chrome for the static cookbook Pages demo (no worklet IPC). */
export class PagesPeerChrome {
  private modal: PeerChromeModal | null = null;
  private pending: Pending | null = null;
  private readonly listeners = new Set<(modal: PeerChromeModal | null) => void>();

  subscribe(listener: (modal: PeerChromeModal | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.modal);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): PeerChromeModal | null {
    return this.modal;
  }

  setInput(value: string): void {
    if (this.modal?.kind !== "exchange") return;
    this.modal = { ...this.modal, input: value };
    this.emit();
  }

  cancel(): void {
    const pending = this.pending;
    this.clearModal();
    if (pending === null) return;
    if (pending.type === "exchange") {
      clearTimeout(pending.timer);
      pending.resolve({ accepted: false });
    } else {
      pending.resolve(false);
    }
  }

  async continueExchange(): Promise<void> {
    if (this.modal?.kind !== "exchange" || this.pending?.type !== "exchange") return;
    const modal = this.modal;
    const pending = this.pending;
    try {
      if (modal.exchange === "audio-transmit") {
        await playPeerAudio(modal.frames ?? []);
        const frames = modal.expectsResponse ? await recordPeerAudio() : [];
        clearTimeout(pending.timer);
        this.clearModal();
        pending.resolve({ accepted: true, frames });
        return;
      }
      if (modal.exchange === "audio-receive") {
        const frames = await recordPeerAudio();
        clearTimeout(pending.timer);
        this.clearModal();
        pending.resolve({ accepted: true, frames });
        return;
      }
      const code = modal.expectsResponse || modal.exchange === "manual-enter" || modal.exchange === "qr-scan"
        ? modal.input.trim()
        : modal.code;
      if ((modal.expectsResponse || modal.exchange === "manual-enter" || modal.exchange === "qr-scan") && (code === undefined || code.length === 0)) {
        return;
      }
      clearTimeout(pending.timer);
      this.clearModal();
      pending.resolve({ accepted: true, ...(code === undefined ? {} : { code }) });
    } catch (error) {
      clearTimeout(pending.timer);
      this.clearModal();
      pending.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  confirmDecision(approved: boolean): void {
    if (this.pending?.type !== "confirm") return;
    const pending = this.pending;
    this.clearModal();
    pending.resolve(approved);
  }

  readonly manual: ManualDiscoveryChannel = {
    offer: async function* (this: PagesPeerChrome, session, code, options) {
      const reply = await this.requestExchange({
        exchange: "manual-present",
        sessionId: session.id,
        code,
        expectsResponse: true,
        timeoutMs: options.timeoutMs
      });
      if (reply.accepted && typeof reply.code === "string") yield reply.code;
    }.bind(this),
    accept: async function* (this: PagesPeerChrome, options) {
      const session = { id: cryptoRandomId(), kind: "manual" as const };
      const reply = await this.requestExchange({
        exchange: "manual-enter",
        sessionId: session.id,
        service: options.service,
        expectsResponse: true,
        timeoutMs: options.timeoutMs
      });
      if (reply.accepted && typeof reply.code === "string") yield { session, code: reply.code } satisfies ManualInboundCode;
    }.bind(this),
    answer: async (session, code) => {
      const reply = await this.requestExchange({
        exchange: "manual-present",
        sessionId: session.id,
        code,
        expectsResponse: false,
        timeoutMs: 120_000
      });
      if (!reply.accepted) throw new Error("Manual answer presentation was cancelled");
    },
    cancel: async (sessionId) => {
      this.cancelSession(sessionId);
    }
  };

  readonly qr: QrDiscoveryChannel = {
    availability: async (): Promise<DiscoveryAvailability> =>
      cameraAvailable()
        ? { state: "permission-required", reason: "Camera starts only after Start camera" }
        : { state: "unsupported", reason: "Camera capture is unavailable; use manual full code" },
    present: async function* (this: PagesPeerChrome, session, codes, options) {
      const reply = await this.requestExchange({
        exchange: "qr-present",
        sessionId: session.id,
        codes,
        expectsResponse: true,
        timeoutMs: options.timeoutMs
      });
      if (reply.accepted && typeof reply.code === "string") yield reply.code;
    }.bind(this),
    scan: async function* (this: PagesPeerChrome, options) {
      const session = { id: cryptoRandomId(), kind: "qr" as const };
      const reply = await this.requestExchange({
        exchange: "qr-scan",
        sessionId: session.id,
        service: options.service,
        expectsResponse: true,
        timeoutMs: options.timeoutMs
      });
      if (reply.accepted && typeof reply.code === "string") yield { session, code: reply.code } satisfies QrInboundCode;
    }.bind(this),
    answer: async (session, codes) => {
      const reply = await this.requestExchange({
        exchange: "qr-present",
        sessionId: session.id,
        codes,
        expectsResponse: false,
        timeoutMs: 120_000
      });
      if (!reply.accepted) throw new Error("QR answer presentation was cancelled");
    },
    cancel: async (sessionId) => {
      this.cancelSession(sessionId);
    }
  };

  readonly audio: AudioDiscoveryChannel = {
    availability: async (): Promise<DiscoveryAvailability> =>
      audioAvailable()
        ? { state: "permission-required", reason: "Microphone permission is requested only after starting the audible exchange" }
        : { state: "unsupported", reason: "Web Audio microphone/playback is unavailable" },
    transmit: async function* (this: PagesPeerChrome, session, frames, options) {
      const reply = await this.requestExchange({
        exchange: "audio-transmit",
        sessionId: session.id,
        frames,
        expectsResponse: true,
        timeoutMs: options.timeoutMs
      });
      if (reply.accepted) for (const frame of reply.frames ?? []) yield frame;
    }.bind(this),
    receive: async function* (this: PagesPeerChrome, options) {
      const session: DiscoverySession = { id: cryptoRandomId(), kind: "audio" };
      const reply = await this.requestExchange({
        exchange: "audio-receive",
        sessionId: session.id,
        service: options.service,
        expectsResponse: true,
        timeoutMs: options.timeoutMs
      });
      if (reply.accepted) for (const frame of reply.frames ?? []) yield { session, frame } satisfies AudioInboundFrame;
    }.bind(this),
    answer: async (session, frames) => {
      const reply = await this.requestExchange({
        exchange: "audio-transmit",
        sessionId: session.id,
        frames,
        expectsResponse: false,
        timeoutMs: 120_000
      });
      if (!reply.accepted) throw new Error("Audio answer playback was cancelled");
    },
    cancel: async (sessionId) => {
      this.cancelSession(sessionId);
    }
  };

  confirm(peer: UnconfirmedPeer, request: PeerConnectRequest): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.pending !== null) {
        reject(new Error("Peer chrome is busy"));
        return;
      }
      this.pending = { type: "confirm", resolve, reject };
      this.modal = {
        kind: "confirm",
        appId: request.service,
        purpose: request.purpose,
        service: request.service,
        peer
      };
      this.emit();
    });
  }

  private requestExchange(request: {
    readonly exchange: PeerChromeExchangeKind;
    readonly sessionId: string;
    readonly service?: string;
    readonly code?: string;
    readonly codes?: ReadonlyArray<string>;
    readonly frames?: ReadonlyArray<Uint8Array>;
    readonly expectsResponse: boolean;
    readonly timeoutMs: number;
  }): Promise<{ readonly accepted: boolean; readonly code?: string; readonly frames?: ReadonlyArray<Uint8Array> }> {
    return new Promise((resolve, reject) => {
      if (this.pending !== null) {
        reject(new Error("Peer chrome is busy"));
        return;
      }
      const timer = setTimeout(() => {
        this.clearModal();
        resolve({ accepted: false });
      }, request.timeoutMs);
      this.pending = { type: "exchange", sessionId: request.sessionId, resolve, reject, timer };
      this.modal = {
        kind: "exchange",
        exchange: request.exchange,
        sessionId: request.sessionId,
        expectsResponse: request.expectsResponse,
        input: "",
        ...(request.service === undefined ? {} : { service: request.service }),
        ...(request.code === undefined ? {} : { code: request.code }),
        ...(request.codes === undefined ? {} : { codes: request.codes }),
        ...(request.frames === undefined ? {} : { frames: request.frames })
      };
      this.emit();
    });
  }

  private cancelSession(sessionId: string): void {
    if (this.pending?.type === "exchange" && this.pending.sessionId === sessionId) this.cancel();
  }

  private clearModal(): void {
    this.pending = null;
    this.modal = null;
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.modal);
  }
}
