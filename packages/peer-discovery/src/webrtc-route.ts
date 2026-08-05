import type { PeerCandidate, PeerInvitation } from "@twistedpear/protocol";
import type {
  EstablishedPeer,
  PeerConnectRequest,
  PeerDiscoveryAdapter,
} from "./index.js";
import type { UnconfirmedPeer } from "./coordinator.js";
import type { CryptoPeerRouteContext } from "./crypto-backend.js";
import { PeerDiscoveryError } from "./index.js";

const MAX_WEBRTC_SIGNAL_BYTES = 4_096;

function key(sessionId: Uint8Array): string {
  return [...sessionId]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function encode(description: RTCSessionDescriptionInit): Uint8Array {
  const bytes = new TextEncoder().encode(
    JSON.stringify({ type: description.type, sdp: description.sdp }),
  );
  if (bytes.length > MAX_WEBRTC_SIGNAL_BYTES) {
    throw new PeerDiscoveryError(
      "QUOTA_EXCEEDED",
      "WebRTC signal exceeds invitation candidate budget",
    );
  }
  return bytes;
}

function decode(bytes: Uint8Array): RTCSessionDescriptionInit {
  if (bytes.length > MAX_WEBRTC_SIGNAL_BYTES) {
    throw new PeerDiscoveryError(
      "INVALID_INVITATION",
      "WebRTC signal exceeds candidate budget",
    );
  }
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new PeerDiscoveryError(
      "INVALID_INVITATION",
      "Malformed WebRTC signal",
    );
  }
  if (
    typeof value !== "object" ||
    value === null ||
    !("type" in value) ||
    !("sdp" in value) ||
    !["offer", "answer"].includes(String((value as { type: unknown }).type)) ||
    typeof (value as { sdp: unknown }).sdp !== "string"
  ) {
    throw new PeerDiscoveryError(
      "INVALID_INVITATION",
      "Malformed WebRTC session description",
    );
  }
  return value as RTCSessionDescriptionInit;
}

async function gather(
  connection: RTCPeerConnection,
  timeoutMs: number,
): Promise<void> {
  if (connection.iceGatheringState === "complete") return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    const listener = () => {
      if (connection.iceGatheringState === "complete") {
        clearTimeout(timer);
        connection.removeEventListener("icegatheringstatechange", listener);
        resolve();
      }
    };
    connection.addEventListener("icegatheringstatechange", listener);
  });
}

/** Authenticated data-channel route; SDP/ICE never cross the mini-app broker. */
export interface WebRtcRoute {
  readonly channel: RTCDataChannel;
  send(payload: Uint8Array): void;
  close(): void;
}

/**
 * Host-owned media extension of {@link WebRtcRoute}. Tracks stay in the host;
 * mini-apps only name sinks, never hold RTCPeerConnection or MediaStreamTrack.
 */
export interface WebRtcMediaRoute extends WebRtcRoute {
  readonly connection: RTCPeerConnection;
  /** Attaches a local capture track for the call. */
  attachTrack(track: MediaStreamTrack, streams?: MediaStream[]): RTCRtpSender;
  /** Observes remote tracks for host sinks (`remote-video` / speaker). */
  onRemoteTrack(
    listener: (
      track: MediaStreamTrack,
      streams: ReadonlyArray<MediaStream>,
    ) => void,
  ): () => void;
}

export interface WebRtcRouteControllerOptions {
  readonly createPeerConnection?: () => RTCPeerConnection;
  readonly iceGatherTimeoutMs?: number;
  readonly openTimeoutMs?: number;
  /**
   * Negotiate host media transceivers during pairing. Defaults to none so
   * data-channel-only peers stay unchanged; call hosts pass `audio` / `video`.
   */
  readonly mediaTransceivers?: ReadonlyArray<"audio" | "video">;
}

interface Pending {
  readonly connection: RTCPeerConnection;
  channel: RTCDataChannel | null;
  readonly role: "offer" | "answer";
  readonly remoteTracks: MediaStreamTrack[];
  readonly remoteTrackListeners: Set<
    (track: MediaStreamTrack, streams: ReadonlyArray<MediaStream>) => void
  >;
}

/** Host-owned WebRTC signaling, data channel, and optional media tracks. */
export class WebRtcRouteController {
  private readonly pending = new Map<string, Pending>();
  private readonly routes = new Map<string, WebRtcMediaRoute>();

  constructor(private readonly options: WebRtcRouteControllerOptions = {}) {}

  async candidates(
    _request: PeerConnectRequest,
    context: {
      readonly role: "offer" | "answer";
      readonly sessionId: Uint8Array;
      readonly remoteInvitation?: PeerInvitation;
    },
  ): Promise<ReadonlyArray<PeerCandidate>> {
    if (
      typeof RTCPeerConnection !== "function" &&
      this.options.createPeerConnection === undefined
    ) {
      return [];
    }
    const connection =
      this.options.createPeerConnection?.() ?? new RTCPeerConnection();
    const pending: Pending = {
      connection,
      channel: null,
      role: context.role,
      remoteTracks: [],
      remoteTrackListeners: new Set(),
    };
    this.pending.set(key(context.sessionId), pending);
    connection.addEventListener("track", (event) => {
      pending.remoteTracks.push(event.track);
      for (const listener of pending.remoteTrackListeners) {
        listener(event.track, event.streams);
      }
    });
    for (const kind of this.options.mediaTransceivers ?? []) {
      connection.addTransceiver(kind, { direction: "sendrecv" });
    }
    if (context.role === "offer") {
      pending.channel = connection.createDataChannel("twistedpear-peer", {
        ordered: true,
      });
      await connection.setLocalDescription(await connection.createOffer());
    } else {
      const candidate = context.remoteInvitation?.candidates.find(
        (entry) => entry.kind === "webrtc",
      );
      if (candidate === undefined) {
        connection.close();
        this.pending.delete(key(context.sessionId));
        return [];
      }
      await connection.setRemoteDescription(decode(candidate.value));
      connection.addEventListener("datachannel", (event) => {
        pending.channel = event.channel;
      });
      await connection.setLocalDescription(await connection.createAnswer());
    }
    await gather(connection, this.options.iceGatherTimeoutMs ?? 2_000);
    if (connection.localDescription === null) {
      throw new PeerDiscoveryError(
        "NO_RETURN_CHANNEL",
        "WebRTC did not produce a local description",
      );
    }
    return [{ kind: "webrtc", value: encode(connection.localDescription) }];
  }

  async establish(
    context: CryptoPeerRouteContext,
    peer: UnconfirmedPeer,
    adapter: PeerDiscoveryAdapter,
  ): Promise<EstablishedPeer> {
    const session = key(context.remoteInvitation.sessionId);
    const pending = this.pending.get(session);
    if (pending === undefined) {
      throw new PeerDiscoveryError(
        "NO_RETURN_CHANNEL",
        "WebRTC pairing state is missing",
      );
    }
    if (pending.role === "offer") {
      const answer = context.remoteInvitation.candidates.find(
        (entry) => entry.kind === "webrtc",
      );
      if (answer === undefined) {
        throw new PeerDiscoveryError(
          "NO_RETURN_CHANNEL",
          "Peer did not return a WebRTC answer",
        );
      }
      await pending.connection.setRemoteDescription(decode(answer.value));
    }
    const channel = await this.waitForChannel(pending);
    const route = this.createMediaRoute(pending, channel);
    this.pending.delete(session);
    this.routes.set(peer.fingerprint, route);
    return {
      authenticated: true,
      confirmed: true,
      fingerprint: peer.fingerprint,
      displayLabel: peer.displayLabel,
      rendezvous: adapter.kind,
      dataPlane: "webrtc",
      route,
      close: async () => {
        route.close();
        this.routes.delete(peer.fingerprint);
      },
    };
  }

  route(fingerprint: string): WebRtcMediaRoute | undefined {
    return this.routes.get(fingerprint);
  }

  private createMediaRoute(
    pending: Pending,
    channel: RTCDataChannel,
  ): WebRtcMediaRoute {
    return {
      channel,
      connection: pending.connection,
      send(payload) {
        if (payload.length > 64 * 1024) {
          throw new PeerDiscoveryError(
            "QUOTA_EXCEEDED",
            "Peer message exceeds WebRTC route budget",
          );
        }
        channel.send(payload);
      },
      attachTrack(track, streams = []) {
        return pending.connection.addTrack(track, ...streams);
      },
      onRemoteTrack(listener) {
        pending.remoteTrackListeners.add(listener);
        for (const track of pending.remoteTracks) {
          listener(track, []);
        }
        return () => {
          pending.remoteTrackListeners.delete(listener);
        };
      },
      close() {
        channel.close();
        pending.connection.close();
      },
    };
  }

  private async waitForChannel(pending: Pending): Promise<RTCDataChannel> {
    const deadline = Date.now() + (this.options.openTimeoutMs ?? 30_000);
    while (Date.now() < deadline) {
      if (pending.channel?.readyState === "open") return pending.channel;
      if (
        pending.connection.connectionState === "failed" ||
        pending.connection.connectionState === "closed"
      ) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    pending.connection.close();
    throw new PeerDiscoveryError(
      "NO_RETURN_CHANNEL",
      "WebRTC data channel did not open",
    );
  }
}
