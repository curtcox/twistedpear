import {
  decodePeerInvitation,
  decodePeerInvitationText,
  encodePeerInvitationText,
  framePeerQrPayload,
  initialPeerQrAssemblyState,
  stepPeerQrAssembly,
  type PeerQrAssemblyState,
} from "@twistedpear/protocol";
import type {
  AcceptOptions,
  DiscoveryAvailability,
  DiscoveryEvent,
  DiscoverySession,
  OfferOptions,
  PeerDiscoveryAdapter,
} from "./index.js";
import { PeerDiscoveryError } from "./index.js";
import { withDiscoveryBudget } from "./budget.js";

export const MAX_STATIC_PEER_QR_TEXT_LENGTH = 512;
export const PEER_QR_CHUNK_PAYLOAD_BYTES = 220;
const STATIC_PREFIX = "TPI1:";
const FRAME_PREFIX = "TPQ1:";

export interface QrInboundCode {
  readonly session: DiscoverySession;
  readonly code: string;
}
/** Camera/display boundary. Decoding may use BarcodeDetector or a bundled JS/Wasm fallback. */
export interface QrDiscoveryChannel {
  availability(): Promise<DiscoveryAvailability>;
  present(
    session: DiscoverySession,
    codes: ReadonlyArray<string>,
    options: OfferOptions,
  ): AsyncIterable<string>;
  scan(options: AcceptOptions): AsyncIterable<QrInboundCode>;
  answer(
    session: DiscoverySession,
    codes: ReadonlyArray<string>,
  ): Promise<void>;
  cancel(sessionId: string): Promise<void>;
}
export interface QrDiscoveryAdapterOptions {
  readonly channel: QrDiscoveryChannel;
  readonly createSessionId: () => string;
  readonly now?: () => number;
}

export function encodePeerQrCodes(envelope: Uint8Array): ReadonlyArray<string> {
  const invitation = decodePeerInvitation(envelope);
  const full = `${STATIC_PREFIX}${encodePeerInvitationText(envelope)}`;
  if (full.length <= MAX_STATIC_PEER_QR_TEXT_LENGTH) return [full];
  return framePeerQrPayload(
    invitation.sessionId,
    envelope,
    PEER_QR_CHUNK_PAYLOAD_BYTES,
  ).map((frame) => `${FRAME_PREFIX}${encodePeerInvitationText(frame)}`);
}

interface DecodeState {
  assembly: PeerQrAssemblyState | null;
}
function decodePeerQrCode(
  state: DecodeState,
  code: string,
  expiresAt: number,
  now: number,
): {
  readonly state: DecodeState;
  readonly envelope: Uint8Array | null;
  readonly progress: {
    readonly completed: number;
    readonly total?: number;
  } | null;
} {
  try {
    if (code.startsWith(STATIC_PREFIX)) {
      const envelope = decodePeerInvitationText(
        code.slice(STATIC_PREFIX.length),
      );
      decodePeerInvitation(envelope, now);
      return { state, envelope, progress: { completed: 1, total: 1 } };
    }
    if (!code.startsWith(FRAME_PREFIX))
      throw new Error("unknown QR payload prefix");
    const encodedFrame = decodePeerInvitationText(
      code.slice(FRAME_PREFIX.length),
    );
    const result = stepPeerQrAssembly(
      state.assembly ?? initialPeerQrAssemblyState(expiresAt),
      encodedFrame,
      now,
    );
    if (result.payload !== null) decodePeerInvitation(result.payload, now);
    return {
      state: { assembly: result.state },
      envelope: result.payload,
      progress: {
        completed: result.state.received,
        ...(result.state.total === null ? {} : { total: result.state.total }),
      },
    };
  } catch (error) {
    throw new PeerDiscoveryError(
      "INVALID_INVITATION",
      error instanceof Error ? error.message : "Invalid QR invitation",
    );
  }
}

export class QrPeerDiscoveryAdapter implements PeerDiscoveryAdapter {
  readonly kind = "qr" as const;
  constructor(private readonly options: QrDiscoveryAdapterOptions) {}
  availability(): Promise<DiscoveryAvailability> {
    return this.options.channel.availability();
  }
  async *offer(
    envelope: Uint8Array,
    options: OfferOptions,
  ): AsyncIterable<DiscoveryEvent> {
    const invitation = decodePeerInvitation(envelope, this.now());
    if (invitation.role !== "offer")
      throw new PeerDiscoveryError(
        "INVALID_INVITATION",
        "QR offer requires an offer envelope",
      );
    const session = {
      id: this.options.createSessionId(),
      kind: this.kind,
    } as const;
    yield { kind: "ready", session };
    let state: DecodeState = { assembly: null };
    const expiresAt = this.now() + options.timeoutMs;
    for await (const code of withDiscoveryBudget(
      this.options.channel.present(
        session,
        encodePeerQrCodes(envelope),
        options,
      ),
      options.timeoutMs,
      options.signal,
      () => this.cancel(session.id),
    )) {
      const decoded = decodePeerQrCode(state, code, expiresAt, this.now());
      state = decoded.state;
      if (decoded.progress !== null)
        yield { kind: "progress", session, ...decoded.progress };
      if (decoded.envelope !== null) {
        if (
          decodePeerInvitation(decoded.envelope, this.now()).role !== "answer"
        )
          throw new PeerDiscoveryError(
            "INVALID_INVITATION",
            "QR return payload is not an answer",
          );
        yield { kind: "invitation", session, envelope: decoded.envelope };
      }
    }
  }
  async *accept(options: AcceptOptions): AsyncIterable<DiscoveryEvent> {
    let state: DecodeState = { assembly: null };
    let activeSession: DiscoverySession | null = null;
    const expiresAt = this.now() + options.timeoutMs;
    for await (const inbound of withDiscoveryBudget(
      this.options.channel.scan(options),
      options.timeoutMs,
      options.signal,
      async () => {
        if (activeSession !== null) await this.cancel(activeSession.id);
      },
    )) {
      if (activeSession !== null && activeSession.id !== inbound.session.id)
        throw new PeerDiscoveryError(
          "INVALID_INVITATION",
          "mixed QR channel sessions",
        );
      activeSession = inbound.session;
      const decoded = decodePeerQrCode(
        state,
        inbound.code,
        expiresAt,
        this.now(),
      );
      state = decoded.state;
      if (decoded.progress !== null)
        yield {
          kind: "progress",
          session: inbound.session,
          ...decoded.progress,
        };
      if (decoded.envelope !== null) {
        const invitation = decodePeerInvitation(decoded.envelope, this.now());
        if (
          invitation.role !== "offer" ||
          invitation.service !== options.service
        )
          throw new PeerDiscoveryError(
            "INVALID_INVITATION",
            "QR invitation has the wrong role or service",
          );
        yield {
          kind: "invitation",
          session: inbound.session,
          envelope: decoded.envelope,
        };
      }
    }
  }
  async answer(session: DiscoverySession, envelope: Uint8Array): Promise<void> {
    if (decodePeerInvitation(envelope, this.now()).role !== "answer")
      throw new PeerDiscoveryError(
        "INVALID_INVITATION",
        "QR answer requires an answer envelope",
      );
    await this.options.channel.answer(session, encodePeerQrCodes(envelope));
  }
  cancel(sessionId: string): Promise<void> {
    return this.options.channel.cancel(sessionId);
  }
  private now(): number {
    return this.options.now?.() ?? Date.now();
  }
}
