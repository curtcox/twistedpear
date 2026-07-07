import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  Announce,
  Identity,
  NodeCryptoProvider,
  Packet,
  PacketHeaderType,
  PureCryptoProvider,
  hexToBytes,
  type CryptoProvider
} from "../src/index.js";

const providers: ReadonlyArray<CryptoProvider> = [new NodeCryptoProvider(), new PureCryptoProvider()];
const FUZZ_ITERATIONS = Number.parseInt(process.env.FUZZ_ITERATIONS ?? "256", 10);

const packetVectors = JSON.parse(
  readFileSync(resolve("conformance/vectors/packet.json"), "utf8")
) as {
  readonly packets: ReadonlyArray<{ readonly rawHex: string; readonly headerType?: number }>;
  readonly announces: ReadonlyArray<{ readonly rawHex: string }>;
};

function mutate(bytes: Uint8Array, seed: number): Uint8Array {
  const mutated = Uint8Array.from(bytes);
  const index = seed % mutated.length;
  mutated[index] = mutated[index]! ^ (1 << (seed % 8));
  return mutated;
}

function truncate(bytes: Uint8Array, seed: number): Uint8Array {
  const length = Math.max(1, seed % bytes.length);
  return bytes.subarray(0, length);
}

function concatGarbage(bytes: Uint8Array, seed: number): Uint8Array {
  const suffix = new Uint8Array(8 + (seed % 32));
  suffix.fill(0xff);
  const merged = new Uint8Array(bytes.length + suffix.length);
  merged.set(bytes, 0);
  merged.set(suffix, bytes.length);
  return merged;
}

describe.each(providers.map((provider) => [provider.name, provider] as const))(
  "structure-aware fuzz (%s provider)",
  (_name, provider) => {
    it(`survives ${FUZZ_ITERATIONS} packet/announce mutations without throwing`, () => {
      const seeds = packetVectors.packets.flatMap((vector) => {
        const raw = hexToBytes(vector.rawHex);
        return [
          mutate(raw, 1),
          mutate(raw, 7),
          truncate(raw, 3),
          concatGarbage(raw, 11)
        ];
      });

      for (let iteration = 0; iteration < FUZZ_ITERATIONS; iteration += 1) {
        const sample = seeds[iteration % seeds.length]!;
        const mutated = mutate(sample, iteration + 13);
        expect(() => Packet.decode(provider, mutated)).not.toThrow();
        const decoded = Packet.decode(provider, mutated);
        if (decoded !== null) {
          expect(() => Announce.parse(decoded)).not.toThrow();
          if (decoded.headerType === PacketHeaderType.HEADER_2) {
            expect(() => Announce.validate(provider, decoded)).not.toThrow();
          }
        }
      }
    });

    it("returns null for invalid identity byte lengths", () => {
      for (const length of [0, 16, 31, 33, 128]) {
        const material = new Uint8Array(length);
        material.fill(0xff);
        expect(Identity.fromBytes(provider, material)).toBeNull();
      }
    });
  }
);
