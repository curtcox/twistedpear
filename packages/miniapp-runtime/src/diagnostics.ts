/**
 * Host-owned per-app diagnostics. Lives beside `BrokerAuditEntry` as a
 * host surface, but never travels the broker request path — log lines must
 * not consume the message budget or become covert unmetered storage.
 */

export type DiagnosticsLevel = "debug" | "log" | "info" | "warn" | "error";

export type AppErrorPhase = "bundle" | "ui-event" | "lifecycle";

export interface AppErrorReport {
  readonly phase: AppErrorPhase;
  readonly message: string;
  readonly stack?: string;
  readonly event?: string;
  readonly nodeId?: string;
}

export interface DiagnosticsLogEntry {
  readonly appId: string;
  readonly level: DiagnosticsLevel;
  readonly message: string;
  readonly at: number;
  /** Always true: ring contents are app-authored, never chrome assurance. */
  readonly authored: true;
}

export interface DiagnosticsRingSnapshot {
  readonly entries: ReadonlyArray<DiagnosticsLogEntry>;
  readonly dropped: number;
}

export const DIAGNOSTICS_RING_CAPACITY = 200;
export const DIAGNOSTICS_ENTRY_MAX_BYTES = 4 * 1024;

const LEVELS: ReadonlySet<string> = new Set([
  "debug",
  "log",
  "info",
  "warn",
  "error",
]);

export function isDiagnosticsLevel(value: string): value is DiagnosticsLevel {
  return LEVELS.has(value);
}

export class DiagnosticsRing {
  private readonly entries: DiagnosticsLogEntry[] = [];
  private dropped = 0;

  constructor(
    private readonly now: () => number,
    private readonly capacity = DIAGNOSTICS_RING_CAPACITY,
    private readonly maxBytes = DIAGNOSTICS_ENTRY_MAX_BYTES,
  ) {}

  push(
    appId: string,
    level: DiagnosticsLevel,
    message: string,
  ): DiagnosticsLogEntry {
    const entry: DiagnosticsLogEntry = {
      appId,
      level,
      message: truncateUtf8(message, this.maxBytes),
      at: this.now(),
      authored: true,
    };
    this.entries.push(entry);
    while (this.entries.length > this.capacity) {
      this.entries.shift();
      this.dropped += 1;
    }
    return entry;
  }

  snapshot(): DiagnosticsRingSnapshot {
    return { entries: [...this.entries], dropped: this.dropped };
  }
}

function truncateUtf8(value: string, maxBytes: number): string {
  const encoded = new TextEncoder().encode(value);
  if (encoded.byteLength <= maxBytes) return value;
  return new TextDecoder("utf-8", { fatal: false }).decode(
    encoded.slice(0, maxBytes),
  );
}

export {
  APP_TRACE_FORMAT,
  APP_TRACE_KIND,
  APP_TRACE_MODE_SHAPE,
  APP_TRACE_SHAPE_FORBIDDEN_KEYS,
  AppTraceFormatError,
  hashAppTrace,
  parseAppTrace,
  serializeAppTrace,
} from "./trace-format.js";
export type {
  AppTrace,
  AppTraceEntry,
  AppTraceHost,
  AppTraceIdentity,
  AppTraceInboundKind,
} from "./trace-format.js";
