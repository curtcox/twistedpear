import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createIpcBonjourBridge } from "../src/ipc-bonjour-bridge.mjs";
import { createIpcMulticastBridge } from "../src/ipc-multicast-bridge.mjs";
import { createIpcSerialBridge } from "../src/ipc-serial-bridge.mjs";

/**
 * The bridges are the worklet half of a BareKit IPC pair: every operation is a
 * newline-delimited JSON frame written to `BareKit.IPC`, and every host reply
 * arrives through `handleHostMessage`. The stub captures the wire.
 */
const frames: Record<string, unknown>[] = [];

beforeEach(() => {
  frames.length = 0;
  Reflect.set(globalThis, "BareKit", {
    IPC: {
      write: (chunk: Buffer) => {
        for (const line of chunk.toString("utf8").split("\n")) {
          if (line !== "") frames.push(JSON.parse(line) as never);
        }
      },
    },
  });
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, "BareKit");
});

describe("createIpcSerialBridge", () => {
  it("starts closed with zeroed stats", () => {
    const pipe = createIpcSerialBridge({ portPath: "/dev/ttyUSB0" });
    expect(pipe.connected).toBe(false);
    expect(pipe.stats).toEqual({ bytesIn: 0, bytesOut: 0, connected: false });
  });

  it("emits the desktop start frame with the default baud rate", async () => {
    await createIpcSerialBridge({ portPath: "/dev/ttyUSB0" }).open();
    expect(frames).toEqual([
      { type: "serial-start", baudRate: 115_200, portPath: "/dev/ttyUSB0" },
    ]);
  });

  it("emits the mobile start frame with an explicit baud rate", async () => {
    await createIpcSerialBridge({ deviceId: 3, baudRate: 9600 }).open();
    expect(frames).toEqual([
      { type: "serial-start", baudRate: 9600, deviceId: 3 },
    ]);
  });

  it("is idempotent across repeated open and close", async () => {
    const pipe = createIpcSerialBridge({ deviceId: 1 });
    await pipe.close();
    expect(frames).toEqual([]);

    await pipe.open();
    await pipe.open();
    await pipe.close();
    await pipe.close();

    expect(frames.map((frame) => frame.type)).toEqual([
      "serial-start",
      "serial-stop",
    ]);
  });

  it("hex-encodes writes and counts the bytes out", async () => {
    const pipe = createIpcSerialBridge({ deviceId: 1 });
    await pipe.write(new Uint8Array([0x00, 0x0f, 0xff]));

    expect(frames).toEqual([{ type: "serial-write", dataHex: "000fff" }]);
    expect(pipe.stats.bytesOut).toBe(3);
  });

  it("decodes host data and counts the bytes in", () => {
    const received: Uint8Array[] = [];
    const pipe = createIpcSerialBridge({ deviceId: 1 });
    pipe.setEvents({ onData: (data: Uint8Array) => received.push(data) });

    pipe.handleHostMessage({ type: "serial-data", dataHex: "0a1b" });

    expect(received).toEqual([new Uint8Array([0x0a, 0x1b])]);
    expect(pipe.stats.bytesIn).toBe(2);
  });

  it("tracks connect and disconnect notifications", () => {
    const seen: string[] = [];
    const pipe = createIpcSerialBridge({ deviceId: 1 });
    pipe.setEvents({
      onConnect: () => seen.push("connect"),
      onDisconnect: () => seen.push("disconnect"),
    });

    pipe.handleHostMessage({ type: "serial-connect" });
    expect(pipe.connected).toBe(true);

    pipe.handleHostMessage({ type: "serial-disconnect" });
    expect(pipe.connected).toBe(false);
    expect(seen).toEqual(["connect", "disconnect"]);
  });

  it("surfaces host errors as Error instances", () => {
    const errors: Error[] = [];
    const pipe = createIpcSerialBridge({ deviceId: 1 });
    pipe.setEvents({ onError: (error: Error) => errors.push(error) });

    pipe.handleHostMessage({ type: "serial-error", message: "cable yanked" });

    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toBe("cable yanked");
  });

  it("drops close after a disconnect and ignores unknown host frames", () => {
    const pipe = createIpcSerialBridge({ deviceId: 1 });
    pipe.handleHostMessage({ type: "serial-connect" });
    pipe.handleHostMessage({ type: "who-knows" });
    expect(pipe.connected).toBe(true);
  });

  it("tolerates host messages with no events registered", () => {
    const pipe = createIpcSerialBridge({ deviceId: 1 });
    expect(() => {
      pipe.handleHostMessage({ type: "serial-data", dataHex: "01" });
      pipe.handleHostMessage({ type: "serial-connect" });
      pipe.handleHostMessage({ type: "serial-disconnect" });
      pipe.handleHostMessage({ type: "serial-error", message: "x" });
    }).not.toThrow();
  });
});

describe("createIpcMulticastBridge", () => {
  it("emits start and stop once each and clears interfaces on stop", async () => {
    const bridge = createIpcMulticastBridge();
    await bridge.stop();
    await bridge.start();
    await bridge.start();

    bridge.handleHostMessage({
      type: "multicast-interfaces",
      interfaces: [{ ifname: "en0", address: "fe80::1" }],
    });
    expect(bridge.interfaces).toEqual([{ ifname: "en0", address: "fe80::1" }]);

    await bridge.stop();
    expect(bridge.interfaces).toEqual([]);
    expect(frames.map((frame) => frame.type)).toEqual([
      "multicast-start",
      "multicast-stop",
    ]);
  });

  it("forwards join, bind, send, and unicast as IPC frames", async () => {
    const bridge = createIpcMulticastBridge();
    await bridge.joinGroup("en0", "ff12::1", 4242);
    await bridge.bindPort("en0", 4242);
    await bridge.send("en0", "ff12::1", 4242, new Uint8Array([0xde, 0xad]));
    await bridge.sendUnicast("en0", "fe80::2", 4242, new Uint8Array([0x01]));

    expect(frames).toEqual([
      {
        type: "multicast-join",
        ifname: "en0",
        groupAddress: "ff12::1",
        port: 4242,
      },
      { type: "multicast-bind", ifname: "en0", port: 4242 },
      {
        type: "multicast-send",
        ifname: "en0",
        groupAddress: "ff12::1",
        port: 4242,
        dataHex: "dead",
      },
      {
        type: "multicast-unicast",
        ifname: "en0",
        targetAddress: "fe80::2",
        port: 4242,
        dataHex: "01",
      },
    ]);
  });

  it("delivers received packets to the packet handler", () => {
    const packets: unknown[] = [];
    const bridge = createIpcMulticastBridge();
    bridge.setEvents({
      onPacket: (
        ifname: string,
        data: Uint8Array,
        sourceAddress: string,
        port: number,
      ) => packets.push([ifname, [...data], sourceAddress, port]),
    });

    bridge.handleHostMessage({
      type: "multicast-packet",
      ifname: "en0",
      dataHex: "beef",
      sourceAddress: "fe80::3",
      port: 4242,
    });

    expect(packets).toEqual([["en0", [0xbe, 0xef], "fe80::3", 4242]]);
  });

  it("announces interface changes and ignores unknown frames", () => {
    const changes: unknown[] = [];
    const bridge = createIpcMulticastBridge();
    bridge.setEvents({
      onNetworkChange: (interfaces: unknown) => changes.push(interfaces),
    });

    bridge.handleHostMessage({
      type: "multicast-interfaces",
      interfaces: [{ ifname: "en0" }],
    });
    bridge.handleHostMessage({ type: "who-knows" });

    expect(changes).toEqual([[{ ifname: "en0" }]]);
  });
});

describe("createIpcBonjourBridge", () => {
  it("emits start and stop once each and clears interfaces on stop", async () => {
    const bridge = createIpcBonjourBridge();
    await bridge.stop();
    await bridge.start();
    await bridge.start();

    bridge.handleHostMessage({
      type: "bonjour-interfaces",
      interfaces: [{ ifname: "en0" }],
    });
    expect(bridge.interfaces).toEqual([{ ifname: "en0" }]);

    await bridge.stop();
    expect(bridge.interfaces).toEqual([]);
    expect(frames.map((frame) => frame.type)).toEqual([
      "bonjour-start",
      "bonjour-stop",
    ]);
  });

  it("forwards advertisements and ignores unknown frames", async () => {
    const bridge = createIpcBonjourBridge();
    await bridge.advertise("en0", "fe80::1", 4242);
    bridge.handleHostMessage({ type: "who-knows" });

    expect(frames).toEqual([
      {
        type: "bonjour-advertise",
        ifname: "en0",
        address: "fe80::1",
        port: 4242,
      },
    ]);
    expect(bridge.interfaces).toEqual([]);
  });
});
