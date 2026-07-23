import { describe, expect, it } from "vitest";
import {
  DestinationType,
  NodeCryptoProvider,
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  PipeInterface,
  TransportType,
  hexToBytes
} from "../src/index.js";

const provider = new NodeCryptoProvider();

function packet(data = new Uint8Array([1, 2, 3])): Packet {
  return Packet.fromFields(provider, {
    headerType: PacketHeaderType.HEADER_1,
    transportType: TransportType.BROADCAST,
    destinationType: DestinationType.SINGLE,
    packetType: PacketType.DATA,
    destinationHash: hexToBytes("00112233445566778899aabbccddeeff"),
    context: PacketContext.NONE,
    data
  });
}

describe("PacketInterface direction gating", () => {
  it("rejects send on an outgoing=false interface", async () => {
    const [rxOnly, _peer] = PipeInterface.pair(provider, { name: "rx-only", incoming: true, outgoing: false }, { name: "peer" });
    await expect(rxOnly.send(packet())).rejects.toThrow("not configured for outbound traffic");
  });

  it("does not enqueue received packets on an incoming=false interface", async () => {
    const [txOnly, peer] = PipeInterface.pair(provider, { name: "tx-only", incoming: false, outgoing: true }, { name: "peer" });
    await peer.send(packet());

    const iterator = txOnly.packets[Symbol.asyncIterator]();
    const timeout = new Promise<IteratorResult<Packet, undefined>>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 50)
    );
    await expect(Promise.race([iterator.next(), timeout])).rejects.toThrow("timeout");
  });
});
