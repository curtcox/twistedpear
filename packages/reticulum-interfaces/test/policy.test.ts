import { describe, expect, it } from "vitest";
import type { PacketInterface } from "@twistedpear/reticulum-ts";
import {
  InterfaceKind,
  inferInterfaceKind,
  rankOutgoingInterfaces,
  selectPreferredInterface,
} from "../src/policy.js";

function mockInterface(
  name: string,
  options: {
    readonly online?: boolean;
    readonly bitrate?: number | null;
    readonly outgoing?: boolean;
  } = {},
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
    close: async () => {},
  };
}

describe("interface prioritization policy", () => {
  it("infers kinds from interface names", () => {
    const cases = [
      ["harness-auto", InterfaceKind.AUTO],
      ["host-websocket", InterfaceKind.WEBSOCKET],
      ["host-ws-gateway", InterfaceKind.WEBSOCKET],
      ["tcp-client", InterfaceKind.TCP],
      ["udp-listener", InterfaceKind.UDP],
      ["harness-ble", InterfaceKind.BLE],
      ["classic-bluetooth", InterfaceKind.BLUETOOTH],
      ["rnode-usb", InterfaceKind.RNODE],
      ["kiss-serial", InterfaceKind.RNODE],
      ["lora-radio", InterfaceKind.RNODE],
      ["i2p-router", InterfaceKind.I2P],
      ["sam-session", InterfaceKind.I2P],
      ["host-freenet", InterfaceKind.FREENET],
      ["tplg-contract", InterfaceKind.FREENET],
      ["camera-link", InterfaceKind.OPTICAL],
      ["audio-link", InterfaceKind.ACOUSTIC],
      ["ntfy-relay", InterfaceKind.NTFY],
      ["docker-peer", InterfaceKind.UNKNOWN],
    ] as const;

    for (const [name, kind] of cases) {
      expect(inferInterfaceKind(name)).toBe(kind);
    }
  });

  it("ranks AutoInterface above TCP above BLE", () => {
    const ranked = rankOutgoingInterfaces([
      mockInterface("harness-ble", { bitrate: 20_000 }),
      mockInterface("harness-tcp"),
      mockInterface("harness-auto"),
    ]);

    expect(ranked.map((entry) => entry.kind)).toEqual([
      InterfaceKind.AUTO,
      InterfaceKind.TCP,
      InterfaceKind.BLE,
    ]);
  });

  it("prefers online interfaces over offline higher-priority ones", () => {
    const preferred = selectPreferredInterface([
      mockInterface("harness-auto", { online: false }),
      mockInterface("harness-ble", { online: true }),
    ]);

    expect(preferred?.name).toBe("harness-ble");
  });
});
