import { HOST_API_VERSION } from "./host-api.js";
import {
  parseAppTrace,
  type AppTrace,
  type AppTraceEntry,
  type AppTraceHost,
  type AppTraceIdentity,
} from "./trace-format.js";
import { isSandboxTraceMessage } from "./time-shims.js";

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
  private readonly grants: string[];
  private readonly now: () => number;
  private readonly requireClockShim: boolean;
  private readonly entries: AppTraceEntry[] = [];
  private clockShim: "unknown" | "installed" | "missing" = "unknown";
  private lastClockAt: number | null = null;

  constructor(options: SessionRecorderOptions) {
    this.identity = options.identity;
    this.host = options.host;
    this.hostApiVersion = options.hostApiVersion ?? HOST_API_VERSION;
    this.grants = [...(options.grants ?? [])];
    this.now = options.now;
    this.requireClockShim = options.requireClockShim !== false;
  }

  noteClockShim(installed: boolean): void {
    this.clockShim = installed ? "installed" : "missing";
  }

  recordClock(at = this.now()): void {
    if (this.lastClockAt === at) return;
    this.lastClockAt = at;
    this.entries.push({ t: "clock", at });
  }

  recordEntropy(byteCount: number, at = this.now()): void {
    this.entries.push({ t: "entropy", at, byteCount });
  }

  recordGrant(
    capability: string,
    change: "grant" | "revoke" | "deny",
    at = this.now(),
  ): void {
    this.entries.push({ t: "grant", at, capability, change });
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
  }): void {
    this.entries.push({
      t: "broker",
      at: entry.at ?? this.now(),
      namespace: entry.namespace,
      method: entry.method,
      capability: entry.capability,
      outcome: entry.outcome,
    });
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
    this.entries.push({ t: "inbound", at, kind, name });
  }

  recordAssertWidget(nodes: number, at = this.now()): void {
    this.entries.push({ t: "assert", at, kind: "widget", nodes });
  }

  recordAssertCall(at = this.now()): void {
    this.entries.push({ t: "assert", at, kind: "call" });
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
    if (message.type === "trace-entropy") {
      this.noteClockShim(true);
      this.recordEntropy(message.byteCount);
      return true;
    }
    return false;
  }

  snapshot(): AppTrace {
    if (this.requireClockShim && this.clockShim !== "installed") {
      throw new UnshimmedClockError();
    }
    return parseAppTrace({
      format: 1,
      kind: "miniapp-session",
      mode: "shape",
      hostApiVersion: this.hostApiVersion,
      identity: this.identity,
      host: this.host,
      grants: this.grants,
      entries: this.entries,
    });
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
