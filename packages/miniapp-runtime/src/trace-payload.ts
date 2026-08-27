import { canonicalJson, fnv1a64Hex } from "@twistedpear/effects";
import { asArray, asRecord } from "./trace-assertions.js";
import {
  APP_TRACE_FORMAT,
  APP_TRACE_KIND,
  AppTraceFormatError,
  parseAppTrace,
  type AppTrace,
  type AppTraceEntry,
  type AppTraceHost,
  type AppTraceIdentity,
} from "./trace-format.js";

export const APP_TRACE_MODE_PAYLOAD = "payload" as const;

export type PayloadBrokerEntry = Extract<AppTraceEntry, { t: "broker" }> & {
  readonly payload?: unknown;
  readonly result?: unknown;
};

export type PayloadAppTraceEntry =
  Exclude<AppTraceEntry, { t: "broker" }> | PayloadBrokerEntry;

export interface PayloadAppTrace {
  readonly format: typeof APP_TRACE_FORMAT;
  readonly kind: typeof APP_TRACE_KIND;
  readonly mode: typeof APP_TRACE_MODE_PAYLOAD;
  readonly hostApiVersion: string;
  readonly identity: AppTraceIdentity;
  readonly host: AppTraceHost;
  readonly grants: readonly string[];
  readonly entries: readonly PayloadAppTraceEntry[];
}

export function parsePayloadAppTrace(input: unknown): PayloadAppTrace {
  const root = asRecord(input, "trace");
  if (root.mode !== APP_TRACE_MODE_PAYLOAD) {
    throw new AppTraceFormatError(
      `payload traces must use mode "${APP_TRACE_MODE_PAYLOAD}"`,
    );
  }
  const rawEntries = asArray(root.entries, "entries");
  const extras = rawEntries.map((entry, index) =>
    brokerExtras(entry, `entries[${index}]`),
  );
  const shape = parseAppTrace({
    ...root,
    mode: "shape",
    entries: rawEntries.map(stripBrokerPayload),
  });
  return {
    format: APP_TRACE_FORMAT,
    kind: APP_TRACE_KIND,
    mode: APP_TRACE_MODE_PAYLOAD,
    hostApiVersion: shape.hostApiVersion,
    identity: shape.identity,
    host: shape.host,
    grants: shape.grants,
    entries: shape.entries.map((entry, index) => {
      const extra = extras[index];
      if (entry.t !== "broker" || extra === undefined) return entry;
      return { ...entry, ...extra };
    }),
  };
}

export function serializePayloadAppTrace(trace: PayloadAppTrace): string {
  return canonicalJson(parsePayloadAppTrace(trace));
}

export function hashPayloadAppTrace(trace: PayloadAppTrace): string {
  return fnv1a64Hex(serializePayloadAppTrace(trace));
}

export function redactAppTrace(trace: AppTrace | PayloadAppTrace): AppTrace {
  if (trace.mode === "shape") return parseAppTrace(trace);
  return parseAppTrace({
    format: trace.format,
    kind: trace.kind,
    mode: "shape",
    hostApiVersion: trace.hostApiVersion,
    identity: trace.identity,
    host: trace.host,
    grants: trace.grants,
    entries: trace.entries.map(stripBrokerPayload),
  });
}

export function stripBrokerPayload(entry: unknown): unknown {
  if (!isRecord(entry) || entry.t !== "broker") return entry;
  const { payload: _payload, result: _result, ...rest } = entry;
  return rest;
}

function brokerExtras(
  entry: unknown,
  path: string,
): { payload?: unknown; result?: unknown } | undefined {
  if (!isRecord(entry) || entry.t !== "broker") return undefined;
  const extra: { payload?: unknown; result?: unknown } = {};
  if ("payload" in entry)
    extra.payload = asJson(entry.payload, `${path}.payload`);
  if ("result" in entry) extra.result = asJson(entry.result, `${path}.result`);
  return extra;
}

function asJson(value: unknown, path: string): unknown {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    throw new AppTraceFormatError(`${path} must be JSON`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
