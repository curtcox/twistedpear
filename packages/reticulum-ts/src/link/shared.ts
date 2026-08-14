import {
  initialComputeLinkEstablishmentTimeoutState,
  initialComputeLinkMduState,
  initialComputeLinkRequestTimeoutState,
  initialComputeLinkRttSecondsState,
  initialMergeLinkRttState,
  LINK_ENABLED_MODES,
  LINK_ESTABLISHMENT_TIMEOUT_PER_HOP,
  LINK_KEEPALIVE,
  LINK_KEEPALIVE_MAX_RTT,
  LINK_KEEPALIVE_MIN,
  LINK_KEEPALIVE_TIMEOUT_FACTOR,
  LINK_MODE_BYTEMASK,
  LINK_MODE_DEFAULT,
  LINK_MTU_BYTEMASK,
  LINK_PROOF_MTU_SIZE,
  LINK_PROOF_SIGNATURE_SIZE,
  LINK_REQUEST_ECPUB_SIZE,
  LINK_RESPONSE_MAX_GRACE_TIME,
  LINK_STALE_FACTOR,
  LINK_STALE_GRACE,
  LINK_TRAFFIC_TIMEOUT_FACTOR,
  LINK_WATCHDOG_MAX_SLEEP_MS,
  LINK_X25519_KEY_SIZE,
  linkEstablishmentTimeoutFromActions,
  linkMduFromActions,
  LinkMode,
  linkRequestTimeoutFromActions,
  LinkResourceStrategy,
  linkRttSecondsFromActions,
  LinkStatus,
  LinkTeardownReason,
  mergeLinkRttFromActions,
  shouldUseLinkEstablishmentTimeout,
  shouldUseLinkMdu,
  shouldUseLinkRequestTimeout,
  shouldUseLinkRttSeconds,
  shouldUseMergeLinkRtt,
  stepComputeLinkEstablishmentTimeoutWithActions,
  stepComputeLinkMduWithActions,
  stepComputeLinkRequestTimeoutWithActions,
  stepComputeLinkRttSecondsWithActions,
  stepMergeLinkRttWithActions,
  type LinkModeValue,
  type LinkResourceStrategyValue,
  type LinkStatusValue,
  type LinkTeardownReasonValue,
} from "./protocol.js";

import { Identity } from "../identity.js";
import { LinkRequestReceipt } from "../link-request-receipt.js";
import { Packet } from "../packet.js";
import type { PacketReceipt } from "../packet-receipt.js";
import type { RegisteredDestination } from "../registered-destination.js";
import type { LeafTransport } from "../transport/node.js";
import { Resource, ResourceAdvertisement } from "../resource.js";
import type { Link } from "../link.js";
/** Mirrors RNS/Link.py link mode constants (RNS 0.9.4). */
export {
  LinkMode,
  LINK_MODE_DEFAULT,
  LINK_ENABLED_MODES,
  LINK_MTU_BYTEMASK,
  LINK_MODE_BYTEMASK,
  type LinkModeValue,
};

/** Mirrors RNS/Link.py constants (RNS 0.9.4). */
export const LINK_ECPUB_SIZE = LINK_REQUEST_ECPUB_SIZE;
export const LINK_KEY_SIZE = LINK_X25519_KEY_SIZE;
export const LINK_MTU_SIZE = LINK_PROOF_MTU_SIZE;
export const LINK_SIGNATURE_SIZE = LINK_PROOF_SIGNATURE_SIZE;
export {
  LINK_KEEPALIVE,
  LINK_KEEPALIVE_MIN,
  LINK_KEEPALIVE_MAX_RTT,
  LINK_STALE_FACTOR,
  LINK_STALE_GRACE,
  LINK_TRAFFIC_TIMEOUT_FACTOR,
  LINK_KEEPALIVE_TIMEOUT_FACTOR,
  LINK_WATCHDOG_MAX_SLEEP_MS,
  LINK_ESTABLISHMENT_TIMEOUT_PER_HOP,
  LINK_RESPONSE_MAX_GRACE_TIME,
  LinkStatus,
  LinkTeardownReason,
  LinkResourceStrategy,
  type LinkStatusValue,
  type LinkTeardownReasonValue,
  type LinkResourceStrategyValue,
};

export interface LinkCallbacks {
  linkEstablished?: (link: Link) => void;
  linkClosed?: (link: Link) => void;
  packet?: (data: Uint8Array, packet: Packet) => void;
  remoteIdentified?: (link: Link, identity: Identity) => void;
  resource?: (advertisement: ResourceAdvertisement) => boolean;
  resourceConcluded?: (resource: Resource) => void;
}

export interface InitiatorLinkOptions {
  readonly destination: RegisteredDestination;
  readonly transport: LeafTransport;
  readonly linkMtuDiscovery?: boolean;
  readonly callbacks?: LinkCallbacks;
  /**
   * Optional injected entropy for initiator X25519 + Ed25519 private keys
   * (64 bytes). When omitted, the crypto provider supplies randomness.
   */
  readonly entropy?: Uint8Array;
}

export interface LinkRequestOptions {
  readonly response?: (receipt: LinkRequestReceipt) => void;
  readonly failed?: (receipt: LinkRequestReceipt) => void;
  readonly timeout?: number;
}

export interface LinkSendContextResult {
  readonly raw: Uint8Array;
  readonly receipt: PacketReceipt | null;
}

export function linkEstablishmentTimeoutForHops(
  hops: number,
  keepalive = LINK_KEEPALIVE,
): number {
  const stepped = stepComputeLinkEstablishmentTimeoutWithActions(
    initialComputeLinkEstablishmentTimeoutState(),
    {
      kind: "link/establishment-timeout-gate",
      hops,
      keepalive,
    },
  );
  const timeout = shouldUseLinkEstablishmentTimeout(stepped.actions)
    ? linkEstablishmentTimeoutFromActions(stepped.actions)
    : null;
  if (timeout === null) {
    throw new Error(
      "Link: missing use-timeout action for establishment timeout",
    );
  }
  return timeout;
}

export function linkRttSecondsForRequest(
  nowSeconds: number,
  requestTimeSeconds: number,
): number {
  const stepped = stepComputeLinkRttSecondsWithActions(
    initialComputeLinkRttSecondsState(),
    {
      kind: "link/rtt-seconds-gate",
      nowSeconds,
      requestTimeSeconds,
    },
  );
  const rtt = shouldUseLinkRttSeconds(stepped.actions)
    ? linkRttSecondsFromActions(stepped.actions)
    : null;
  if (rtt === null) {
    throw new Error("Link: missing use-rtt action for RTT seconds");
  }
  return rtt;
}

export function mergedLinkRtt(
  measuredSeconds: number,
  remoteSeconds: number,
): number {
  const stepped = stepMergeLinkRttWithActions(initialMergeLinkRttState(), {
    kind: "link/merge-rtt-gate",
    measuredSeconds,
    remoteSeconds,
  });
  const rtt = shouldUseMergeLinkRtt(stepped.actions)
    ? mergeLinkRttFromActions(stepped.actions)
    : null;
  if (rtt === null) {
    throw new Error("Link: missing use-rtt action for merged RTT");
  }
  return rtt;
}

export function linkRequestTimeoutForRtt(rtt: number): number {
  const stepped = stepComputeLinkRequestTimeoutWithActions(
    initialComputeLinkRequestTimeoutState(),
    {
      kind: "link/request-timeout-gate",
      rtt,
    },
  );
  const timeout = shouldUseLinkRequestTimeout(stepped.actions)
    ? linkRequestTimeoutFromActions(stepped.actions)
    : null;
  if (timeout === null) {
    throw new Error("Link: missing use-timeout action for request timeout");
  }
  return timeout;
}

export function linkMduForMtu(mtu: number): number {
  const stepped = stepComputeLinkMduWithActions(initialComputeLinkMduState(), {
    kind: "link/mdu-gate",
    mtu,
  });
  const mdu = shouldUseLinkMdu(stepped.actions)
    ? linkMduFromActions(stepped.actions)
    : null;
  if (mdu === null) {
    throw new Error("Link: missing use-mdu action");
  }
  return mdu;
}
