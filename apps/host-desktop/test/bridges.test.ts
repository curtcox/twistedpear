import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeBonjour, FakeMulticast, FakeSerialPipe } from "./bridges-fakes.js";

let latestMulticast: FakeMulticast;
let latestBonjour: FakeBonjour;

vi.mock("@twistedpear/reticulum-interfaces/multicast-node", () => ({
  createNodeMulticastBridge: () => {
    latestMulticast = new FakeMulticast();
    return latestMulticast;
  },
}));
vi.mock("@twistedpear/reticulum-interfaces/bonjour-mdns", () => ({
  createMdnsBonjourBridge: () => {
    latestBonjour = new FakeBonjour();
    return latestBonjour;
  },
}));
vi.mock("@twistedpear/reticulum-interfaces/serial-node", () => ({
  createSerialNodePipe: () => new FakeSerialPipe(),
}));
vi.mock("@twistedpear/reticulum-interfaces", () => ({
  BONJOUR_RETICULUM_SERVICE: "_reticulum._udp",
}));

const { HostDesktopBridges } = await import("../src/main/bridges.js");

beforeEach(() => {
  FakeSerialPipe.failToOpen = false;
});

describe("HostDesktopBridges classification and lifecycle", () => {
  it("classifies messages by prefix", () => {
    const bridges = new HostDesktopBridges(() => {});
    expect(bridges.isBridgeMessage({ type: "multicast-start" })).toBe(true);
    expect(bridges.isBridgeMessage({ type: "bonjour-start" })).toBe(true);
    expect(bridges.isBridgeMessage({ type: "serial-stop" })).toBe(true);
    expect(
      bridges.isBridgeMessage({ type: "status", status: {} } as never),
    ).toBe(false);
  });

  it("ignores unknown message subtypes for each namespace", async () => {
    const bridges = new HostDesktopBridges(() => {});
    await expect(
      bridges.handleWorkletMessage({ type: "multicast-unknown" } as never),
    ).resolves.toBeUndefined();
    await expect(
      bridges.handleWorkletMessage({ type: "bonjour-unknown" } as never),
    ).resolves.toBeUndefined();
    await expect(
      bridges.handleWorkletMessage({ type: "serial-unknown" } as never),
    ).resolves.toBeUndefined();
    await expect(
      bridges.handleWorkletMessage({ type: "status", status: {} } as never),
    ).resolves.toBeUndefined();
  });

  it("stop() tears down serial, multicast, and bonjour", async () => {
    const bridges = new HostDesktopBridges(() => {});
    await bridges.handleWorkletMessage({
      type: "serial-start",
      portPath: "/dev/tty.usb",
      baudRate: 9600,
    });

    await bridges.stop();

    expect(latestMulticast.stopped).toBe(1);
    expect(latestBonjour.stopped).toBe(1);
  });
});

describe("HostDesktopBridges multicast dispatch", () => {
  it("forwards multicast packet and network-change events to the worklet", () => {
    const sent: unknown[] = [];
    new HostDesktopBridges((message) => sent.push(message));

    latestMulticast.events.onPacket?.(
      "en0",
      new Uint8Array([1, 2]),
      "10.0.0.1",
      4242,
    );
    latestMulticast.events.onNetworkChange?.([
      { name: "en0", linkLocalAddress: "fe80::1" },
    ]);

    expect(sent).toEqual([
      {
        type: "multicast-packet",
        ifname: "en0",
        dataHex: "0102",
        sourceAddress: "10.0.0.1",
        port: 4242,
      },
      {
        type: "multicast-interfaces",
        interfaces: [{ name: "en0", linkLocalAddress: "fe80::1" }],
      },
    ]);
  });

  it("dispatches multicast worklet messages to the bridge", async () => {
    const bridges = new HostDesktopBridges(() => {});

    await bridges.handleWorkletMessage({ type: "multicast-start" });
    await bridges.handleWorkletMessage({
      type: "multicast-join",
      ifname: "en0",
      groupAddress: "ff02::1",
      port: 4242,
    });
    await bridges.handleWorkletMessage({
      type: "multicast-bind",
      ifname: "en0",
      port: 4242,
    });
    await bridges.handleWorkletMessage({
      type: "multicast-send",
      ifname: "en0",
      groupAddress: "ff02::1",
      port: 4242,
      dataHex: "aabb",
    });
    await bridges.handleWorkletMessage({
      type: "multicast-unicast",
      ifname: "en0",
      targetAddress: "fe80::5",
      port: 4242,
      dataHex: "ccdd",
    });
    await bridges.handleWorkletMessage({ type: "multicast-stop" });

    expect(latestMulticast.started).toBe(1);
    expect(latestMulticast.joined).toEqual([
      { ifname: "en0", groupAddress: "ff02::1", port: 4242 },
    ]);
    expect(latestMulticast.bound).toEqual([{ ifname: "en0", port: 4242 }]);
    expect(latestMulticast.sent).toEqual([
      {
        ifname: "en0",
        groupAddress: "ff02::1",
        port: 4242,
        data: new Uint8Array([0xaa, 0xbb]),
      },
    ]);
    expect(latestMulticast.unicast).toEqual([
      {
        ifname: "en0",
        targetAddress: "fe80::5",
        port: 4242,
        data: new Uint8Array([0xcc, 0xdd]),
      },
    ]);
    expect(latestMulticast.stopped).toBe(1);
  });
});

describe("HostDesktopBridges bonjour dispatch", () => {
  it("forwards bonjour service-found and network-change events", () => {
    const sent: unknown[] = [];
    new HostDesktopBridges((message) => sent.push(message));

    (
      latestBonjour.events as { onServiceFound?: (record: unknown) => void }
    ).onServiceFound?.({ ifname: "en0", host: "10.0.0.2", port: 4243 });
    (
      latestBonjour.events as {
        onNetworkChange?: (interfaces: unknown) => void;
      }
    ).onNetworkChange?.([{ name: "en0", linkLocalAddress: "fe80::2" }]);

    expect(sent).toEqual([
      { type: "bonjour-peer", ifname: "en0", address: "10.0.0.2", port: 4243 },
      {
        type: "bonjour-interfaces",
        interfaces: [{ name: "en0", linkLocalAddress: "fe80::2" }],
      },
    ]);
  });

  it("dispatches bonjour worklet messages to the bridge", async () => {
    const bridges = new HostDesktopBridges(() => {});

    await bridges.handleWorkletMessage({ type: "bonjour-start" });
    await bridges.handleWorkletMessage({
      type: "bonjour-advertise",
      ifname: "en0",
      address: "10.0.0.1",
      port: 4242,
    });
    await bridges.handleWorkletMessage({ type: "bonjour-stop" });

    expect(latestBonjour.started).toEqual(["_reticulum._udp"]);
    expect(latestBonjour.advertised).toEqual([
      { id: "en0:10.0.0.1:4242", ifname: "en0", host: "10.0.0.1", port: 4242 },
    ]);
    expect(latestBonjour.stopped).toBe(1);
  });
});
