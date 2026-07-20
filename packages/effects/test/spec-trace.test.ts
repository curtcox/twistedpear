import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — plain-JS conformance helper without type declarations.
import { createValidator } from "../../../conformance/tools/mini-json-schema.mjs";
import type { Event, Intent, StepFn } from "../src/types.js";
import { canonicalJson, hashTrace, serializeTrace, type TraceEntry } from "../src/trace.js";
import { SimKernel } from "../src/adapters/sim/kernel.js";
import { parseHistory, serializeHistory } from "../src/adapters/sim/recorder.js";
import { replayRecordedTrace } from "../src/adapters/sim/consumer.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..", "..");
const schemaDir = join(repo, "specs", "spec-trace", "schema");
const vectorsPath = join(repo, "specs", "spec-trace", "vectors", "trace-hash.json");

interface DemoState {
  readonly peer: string;
  readonly pongs: number;
}

/** Exercises transport, timers, store cascades, and entropy in one machine. */
const stepDemo: StepFn<DemoState> = (state, event: Event) => {
  const intents: Intent[] = [];
  if (event.kind === "start") {
    intents.push(
      { kind: "transport/send", send: { channel: "demo", destination: state.peer, payload: new Uint8Array([1]) } },
      { kind: "timer/set", timer: { id: "tick", delayMs: 25 } },
      { kind: "store/write", write: { key: "boot", value: new Uint8Array([9, 9]) } }
    );
    return { state, intents };
  }
  if (event.kind === "store/done" && event.key === "boot") {
    return { state, intents: [{ kind: "need_entropy", nbytes: 4 }] };
  }
  if (event.kind === "entropy") {
    return { state, intents: [{ kind: "store/write", write: { key: "seed", value: event.bytes } }] };
  }
  if (event.kind === "transport/recv") {
    if (event.payload[0] === 1) {
      return {
        state,
        intents: [
          { kind: "transport/send", send: { channel: "demo", destination: event.source, payload: new Uint8Array([2]) } }
        ]
      };
    }
    return { state: { ...state, pongs: state.pongs + 1 }, intents: [] };
  }
  if (event.kind === "timer/fired") {
    return { state, intents: [{ kind: "log", level: "debug", message: `tick@${event.at}` }] };
  }
  return { state, intents: [] };
};

function demoHistory() {
  const kernel = new SimKernel<DemoState>({
    seed: 0xbeef,
    nodes: [
      { id: "a", machine: "spec-trace-demo", initial: { peer: "b", pongs: 0 }, step: stepDemo },
      { id: "b", machine: "spec-trace-demo", initial: { peer: "a", pongs: 0 }, step: stepDemo }
    ],
    delivery: { latencyMs: 3 }
  });
  kernel.start();
  kernel.runUntilIdle(1_000);
  return { kernel, history: kernel.getHistory() };
}

function reviveBytes(text: string): unknown {
  return JSON.parse(text, (_key, item: unknown) => {
    if (typeof item === "object" && item !== null && typeof (item as { $bytes?: unknown }).$bytes === "string") {
      const hex = (item as { $bytes: string }).$bytes;
      const out = new Uint8Array(hex.length / 2);
      for (let i = 0; i < out.length; i += 1) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      return out;
    }
    return item;
  });
}

describe("SPEC-TRACE canonical form", () => {
  it("serializes object keys sorted regardless of insertion order", () => {
    const scrambled = JSON.parse('{"node":"a","t":"advance","at":5}') as Record<string, unknown>;
    expect(canonicalJson(scrambled)).toBe('{"at":5,"node":"a","t":"advance"}');
    expect(canonicalJson({ t: "advance", at: 5, node: "a" })).toBe('{"at":5,"node":"a","t":"advance"}');
  });

  it("encodes bytes, drops undefined, rejects non-finite numbers", () => {
    expect(canonicalJson({ b: new Uint8Array([0, 255]), u: undefined })).toBe('{"b":{"$bytes":"00ff"}}');
    expect(() => canonicalJson({ x: Number.NaN })).toThrow(/non-finite/);
    expect(() => canonicalJson({ x: Number.POSITIVE_INFINITY })).toThrow(/non-finite/);
  });

  it("hashes are insensitive to producer key order", () => {
    const a: TraceEntry[] = [{ t: "event", node: "n", event: { kind: "start", at: 0 } }];
    const b = JSON.parse('[{"event":{"at":0,"kind":"start"},"node":"n","t":"event"}]') as TraceEntry[];
    expect(hashTrace(a)).toBe(hashTrace(b));
  });

  it("matches the pinned vectors", () => {
    const file = JSON.parse(readFileSync(vectorsPath, "utf8")) as {
      vectors: Array<{ name: string; trace: unknown; canonical: string; hash: string }>;
    };
    expect(file.vectors.length).toBeGreaterThanOrEqual(3);
    for (const vector of file.vectors) {
      const trace = reviveBytes(JSON.stringify(vector.trace)) as TraceEntry[];
      expect(serializeTrace(trace), vector.name).toBe(vector.canonical);
      expect(hashTrace(trace), vector.name).toBe(vector.hash);
    }
  });
});

describe("SPEC-TRACE schemas", () => {
  const entryValidator = createValidator(join(schemaDir, "trace-entry.schema.json"));
  const historyValidator = createValidator(join(schemaDir, "recorded-history.schema.json"));

  it("accept a freshly recorded history and every entry in it", () => {
    const { history } = demoHistory();
    const raw = JSON.parse(serializeHistory(history)) as { trace: unknown[] };
    expect(historyValidator(raw)).toEqual([]);
    expect(raw.trace.length).toBeGreaterThan(10);
    for (const entry of raw.trace) {
      expect(entryValidator(entry)).toEqual([]);
    }
  });

  it("accept the stored regression and campaign reproducer fixtures", () => {
    const fixtures = [join(repo, "conformance", "sim-regressions", "llm-duplicate-delivery.json")];
    const reproducers = join(repo, "conformance", "sim-campaign", "artifacts", "reproducers");
    // Campaign artifacts are gitignored; CI checkouts have no reproducers dir.
    if (existsSync(reproducers)) {
      const names = readdirSync(reproducers).filter((name) => name.endsWith(".json")).sort();
      if (names.length > 0) fixtures.push(join(reproducers, names[0]!));
    }
    for (const fixture of fixtures) {
      const raw = JSON.parse(readFileSync(fixture, "utf8"));
      expect(historyValidator(raw), fixture).toEqual([]);
    }
  });

  it("reject malformed entries", () => {
    expect(entryValidator({ t: "advance" })).not.toEqual([]);
    expect(entryValidator({ t: "event", node: "a", event: {} })).not.toEqual([]);
    expect(entryValidator({ t: "intent", node: "a", intent: { kind: "log" }, extra: 1 })).not.toEqual([]);
    expect(historyValidator({ version: 2, config: { seed: 1, startMs: 0, nodes: [] }, trace: [] })).not.toEqual([]);
  });
});

describe("SPEC-TRACE cross-producer replay", () => {
  it("consumer regenerates the producer's exact trace hash from the serialized history", () => {
    const { kernel, history } = demoHistory();
    const text = serializeHistory(history);
    const parsed = parseHistory<DemoState>(text);
    const replayed = replayRecordedTrace(parsed, (machine) => {
      expect(machine).toBe("spec-trace-demo");
      return stepDemo;
    });
    expect(replayed.traceHash).toBe(kernel.getTraceHash());
    expect(replayed.traceHash).toBe(hashTrace(history.trace));
    expect(replayed.states.get("a")).toEqual(kernel.getNodeState("a"));
    expect(replayed.states.get("b")).toEqual(kernel.getNodeState("b"));
  });

  it("detects a machine that diverges from the recording", () => {
    const { history } = demoHistory();
    const divergent: StepFn<DemoState> = (state, event) => {
      const result = stepDemo(state, event);
      if (event.kind === "timer/fired") {
        return { state: result.state, intents: [{ kind: "log", level: "info", message: "divergent" }] };
      }
      return result;
    };
    const replayed = replayRecordedTrace(history, () => divergent);
    expect(replayed.traceHash).not.toBe(hashTrace(history.trace));
  });
});
