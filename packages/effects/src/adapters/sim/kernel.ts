import type { Event, Intent, NodeId, StepFn } from "../../types.js";

type StoreIntent = Extract<
  Intent,
  { kind: "store/read" | "store/write" | "store/delete" }
>;

function isStoreIntent(intent: Intent): intent is StoreIntent {
  return (
    intent.kind === "store/read" ||
    intent.kind === "store/write" ||
    intent.kind === "store/delete"
  );
}
import { hashTrace, type TraceEntry } from "../../trace.js";
import { SimClock } from "./clock.js";
import { Xoshiro128StarStar } from "./entropy.js";
import { SimStore } from "./store.js";
import { SimTimers } from "./timers.js";
import { SimTransport, type DeliveryModel } from "./transport.js";
import type { LinkConfig } from "./transport-classes.js";
import type { HistoryRecorder, RecordedHistory } from "./recorder.js";
import { snapshotConfig } from "./recorder.js";
import type { Oracle, Violation, WorldView } from "./oracles.js";

export interface SimNodeConfig<S> {
  readonly id: NodeId;
  /** Stable registry key used when replaying an on-disk history. */
  readonly machine?: string;
  readonly initial: S;
  readonly step: StepFn<S>;
}

export interface SimKernelConfig<S> {
  readonly seed: number;
  readonly startMs?: number;
  readonly nodes: readonly SimNodeConfig<S>[];
  readonly delivery?: DeliveryModel;
  readonly links?: readonly LinkConfig[];
  /** Salt mixed into the transport RNG only — schedule fuzz without changing protocol seed. */
  readonly interleaveSalt?: number;
  readonly oracles?: readonly Oracle<S>[];
  readonly recorder?: HistoryRecorder<S>;
}

export class OracleViolation extends Error {
  constructor(
    readonly violation: Violation,
    readonly history: RecordedHistory,
    readonly historyPath?: string,
  ) {
    super(violation.message);
    this.name = "OracleViolation";
  }
}

export class EffectWithoutIntentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EffectWithoutIntentError";
  }
}

interface NodeRuntime<S> {
  readonly id: NodeId;
  state: S;
  readonly step: StepFn<S>;
  readonly timers: SimTimers;
  readonly store: SimStore;
  readonly entropy: Xoshiro128StarStar;
}

/**
 * Simulator kernel: the only holder of virtual time, entropy, transport, and
 * storage. Asserts every externally visible action was produced via an intent.
 */
export class SimKernel<S> {
  readonly clock: SimClock;
  readonly transport: SimTransport;
  private readonly nodes = new Map<NodeId, NodeRuntime<S>>();
  private readonly trace: TraceEntry[] = [];
  private readonly intentLog: Intent[] = [];
  private readonly seed: number;
  private readonly config: SimKernelConfig<S>;

  constructor(config: SimKernelConfig<S>) {
    this.config = config;
    this.seed = config.seed;
    this.clock = new SimClock(config.startMs ?? 0);
    const transportEntropy = new Xoshiro128StarStar(
      (config.seed ^ (config.interleaveSalt ?? 0)) >>> 0,
    );
    const rng = (): number => transportEntropy.randomBytes(4)[0]! / 256;
    this.transport = new SimTransport(
      {
        ...(config.delivery === undefined ? {} : { delivery: config.delivery }),
        ...(config.links === undefined ? {} : { links: config.links }),
      },
      rng,
    );

    for (const node of config.nodes) {
      const entropy = new Xoshiro128StarStar(
        (config.seed ^ hashNodeId(node.id)) >>> 0,
      );
      this.nodes.set(node.id, {
        id: node.id,
        state: node.initial,
        step: node.step,
        timers: new SimTimers(this.clock),
        store: new SimStore(),
        entropy,
      });
    }
  }

  getTrace(): readonly TraceEntry[] {
    return this.trace;
  }

  getTraceHash(): string {
    return hashTrace(this.trace);
  }

  getIntentLog(): readonly Intent[] {
    return this.intentLog;
  }

  getNodeState(id: NodeId): S {
    const node = this.requireNode(id);
    return node.state;
  }

  getWorldView(): WorldView<S> {
    return {
      at: this.clock.now(),
      nodes: new Map([...this.nodes].map(([id, node]) => [id, node.state])),
      trace: this.trace,
      intents: this.intentLog,
    };
  }

  getHistory(violation?: Violation): RecordedHistory<S> {
    return {
      version: 1,
      config: snapshotConfig(this.config),
      trace: [...this.trace],
      ...(violation === undefined ? {} : { violation }),
    };
  }

  recordHistory(): string | undefined {
    return this.config.recorder?.record(this.getHistory());
  }

  entropyFor(id: NodeId): Xoshiro128StarStar {
    return this.requireNode(id).entropy;
  }

  /** Deliver an external event to a node and process cascading store replies. */
  inject(nodeId: NodeId, event: Event): void {
    this.dispatch(nodeId, event);
  }

  start(): void {
    const at = this.clock.now();
    for (const id of [...this.nodes.keys()].sort()) {
      this.dispatch(id, { kind: "start", at });
    }
  }

  /**
   * Advance virtual time to `target` (or the next scheduled effect if earlier),
   * delivering due timers and transport messages in deterministic order.
   */
  advanceTo(target: number): void {
    let guard = 0;
    while (guard < 100_000) {
      guard += 1;
      const next = this.nextScheduledAt();
      if (next === undefined || next > target) {
        this.clock.set(target);
        this.trace.push({ t: "advance", at: target });
        return;
      }
      this.clock.set(next);
      this.trace.push({ t: "advance", at: next });
      this.deliverDue(next);
    }
    throw new Error("SimKernel.advanceTo exceeded iteration guard");
  }

  /** Run until no timers or in-flight messages remain, capped by `until`. */
  runUntilIdle(until: number): void {
    let guard = 0;
    while (guard < 100_000) {
      guard += 1;
      const next = this.nextScheduledAt();
      if (next === undefined || next > until) {
        return;
      }
      this.advanceTo(next);
    }
    throw new Error("SimKernel.runUntilIdle exceeded iteration guard");
  }

  private nextScheduledAt(): number | undefined {
    let soonest: number | undefined;
    for (const node of this.nodes.values()) {
      const t = node.timers.nextFireAt();
      if (t !== undefined && (soonest === undefined || t < soonest)) {
        soonest = t;
      }
    }
    const d = this.transport.nextDeliverAt();
    if (d !== undefined && (soonest === undefined || d < soonest)) {
      soonest = d;
    }
    return soonest;
  }

  private deliverDue(at: number): void {
    const nodeIds = [...this.nodes.keys()].sort();
    for (const id of nodeIds) {
      const node = this.requireNode(id);
      for (const timerId of node.timers.dueAt(at)) {
        this.dispatch(id, { kind: "timer/fired", id: timerId, at });
      }
    }

    for (const msg of this.transport.deliverDue(at)) {
      if (!this.nodes.has(msg.destination)) {
        throw new EffectWithoutIntentError(
          `transport delivery to unknown node ${msg.destination} without matching topology`,
        );
      }
      this.dispatch(msg.destination, {
        kind: "transport/recv",
        channel: msg.channel,
        source: msg.source,
        payload: msg.payload,
        at,
      });
    }
  }

  private dispatch(nodeId: NodeId, event: Event): void {
    const node = this.requireNode(nodeId);
    this.trace.push({ t: "event", node: nodeId, event });
    const result = node.step(node.state, event);
    node.state = result.state;

    for (const intent of result.intents) {
      this.recordIntent(nodeId, intent);
      this.applyIntent(node, intent);
    }
    this.checkOracles();
  }

  private checkOracles(): void {
    if (this.config.oracles === undefined) return;
    const world = this.getWorldView();
    for (const oracle of this.config.oracles) {
      const violation = oracle.check(world);
      if (violation !== null) {
        const history = this.getHistory(violation);
        const path = this.config.recorder?.record(history);
        throw new OracleViolation(violation, history, path);
      }
    }
  }

  private recordIntent(nodeId: NodeId, intent: Intent): void {
    this.intentLog.push(intent);
    this.trace.push({ t: "intent", node: nodeId, intent });
  }

  private applyIntent(node: NodeRuntime<S>, intent: Intent): void {
    if (intent.kind === "need_entropy") {
      if (!Number.isSafeInteger(intent.nbytes) || intent.nbytes < 0) {
        throw new EffectWithoutIntentError(
          `invalid entropy byte count: ${intent.nbytes}`,
        );
      }
      this.dispatch(node.id, {
        kind: "entropy",
        bytes: node.entropy.randomBytes(intent.nbytes),
      });
      return;
    }
    if (intent.kind === "transport/adversary") {
      this.transport.applyAdversary(intent.action, node.id, this.clock.now());
      return;
    }
    if (intent.kind === "timer/set" || intent.kind === "timer/cancel") {
      node.timers.applyIntent(intent);
      return;
    }
    if (intent.kind === "transport/send") {
      this.transport.applySend(intent, node.id, this.clock.now());
      return;
    }
    if (isStoreIntent(intent)) {
      this.applyStoreIntent(node, intent);
      return;
    }
    if (intent.kind === "log") {
      return;
    }
    const observeDrop: Extract<Intent, { kind: "observe/drop" }> = intent;
    void observeDrop;
  }

  private applyStoreIntent(node: NodeRuntime<S>, intent: StoreIntent): void {
    for (const ev of node.store.applyIntent(intent)) {
      this.dispatch(node.id, ev);
    }
  }

  private requireNode(id: NodeId): NodeRuntime<S> {
    const node = this.nodes.get(id);
    if (node === undefined) {
      throw new Error(`unknown node: ${id}`);
    }
    return node;
  }
}

function hashNodeId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Convenience: run the same scenario twice and return both trace hashes. */
export function doubleRunHashes<S>(config: SimKernelConfig<S>): {
  readonly a: string;
  readonly b: string;
} {
  const run = (): string => {
    const kernel = new SimKernel(config);
    kernel.start();
    kernel.runUntilIdle(1_000_000);
    return kernel.getTraceHash();
  };
  return { a: run(), b: run() };
}
