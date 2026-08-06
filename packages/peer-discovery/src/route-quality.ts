/**
 * Passive goodput metering for an authenticated peer route.
 *
 * The Link Observatory reports a per-peer `LinkQuality` to `link:observe`
 * apps, and the honest-degradation rule means a number the host guessed must
 * never be labelled as one it measured. A raw transport can usually report its
 * interface's nameplate bitrate and its link RTT; nothing in it counts bytes.
 * This wrapper counts the payload bytes that were going to move anyway — the
 * `observed` half of the hybrid measurement — and folds them into the Sans-IO
 * estimator, leaving the clock and the byte counting here in the adapter.
 */

import {
  linkQualityFromRoute,
  observeLinkDelivery,
  openLinkObservation,
  type DeclaredLinkMeasurement,
  type LinkObservationWindow,
  type RouteQualityReport,
} from "@twistedpear/protocol";
import type { HostPeerRoute } from "./route-registry.js";

export interface MeteredHostPeerRouteOptions {
  /** Host clock. Supplied so the estimator itself stays Sans-IO. */
  readonly now: () => number;
  /** Interface nameplate rate, reported until a real sample lands. */
  readonly declaredBps: number;
  readonly declaredMtu: number;
  /** Bytes a window must carry before its goodput is credible. */
  readonly minSampleBytes?: number;
  /** Age after which an under-filled window is discarded rather than reported. */
  readonly maxWindowMs?: number;
}

/**
 * Wraps a route so every byte sent or received updates its observed quality.
 *
 * Idle time never lowers the estimate: an under-filled window is discarded, so
 * a fast link that nobody is using keeps saying what it last measured instead
 * of decaying towards "events only".
 */
export function meterHostPeerRoute(
  route: HostPeerRoute,
  options: MeteredHostPeerRouteOptions,
): HostPeerRoute {
  const declared: DeclaredLinkMeasurement = {
    kind: "declared",
    effectiveBps: options.declaredBps,
    mtu: options.declaredMtu,
  };
  let window: LinkObservationWindow = openLinkObservation(
    declared,
    options.now(),
  );

  const observe = (bytes: number): void => {
    const reported = route.quality?.();
    window = observeLinkDelivery(window, {
      bytes,
      atMs: options.now(),
      ...(reported === undefined
        ? {}
        : { rttMs: reported.rttMs, mtu: reported.mtu }),
      ...(options.minSampleBytes === undefined
        ? {}
        : { minSampleBytes: options.minSampleBytes }),
      ...(options.maxWindowMs === undefined
        ? {}
        : { maxWindowMs: options.maxWindowMs }),
    });
  };

  const metered: HostPeerRoute = {
    async send(payload) {
      await route.send(payload);
      // Only bytes the transport accepted count as delivered.
      observe(payload.byteLength);
    },
    quality(): RouteQualityReport {
      const reported = route.quality?.();
      const measured = window.quality;
      if (measured.source === "declared") {
        // Nothing measured yet: pass the transport's own claim through
        // unchanged rather than dressing a nameplate as an observation.
        return reported ?? linkQualityFromRoute(declared);
      }
      return {
        goodputBps: measured.goodputBps,
        rttMs: reported?.rttMs ?? measured.rttMs,
        mtu: reported?.mtu ?? measured.mtu,
        jitterMs: measured.jitterMs,
        lossRatio: measured.lossRatio,
        source: measured.source,
        samples: measured.samples,
        confidence: measured.confidence,
        ...(reported?.queueDepthBytes === undefined
          ? {}
          : { queueDepthBytes: reported.queueDepthBytes }),
      };
    },
  };

  if (route.subscribe !== undefined) {
    const subscribe = route.subscribe.bind(route);
    metered.subscribe = (listener) =>
      subscribe((payload) => {
        observe(payload.byteLength);
        listener(payload);
      });
  }

  return metered;
}
