import type {
  AdmissionDecision,
  LinkQuality,
  StreamDemand,
  StreamPlane,
} from "@twistedpear/protocol";
import type { PeerHandle } from "@twistedpear/peer-discovery";

export interface StreamEgressSendResult {
  readonly queuedBytes: number;
  readonly droppedOldest: number;
}
export interface StreamEgress {
  readonly plane: StreamPlane;
  send(frame: Uint8Array): Promise<StreamEgressSendResult>;
  quality(): LinkQuality;
  close(): Promise<void>;
}
export interface StreamEgressFactory {
  create(input: {
    readonly appId: string;
    readonly peer: string;
    readonly demand: StreamDemand;
    readonly admission: AdmissionDecision;
  }): Promise<StreamEgress>;
}

export interface AppPeerMediaRouteDirectory {
  route(
    appId: string,
    handle: PeerHandle,
  ):
    | undefined
    | {
        readonly dataPlane: "reticulum" | "webrtc" | "gateway" | "bluetooth";
        readonly transport?: {
          send(payload: Uint8Array): void | Promise<void>;
          subscribe?(listener: (payload: Uint8Array) => void): () => void;
          quality?(): import("@twistedpear/protocol").RouteQualityReport;
        };
      };
}

export interface PeerRouteMediaDirectory extends AppPeerMediaRouteDirectory {
  list(appId: string): ReadonlyArray<{
    readonly handle: PeerHandle;
    readonly displayLabel: string;
  }>;
}

export interface StreamOffer {
  readonly id: string;
  readonly peer: PeerHandle;
  readonly displayLabel: string;
  readonly classId: "camera" | "microphone" | "screen-capture";
  readonly tierId: string;
  readonly encoding: string;
  readonly plane: StreamPlane;
  readonly expiresAt: number;
}
export type StreamSink =
  | { readonly kind: "remote-video"; readonly widgetId: string }
  | { readonly kind: "speaker" };
export interface InboundStream {
  readonly handle: string;
  readonly offerId: string;
  readonly sink: StreamSink;
}
export interface StreamOfferBatch {
  readonly cursor: string;
  readonly offers: ReadonlyArray<StreamOffer>;
}
export interface InboundMediaBackend {
  pollOffers(appId: string, cursor?: string): Promise<StreamOfferBatch>;
  accept(
    appId: string,
    offer: StreamOffer,
    sink: StreamSink,
  ): Promise<InboundStream>;
  decline(appId: string, offer: StreamOffer, reason?: string): Promise<void>;
  close(appId: string, stream: InboundStream): Promise<void>;
}

export interface RealtimeBandwidthReservation {
  consume(bytes: number): Promise<void>;
  release(): void;
}

export interface RealtimeBandwidthReservationProvider {
  reserveRealtime(bytesPerSecond: number): RealtimeBandwidthReservation | null;
}

/** Plane-specific host transport. Mini-apps never receive this object or its credentials. */
export interface PlaneMediaTransport {
  send(frame: Uint8Array): Promise<StreamEgressSendResult>;
  quality(): LinkQuality;
  close(): Promise<void>;
}

export type PlaneMediaTransportOpener = (input: {
  readonly appId: string;
  readonly peer: string;
  readonly demand: StreamDemand;
  readonly admission: AdmissionDecision;
}) => Promise<PlaneMediaTransport>;

export interface CasDerivedPlaneOpenerOptions {
  readonly put: (frame: Uint8Array) => Promise<string>;
  readonly announce?: (input: {
    readonly appId: string;
    readonly peer: string;
    readonly t256: string;
  }) => Promise<void>;
}

export interface PearsBulkAppendPlaneOpenerOptions {
  readonly append: (input: {
    readonly appId: string;
    readonly peer: string;
    readonly frame: Uint8Array;
    readonly sequence: number;
  }) => Promise<{ readonly path: string }>;
}

export interface WebRtcMediaTrackHandle {
  attachTrack(track: MediaStreamTrack, streams?: MediaStream[]): RTCRtpSender;
  onRemoteTrack(
    listener: (
      track: MediaStreamTrack,
      streams: ReadonlyArray<MediaStream>,
    ) => void,
  ): () => void;
  quality?(): LinkQuality;
  close(): void;
}

export interface WebRtcMediaTrackPlaneOpenerOptions {
  readonly routeForPeer: (input: {
    readonly appId: string;
    readonly peer: string;
  }) => WebRtcMediaTrackHandle | undefined;
  readonly getOutboundTrack: (input: {
    readonly appId: string;
    readonly peer: string;
    readonly demand: StreamDemand;
  }) => Promise<MediaStreamTrack | null>;
  readonly onRemoteTrack?: (input: {
    readonly appId: string;
    readonly peer: string;
    readonly track: MediaStreamTrack;
  }) => void;
}
