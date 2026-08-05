import {
  linkQualityFromRoute,
  type DeclaredLinkMeasurement,
  type LinkQuality,
  type RouteQualityReport,
} from "@twistedpear/protocol";

export type PeerDataPlane = "reticulum" | "webrtc" | "gateway" | "bluetooth";

/**
 * Nameplate rate for a data plane, used until a route reports a measurement.
 * These are declarations, not observations, and are labelled as such.
 */
export function declaredMeasurementForDataPlane(
  dataPlane: PeerDataPlane,
): DeclaredLinkMeasurement {
  return {
    kind: "declared",
    effectiveBps:
      dataPlane === "webrtc" || dataPlane === "gateway"
        ? 2_000_000
        : dataPlane === "bluetooth"
          ? 128_000
          : 64_000,
    mtu: dataPlane === "bluetooth" ? 185 : 1_200,
  };
}

/**
 * Single mapping from host route telemetry to the `LinkQuality` an app sees.
 * A transport that does not declare a `source` is reporting its interface's
 * nameplate, so the result stays `declared`/`low` and Line Check keeps saying
 * "probably" — see `meterHostPeerRoute` for the observed form.
 */
export function qualityForPeerRoute(
  dataPlane: PeerDataPlane,
  transport?: { quality?(): RouteQualityReport },
): LinkQuality {
  return linkQualityFromRoute(
    declaredMeasurementForDataPlane(dataPlane),
    transport?.quality?.(),
  );
}
