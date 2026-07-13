import { describe, expect, it } from "vitest";
import {
  LINK_KEEPALIVE_PROBE_BYTE,
  LINK_KEEPALIVE_REPLY_BYTE,
  isLinkKeepaliveProbe,
  isLinkKeepaliveReply,
  packLinkKeepaliveProbe,
  packLinkKeepaliveReply,
  shouldIgnoreInitiatorKeepaliveProbe,
  shouldReplyKeepaliveProbe
} from "../src/link-keepalive.js";

describe("link keepalive framing", () => {
  it("packs probe and reply bytes", () => {
    expect(Array.from(packLinkKeepaliveProbe())).toEqual([LINK_KEEPALIVE_PROBE_BYTE]);
    expect(Array.from(packLinkKeepaliveReply())).toEqual([LINK_KEEPALIVE_REPLY_BYTE]);
  });

  it("classifies probe and reply payloads", () => {
    expect(isLinkKeepaliveProbe(packLinkKeepaliveProbe())).toBe(true);
    expect(isLinkKeepaliveReply(packLinkKeepaliveReply())).toBe(true);
    expect(isLinkKeepaliveProbe(packLinkKeepaliveReply())).toBe(false);
    expect(isLinkKeepaliveReply(new Uint8Array([0xff, 0xfe]))).toBe(false);
  });

  it("ignores initiator keepalive probes only", () => {
    expect(
      shouldIgnoreInitiatorKeepaliveProbe({
        initiator: true,
        contextKeepalive: true,
        probePayload: true
      })
    ).toBe(true);
    expect(
      shouldIgnoreInitiatorKeepaliveProbe({
        initiator: false,
        contextKeepalive: true,
        probePayload: true
      })
    ).toBe(false);
    expect(
      shouldIgnoreInitiatorKeepaliveProbe({
        initiator: true,
        contextKeepalive: false,
        probePayload: true
      })
    ).toBe(false);
  });

  it("replies to responder keepalive probes only", () => {
    expect(
      shouldReplyKeepaliveProbe({
        initiator: false,
        probePayload: true
      })
    ).toBe(true);
    expect(
      shouldReplyKeepaliveProbe({
        initiator: true,
        probePayload: true
      })
    ).toBe(false);
    expect(
      shouldReplyKeepaliveProbe({
        initiator: false,
        probePayload: false
      })
    ).toBe(false);
  });
});
