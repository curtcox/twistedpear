/**
 * Inbound `session-invite` delivery.
 *
 * A calling mini-app is not running when someone rings it — mini-apps run one
 * at a time in the foreground and never in the background — so the invitation
 * has to arrive somewhere that is always up. That is the host's LXMF delivery
 * path: the bytes land here, this module decides whether they are a real,
 * cryptographically verified request from a peer, and only then hands a
 * `SessionInvite` to trusted chrome. No mini-app code runs anywhere on this
 * path; launching the app is chrome's decision after the user accepts.
 *
 * Everything a sender controls is treated as hostile: the peer label shown in
 * chrome is named by *this* host from the verified source hash, never by the
 * sender, and an invite for an app the host will not ring is dropped before it
 * can raise a notification.
 */

import { bytesToHex } from "@twistedpear/reticulum-ts";
import {
  decodeLinkControl,
  parseSessionInvite,
  SESSION_INVITE_MAX_BODY_BYTES,
  type SessionInviteRequest,
} from "@twistedpear/protocol";

/** LXMF title that carries a `TPL1` type-4 invite. */
export const SESSION_INVITE_TITLE = "tp-session-invite";
/** Content prefix, so an invite is never confused with ordinary mail. */
export const SESSION_INVITE_PREFIX = "tp-invite:";
/** Hex body ceiling: header, id, and a bounded invite body. */
const MAX_INVITE_HEX = 2 * (8 + 64 + SESSION_INVITE_MAX_BODY_BYTES);
/** Per-sender ceiling, so a peer cannot turn chrome into a notification firehose. */
const DEFAULT_MAX_INVITES_PER_WINDOW = 3;
const DEFAULT_WINDOW_MS = 60_000;

/** The subset of an inbound LXMF message this path reads. */
export interface SessionInviteCarrierMessage {
  titleAsString(): string;
  contentAsString(): string;
  readonly sourceHash: Uint8Array;
  readonly signatureValidated: boolean;
}

/** What trusted chrome is handed. Shaped for `MiniappHost.receiveSessionInvite`. */
export interface DeliveredSessionInvite {
  readonly id: string;
  readonly appId: string;
  readonly peer: { readonly id: string };
  readonly verifiedPeerLabel: string;
  readonly requestedClasses: SessionInviteRequest["requestedClasses"];
  readonly expiresAt: number;
  readonly verified: true;
}

export interface SessionInviteReceiverOptions {
  /** Raises the invitation in host chrome. Rejections are logged, never thrown. */
  readonly deliver: (invite: DeliveredSessionInvite) => Promise<void>;
  /**
   * Host policy gate: an invite for an app this host will not ring is dropped
   * before chrome sees it. Returning false is indistinguishable to the sender
   * from an unreachable host.
   */
  readonly isInvitableApp: (appId: string) => boolean;
  /**
   * Names the verified sender for chrome, and mints the opaque peer handle.
   * Returning null drops the invite: an unnamed peer must not be rung.
   */
  readonly resolvePeer: (
    sourceHashHex: string,
  ) => { readonly handleId: string; readonly displayLabel: string } | null;
  readonly now: () => number;
  readonly maxInvitesPerWindow?: number;
  readonly windowMs?: number;
  readonly log?: (line: string) => void;
}

/**
 * Builds the delivery-callback half of the carrier.
 *
 * The host owns its LXMF router's single `onDelivery` callback, so this
 * returns a handler to call from it rather than registering one itself.
 */
export function createSessionInviteReceiver(
  options: SessionInviteReceiverOptions,
): (message: SessionInviteCarrierMessage) => void {
  const maxPerWindow =
    options.maxInvitesPerWindow ?? DEFAULT_MAX_INVITES_PER_WINDOW;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const seen = new Map<string, number[]>();
  const log = options.log ?? (() => {});

  const withinRate = (sourceHashHex: string, at: number): boolean => {
    const recent = (seen.get(sourceHashHex) ?? []).filter(
      (stamp) => at - stamp < windowMs,
    );
    if (recent.length >= maxPerWindow) {
      seen.set(sourceHashHex, recent);
      return false;
    }
    recent.push(at);
    seen.set(sourceHashHex, recent);
    return true;
  };

  return (message) => {
    let title: string;
    let content: string;
    try {
      title = message.titleAsString();
      if (title !== SESSION_INVITE_TITLE) return;
      content = message.contentAsString();
    } catch {
      return;
    }
    // An unsigned or unverifiable message is not a peer, whatever it claims.
    if (message.signatureValidated !== true) return;
    if (!content.startsWith(SESSION_INVITE_PREFIX)) return;
    const payloadHex = content.slice(SESSION_INVITE_PREFIX.length);
    if (payloadHex.length > MAX_INVITE_HEX || payloadHex.length % 2 !== 0)
      return;
    if (!/^[0-9a-f]*$/i.test(payloadHex)) return;

    const envelope = decodeLinkControl(hexToBytes(payloadHex));
    if (envelope === null) return;
    const request = parseSessionInvite(envelope);
    if (request === null) return;

    const at = options.now();
    if (request.expiresAt <= at) return;
    if (!options.isInvitableApp(request.appId)) return;

    const sourceHashHex = bytesToHex(message.sourceHash);
    const peer = options.resolvePeer(sourceHashHex);
    if (peer === null) return;
    if (!withinRate(sourceHashHex, at)) {
      log(
        `Session invite from ${sourceHashHex.slice(0, 12)}… dropped: per-peer rate ceiling`,
      );
      return;
    }

    void options
      .deliver({
        // The invite id is sender-chosen, so it is namespaced by the verified
        // sender: two peers cannot collide, and neither can replay the other.
        id: `${sourceHashHex.slice(0, 16)}-${request.id}`,
        appId: request.appId,
        peer: { id: peer.handleId },
        verifiedPeerLabel: peer.displayLabel,
        requestedClasses: request.requestedClasses,
        expiresAt: request.expiresAt,
        verified: true,
      })
      .catch((error: unknown) =>
        log(
          `Session invite delivery failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
  };
}

/** Builds the LXMF body a peer sends to ring an app on this host. */
export function sessionInviteContent(envelope: Uint8Array): string {
  return `${SESSION_INVITE_PREFIX}${bytesToHex(envelope)}`;
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let index = 0; index < out.length; index += 1) {
    out[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return out;
}
