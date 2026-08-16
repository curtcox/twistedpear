import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeBonjour, FakeMulticast, FakeSerialPipe } from "./bridges-fakes.js";

let latestSerialOptions: { path: string; baudRate: number } | null = null;
const serialPipes: FakeSerialPipe[] = [];

vi.mock("@twistedpear/reticulum-interfaces/multicast-node", () => ({
  createNodeMulticastBridge: () => new FakeMulticast(),
}));
vi.mock("@twistedpear/reticulum-interfaces/bonjour-mdns", () => ({
  createMdnsBonjourBridge: () => new FakeBonjour(),
}));
vi.mock("@twistedpear/reticulum-interfaces/serial-node", () => ({
  createSerialNodePipe: (options: { path: string; baudRate: number }) => {
    latestSerialOptions = options;
    const pipe = new FakeSerialPipe();
    serialPipes.push(pipe);
    return pipe;
  },
}));
vi.mock("@twistedpear/reticulum-interfaces", () => ({
  BONJOUR_RETICULUM_SERVICE: "_reticulum._udp",
}));

const { HostDesktopBridges } = await import("../src/main/bridges.js");

beforeEach(() => {
  FakeSerialPipe.failToOpen = false;
  latestSerialOptions = null;
  serialPipes.length = 0;
});

describe("HostDesktopBridges serial dispatch", () => {
  it("opens a serial pipe, forwards its events, and writes/stops it", async () => {
    const sent: unknown[] = [];
    const bridges = new HostDesktopBridges((message) => sent.push(message));

    await bridges.handleWorkletMessage({
      type: "serial-start",
      portPath: "/dev/tty.usb",
      baudRate: 115200,
    });

    expect(latestSerialOptions).toEqual({
      path: "/dev/tty.usb",
      baudRate: 115200,
    });
    const pipe = serialPipes[0]!;
    expect(pipe.opened).toBe(1);
    expect(sent).toContainEqual({
      type: "serial-connect",
      deviceName: "/dev/tty.usb",
    });

    pipe.events.onData?.(new Uint8Array([1, 2, 3]));
    pipe.events.onConnect?.();
    pipe.events.onDisconnect?.();
    pipe.events.onError?.(new Error("bad byte"));

    expect(sent).toContainEqual({ type: "serial-data", dataHex: "010203" });
    expect(sent).toContainEqual({
      type: "serial-connect",
      deviceName: "/dev/tty.usb",
    });
    expect(sent).toContainEqual({ type: "serial-disconnect" });
    expect(sent).toContainEqual({ type: "serial-error", message: "bad byte" });

    await bridges.handleWorkletMessage({
      type: "serial-write",
      dataHex: "0a0b",
    });
    expect(pipe.written).toEqual([new Uint8Array([0x0a, 0x0b])]);

    await bridges.handleWorkletMessage({ type: "serial-stop" });
    expect(pipe.closed).toBe(1);

    // A second stop is a no-op once the pipe has already been torn down.
    await bridges.handleWorkletMessage({ type: "serial-stop" });
    expect(pipe.closed).toBe(1);
  });

  it("ignores a serial-start with an empty port path", async () => {
    const bridges = new HostDesktopBridges(() => {});
    await bridges.handleWorkletMessage({
      type: "serial-start",
      baudRate: 9600,
    });
    expect(serialPipes).toHaveLength(0);
  });

  it("does not open a second serial pipe while one is active", async () => {
    const bridges = new HostDesktopBridges(() => {});
    await bridges.handleWorkletMessage({
      type: "serial-start",
      portPath: "/dev/tty.usb",
      baudRate: 9600,
    });
    await bridges.handleWorkletMessage({
      type: "serial-start",
      portPath: "/dev/tty.other",
      baudRate: 9600,
    });
    expect(serialPipes).toHaveLength(1);
  });

  it("reports a serial-error when opening the pipe fails", async () => {
    FakeSerialPipe.failToOpen = true;
    const sent: unknown[] = [];
    const bridges = new HostDesktopBridges((message) => sent.push(message));

    await bridges.handleWorkletMessage({
      type: "serial-start",
      portPath: "/dev/tty.usb",
      baudRate: 9600,
    });

    expect(sent).toContainEqual({
      type: "serial-error",
      message: "no such device",
    });
  });

  it("writes to the serial pipe only when one is open", async () => {
    const bridges = new HostDesktopBridges(() => {});
    await expect(
      bridges.handleWorkletMessage({ type: "serial-write", dataHex: "aa" }),
    ).resolves.toBeUndefined();
  });
});
