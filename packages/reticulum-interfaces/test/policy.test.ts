import { describe, expect, it } from "vitest";
import type { PacketInterface } from "@twistedpear/reticulum-ts";
import {
  InterfaceKind,
  inferInterfaceKind,
  rankOutgoingInterfaces,
  selectPreferredInterface
} from "../src/policy.js";

function mockInterface(
  name: string,
  options: { readonly online?: boolean; readonly bitrate?: number | null; readonly outgoing?: boolean } = {}
): PacketInterface {
  return {
    name,
    mtu: 500,
    bitrate: options.bitrate ?? null,
    incoming: true,
    outgoing: options.outgoing ?? true,
    online: options.online ?? true,
    packets: (async function* () {})(),
    send: async () => {},
    close: async () => {}
  };
}

describe("interface prioritization policy", () => {
  it("infers kinds from interface names", () => {
    expect(inferInterfaceKind("harness-auto")).toBe(InterfaceKind.AUTO);
    expect(inferInterfaceKind("docker-peer")).toBe(InterfaceKind.UNKNOWN);
    expect(inferInterfaceKind("harness-ble")).toBe(InterfaceKind.BLE);
    expect(inferInterfaceKind("rnode-usb")).toBe(InterfaceKind.RNODE);
  });

  it("ranks AutoInterface above TCP above BLE", () => {
    const ranked = rankOutgoingInterfaces([
      mockInterface("harness-ble", { bitrate: 20_000 }),
      mockInterface("harness-tcp"),
      mockInterface("harness-auto")
    ]);

    expect(ranked.map((entry) => entry.kind)).toEqual([
      InterfaceKind.AUTO,
      InterfaceKind.TCP,
      InterfaceKind.BLE
    ]);
  });

  it("prefers online interfaces over offline higher-priority ones", () => {
    const preferred = selectPreferredInterface([
      mockInterface("harness-auto", { online: false }),
      mockInterface("harness-ble", { online: true })
    ]);

    expect(preferred?.name).toBe("harness-ble");
  });
});
