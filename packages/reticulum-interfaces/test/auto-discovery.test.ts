import { describe, expect, it } from "vitest";
import {
  BonjourDiscoveryProvider,
  serviceRecordToPeer,
  selectDiscoveryProviders,
  type BonjourBridge,
  type BonjourBridgeEvents,
} from "../src/index.js";
import type { MulticastNetworkInfo } from "../src/pipes.js";

class MockBonjourBridge implements BonjourBridge {
  interfaces: MulticastNetworkInfo[] = [
    { name: "en0", linkLocalAddress: "fe80::1" },
  ];
  private events: BonjourBridgeEvents = {};
  startedWith: string | null = null;
  advertised: ReadonlyArray<{
    readonly id: string;
    readonly ifname: string;
    readonly host: string;
    readonly port: number;
  }> = [];

  setEvents(events: BonjourBridgeEvents): void {
    this.events = events;
  }

  async start(serviceType: string): Promise<void> {
    this.startedWith = serviceType;
  }

  async stop(): Promise<void> {}

  async advertise(record: {
    readonly id: string;
    readonly ifname: string;
    readonly host: string;
    readonly port: number;
  }): Promise<void> {
    this.advertised = [...this.advertised, record];
  }

  emit(record: {
    readonly id: string;
    readonly ifname: string;
    readonly host: string;
    readonly port: number;
  }): void {
    this.events.onServiceFound?.(record);
  }
}

describe("discovery provider policy", () => {
  it("prefers multicast when entitlement and bridge are available", () => {
    expect(
      selectDiscoveryProviders({
        multicastAvailable: true,
        multicastEntitled: true,
        bonjourAvailable: true,
      }),
    ).toEqual({ primary: "multicast", active: ["multicast"] });
  });

  it("falls back to Bonjour when multicast is unavailable or unentitled", () => {
    expect(
      selectDiscoveryProviders({
        multicastAvailable: true,
        multicastEntitled: false,
        bonjourAvailable: true,
      }),
    ).toEqual({ primary: "bonjour", active: ["bonjour"] });
  });

  it("can run both providers during migration", () => {
    expect(
      selectDiscoveryProviders({
        multicastAvailable: true,
        multicastEntitled: true,
        bonjourAvailable: true,
        allowConcurrent: true,
      }),
    ).toEqual({ primary: "multicast", active: ["multicast", "bonjour"] });
  });
});

describe("BonjourDiscoveryProvider", () => {
  it("maps Bonjour records to discovery peers and advertises Reticulum UDP records", async () => {
    const bridge = new MockBonjourBridge();
    const provider = new BonjourDiscoveryProvider(bridge);
    let peer = null as ReturnType<typeof serviceRecordToPeer> | null;

    provider.setEvents({
      onPeer: (next) => {
        peer = next;
      },
    });

    await provider.start();
    await provider.advertise("en0", "fe80::1234", 42_671);
    bridge.emit({
      id: "remote",
      ifname: "en0",
      host: "fe80::5678",
      port: 42_671,
    });

    expect(bridge.startedWith).toBe("_reticulum._udp");
    expect(bridge.advertised).toHaveLength(1);
    expect(peer?.provider).toBe("bonjour");
    expect(peer?.address).toBe("fe80::5678");
  });
});
