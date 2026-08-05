import { describe, expect, it } from "vitest";
import {
  LINK_KEEPALIVE_PROBE_BYTE,
  LINK_KEEPALIVE_REPLY_BYTE,
  initialClassifyLinkKeepaliveState,
  initialPackLinkKeepaliveProbeState,
  initialPackLinkKeepaliveReplyState,
  isLinkKeepaliveProbe,
  isLinkKeepaliveReply,
  packLinkKeepaliveProbe,
  packLinkKeepaliveProbeRawFromActions,
  packLinkKeepaliveReply,
  packLinkKeepaliveReplyRawFromActions,
  shouldClassifyLinkKeepaliveProbe,
  shouldClassifyLinkKeepaliveReply,
  shouldIgnoreInitiatorKeepaliveProbe,
  shouldIgnoreInitiatorKeepaliveProbeNow,
  shouldProceedInitiatorKeepaliveProbe,
  initialIgnoreInitiatorKeepaliveProbeState,
  stepIgnoreInitiatorKeepaliveProbeWithActions,
  shouldRejectClassifyLinkKeepalive,
  shouldReplyKeepaliveProbe,
  shouldReplyKeepaliveProbeNow,
  shouldSkipKeepaliveProbeReply,
  initialReplyKeepaliveProbeState,
  stepReplyKeepaliveProbeWithActions,
  shouldUsePackLinkKeepaliveProbe,
  shouldUsePackLinkKeepaliveReply,
  stepClassifyLinkKeepaliveWithActions,
  stepPackLinkKeepaliveProbeWithActions,
  stepPackLinkKeepaliveReplyWithActions,
} from "../src/link-keepalive.js";

describe("link keepalive framing", () => {
  it("packs probe and reply bytes", () => {
    expect(Array.from(packLinkKeepaliveProbe())).toEqual([
      LINK_KEEPALIVE_PROBE_BYTE,
    ]);
    expect(Array.from(packLinkKeepaliveReply())).toEqual([
      LINK_KEEPALIVE_REPLY_BYTE,
    ]);
  });

  it("classifies probe and reply payloads", () => {
    expect(isLinkKeepaliveProbe(packLinkKeepaliveProbe())).toBe(true);
    expect(isLinkKeepaliveReply(packLinkKeepaliveReply())).toBe(true);
    expect(isLinkKeepaliveProbe(packLinkKeepaliveReply())).toBe(false);
    expect(isLinkKeepaliveReply(new Uint8Array([0xff, 0xfe]))).toBe(false);
  });

  it("packs probe and reply via WithActions", () => {
    const probeStepped = stepPackLinkKeepaliveProbeWithActions(
      initialPackLinkKeepaliveProbeState(),
      { kind: "link-keepalive/pack-probe-gate" },
    );
    expect(shouldUsePackLinkKeepaliveProbe(probeStepped.actions)).toBe(true);
    expect(
      Array.from(packLinkKeepaliveProbeRawFromActions(probeStepped.actions)!),
    ).toEqual([LINK_KEEPALIVE_PROBE_BYTE]);

    const replyStepped = stepPackLinkKeepaliveReplyWithActions(
      initialPackLinkKeepaliveReplyState(),
      { kind: "link-keepalive/pack-reply-gate" },
    );
    expect(shouldUsePackLinkKeepaliveReply(replyStepped.actions)).toBe(true);
    expect(
      Array.from(packLinkKeepaliveReplyRawFromActions(replyStepped.actions)!),
    ).toEqual([LINK_KEEPALIVE_REPLY_BYTE]);
  });

  it("classifies payloads via WithActions", () => {
    const probe = stepClassifyLinkKeepaliveWithActions(
      initialClassifyLinkKeepaliveState(),
      {
        kind: "link-keepalive/classify-gate",
        data: packLinkKeepaliveProbe(),
      },
    );
    expect(shouldClassifyLinkKeepaliveProbe(probe.actions)).toBe(true);
    expect(shouldClassifyLinkKeepaliveReply(probe.actions)).toBe(false);
    expect(shouldRejectClassifyLinkKeepalive(probe.actions)).toBe(false);

    const reply = stepClassifyLinkKeepaliveWithActions(
      initialClassifyLinkKeepaliveState(),
      {
        kind: "link-keepalive/classify-gate",
        data: packLinkKeepaliveReply(),
      },
    );
    expect(shouldClassifyLinkKeepaliveReply(reply.actions)).toBe(true);

    const reject = stepClassifyLinkKeepaliveWithActions(
      initialClassifyLinkKeepaliveState(),
      {
        kind: "link-keepalive/classify-gate",
        data: new Uint8Array([0x00]),
      },
    );
    expect(shouldRejectClassifyLinkKeepalive(reject.actions)).toBe(true);
  });

  it("ignores initiator keepalive probes only", () => {
    expect(
      shouldIgnoreInitiatorKeepaliveProbe({
        initiator: true,
        contextKeepalive: true,
        probePayload: true,
      }),
    ).toBe(true);
    expect(
      shouldIgnoreInitiatorKeepaliveProbe({
        initiator: false,
        contextKeepalive: true,
        probePayload: true,
      }),
    ).toBe(false);
    expect(
      shouldIgnoreInitiatorKeepaliveProbe({
        initiator: true,
        contextKeepalive: false,
        probePayload: true,
      }),
    ).toBe(false);
  });

  it("replies to responder keepalive probes only", () => {
    expect(
      shouldReplyKeepaliveProbe({
        initiator: false,
        probePayload: true,
      }),
    ).toBe(true);
    expect(
      shouldReplyKeepaliveProbe({
        initiator: true,
        probePayload: true,
      }),
    ).toBe(false);
    expect(
      shouldReplyKeepaliveProbe({
        initiator: false,
        probePayload: false,
      }),
    ).toBe(false);
  });

  it("concludes initiator ignore / responder reply via actions", () => {
    const ignore = stepIgnoreInitiatorKeepaliveProbeWithActions(
      initialIgnoreInitiatorKeepaliveProbeState(),
      {
        kind: "link-keepalive/ignore-initiator-probe-gate",
        initiator: true,
        contextKeepalive: true,
        probePayload: true,
      },
    );
    expect(shouldIgnoreInitiatorKeepaliveProbeNow(ignore.actions)).toBe(true);
    const proceed = stepIgnoreInitiatorKeepaliveProbeWithActions(
      initialIgnoreInitiatorKeepaliveProbeState(),
      {
        kind: "link-keepalive/ignore-initiator-probe-gate",
        initiator: false,
        contextKeepalive: true,
        probePayload: true,
      },
    );
    expect(shouldProceedInitiatorKeepaliveProbe(proceed.actions)).toBe(true);

    const reply = stepReplyKeepaliveProbeWithActions(
      initialReplyKeepaliveProbeState(),
      {
        kind: "link-keepalive/reply-probe-gate",
        initiator: false,
        probePayload: true,
      },
    );
    expect(shouldReplyKeepaliveProbeNow(reply.actions)).toBe(true);
    const skip = stepReplyKeepaliveProbeWithActions(
      initialReplyKeepaliveProbeState(),
      {
        kind: "link-keepalive/reply-probe-gate",
        initiator: true,
        probePayload: true,
      },
    );
    expect(shouldSkipKeepaliveProbeReply(skip.actions)).toBe(true);
  });
});
