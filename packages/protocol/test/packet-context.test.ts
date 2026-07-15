import { describe, expect, it } from "vitest";
import {
  PacketContextCode,
  initialLinkDataContextState,
  initialLinkKeepaliveContextState,
  isLinkKeepaliveContext,
  linkDataContextFromActions,
  planLinkDataContext,
  shouldHandleLinkDataChannel,
  shouldHandleLinkDataClose,
  shouldHandleLinkDataIdentify,
  shouldHandleLinkDataKeepalive,
  shouldHandleLinkDataPlaintext,
  shouldHandleLinkDataRequest,
  shouldHandleLinkDataResource,
  shouldHandleLinkDataResourceAdv,
  shouldHandleLinkDataResourceHmu,
  shouldHandleLinkDataResourceIcl,
  shouldHandleLinkDataResourceRcl,
  shouldHandleLinkDataResourceReq,
  shouldHandleLinkDataResponse,
  shouldHandleLinkDataRtt,
  shouldIgnoreLinkDataContext,
  shouldTreatLinkKeepaliveContext,
  shouldTreatLinkKeepaliveOther,
  stepLinkDataContextWithActions,
  stepLinkKeepaliveContextWithActions
} from "../src/packet-context.js";

describe("protocol packet context", () => {
  it("plans link DATA context dispatch kinds", () => {
    expect(planLinkDataContext(PacketContextCode.LRRTT)).toBe("rtt");
    expect(planLinkDataContext(PacketContextCode.KEEPALIVE)).toBe("keepalive");
    expect(planLinkDataContext(PacketContextCode.LINKCLOSE)).toBe("close");
    expect(planLinkDataContext(PacketContextCode.LINKIDENTIFY)).toBe("identify");
    expect(planLinkDataContext(PacketContextCode.REQUEST)).toBe("request");
    expect(planLinkDataContext(PacketContextCode.RESPONSE)).toBe("response");
    expect(planLinkDataContext(PacketContextCode.CHANNEL)).toBe("channel");
    expect(planLinkDataContext(PacketContextCode.RESOURCE_ADV)).toBe("resource-adv");
    expect(planLinkDataContext(PacketContextCode.RESOURCE_REQ)).toBe("resource-req");
    expect(planLinkDataContext(PacketContextCode.RESOURCE_HMU)).toBe("resource-hmu");
    expect(planLinkDataContext(PacketContextCode.RESOURCE_ICL)).toBe("resource-icl");
    expect(planLinkDataContext(PacketContextCode.RESOURCE_RCL)).toBe("resource-rcl");
    expect(planLinkDataContext(PacketContextCode.RESOURCE)).toBe("resource");
    expect(planLinkDataContext(PacketContextCode.NONE)).toBe("plaintext");
    expect(planLinkDataContext(PacketContextCode.LRPROOF)).toBe("ignore");
  });

  it("emits link DATA context actions without ad-hoc plan reads", () => {
    const cases: Array<{ context: number; kind: string; check: (actions: ReturnType<typeof stepLinkDataContextWithActions>["actions"]) => boolean }> = [
      { context: PacketContextCode.LRRTT, kind: "rtt", check: shouldHandleLinkDataRtt },
      { context: PacketContextCode.KEEPALIVE, kind: "keepalive", check: shouldHandleLinkDataKeepalive },
      { context: PacketContextCode.LINKCLOSE, kind: "close", check: shouldHandleLinkDataClose },
      { context: PacketContextCode.LINKIDENTIFY, kind: "identify", check: shouldHandleLinkDataIdentify },
      { context: PacketContextCode.REQUEST, kind: "request", check: shouldHandleLinkDataRequest },
      { context: PacketContextCode.RESPONSE, kind: "response", check: shouldHandleLinkDataResponse },
      { context: PacketContextCode.CHANNEL, kind: "channel", check: shouldHandleLinkDataChannel },
      { context: PacketContextCode.RESOURCE_ADV, kind: "resource-adv", check: shouldHandleLinkDataResourceAdv },
      { context: PacketContextCode.RESOURCE_REQ, kind: "resource-req", check: shouldHandleLinkDataResourceReq },
      { context: PacketContextCode.RESOURCE_HMU, kind: "resource-hmu", check: shouldHandleLinkDataResourceHmu },
      { context: PacketContextCode.RESOURCE_ICL, kind: "resource-icl", check: shouldHandleLinkDataResourceIcl },
      { context: PacketContextCode.RESOURCE_RCL, kind: "resource-rcl", check: shouldHandleLinkDataResourceRcl },
      { context: PacketContextCode.RESOURCE, kind: "resource", check: shouldHandleLinkDataResource },
      { context: PacketContextCode.NONE, kind: "plaintext", check: shouldHandleLinkDataPlaintext },
      { context: PacketContextCode.LRPROOF, kind: "ignore", check: shouldIgnoreLinkDataContext }
    ];

    for (const entry of cases) {
      const stepped = stepLinkDataContextWithActions(initialLinkDataContextState(), {
        kind: "link/data-context-gate",
        context: entry.context
      });
      expect(linkDataContextFromActions(stepped.actions)).toBe(entry.kind);
      expect(entry.check(stepped.actions)).toBe(true);
    }
  });

  it("recognizes keepalive context bytes", () => {
    expect(isLinkKeepaliveContext(PacketContextCode.KEEPALIVE)).toBe(true);
    expect(isLinkKeepaliveContext(PacketContextCode.NONE)).toBe(false);
  });

  it("emits keepalive-context only from keepalive/other actions", () => {
    const keepalive = stepLinkKeepaliveContextWithActions(initialLinkKeepaliveContextState(), {
      kind: "link/keepalive-context-gate",
      context: PacketContextCode.KEEPALIVE
    });
    expect(shouldTreatLinkKeepaliveContext(keepalive.actions)).toBe(true);
    expect(shouldTreatLinkKeepaliveOther(keepalive.actions)).toBe(false);

    const other = stepLinkKeepaliveContextWithActions(initialLinkKeepaliveContextState(), {
      kind: "link/keepalive-context-gate",
      context: PacketContextCode.NONE
    });
    expect(shouldTreatLinkKeepaliveContext(other.actions)).toBe(false);
    expect(shouldTreatLinkKeepaliveOther(other.actions)).toBe(true);

    const empty = stepLinkKeepaliveContextWithActions(initialLinkKeepaliveContextState(), {
      kind: "timer/fired",
      timer: { id: "x" }
    });
    expect(shouldTreatLinkKeepaliveContext(empty.actions)).toBe(false);
    expect(shouldTreatLinkKeepaliveOther(empty.actions)).toBe(false);
  });
});
