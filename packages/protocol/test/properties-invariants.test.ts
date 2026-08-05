import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  CLIENT_RATE_WINDOW_MS,
  MAX_ANNOUNCE_RATE_TIMESTAMPS,
  PATHFINDER_MAX_HOPS,
  initialAnnounceRateState,
  initialClientRateLimitState,
  initialGrantHostState,
  initialPathTableState,
  recordAnnounce,
  stepClientRateLimit,
  stepGrantHost,
  stepPathTable,
} from "../src/index.js";

const numRuns = Number.parseInt(process.env.PROPERTY_RUNS ?? "100", 10);
const parameters = {
  numRuns,
  seed: process.env.PROPERTY_SEED
    ? Number(process.env.PROPERTY_SEED)
    : undefined,
};

describe("protocol invariant properties", () => {
  it("never allows more client requests than the configured window budget", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.array(fc.integer({ min: 0, max: CLIENT_RATE_WINDOW_MS - 1 }), {
          maxLength: 200,
        }),
        (limit, offsets) => {
          let state = initialClientRateLimitState(limit);
          let allowed = 0;
          for (const at of offsets.sort((left, right) => left - right)) {
            state = stepClientRateLimit(state, {
              kind: "rate/check",
              clientKey: "client",
              at,
            }).state;
            if (state.lastAllowed) allowed += 1;
          }
          expect(allowed).toBeLessThanOrEqual(limit);
        },
      ),
      parameters,
    );
  });

  it("never stores an over-hop path and repeated announces are idempotent", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            destinationKey: fc.string({ minLength: 1, maxLength: 32 }),
            hops: fc.integer({ min: 0, max: PATHFINDER_MAX_HOPS * 2 }),
            randomBlob: fc.uint8Array({ minLength: 1, maxLength: 32 }),
            at: fc.integer({ min: 0, max: 1_000_000 }),
          }),
          { maxLength: 200 },
        ),
        (events) => {
          let state = initialPathTableState();
          for (const event of events) {
            state = stepPathTable(state, {
              kind: "path/announce",
              ...event,
            }).state;
            expect(
              [...state.entries.values()].every(
                (entry) => entry.hops <= PATHFINDER_MAX_HOPS,
              ),
            ).toBe(true);
          }

          const event = {
            kind: "path/announce" as const,
            destinationKey: "repeat",
            hops: 1,
            randomBlob: new Uint8Array([1, 2, 3]),
            at: 42,
          };
          const once = stepPathTable(state, event).state;
          const twice = stepPathTable(once, event).state;
          expect(twice.entries).toEqual(once.entries);
          expect(twice.lastAdded).toBe(false);
        },
      ),
      parameters,
    );
  });

  it("keeps grant evaluation monotone when declared capabilities grow", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1, maxLength: 32 }), {
          maxLength: 20,
        }),
        fc.uniqueArray(fc.string({ minLength: 1, maxLength: 32 }), {
          maxLength: 20,
        }),
        (requested, additions) => {
          const state = initialGrantHostState("app", "publisher");
          const base = stepGrantHost(state, {
            kind: "grant/set",
            at: 1,
            declared: requested,
            requested,
          }).state;
          const superset = stepGrantHost(state, {
            kind: "grant/set",
            at: 1,
            declared: [...new Set([...requested, ...additions])],
            requested,
          }).state;
          expect(base.lastError).toBeNull();
          expect(superset.lastError).toBeNull();
          expect(superset.record).toEqual(base.record);
        },
      ),
      parameters,
    );
  });

  it("bounds announce history regardless of input trace length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 1_000_000, noNaN: true }), {
          maxLength: 500,
        }),
        (times) => {
          let state = initialAnnounceRateState();
          for (const at of times.sort((left, right) => left - right)) {
            state = recordAnnounce(state, "destination", at).state;
            expect(
              state.table.get("destination")?.timestamps.length ?? 0,
            ).toBeLessThanOrEqual(MAX_ANNOUNCE_RATE_TIMESTAMPS);
          }
        },
      ),
      parameters,
    );
  });
});
