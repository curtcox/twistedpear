// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  DestinationType,
  NodeCryptoProvider,
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  TransportType,
  hexToBytes
} from "@twistedpear/reticulum-ts";
import {
  FreenetInterface,
  type FreenetPacketLogBackend
} from "../src/freenet.js";

class MemoryPacketLogBackend implements FreenetPacketLogBackend {
  #receiver: ((frame: Uint8Array) => void) | null = null;
  #active = false;
  readonly published: Uint8Array[] = [];
  peer: MemoryPacketLogBackend | null = null;

  get active(): boolean {
    return this.#active;
  }

  setReceiver(onFrame: (hdlcFrame: Uint8Array) => void): void {
    this.#receiver = onFrame;
  }

  async start(): Promise<void> {
    this.#active = true;
  }

  async stop(): Promise<void> {
    this.#active = false;
  }

  async publishFrame(hdlcFrame: Uint8Array): Promise<void> {
    this.published.push(Uint8Array.from(hdlcFrame));
    this.peer?.deliver(Uint8Array.from(hdlcFrame));
  }

  deliver(frame: Uint8Array): void {
    this.#receiver?.(frame);
  }
}

describe("FreenetInterface", () => {
  it("exchanges an HDLC-framed Reticulum packet through a simulated backend", async () => {
    const provider = new NodeCryptoProvider();
    const leftBackend = new MemoryPacketLogBackend();
    const rightBackend = new MemoryPacketLogBackend();
    leftBackend.peer = rightBackend;
    rightBackend.peer = leftBackend;

    const left = await FreenetInterface.open(provider, {
      name: "freenet-left",
      provider,
      backend: leftBackend
    });
    const right = await FreenetInterface.open(provider, {
      name: "freenet-right",
      provider,
      backend: rightBackend
    });

    const received = Promise.race([
      (async () => {
        for await (const packet of right.packets) {
          return packet;
        }
        throw new Error("no packet");
      })(),
      new Promise<Packet>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 1000)
      )
    ]);

    const packet = Packet.fromFields(provider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.SINGLE,
      packetType: PacketType.DATA,
      destinationHash: hexToBytes("00112233445566778899aabbccddeeff"),
      context: PacketContext.NONE,
      data: new Uint8Array([1, 2, 3, 4])
    });
    await left.send(packet);
    const got = await received;
    expect(Buffer.from(got.data).toString("hex")).toBe("01020304");
    expect(leftBackend.published.length).toBe(1);
    expect(left.bitrate).toBe(90_000);

    await left.close();
    await right.close();
  });
});
