// @ts-nocheck
import { describe, expect, it } from "vitest";
import { createMdnsBonjourBridge } from "@twistedpear/reticulum-interfaces/bonjour-mdns";

describe("createMdnsBonjourBridge", () => {
  it("starts, advertises, and stops without throwing", async () => {
    const bridge = createMdnsBonjourBridge({
      interfaces: [{ name: "lo0", linkLocalAddress: "fe80::1" }]
    });

    await bridge.start();
    await bridge.advertise({
      id: "test-peer",
      ifname: "lo0",
      host: "fe80::1",
      port: 42_671
    });
    await bridge.stop();
    expect(bridge.interfaces).toHaveLength(1);
  });
});
