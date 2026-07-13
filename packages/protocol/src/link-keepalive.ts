/**
 * Pure link keepalive probe / reply framing (1-byte payloads).
 * Timing stays in link-watchdog; send/receive stays at the adapter edge.
 */

export const LINK_KEEPALIVE_PROBE_BYTE = 0xff;
export const LINK_KEEPALIVE_REPLY_BYTE = 0xfe;

export function packLinkKeepaliveProbe(): Uint8Array {
  return new Uint8Array([LINK_KEEPALIVE_PROBE_BYTE]);
}

export function packLinkKeepaliveReply(): Uint8Array {
  return new Uint8Array([LINK_KEEPALIVE_REPLY_BYTE]);
}

export function isLinkKeepaliveProbe(data: Uint8Array): boolean {
  return data.length === 1 && data[0] === LINK_KEEPALIVE_PROBE_BYTE;
}

export function isLinkKeepaliveReply(data: Uint8Array): boolean {
  return data.length === 1 && data[0] === LINK_KEEPALIVE_REPLY_BYTE;
}

/** Whether an initiator should drop an inbound keepalive-probe DATA/KEEPALIVE packet. */
export function shouldIgnoreInitiatorKeepaliveProbe(input: {
  readonly initiator: boolean;
  readonly contextKeepalive: boolean;
  readonly probePayload: boolean;
}): boolean {
  return input.initiator && input.contextKeepalive && input.probePayload;
}
