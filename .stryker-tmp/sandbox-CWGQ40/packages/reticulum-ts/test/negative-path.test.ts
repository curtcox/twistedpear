// @ts-nocheck
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  Announce,
  Identity,
  NodeCryptoProvider,
  Packet,
  PacketContextFlag,
  PacketHeaderType,
  PureCryptoProvider,
  hexToBytes,
  type CryptoProvider
} from "../src/index.js";

const providers: ReadonlyArray<CryptoProvider> = [new NodeCryptoProvider(), new PureCryptoProvider()];

const packetVectors = JSON.parse(
  readFileSync(resolve("conformance/vectors/packet.json"), "utf8")
) as {
  readonly packets: ReadonlyArray<{ readonly rawHex: string; readonly headerType?: number }>;
  readonly announces: ReadonlyArray<{ readonly rawHex: string }>;
};

describe.each(providers.map((provider) => [provider.name, provider] as const))(
  "negative-path parsers (%s provider)",
  (_name, provider) => {
    it("returns null for empty, truncated, and garbage packet input", () => {
      expect(Packet.decode(provider, new Uint8Array())).toBeNull();
      expect(Packet.decode(provider, new Uint8Array([0x00]))).toBeNull();
      expect(Packet.decode(provider, new Uint8Array(32).fill(0xff))).toBeNull();
    });

    it("returns null when header-2 packets are missing transport id bytes", () => {
      const valid = packetVectors.packets.find((vector) => vector.headerType === 1);
      expect(valid).toBeDefined();
      const raw = hexToBytes(valid!.rawHex);
      expect(Packet.decode(provider, raw.subarray(0, raw.length - 20))).toBeNull();
    });

    it("returns null for packets with invalid enum combinations in flags", () => {
      expect(
        Packet.decode(
          provider,
          new Uint8Array([
            (PacketHeaderType.HEADER_1 << 6) |
              (PacketContextFlag.UNSET << 5) |
              (0 << 4) |
              (0 << 2) |
              0xff
          ])
        )
      ).toBeNull();
    });

    it("returns null when announce data is shorter than the minimum signed payload", () => {
      const vector = packetVectors.announces[0]!;
      const raw = hexToBytes(vector.rawHex);
      const packet = Packet.decode(provider, raw);
      expect(packet).not.toBeNull();
      expect(Announce.parse(packet!)).not.toBeNull();

      const truncated = Packet.decode(provider, raw.subarray(0, 2 + 16 + 1 + 8));
      expect(truncated).not.toBeNull();
      expect(Announce.parse(truncated!)).toBeNull();
    });

    it("rejects announces with tampered signatures and destination hashes", () => {
      const vector = packetVectors.announces[0]!;
      const raw = hexToBytes(vector.rawHex);
      const packet = Packet.decode(provider, raw);
      expect(packet).not.toBeNull();
      expect(Announce.validate(provider, packet!)).toBe(true);

      const badSignature = Uint8Array.from(raw);
      badSignature[badSignature.length - 1] = badSignature[badSignature.length - 1]! ^ 0x01;
      const tamperedSignature = Packet.decode(provider, badSignature);
      expect(tamperedSignature).not.toBeNull();
      expect(Announce.validate(provider, tamperedSignature!)).toBe(false);

      const badDestination = Uint8Array.from(raw);
      badDestination[2] = badDestination[2]! ^ 0x01;
      const tamperedDestination = Packet.decode(provider, badDestination);
      expect(tamperedDestination).not.toBeNull();
      expect(Announce.validate(provider, tamperedDestination!)).toBe(false);
    });

    it("rejects proof validation for wrong-length proofs", () => {
      const vector = packetVectors.packets[0]!;
      const packet = Packet.decode(provider, hexToBytes(vector.rawHex));
      expect(packet).not.toBeNull();

      const identityVector = JSON.parse(
        readFileSync(resolve("conformance/vectors/identity.json"), "utf8")
      ) as {
        identities: ReadonlyArray<{ name: string; privateKeyHex: string }>;
      };
      const alice = identityVector.identities.find((entry) => entry.name === "alice");
      expect(alice).toBeDefined();

      const identity = Identity.fromBytes(provider, hexToBytes(alice!.privateKeyHex));
      expect(identity).not.toBeNull();

      expect(packet!.validateProof(identity!, new Uint8Array(16))).toBe(false);
      expect(packet!.validateProof(identity!, new Uint8Array(128))).toBe(false);
    });
  }
);

describe("negative-path packet construction", () => {
  it("throws when constructing packets with invalid enum values", () => {
    const vector = packetVectors.packets[0]!;
    const packet = Packet.decode(providers[0]!, hexToBytes(vector.rawHex));
    expect(packet).not.toBeNull();

    expect(() =>
      Packet.fromFields(providers[0]!, {
        headerType: packet!.headerType,
        contextFlag: 2 as PacketContextFlag,
        transportType: packet!.transportType,
        destinationType: packet!.destinationType,
        packetType: packet!.packetType,
        destinationHash: packet!.destinationHash
      })
    ).toThrow("Unknown packet context flag");

    expect(() =>
      Packet.fromFields(providers[0]!, {
        headerType: packet!.headerType,
        contextFlag: packet!.contextFlag,
        transportType: packet!.transportType,
        destinationType: packet!.destinationType,
        packetType: 0x7f,
        destinationHash: packet!.destinationHash
      })
    ).toThrow("Unknown packet type");
  });
});
