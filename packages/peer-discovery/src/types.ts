import type { PeerDiscoveryErrorCode } from "./errors.js";

export type PeerDiscoveryKind =
  | "reticulum"
  | "qr"
  | "manual"
  | "audio"
  | "bluetooth"
  | "ntfy"
  | "local-peer-to-peer";

export type DiscoveryAvailabilityState =
  | "available"
  | "permission-required"
  | "unsupported"
  | "offline"
  | "policy-disabled";

export interface DiscoveryAvailability {
  readonly state: DiscoveryAvailabilityState;
  readonly reason?: string;
}

export interface OfferOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs: number;
}

export interface AcceptOptions extends OfferOptions {
  readonly service: string;
}

export interface DiscoverySession {
  readonly id: string;
  readonly kind: PeerDiscoveryKind;
}

export type DiscoveryEvent =
  | { readonly kind: "ready"; readonly session: DiscoverySession }
  | {
      readonly kind: "invitation";
      readonly session: DiscoverySession;
      readonly envelope: Uint8Array;
    }
  | {
      readonly kind: "progress";
      readonly session: DiscoverySession;
      readonly completed: number;
      readonly total?: number;
    }
  | {
      readonly kind: "error";
      readonly session?: DiscoverySession;
      readonly code: PeerDiscoveryErrorCode;
      readonly message: string;
    };

export interface PeerDiscoveryAdapter {
  readonly kind: PeerDiscoveryKind;
  availability(): Promise<DiscoveryAvailability>;
  offer(
    envelope: Uint8Array,
    options: OfferOptions,
  ): AsyncIterable<DiscoveryEvent>;
  accept(options: AcceptOptions): AsyncIterable<DiscoveryEvent>;
  answer(session: DiscoverySession, envelope: Uint8Array): Promise<void>;
  cancel(sessionId: string): Promise<void>;
}

export interface AdapterPreference {
  readonly privacy?: number;
  readonly battery?: number;
  readonly user?: number;
}

export interface PeerConnectRequest {
  readonly service: string;
  readonly purpose: string;
  readonly mechanisms: ReadonlyArray<PeerDiscoveryKind> | "any";
  readonly timeoutMs: number;
}

/** Host-owned authenticated transport. This object must never cross the mini-app broker. */
export interface HostPeerRoute {
  send(payload: Uint8Array): void | Promise<void>;
  subscribe?(listener: (payload: Uint8Array) => void): () => void;
  /**
   * Host-only live route telemetry; never exposed as an app-provided value. A
   * route that omits `source` reports a declared rate rather than a measurement.
   */
  quality?(): import("@twistedpear/protocol").RouteQualityReport;
}

export interface EstablishedPeer {
  readonly authenticated: true;
  readonly confirmed: true;
  readonly fingerprint: string;
  readonly displayLabel: string;
  readonly rendezvous: PeerDiscoveryKind;
  readonly dataPlane: "reticulum" | "webrtc" | "gateway" | "bluetooth";
  readonly route?: HostPeerRoute;
  readonly close?: () => Promise<void>;
}

export interface PeerPairingDriver {
  request(
    adapter: PeerDiscoveryAdapter,
    request: PeerConnectRequest,
  ): Promise<EstablishedPeer>;
  listen(
    adapter: PeerDiscoveryAdapter,
    request: PeerConnectRequest,
  ): Promise<EstablishedPeer>;
}

export interface PeerHandle {
  readonly id: string;
}

export interface PeerSummary {
  readonly fingerprint: string;
  readonly displayLabel: string;
  readonly state: "connected" | "closed";
  readonly rendezvous: PeerDiscoveryKind;
  readonly dataPlane: EstablishedPeer["dataPlane"];
}

export interface AppPeerSummary extends PeerSummary {
  readonly handle: PeerHandle;
  readonly connectedAt: number;
}
