import type {
  Identity,
  CryptoProvider,
  Reticulum,
} from "@twistedpear/reticulum-ts";
import type { PeerMediaReadiness } from "@twistedpear/protocol";
import type { DeliveredSessionInvite } from "./session-invite-carrier.js";
import type { HostLxmfDeliverySession } from "./host-lxmf-delivery.js";
import type { DropCensusCounts } from "./drop-census.js";

export interface TestAgentPeerRecord {
  /** Delivery destination hash of the announcing peer, hex. */
  readonly destinationHash: string;
  /** Truncated identity hash of the announcing peer, hex. */
  readonly identityHash: string;
  readonly firstSeenAt: number;
  readonly lastSeenAt: number;
  readonly count: number;
}

export interface TestAgentInboxEntry {
  readonly nonce: string;
  /** `probe` for an inbound probe, `echo` for the reply to one we sent. */
  readonly kind: "probe" | "echo";
  readonly fromDestinationHash: string;
  readonly receivedAt: number;
}

export interface TestAgentRealtimeEntry {
  readonly nonce: string;
  readonly kind: "payload" | "echo";
  readonly fromDestinationHash: string;
  readonly payloadHex: string;
  readonly receivedAt: number;
}

export interface TestAgentReadinessEntry {
  readonly fromDestinationHash: string;
  /** `request` opened the exchange; `response` answered ours. */
  readonly kind: "request" | "response";
  readonly readiness: PeerMediaReadiness;
  readonly receivedAt: number;
}

export interface TestAgentInviteEntry {
  readonly kind: "sent" | "raised" | "accepted";
  readonly id: string;
  readonly appId: string;
  readonly peerLabel: string;
  readonly requestedClasses: ReadonlyArray<
    "camera" | "microphone" | "screen-capture"
  >;
  readonly expiresAt: number;
  readonly at: number;
  /** LXMF delivery hash of the other party, when known. */
  readonly peerDestinationHash?: string;
}

export interface TestAgentCallEntry {
  readonly nonce: string;
  readonly kind: "payload" | "echo";
  readonly fromDestinationHash: string;
  readonly payloadHex: string;
  readonly receivedAt: number;
}

export interface TestAgentProbeEntry {
  readonly id: string;
  readonly toDestinationHash: string;
  readonly budgetBytes: number;
  readonly sentAt: number;
  readonly rttMs: number | null;
}

export interface TestAgentInfo {
  readonly label: string;
  readonly platform: string;
  readonly identityHash: string;
  readonly lxmfAddress: string;
}

export interface TestAgentStatus extends TestAgentInfo {
  readonly linkOnline: boolean;
  readonly interfaceCount: number;
  readonly announcesSeen: number;
  readonly dropCensus: DropCensusCounts;
  readonly peerCount: number;
  readonly inboxCount: number;
  readonly realtimeInboxCount: number;
  readonly readinessCount: number;
  readonly probeCount: number;
  readonly inviteCount: number;
  readonly callInboxCount: number;
  readonly pathTableCount: number;
}

export interface TestAgentOptions {
  readonly reticulum: Reticulum;
  readonly provider: CryptoProvider;
  readonly identity: Identity;
  /** Stable peer id used by the harness, e.g. `hub`, `ios`, `desktop`. */
  readonly label: string;
  /** Free-form implementation tag, e.g. `tp-node`, `desktop-worklet`, `ios`. */
  readonly platform: string;
  readonly controlHost: string;
  readonly controlPort: number;
  /** Re-announce cadence. 0 disables the periodic announce. */
  readonly announceIntervalMs?: number;
  readonly reconnectWaitMs?: number;
  /** Readiness this peer advertises. Defaults to a narrow, TTL-bounded posture. */
  readonly mediaReadiness?: () => PeerMediaReadiness;
  /**
   * Where a verified inbound `session-invite` goes on this host. A host with a
   * mini-app runtime passes `receiveSessionInvite`; a headless peer omits it
   * and the agent only records that chrome would have been raised.
   * Ignored when `delivery` is provided — that session already owns chrome
   * delivery; the agent only observes raised invites for the harness.
   */
  readonly receiveSessionInvite?: (
    invite: DeliveredSessionInvite,
  ) => Promise<void>;
  /**
   * Trusted-chrome accept for a raised invite. GUI hosts call into the mini-app
   * host; headless peers omit it and the agent only records the accept.
   */
  readonly acceptSessionInvite?: (inviteId: string) => Promise<void>;
  /**
   * Reuse the shipping host's LXMF delivery destination. When omitted the agent
   * creates one, which is what headless peers still do.
   */
  readonly delivery?: HostLxmfDeliverySession;
  /** Apps this host will ring. Defaults to the realtime-media cookbook app. */
  readonly invitableApps?: ReadonlyArray<string>;
  readonly log?: (line: string) => void;
  /** Optional host-specific commands used by deeper conformance harnesses. */
  readonly handleCommand?: (
    request: Readonly<Record<string, unknown>>,
  ) => Promise<Readonly<Record<string, unknown>>>;
}

export interface TestAgentSession extends TestAgentInfo {
  peers(): ReadonlyArray<TestAgentPeerRecord>;
  inbox(): ReadonlyArray<TestAgentInboxEntry>;
  status(): TestAgentStatus;
  /** Sends a probe to a peer's delivery destination hash (hex). */
  send(toLxmfAddress: string, nonce: string): Promise<void>;
  announce(): Promise<void>;
  stop(): Promise<void>;
}
