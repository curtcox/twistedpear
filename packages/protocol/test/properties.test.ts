import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  LinkStatus,
  ResourceStatus,
  applyLinkEstablishEvent,
  applyResourceStatusEvent,
  decodeHdlcFrames,
  initialLinkEstablishState,
  initialResourceStatusState,
  msgpackPackFloat64,
  msgpackUnpackFloat,
  pkcs7Pad,
  pkcs7Unpad,
  encodeHdlcFrame,
} from "../src/index.js";

const numRuns = Number.parseInt(process.env.PROPERTY_RUNS ?? "100", 10);
const parameters = {
  numRuns,
  seed: process.env.PROPERTY_SEED
    ? Number(process.env.PROPERTY_SEED)
    : undefined,
};
const bytes = fc.uint8Array({ maxLength: 4096 });

describe("protocol properties", () => {
  it("round-trips HDLC frames", () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 4096 }),
        (payload) => {
          const decoded = decodeHdlcFrames(encodeHdlcFrame(payload));
          expect(decoded.frames).toHaveLength(1);
          expect(decoded.frames[0]).toEqual(payload);
        },
      ),
      parameters,
    );
  });

  it("round-trips PKCS#7 for every supported block size", () => {
    fc.assert(
      fc.property(
        bytes,
        fc.integer({ min: 1, max: 255 }),
        (payload, blockSize) => {
          expect(pkcs7Unpad(pkcs7Pad(payload, blockSize), blockSize)).toEqual(
            payload,
          );
        },
      ),
      parameters,
    );
  });

  it("round-trips msgpack float64 values", () => {
    fc.assert(
      fc.property(fc.double(), (value) => {
        expect(
          Object.is(msgpackUnpackFloat(msgpackPackFloat64(value)), value),
        ).toBe(true);
      }),
      parameters,
    );
  });

  it("matches the link establishment model across event traces", () => {
    const event = fc.oneof(
      fc.constant({ kind: "establish/handshake" } as const),
      fc.record({
        kind: fc.constant("establish/activated" as const),
        atSeconds: fc.double({ noNaN: true }),
        rtt: fc.double({ min: 0, noNaN: true }),
      }),
      fc.constant({ kind: "establish/failed" } as const),
    );
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.array(event, { maxLength: 100 }),
        (initiator, events) => {
          let actual = initialLinkEstablishState({ initiator });
          let expected = LinkStatus.PENDING;
          for (const current of events) {
            actual = applyLinkEstablishEvent(actual, current);
            if (
              current.kind === "establish/handshake" &&
              expected === LinkStatus.PENDING
            )
              expected = LinkStatus.HANDSHAKE;
            if (current.kind === "establish/activated")
              expected = LinkStatus.ACTIVE;
            if (current.kind === "establish/failed")
              expected = LinkStatus.CLOSED;
            expect(actual.status).toBe(expected);
          }
        },
      ),
      parameters,
    );
  });

  it("matches the resource lifecycle model across event traces", () => {
    const mapping = {
      "resource/queue": ResourceStatus.QUEUED,
      "resource/advertise": ResourceStatus.ADVERTISED,
      "resource/transferring": ResourceStatus.TRANSFERRING,
      "resource/awaiting-proof": ResourceStatus.AWAITING_PROOF,
      "resource/assemble": ResourceStatus.ASSEMBLING,
      "resource/complete": ResourceStatus.COMPLETE,
      "resource/corrupt": ResourceStatus.CORRUPT,
      "resource/fail": ResourceStatus.FAILED,
    } as const;
    const kinds = Object.keys(mapping) as Array<keyof typeof mapping>;
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...kinds), { maxLength: 100 }),
        (events) => {
          let actual = initialResourceStatusState();
          let expected = ResourceStatus.NONE;
          for (const kind of events) {
            actual = applyResourceStatusEvent(actual, { kind });
            expected = mapping[kind];
            expect(actual.status).toBe(expected);
          }
        },
      ),
      parameters,
    );
  });
});
