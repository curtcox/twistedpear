import type { Event, NodeId } from "../../types.js";
import { serializeTrace, type TraceEntry } from "../../trace.js";
import type { SimKernelConfig } from "./kernel.js";
import type { Violation } from "./oracles.js";

export interface RecordedNode<S> {
  readonly id: NodeId;
  readonly machine?: string;
  readonly initial: S;
}

export interface RecordedKernelConfig<S> {
  readonly seed: number;
  readonly startMs: number;
  readonly nodes: readonly RecordedNode<S>[];
  readonly delivery?: SimKernelConfig<S>["delivery"];
  readonly links?: SimKernelConfig<S>["links"];
  readonly interleaveSalt?: number;
}

export interface RecordedHistory<S = unknown> {
  readonly version: 1;
  readonly config: RecordedKernelConfig<S>;
  readonly trace: readonly TraceEntry[];
  readonly violation?: Violation;
}

export interface HistoryRecorder<S> {
  record(history: RecordedHistory<S>): string | undefined;
}

export class MemoryHistoryRecorder<S> implements HistoryRecorder<S> {
  readonly histories: RecordedHistory<S>[] = [];

  record(history: RecordedHistory<S>): undefined {
    this.histories.push(history);
    return undefined;
  }
}

export type WriteTextFile = (path: string, contents: string) => void;

/** On-disk recorder with injected filesystem IO, keeping the sim core portable. */
export class FileHistoryRecorder<S> implements HistoryRecorder<S> {
  constructor(
    private readonly directory: string,
    private readonly writeTextFile: WriteTextFile,
  ) {}

  record(history: RecordedHistory<S>): string {
    const oracle = sanitize(history.violation?.oracle ?? "history");
    const path = `${this.directory}/sim-${history.config.seed}-${oracle}-${history.trace.length}.json`;
    this.writeTextFile(path, serializeHistory(history));
    return path;
  }
}

export function snapshotConfig<S>(
  config: SimKernelConfig<S>,
): RecordedKernelConfig<S> {
  return {
    seed: config.seed,
    startMs: config.startMs ?? 0,
    nodes: config.nodes.map((node) => ({
      id: node.id,
      ...(node.machine === undefined ? {} : { machine: node.machine }),
      initial: node.initial,
    })),
    ...(config.delivery === undefined ? {} : { delivery: config.delivery }),
    ...(config.links === undefined ? {} : { links: config.links }),
    ...(config.interleaveSalt === undefined
      ? {}
      : { interleaveSalt: config.interleaveSalt }),
  };
}

export function serializeHistory<S>(history: RecordedHistory<S>): string {
  return JSON.stringify(history, (_key, value: unknown) => {
    if (value instanceof Uint8Array) return { $bytes: bytesToHex(value) };
    if (value instanceof Map) return { $map: [...value.entries()] };
    return value;
  });
}

export function parseHistory<S = unknown>(text: string): RecordedHistory<S> {
  const value = JSON.parse(text, (_key, item: unknown) => {
    if (isRecord(item) && typeof item.$bytes === "string")
      return hexToBytes(item.$bytes);
    if (isRecord(item) && Array.isArray(item.$map))
      return new Map(item.$map as Array<[unknown, unknown]>);
    return item;
  }) as { version?: unknown; trace?: unknown; config?: unknown };
  if (
    value.version !== 1 ||
    !Array.isArray(value.trace) ||
    value.config === undefined
  ) {
    throw new Error("invalid simulation history");
  }
  return value as RecordedHistory<S>;
}

export function historyEvents(
  history: RecordedHistory,
): readonly { node: NodeId; event: Event }[] {
  return history.trace.flatMap((entry) =>
    entry.t === "event" ? [{ node: entry.node, event: entry.event }] : [],
  );
}

// Ensure trace serialization remains exercised beside the richer history format.
export function traceBody(history: RecordedHistory): string {
  return serializeTrace(history.trace);
}

function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex))
    throw new Error("invalid byte encoding");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1)
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
