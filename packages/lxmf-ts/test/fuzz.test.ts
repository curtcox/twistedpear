import { describe, expect, it } from "vitest";
import { decodePropagationPeerError } from "../src/propagation-server.js";
import { msgpackUnpack } from "../src/msgpack.js";
import {
  bytesToHex,
  createRandom,
  hexToBytes,
  mutate,
} from "../../../conformance/fuzz/engine.mjs";
import {
  corpusFor,
  corpusPath,
  recordCounterexample,
} from "../../../conformance/fuzz/corpus.mjs";

const FUZZ_ITERATIONS = Number.parseInt(
  process.env.FUZZ_ITERATIONS ?? "256",
  10,
);
const FUZZ_SEED = Number.parseInt(process.env.FUZZ_SEED ?? "20260815", 10);

/**
 * Seeds shaped like msgpack rather than like one repeated byte.
 *
 * The previous version built every frame as `fill(iteration & 0xff)` — a
 * uniform run of a single byte — which never produces a type tag followed by a
 * plausible length, so the interesting paths in the decoder were unreachable.
 * These are real msgpack prefixes: fixmap, fixarray, str8, bin8, and the 16/32
 * bit length variants whose length fields are the parts worth attacking.
 */
const SEEDS: readonly Uint8Array[] = [
  Uint8Array.from([0x80]),
  Uint8Array.from([0x90]),
  Uint8Array.from([0x81, 0xa1, 0x61, 0x01]),
  Uint8Array.from([0x92, 0x01, 0x02]),
  Uint8Array.from([0xc4, 0x04, 0xde, 0xad, 0xbe, 0xef]),
  Uint8Array.from([0xc5, 0x00, 0x04, 0xde, 0xad, 0xbe, 0xef]),
  Uint8Array.from([0xc6, 0x00, 0x00, 0x00, 0x04, 0xde, 0xad, 0xbe, 0xef]),
  Uint8Array.from([0xd9, 0x03, 0x61, 0x62, 0x63]),
  Uint8Array.from([0xda, 0x00, 0x03, 0x61, 0x62, 0x63]),
  Uint8Array.from([0xdc, 0x00, 0x02, 0x01, 0x02]),
  Uint8Array.from([0xde, 0x00, 0x01, 0xa1, 0x61, 0x01]),
  Uint8Array.from([0xcb, 0x40, 0x09, 0x21, 0xfb, 0x54, 0x44, 0x2d, 0x18]),
];

function hashTarget(target: string): number {
  let hash = 0;
  for (const character of target) {
    hash = (Math.imul(hash, 31) + character.charCodeAt(0)) | 0;
  }
  return hash;
}

function fuzzTarget(target: string, check: (input: Uint8Array) => void): void {
  for (const example of corpusFor(target)) {
    expect(
      () => check(hexToBytes(example.inputHex)),
      `committed counterexample ${target}:${example.inputHex} regressed`,
    ).not.toThrow();
  }

  const random = createRandom(FUZZ_SEED + hashTarget(target));
  for (let iteration = 0; iteration < FUZZ_ITERATIONS; iteration += 1) {
    const seed = SEEDS[iteration % SEEDS.length]!;
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
        `${target} failed on a mutated input (seed ${FUZZ_SEED}, operators ${operators.join(
          " → ",
        )}): ${message}. Recorded to ${corpusPath()} — commit it.`,
      );
    }
  }
}

describe("structure-aware LXMF msgpack fuzz", () => {
  // The previous test wrapped both calls in `try {} catch {}` and asserted
  // nothing at all, so it could not fail for any input. These are the two
  // properties actually worth holding.
  it(`keeps decodePropagationPeerError total over ${FUZZ_ITERATIONS} malformed frames`, () => {
    // Its signature is `number | null`: "no peer error here" is a return value,
    // not an exception. Anything that escapes is a bug in a decoder that reads
    // untrusted peer responses.
    fuzzTarget("lxmf-peer-error", (input) => {
      decodePropagationPeerError(input);
    });
  });

  it(`keeps msgpackUnpack deterministic and fail-closed over ${FUZZ_ITERATIONS} malformed frames`, () => {
    fuzzTarget("lxmf-msgpack", (input) => {
      // Rejecting malformed msgpack by throwing is allowed; throwing something
      // that is not an Error is not, and neither is returning different results
      // for the same bytes.
      let first: unknown;
      let firstThrew = false;
      try {
        first = msgpackUnpack(input);
      } catch (error) {
        firstThrew = true;
        if (!(error instanceof Error)) {
          throw new Error(`msgpackUnpack threw a non-Error: ${String(error)}`);
        }
      }

      let secondThrew = false;
      let second: unknown;
      try {
        second = msgpackUnpack(Uint8Array.from(input));
      } catch {
        secondThrew = true;
      }

      if (firstThrew !== secondThrew) {
        throw new Error("msgpackUnpack was not deterministic for equal input");
      }
      if (!firstThrew && JSON.stringify(first) !== JSON.stringify(second)) {
        throw new Error(
          "msgpackUnpack returned different values for equal input",
        );
      }
    });
  });
});
