// SPEC-ADAPTER per-family conformance suite. Each family defines a small
// driver interface, a fixed scenario, family invariants, and a normalized
// observation record. The equivalence bar: an adapter conforms when its
// normalized observations hash identically (SPEC-TRACE canonical form) to the
// simulated reference adapter's — differences in wall-clock pacing are
// normalized away, everything a machine could observe is kept.
//
// Driver interfaces (what a new adapter implements to be gated):
//   clock:     { now() }
//   entropy:   { randomBytes(n) }
//   timers:    { set(id, delayMs, onFire), cancel(id), settle(maxMs) -> Promise }
//   transport: { onRecv(cb), send(source, {channel, destination, payload}),
//                settle(maxMs) -> Promise }
//   storage:   { apply(intent) -> Promise<family events[]> }
//   logging:   { emit(intent), records() }
import { canonicalJson, fnv1a64 } from "../kernel/runner.mjs";

const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

export const families = {
  clock: {
    async observe(adapter) {
      const readings = [];
      for (let i = 0; i < 3; i += 1) {
        readings.push(adapter.now());
        await Promise.resolve();
      }
      const monotone = readings.every(
        (value, index) => index === 0 || value >= readings[index - 1]
      );
      const numeric = readings.every((value) => Number.isFinite(value));
      // Wall-clock values are pacing, not observation: keep only their shape.
      return { readings: readings.length, monotone, numeric };
    },
    invariants(obs, fail) {
      if (!obs.monotone) fail("clock must be monotone non-decreasing");
      if (!obs.numeric) fail("clock must return finite numbers");
    }
  },

  entropy: {
    async observe(adapter) {
      const first = adapter.randomBytes(16);
      const second = adapter.randomBytes(16);
      const third = adapter.randomBytes(32);
      return {
        lengths: [first.length, second.length, third.length],
        distinct: hex(first) !== hex(second)
      };
    },
    invariants(obs, fail) {
      if (JSON.stringify(obs.lengths) !== "[16,16,32]") {
        fail(`randomBytes returned wrong lengths: ${JSON.stringify(obs.lengths)}`);
      }
      if (!obs.distinct) fail("consecutive entropy requests returned identical bytes");
    }
  },

  timers: {
    async observe(adapter) {
      const fired = [];
      adapter.set("t1", 10, () => fired.push("t1"));
      adapter.set("t2", 25, () => fired.push("t2"));
      adapter.set("t3", 15, () => fired.push("t3"));
      adapter.cancel("t2");
      await adapter.settle(60);
      return { fired };
    },
    invariants(obs, fail) {
      if (obs.fired.includes("t2")) fail("cancelled timer fired");
      if (JSON.stringify(obs.fired) !== '["t1","t3"]') {
        fail(`timers fired out of delay order: ${JSON.stringify(obs.fired)}`);
      }
    }
  },

  transport: {
    async observe(adapter) {
      const received = [];
      adapter.onRecv((event) => {
        received.push({ channel: event.channel, source: event.source, payload: hex(event.payload) });
      });
      for (const byte of [1, 2, 3]) {
        adapter.send("a", { channel: "x", destination: "b", payload: new Uint8Array([byte, 0xff]) });
      }
      await adapter.settle(60);
      return { received };
    },
    invariants(obs, fail) {
      const expected = [
        { channel: "x", source: "a", payload: "01ff" },
        { channel: "x", source: "a", payload: "02ff" },
        { channel: "x", source: "a", payload: "03ff" }
      ];
      if (JSON.stringify(obs.received) !== JSON.stringify(expected)) {
        fail(`transport altered payloads, order, or envelope: ${JSON.stringify(obs.received)}`);
      }
    }
  },

  storage: {
    async observe(adapter) {
      const script = [
        { kind: "store/write", write: { key: "k1", value: new Uint8Array([0xbe, 0xef]) } },
        { kind: "store/read", read: { key: "k1" } },
        { kind: "store/read", read: { key: "missing" } },
        { kind: "store/delete", del: { key: "k1" } },
        { kind: "store/read", read: { key: "k1" } }
      ];
      const events = [];
      for (const intent of script) {
        for (const event of await adapter.apply(intent)) {
          events.push({
            kind: event.kind,
            key: event.key,
            ...(event.kind === "store/value"
              ? { value: event.value === undefined ? null : hex(event.value) }
              : { op: event.op })
          });
        }
      }
      return { events };
    },
    invariants(obs, fail) {
      const expected = [
        { kind: "store/done", key: "k1", op: "write" },
        { kind: "store/value", key: "k1", value: "beef" },
        { kind: "store/value", key: "missing", value: null },
        { kind: "store/done", key: "k1", op: "delete" },
        { kind: "store/value", key: "k1", value: null }
      ];
      if (JSON.stringify(obs.events) !== JSON.stringify(expected)) {
        fail(`storage event stream diverged: ${JSON.stringify(obs.events)}`);
      }
    }
  },

  logging: {
    async observe(adapter) {
      const script = [
        { kind: "log", level: "debug", message: "d" },
        { kind: "log", level: "info", message: "i" },
        { kind: "log", level: "warn", message: "w" },
        { kind: "log", level: "error", message: "e" }
      ];
      for (const intent of script) adapter.emit(intent);
      return { records: adapter.records().map(({ level, message }) => ({ level, message })) };
    },
    invariants(obs, fail) {
      const expected = [
        { level: "debug", message: "d" },
        { level: "info", message: "i" },
        { level: "warn", message: "w" },
        { level: "error", message: "e" }
      ];
      if (JSON.stringify(obs.records) !== JSON.stringify(expected)) {
        fail(`log records dropped or reordered: ${JSON.stringify(obs.records)}`);
      }
    }
  }
};

export function observationHash(observations) {
  return fnv1a64(canonicalJson(observations));
}

/** Run one family scenario against one adapter: invariants only. */
export async function runFamily(familyName, adapter) {
  const family = families[familyName];
  if (family === undefined) throw new Error(`unknown family: ${familyName}`);
  const failures = [];
  const observations = await family.observe(adapter);
  family.invariants(observations, (message) => failures.push({ family: familyName, message }));
  return { observations, failures };
}

/**
 * Run the pair suite: the candidate adapter and the simulated reference must
 * both satisfy the family invariants AND produce identical normalized
 * observation hashes.
 */
export async function runAdapterPair(familyName, candidateFactory, simFactory) {
  const candidate = await runFamily(familyName, candidateFactory());
  const sim = await runFamily(familyName, simFactory());
  const failures = [...candidate.failures, ...sim.failures.map((failure) => ({
    ...failure,
    message: `simulated reference: ${failure.message}`
  }))];
  const candidateHash = observationHash(candidate.observations);
  const simHash = observationHash(sim.observations);
  if (candidateHash !== simHash) {
    failures.push({
      family: familyName,
      message: `observational equivalence broken: candidate ${candidateHash} != sim ${simHash}\n  candidate: ${JSON.stringify(candidate.observations)}\n  sim:       ${JSON.stringify(sim.observations)}`
    });
  }
  return { candidateHash, simHash, failures };
}
