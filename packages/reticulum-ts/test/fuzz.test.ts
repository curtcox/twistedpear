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
  ResourceAdvertisement,
  hexToBytes,
  type CryptoProvider,
} from "../src/index.js";
import {
  bytesToHex,
  createRandom,
  mutate,
} from "../../../conformance/fuzz/engine.mjs";
import {
  corpusFor,
  corpusPath,
  recordCounterexample,
} from "../../../conformance/fuzz/corpus.mjs";

const providers: ReadonlyArray<CryptoProvider> = [
  new NodeCryptoProvider(),
  new PureCryptoProvider(),
];
const FUZZ_ITERATIONS = Number.parseInt(
  process.env.FUZZ_ITERATIONS ?? "256",
  10,
);

const packetVectors = JSON.parse(
  readFileSync(resolve("conformance/vectors/packet.json"), "utf8"),
) as {
  readonly packets: ReadonlyArray<{
    readonly rawHex: string;
    readonly headerType?: number;
  }>;
  readonly announces: ReadonlyArray<{ readonly rawHex: string }>;
};

/**
 * The seed for this run. Fixed by default so a red CI run is reproducible from
 * the number in its own output; override with FUZZ_SEED to explore further.
 */
const FUZZ_SEED = Number.parseInt(process.env.FUZZ_SEED ?? "20260815", 10);

/**
 * Run one fuzz target over its committed counterexamples first, then over
 * freshly mutated cases.
 *
 * `check` must not throw for any input: these decoders are required to fail
 * closed by returning null, never by raising. When one does throw, the input is
 * written to the committed corpus before the assertion fails, so the next run
 * replays it whether or not anyone saves the log.
 */
function fuzzTarget(
  target: string,
  seeds: readonly Uint8Array[],
  check: (input: Uint8Array) => void,
): void {
  for (const example of corpusFor(target)) {
    const input = hexToBytes(example.inputHex);
    expect(
      () => check(input),
      `committed counterexample ${target}:${example.inputHex} regressed`,
    ).not.toThrow();
  }

  const random = createRandom(FUZZ_SEED + hashTarget(target));
  for (let iteration = 0; iteration < FUZZ_ITERATIONS; iteration += 1) {
    const seed = seeds[iteration % seeds.length]!;
    const { bytes, operators } = mutate(seed, random);
    try {
      check(bytes);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      recordCounterexample({
        target,
        inputHex: bytesToHex(bytes),
        operators,
        error: message,
      });
      throw new Error(
        `${target} threw on a mutated input (seed ${FUZZ_SEED}, operators ${operators.join(
          " → ",
        )}): ${message}. Recorded to ${corpusPath()} — commit it.`,
      );
    }
  }
}

/** Distinct stream per target, so one target's draws do not shift another's. */
function hashTarget(target: string): number {
  let hash = 0;
  for (const character of target) {
    hash = (Math.imul(hash, 31) + character.charCodeAt(0)) | 0;
  }
  return hash;
}

describe.each(providers.map((provider) => [provider.name, provider] as const))(
  "structure-aware fuzz (%s provider)",
  (_name, provider) => {
    it(`survives ${FUZZ_ITERATIONS} packet/announce mutations without throwing`, () => {
      const seeds = [
        ...packetVectors.packets.map((vector) => hexToBytes(vector.rawHex)),
        ...packetVectors.announces.map((vector) => hexToBytes(vector.rawHex)),
      ];

      fuzzTarget(`packet-announce/${provider.name}`, seeds, (input) => {
        const decoded = Packet.decode(provider, input);
        if (decoded !== null) {
          Announce.parse(decoded);
          if (decoded.headerType === PacketHeaderType.HEADER_2) {
            Announce.validate(provider, decoded);
          }
        }
      });
    });

    it("returns null for invalid identity byte lengths", () => {
      for (const length of [0, 16, 31, 33, 128]) {
        const material = new Uint8Array(length);
        material.fill(0xff);
        expect(Identity.fromBytes(provider, material)).toBeNull();
      }
    });

    it(`survives ${FUZZ_ITERATIONS} resource advertisement wire mutations without throwing`, () => {
      // Seeded from varied fills rather than one uniform byte per iteration,
      // then mutated: a frame of all-0x2a exercises far less of the parser than
      // one whose length prefix and body disagree.
      const seeds = [0x00, 0x11, 0x7f, 0x80, 0xff].flatMap((fill) =>
        [16, 33, 64, 129].map((length) => {
          const frame = new Uint8Array(length);
          frame.fill(fill);
          return frame;
        }),
      );

      fuzzTarget(`resource-advert/${provider.name}`, seeds, (input) => {
        try {
          ResourceAdvertisement.unpack(input);
        } catch {
          // Malformed resource advertisements must fail closed. `unpack` is
          // allowed to throw; `isRequest` is not.
        }
        ResourceAdvertisement.isRequest(input);
      });
    });

    it(`survives ${FUZZ_ITERATIONS} link-context packet mutations without throwing`, () => {
      // Every link context, crossed with the mutation engine, rather than one
      // context per iteration on an otherwise untouched packet.
      const linkContexts = [0xfa, 0xfb, 0xfc, 0xfd, 0xfe, 0xff];
      const seeds = packetVectors.packets.flatMap((vector) => {
        const raw = hexToBytes(vector.rawHex);
        return linkContexts.map((context) => {
          const seeded = Uint8Array.from(raw);
          if (seeded.length > 4) seeded[3] = context;
          return seeded;
        });
      });

      fuzzTarget(`link-context/${provider.name}`, seeds, (input) => {
        Packet.decode(provider, input);
      });
    });
  },
);
