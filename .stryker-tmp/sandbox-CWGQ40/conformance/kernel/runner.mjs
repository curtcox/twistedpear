// @ts-nocheck
// SPEC-KERNEL freestanding conformance runner. Point it at any kernel
// implementation via a factory `createKernel(config) -> kernel` where kernel
// provides start(), runUntilIdle(until), getTrace(), and optionally
// getTraceHash(). The runner computes trace hashes itself with an independent
// canonical-form + FNV-1a implementation (SPEC-TRACE), so a kernel needs no
// hashing support to be tested — and a kernel that does hash is cross-checked.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURES_PATH = join(here, "..", "..", "specs", "spec-kernel", "vectors", "ordering.json");

// --- independent SPEC-TRACE canonical form + hash (deliberately not imported
// --- from packages/effects: the duplication is the cross-check).
export function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`non-finite number: ${value}`);
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (value instanceof Uint8Array) {
    let hex = "";
    for (const b of value) hex += b.toString(16).padStart(2, "0");
    return `{"$bytes":"${hex}"}`;
  }
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item ?? null)).join(",")}]`;
  if (typeof value === "object") {
    const parts = [];
    for (const key of Object.keys(value).sort()) {
      if (value[key] === undefined) continue;
      parts.push(`${JSON.stringify(key)}:${canonicalJson(value[key])}`);
    }
    return `{${parts.join(",")}}`;
  }
  throw new Error(`not canonicalizable: ${typeof value}`);
}

export function fnv1a64(text) {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < text.length; i += 1) {
    h ^= BigInt(text.charCodeAt(i));
    h = (h * prime) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, "0");
}

export function traceHashOf(trace) {
  return fnv1a64(canonicalJson(trace));
}

// --- scenario machines (timers + transport + log only, so any kernel that
// --- implements the core alphabet can run them).
const idle = (state) => ({ state, intents: [] });

function onStart(intents) {
  return (state, event) => (event.kind === "start" ? { state, intents } : idle(state));
}

const send = (destination, byte) => ({
  kind: "transport/send",
  send: { channel: "conf", destination, payload: new Uint8Array([byte]) }
});
const setTimer = (id, delayMs) => ({ kind: "timer/set", timer: { id, delayMs } });

function pingStep(state, event) {
  if (event.kind === "start") {
    return { state, intents: [send(state.peer, 1), setTimer("heartbeat", 50)] };
  }
  if (event.kind === "transport/recv") {
    if (event.payload[0] === 1) {
      return { state: { ...state, pings: state.pings + 1 }, intents: [send(event.source, 2)] };
    }
    return { state: { ...state, pongs: state.pongs + 1 }, intents: [] };
  }
  if (event.kind === "timer/fired") {
    return { state, intents: [{ kind: "log", level: "debug", message: `beat@${event.at}` }] };
  }
  return idle(state);
}

export const scenarios = {
  determinism: {
    config: {
      seed: 0xc0ffee,
      nodes: [
        { id: "a", initial: { peer: "b", pings: 0, pongs: 0 }, step: pingStep },
        { id: "b", initial: { peer: "a", pings: 0, pongs: 0 }, step: pingStep }
      ],
      delivery: { latencyMs: 5 }
    },
    run: (kernel) => {
      kernel.start();
      kernel.runUntilIdle(1_000);
    }
  },
  "rule1-timers-before-transport": {
    config: {
      seed: 1,
      nodes: [
        { id: "a", initial: null, step: onStart([setTimer("t", 5)]) },
        { id: "b", initial: null, step: onStart([send("a", 1)]) }
      ],
      delivery: { latencyMs: 5 }
    },
    run: (kernel) => {
      kernel.start();
      kernel.runUntilIdle(100);
    }
  },
  "rule2-timers-by-node-then-timer-id": {
    config: {
      seed: 2,
      // Config order deliberately scrambled: dequeue order must not follow it.
      nodes: [
        { id: "b", initial: null, step: onStart([setTimer("t2", 10), setTimer("t1", 10)]) },
        { id: "a", initial: null, step: onStart([setTimer("t2", 10), setTimer("t1", 10)]) }
      ]
    },
    run: (kernel) => {
      kernel.start();
      kernel.runUntilIdle(100);
    }
  },
  "rule3-transport-by-source-then-destination": {
    config: {
      seed: 3,
      nodes: [
        { id: "b", initial: null, step: onStart([send("d", 3), send("c", 4)]) },
        { id: "a", initial: null, step: onStart([send("d", 1), send("c", 2)]) },
        { id: "c", initial: null, step: (state) => idle(state) },
        { id: "d", initial: null, step: (state) => idle(state) }
      ],
      delivery: { latencyMs: 7 }
    },
    run: (kernel) => {
      kernel.start();
      kernel.runUntilIdle(100);
    }
  },
  "rule4-ties-in-send-order": {
    config: {
      seed: 4,
      nodes: [
        { id: "a", initial: null, step: onStart([send("b", 1), send("b", 2)]) },
        { id: "b", initial: null, step: (state) => idle(state) }
      ],
      delivery: { latencyMs: 4 }
    },
    run: (kernel) => {
      kernel.start();
      kernel.runUntilIdle(100);
    }
  }
};

/** Deliveries (timer firings and transport receipts) in dispatch order. */
export function deliveryDescriptors(trace) {
  const out = [];
  for (const entry of trace) {
    if (entry.t !== "event") continue;
    const event = entry.event;
    if (event.kind === "timer/fired") {
      out.push(`timer:${entry.node}:${event.id}@${event.at}`);
    } else if (event.kind === "transport/recv") {
      out.push(`recv:${event.source}->${entry.node}:${event.payload[0]}@${event.at}`);
    }
  }
  return out;
}

export function loadFixtures(path = FIXTURES_PATH) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * Run the SPEC-KERNEL conformance suite against a kernel factory.
 * Returns { checks, failures: [{ check, message }] }.
 */
export function runKernelConformance(createKernel, options = {}) {
  const fixtures = options.fixtures ?? loadFixtures();
  const failures = [];
  let checks = 0;

  const runScenario = (name) => {
    const scenario = scenarios[name];
    if (scenario === undefined) throw new Error(`unknown scenario: ${name}`);
    const kernel = createKernel(scenario.config);
    scenario.run(kernel);
    return kernel;
  };

  // Determinism: identical runner-computed hashes across two runs.
  checks += 1;
  try {
    const first = traceHashOf(runScenario("determinism").getTrace());
    const second = traceHashOf(runScenario("determinism").getTrace());
    if (first !== second) {
      failures.push({ check: "determinism", message: `double-run hash mismatch: ${first} != ${second}` });
    }
  } catch (error) {
    failures.push({ check: "determinism", message: String(error) });
  }

  for (const fixture of fixtures.fixtures) {
    checks += 1;
    try {
      const kernel = runScenario(fixture.name);
      const trace = kernel.getTrace();
      const got = deliveryDescriptors(trace);
      if (JSON.stringify(got) !== JSON.stringify(fixture.expected)) {
        failures.push({
          check: fixture.name,
          message: `delivery order mismatch\n  expected: ${fixture.expected.join(", ")}\n  got:      ${got.join(", ")}`
        });
        continue;
      }
      const hash = traceHashOf(trace);
      if (fixture.traceHash !== undefined && hash !== fixture.traceHash) {
        failures.push({
          check: fixture.name,
          message: `trace hash mismatch: expected ${fixture.traceHash}, got ${hash}`
        });
        continue;
      }
      if (typeof kernel.getTraceHash === "function") {
        const own = kernel.getTraceHash();
        if (own !== hash) {
          failures.push({
            check: fixture.name,
            message: `kernel's own trace hash ${own} disagrees with runner's ${hash}`
          });
        }
      }
    } catch (error) {
      failures.push({ check: fixture.name, message: String(error) });
    }
  }

  return { checks, failures };
}
