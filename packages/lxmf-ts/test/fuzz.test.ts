import { describe, expect, it } from "vitest";
import { decodePropagationPeerError } from "../src/propagation-server.js";
import { msgpackUnpack } from "../src/msgpack.js";

const FUZZ_ITERATIONS = Number.parseInt(
  process.env.FUZZ_ITERATIONS ?? "256",
  10,
);

describe("structure-aware LXMF msgpack fuzz", () => {
  it(`survives ${FUZZ_ITERATIONS} malformed frames without crashing`, () => {
    for (let iteration = 0; iteration < FUZZ_ITERATIONS; iteration += 1) {
      const frame = new Uint8Array(16 + (iteration % 64));
      frame.fill(iteration & 0xff);

      try {
        msgpackUnpack(frame);
      } catch {
        // Malformed msgpack is expected to fail closed.
      }

      try {
        decodePropagationPeerError(frame);
      } catch {
        // Peer-error decoding may reject malformed payloads.
      }
    }
  });
});
