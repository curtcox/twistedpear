// @ts-nocheck
import { describe, expect, it } from "vitest";
import { Identity, PureCryptoProvider } from "@twistedpear/reticulum-ts";
import type { MulticastBridge, MulticastBridgeEvents, MulticastNetworkInfo } from "../src/pipes.js";
import { AutoInterfaceBridge } from "../src/auto-bridge.js";
import { AUTO_DEFAULT_DISCOVERY_PORT, AUTO_DEFAULT_GROUP_ID } from "../src/auto.js";
import { concatBytes, deriveMulticastAddress, MULTICAST_TEMPORARY, SCOPE_LINK } from "../src/auto-common.js";

class MockMulticastBridge implements MulticastBridge {
  interfaces: MulticastNetworkInfo[] = [{ name: "mock0", linkLocalAddress: "fe80::1" }];
  private events: MulticastBridgeEvents = {};
  private joined = new Set<string>();
  private bound = new Set<string>();

  setEvents(events: MulticastBridgeEvents): void {
    this.events = events;
  }

  async start(): Promise<void> {}

  async stop(): Promise<void> {}

  async joinGroup(ifname: string, groupAddress: string, port: number): Promise<void> {
    this.joined.add(`${ifname}:${groupAddress}:${port}`);
  }

  async bindPort(ifname: string, port: number): Promise<void> {
    this.bound.add(`${ifname}:${port}`);
  }

  async send(ifname: string, groupAddress: string, port: number, data: Uint8Array): Promise<void> {
    void ifname;
    void groupAddress;
    void port;
    void data;
  }

  async sendUnicast(ifname: string, targetAddress: string, port: number, data: Uint8Array): Promise<void> {
    void ifname;
    void targetAddress;
    void port;
    void data;
  }

  emitPacket(ifname: string, data: Uint8Array, sourceAddress: string, port: number): void {
    this.events.onPacket?.(ifname, data, sourceAddress, port);
  }
}

describe("AutoInterfaceBridge", () => {
  it("derives stable multicast addresses from group id", () => {
    const provider = new PureCryptoProvider();
    const first = deriveMulticastAddress(provider, new TextEncoder().encode("reticulum"), SCOPE_LINK, MULTICAST_TEMPORARY);
    const second = deriveMulticastAddress(provider, new TextEncoder().encode("reticulum"), SCOPE_LINK, MULTICAST_TEMPORARY);
    expect(first).toBe(second);
    expect(first.startsWith("ff12:")).toBe(true);
  });

  it("joins discovery multicast and binds data ports on start", async () => {
    const provider = new PureCryptoProvider();
    const bridge = new MockMulticastBridge();
    const auto = await AutoInterfaceBridge.open(provider, {
      name: "auto-bridge-test",
      provider,
      runtime: {} as never,
      bridge,
      peeringTimeoutMs: 200
    });

    expect(bridge.joined.size).toBeGreaterThan(0);
    expect(bridge.bound.size).toBeGreaterThan(0);
    await auto.close();
  });

  it("spawns a peer when a valid discovery token arrives", async () => {
    const provider = new PureCryptoProvider();
    const bridge = new MockMulticastBridge();
    const auto = await AutoInterfaceBridge.open(provider, {
      name: "auto-bridge-peer-test",
      provider,
      runtime: {} as never,
      bridge,
      peeringTimeoutMs: 5_000
    });

    const remoteAddress = "fe80::dead:beef";
    const token = Identity.fullHash(
      provider,
      concatBytes(new TextEncoder().encode(AUTO_DEFAULT_GROUP_ID), new TextEncoder().encode(remoteAddress))
    );

    bridge.emitPacket("mock0", token, remoteAddress, AUTO_DEFAULT_DISCOVERY_PORT);
    expect(auto.peerInterfaces.length).toBe(1);
    await auto.close();
  });

  it("spawns a peer when notifyPeerDiscovered is called (Bonjour path)", async () => {
    const provider = new PureCryptoProvider();
    const bridge = new MockMulticastBridge();
    const auto = await AutoInterfaceBridge.open(provider, {
      name: "auto-bridge-bonjour-test",
      provider,
      runtime: {} as never,
      bridge,
      peeringTimeoutMs: 5_000
    });

    auto.notifyPeerDiscovered("fe80::cafe", "mock0");
    expect(auto.peerInterfaces.length).toBe(1);
    expect(auto.peerInterfaces[0]?.peerAddress).toBe("fe80::cafe");
    await auto.close();
  });

  it("expires stale peers after the peering timeout", async () => {
    const provider = new PureCryptoProvider();
    const bridge = new MockMulticastBridge();
    let detached = 0;

    const auto = await AutoInterfaceBridge.open(provider, {
      name: "auto-bridge-expiry-test",
      provider,
      runtime: {} as never,
      bridge,
      peeringTimeoutMs: 200,
      onPeerDetach: () => {
        detached += 1;
      }
    });

    const addPeer = (auto as unknown as { addPeer: (address: string, ifname: string) => void }).addPeer.bind(auto);
    addPeer("fe80::dead:beef", "mock0");
    expect(auto.peerInterfaces.length).toBe(1);

    await new Promise((resolve) => setTimeout(resolve, 4_500));
    expect(auto.peerInterfaces.length).toBe(0);
    expect(detached).toBe(1);

    await auto.close();
  }, 10_000);
});
