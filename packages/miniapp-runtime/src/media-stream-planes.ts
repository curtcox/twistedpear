import type { LinkQuality, StreamDemand } from "@twistedpear/protocol";
import type { StreamPlane } from "@twistedpear/protocol";
import type {
  PearsBulkAppendPlaneOpenerOptions,
  PlaneMediaTransportOpener,
  StreamEgressFactory,
  WebRtcMediaTrackPlaneOpenerOptions,
} from "./media-stream-types.js";
import {
  createCasDerivedPlaneOpener,
  createPeerRoutePlaneOpeners,
} from "./media-stream-egress.js";

/**
 * Builds the host plane table: live peer-route openers plus optional CAS,
 * Pears-bulk Hyperdrive append, and WebRTC media-track openers.
 */
export function createHostPlaneOpeners(input: {
  readonly peerRouteFactory?: StreamEgressFactory;
  readonly cas?: import("./media-stream-types.js").CasDerivedPlaneOpenerOptions;
  readonly pearsBulk?: PearsBulkAppendPlaneOpenerOptions;
  readonly webrtcMedia?: WebRtcMediaTrackPlaneOpenerOptions;
  readonly webrtcMediaPlane?: PlaneMediaTransportOpener;
}): Partial<Record<StreamPlane, PlaneMediaTransportOpener>> {
  const openers: Partial<Record<StreamPlane, PlaneMediaTransportOpener>> = {
    ...(input.peerRouteFactory === undefined
      ? {}
      : createPeerRoutePlaneOpeners(input.peerRouteFactory)),
    ...(input.cas === undefined
      ? {}
      : { cas: createCasDerivedPlaneOpener(input.cas) }),
  };
  if (input.pearsBulk !== undefined) {
    const append = createPearsBulkAppendPlaneOpener(input.pearsBulk);
    const routed = openers["pears-bulk"];
    openers["pears-bulk"] =
      routed === undefined
        ? append
        : async (request) => {
            try {
              return await routed(request);
            } catch {
              return append(request);
            }
          };
  }
  const trackOpeners: PlaneMediaTransportOpener[] = [];
  if (input.webrtcMediaPlane !== undefined)
    trackOpeners.push(input.webrtcMediaPlane);
  if (input.webrtcMedia !== undefined)
    trackOpeners.push(createWebRtcMediaTrackPlaneOpener(input.webrtcMedia));
  if (trackOpeners.length > 0) {
    const routed = openers.webrtc;
    const preferTracks: PlaneMediaTransportOpener = async (request) => {
      let lastError: unknown;
      for (const opener of trackOpeners) {
        try {
          return await opener(request);
        } catch (error) {
          lastError = error;
        }
      }
      if (routed !== undefined) return routed(request);
      throw lastError instanceof Error
        ? lastError
        : new Error(String(lastError));
    };
    openers.webrtc = preferTracks;
  }
  return openers;
}

export function createWebRtcMediaTrackPlaneOpener(
  options: WebRtcMediaTrackPlaneOpenerOptions,
): PlaneMediaTransportOpener {
  return async (input) => {
    if (input.admission.plane !== "webrtc") {
      throw new Error(
        "WebRTC media-track opener was asked for a different admitted plane.",
      );
    }
    if (!isLiveWebRtcTrackDemand(input.demand)) {
      throw new Error("WebRTC media tracks admit live pcm/frames demand only.");
    }
    const route = options.routeForPeer({
      appId: input.appId,
      peer: input.peer,
    });
    if (route === undefined) {
      throw new Error("No host WebRTC media route for peer.");
    }
    const track = await options.getOutboundTrack({
      appId: input.appId,
      peer: input.peer,
      demand: input.demand,
    });
    if (track === null) {
      throw new Error("Host did not supply an outbound media track.");
    }
    const sender = route.attachTrack(track);
    const unsubscribe =
      options.onRemoteTrack === undefined
        ? undefined
        : route.onRemoteTrack((remote) => {
            options.onRemoteTrack?.({
              appId: input.appId,
              peer: input.peer,
              track: remote,
            });
          });
    let closed = false;
    return {
      async send() {
        if (closed) throw new Error("WebRTC media-track transport is closed.");
        return { queuedBytes: 0, droppedOldest: 0 };
      },
      quality: () =>
        route.quality?.() ?? {
          goodputBps: 2_000_000,
          rttMs: 40,
          jitterMs: 10,
          lossRatio: 0,
          mtu: 1_200,
          source: "declared",
          samples: 0,
          confidence: "low",
        },
      async close() {
        closed = true;
        unsubscribe?.();
        try {
          sender.track?.stop();
        } catch {
          /* ignore stop races */
        }
      },
    };
  };
}

export function createDelegatedWebRtcMediaPlaneOpener(
  attach: (input: {
    readonly appId: string;
    readonly peer: string;
    readonly demand: StreamDemand;
    readonly admission: import("@twistedpear/protocol").AdmissionDecision;
  }) => Promise<{
    readonly quality?: () => LinkQuality;
    readonly close: () => Promise<void>;
  }>,
): PlaneMediaTransportOpener {
  return async (input) => {
    if (input.admission.plane !== "webrtc") {
      throw new Error(
        "WebRTC media-track opener was asked for a different admitted plane.",
      );
    }
    if (!isLiveWebRtcTrackDemand(input.demand)) {
      throw new Error("WebRTC media tracks admit live pcm/frames demand only.");
    }
    const attached = await attach(input);
    let closed = false;
    return {
      async send() {
        if (closed) throw new Error("WebRTC media-track transport is closed.");
        return { queuedBytes: 0, droppedOldest: 0 };
      },
      quality: () =>
        attached.quality?.() ?? {
          goodputBps: 2_000_000,
          rttMs: 40,
          jitterMs: 10,
          lossRatio: 0,
          mtu: 1_200,
          source: "declared",
          samples: 0,
          confidence: "low",
        },
      async close() {
        if (closed) return;
        closed = true;
        await attached.close();
      },
    };
  };
}

function isLiveWebRtcTrackDemand(demand: StreamDemand): boolean {
  return (
    (demand.classId === "microphone" && demand.tierId === "pcm") ||
    ((demand.classId === "camera" || demand.classId === "screen-capture") &&
      demand.tierId === "frames")
  );
}

export function createPearsBulkAppendPlaneOpener(
  options: PearsBulkAppendPlaneOpenerOptions,
): PlaneMediaTransportOpener {
  return async (input) => {
    if (input.admission.plane !== "pears-bulk") {
      throw new Error(
        "Pears-bulk plane opener was asked for a different admitted plane.",
      );
    }
    if (!isPearsBulkAdmittedRung(input.demand, input.admission.rung)) {
      throw new Error(
        "Pears-bulk plane admits derived or snapshot media only.",
      );
    }
    let closed = false;
    let sequence = 0;
    let lastPath: string | null = null;
    return {
      async send(frame) {
        if (closed) throw new Error("Pears-bulk media transport is closed.");
        if (frame.byteLength < 1 || frame.byteLength > 1024 * 1024) {
          throw new Error("Pears-bulk media frame exceeds append bounds.");
        }
        const written = await options.append({
          appId: input.appId,
          peer: input.peer,
          frame,
          sequence: sequence++,
        });
        lastPath = written.path;
        return { queuedBytes: 0, droppedOldest: 0 };
      },
      quality: () => ({
        goodputBps: 64_000,
        rttMs: 500,
        jitterMs: 100,
        lossRatio: 0,
        mtu: 16_384,
        source: "declared",
        samples: lastPath === null ? 0 : sequence,
        confidence: "low",
      }),
      async close() {
        closed = true;
      },
    };
  };
}

function isPearsBulkAdmittedRung(demand: StreamDemand, rung: string): boolean {
  if (demand.tierId === "derived") return true;
  return (
    rung === "cas-snapshot" ||
    rung === "derived-events" ||
    rung === "thumbnails-1fps" ||
    rung === "transcript-only" ||
    rung === "vad-transcript"
  );
}
