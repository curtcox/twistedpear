import { describe, expect, it } from "vitest";
import { PacketContextCode, planLinkDataContext } from "../src/packet-context.js";

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
});
