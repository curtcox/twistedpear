import { HOST_API_VERSION } from "./host-api.js";
import {
  APP_TRACE_KIND,
  AppTraceFormatError,
  parseAppTrace,
  type AppTrace,
  type AppTraceEntry,
  type AppTraceHost,
  type AppTraceIdentity,
} from "./trace-format.js";
import {
  APP_TRACE_MODE_PAYLOAD,
  parsePayloadAppTrace,
  redactAppTrace,
  stripBrokerPayload,
  type PayloadAppTrace,
  type PayloadAppTraceEntry,
} from "./trace-payload.js";
import { isSandboxTraceMessage } from "./sandbox/time-shims.js";

export const DEFAULT_TRACE_MAX_BYTES = 256 * 1024;

export class UnshimmedClockError extends Error {
  constructor(message = "sandbox clock shim is not installed") {
    super(message);
    this.name = "UnshimmedClockError";
  }
}

export interface SessionRecorderOptions {
  readonly identity: AppTraceIdentity;
  readonly host: AppTraceHost;
  readonly hostApiVersion?: string;
  readonly grants?: ReadonlyArray<string>;
  readonly now: () => number;
  /** When true (default), snapshot() fails if the clock shim was not installed. */
  readonly requireClockShim?: boolean;
  /** Payload recording is off unless set to "payload". snapshot() stays shape-only. */
  readonly mode?: "shape" | "payload";
  /** Ring-buffer ceiling for the in-memory tape. Default 256 KiB. */
  readonly maxBytes?: number;
}

export interface BrokerAuditShape {
  readonly namespace: string;
  readonly method: string;
  readonly capability: string | null;
  readonly outcome: "allowed" | "denied" | "failed";
  readonly at: number;
}

function traceBrokerOutcome(
  outcome: BrokerAuditShape["outcome"],
): "allowed" | "denied" | "failed" {
  if (outcome === "allowed") return "allowed";
  if (outcome === "denied") return "denied";
  return "failed";
}

export class SessionRecorder {
  private readonly identity: AppTraceIdentity;
  private readonly host: AppTraceHost;
  readonly hostApiVersion: string;
  readonly mode: "shape" | "payload";
  private readonly grants: string[];
  private readonly now: () => number;
  private readonly requireClockShim: boolean;
  private readonly maxBytes: number;
  private readonly entries: PayloadAppTraceEntry[] = [];
  private clockShim: "unknown" | "installed" | "missing" = "unknown";
  private lastClockAt: number | null = null;
  private dropped = 0;

  constructor(options: SessionRecorderOptions) {
    this.identity = options.identity;
    this.host = options.host;
    this.hostApiVersion = options.hostApiVersion ?? HOST_API_VERSION;
    this.grants = [...(options.grants ?? [])];
    this.now = options.now;
    this.requireClockShim = options.requireClockShim !== false;
    this.mode = options.mode === "payload" ? "payload" : "shape";
    this.maxBytes = options.maxBytes ?? DEFAULT_TRACE_MAX_BYTES;
    if (!Number.isInteger(this.maxBytes) || this.maxBytes < 1) {
      throw new AppTraceFormatError("maxBytes must be a positive integer");
    }
  }

  get droppedCount(): number {
    return this.dropped;
  }

  noteClockShim(installed: boolean): void {
    this.clockShim = installed ? "installed" : "missing";
  }

  recordClock(at = this.now()): void {
    if (this.lastClockAt === at) return;
    this.lastClockAt = at;
    this.push({ t: "clock", at });
  }

  recordEntropy(byteCount: number, at = this.now()): void {
    this.push({ t: "entropy", at, byteCount });
  }

  recordGrant(
    capability: string,
    change: "grant" | "revoke" | "deny",
    at = this.now(),
  ): void {
    this.push({ t: "grant", at, capability, change });
    if (change === "grant" && !this.grants.includes(capability)) {
      this.grants.push(capability);
    }
    if (change === "revoke" || change === "deny") {
      const index = this.grants.indexOf(capability);
      if (index >= 0) this.grants.splice(index, 1);
    }
  }

  recordBroker(entry: {
    readonly namespace: string;
    readonly method: string;
    readonly capability: string | null;
    readonly outcome: "allowed" | "denied" | "failed";
    readonly at?: number;
    readonly payload?: unknown;
    readonly result?: unknown;
  }): void {
    const row: PayloadAppTraceEntry = {
      t: "broker",
      at: entry.at ?? this.now(),
      namespace: entry.namespace,
      method: entry.method,
      capability: entry.capability,
      outcome: entry.outcome,
      ...(this.mode === "payload" && entry.payload !== undefined
        ? { payload: jsonClone(entry.payload, "payload") }
        : {}),
      ...(this.mode === "payload" && entry.result !== undefined
        ? { result: jsonClone(entry.result, "result") }
        : {}),
    };
    this.push(row);
  }

  recordBrokerAudit(entry: BrokerAuditShape): void {
    const outcome = traceBrokerOutcome(entry.outcome);
    this.recordBroker({
      namespace: entry.namespace,
      method: entry.method,
      capability: entry.capability,
      outcome,
      at: entry.at,
    });
  }

  recordInbound(
    kind: "ui" | "lxmf" | "device" | "channel" | "resume" | "lifecycle",
    name: string,
    at = this.now(),
  ): void {
    this.push({ t: "inbound", at, kind, name });
  }

  recordAssertWidget(nodes: number, at = this.now()): void {
    this.push({ t: "assert", at, kind: "widget", nodes });
  }

  recordAssertCall(at = this.now()): void {
    this.push({ t: "assert", at, kind: "call" });
  }

  consumeSandboxEvent(message: unknown): boolean {
    if (!isSandboxTraceMessage(message)) return false;
    if (message.type === "trace-probe") {
      this.noteClockShim(message.shimmed);
      return true;
    }
    if (message.type === "trace-clock") {
      this.noteClockShim(true);
      this.recordClock();
      return true;
    }
    this.noteClockShim(true);
    this.recordEntropy(message.byteCount);
    return true;
  }

  snapshot(): AppTrace {
    this.assertClockShim();
    return parseAppTrace({
      format: 1,
      kind: APP_TRACE_KIND,
      mode: "shape",
      hostApiVersion: this.hostApiVersion,
      identity: this.identity,
      host: this.host,
      grants: this.grants,
      entries: this.entries.map(stripBrokerPayload),
    });
  }

  snapshotPayload(): PayloadAppTrace {
    if (this.mode !== "payload") {
      throw new AppTraceFormatError("payload recording is not enabled");
    }
    this.assertClockShim();
    return parsePayloadAppTrace({
      format: 1,
      kind: APP_TRACE_KIND,
      mode: APP_TRACE_MODE_PAYLOAD,
      hostApiVersion: this.hostApiVersion,
      identity: this.identity,
      host: this.host,
      grants: this.grants,
      entries: this.entries,
    });
  }

  redact(): AppTrace {
    return this.mode === "payload"
      ? redactAppTrace(this.snapshotPayload())
      : this.snapshot();
  }

  private assertClockShim(): void {
    if (this.requireClockShim && this.clockShim !== "installed") {
      throw new UnshimmedClockError();
    }
  }

  private push(entry: PayloadAppTraceEntry): void {
    this.entries.push(entry);
    this.enforceBudget();
  }

  private enforceBudget(): void {
    while (this.encodedBytes() > this.maxBytes && this.entries.length > 0) {
      const last = this.entries[this.entries.length - 1];
      if (
        last?.t === "broker" &&
        (last.payload !== undefined || last.result !== undefined)
      ) {
        this.entries[this.entries.length - 1] = stripBrokerPayload(
          last,
        ) as AppTraceEntry & { t: "broker" };
        this.dropped += 1;
        continue;
      }
      this.entries.shift();
      this.dropped += 1;
      this.refreshLastClock();
    }
  }

  private encodedBytes(): number {
    return new TextEncoder().encode(JSON.stringify(this.entries)).byteLength;
  }

  private refreshLastClock(): void {
    this.lastClockAt = null;
    for (const entry of this.entries) {
      if (entry.t === "clock") this.lastClockAt = entry.at;
    }
  }
}

function jsonClone(value: unknown, path: string): unknown {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    throw new AppTraceFormatError(`${path} must be JSON`);
  }
}

export function countWidgetNodes(tree: {
  readonly root: { readonly children?: ReadonlyArray<unknown> };
}): number {
  return countNode(tree.root);
}

function countNode(node: {
  readonly children?: ReadonlyArray<unknown>;
}): number {
  const children = node.children ?? [];
  let total = 1;
  for (const child of children) {
    total += countNode(child as { readonly children?: ReadonlyArray<unknown> });
  }
  return total;
}
