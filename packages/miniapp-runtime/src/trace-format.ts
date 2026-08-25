import { canonicalJson, fnv1a64Hex } from "@twistedpear/effects";

export const APP_TRACE_FORMAT = 1 as const;
export const APP_TRACE_KIND = "miniapp-session" as const;
export const APP_TRACE_MODE_SHAPE = "shape" as const;

const HEX64 = /^[0-9a-f]{64}$/;
const INBOUND_KINDS = new Set([
  "ui",
  "lxmf",
  "device",
  "channel",
  "resume",
  "lifecycle",
]);
const GRANT_CHANGES = new Set(["grant", "revoke", "deny"]);
const BROKER_OUTCOMES = new Set(["allowed", "denied", "failed"]);
const ASSERT_KINDS = new Set(["widget", "call"]);

/** Keys that would carry user or peer content. Shape traces must not include them. */
export const APP_TRACE_SHAPE_FORBIDDEN_KEYS = [
  "payload",
  "result",
  "body",
  "secret",
  "contents",
  "text",
  "data",
  "value",
  "label",
  "bytes",
  "message",
] as const;

export class AppTraceFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppTraceFormatError";
  }
}

export interface AppTraceIdentity {
  readonly appId: string;
  readonly version: string;
  readonly publisherKey: string;
  readonly packageHash: string;
}

export interface AppTraceHost {
  readonly platform: string;
  readonly hostVersion: string;
  readonly hostApiVersion: string;
}

export type AppTraceInboundKind =
  "ui" | "lxmf" | "device" | "channel" | "resume" | "lifecycle";

export type AppTraceEntry =
  | { readonly t: "clock"; readonly at: number }
  | { readonly t: "entropy"; readonly at: number; readonly byteCount: number }
  | {
      readonly t: "grant";
      readonly at: number;
      readonly capability: string;
      readonly change: "grant" | "revoke" | "deny";
    }
  | {
      readonly t: "broker";
      readonly at: number;
      readonly namespace: string;
      readonly method: string;
      readonly capability: string | null;
      readonly outcome: "allowed" | "denied" | "failed";
    }
  | {
      readonly t: "inbound";
      readonly at: number;
      readonly kind: AppTraceInboundKind;
      readonly name: string;
    }
  | {
      readonly t: "assert";
      readonly at: number;
      readonly kind: "widget" | "call";
      readonly nodes?: number;
    };

export interface AppTrace {
  readonly format: typeof APP_TRACE_FORMAT;
  readonly kind: typeof APP_TRACE_KIND;
  readonly mode: typeof APP_TRACE_MODE_SHAPE;
  readonly hostApiVersion: string;
  readonly identity: AppTraceIdentity;
  readonly host: AppTraceHost;
  readonly grants: readonly string[];
  readonly entries: readonly AppTraceEntry[];
}

export function parseAppTrace(input: unknown): AppTrace {
  const root = asRecord(input, "trace");
  assertNoForbiddenKeys(root, "trace");
  if (root.format !== APP_TRACE_FORMAT) {
    throw new AppTraceFormatError(`unsupported format ${String(root.format)}`);
  }
  if (root.kind !== APP_TRACE_KIND) {
    throw new AppTraceFormatError(`unsupported kind ${String(root.kind)}`);
  }
  if (root.mode !== APP_TRACE_MODE_SHAPE) {
    throw new AppTraceFormatError(
      `TRACE-1 accepts only mode "${APP_TRACE_MODE_SHAPE}"`,
    );
  }
  return {
    format: APP_TRACE_FORMAT,
    kind: APP_TRACE_KIND,
    mode: APP_TRACE_MODE_SHAPE,
    hostApiVersion: asNonempty(root.hostApiVersion, "hostApiVersion"),
    identity: parseIdentity(root.identity),
    host: parseHost(root.host),
    grants: asStringArray(root.grants, "grants"),
    entries: asArray(root.entries, "entries").map((entry, index) =>
      parseEntry(entry, `entries[${index}]`),
    ),
  };
}

export function serializeAppTrace(trace: AppTrace): string {
  return canonicalJson(parseAppTrace(trace));
}

export function hashAppTrace(trace: AppTrace): string {
  return fnv1a64Hex(serializeAppTrace(trace));
}

function parseIdentity(input: unknown): AppTraceIdentity {
  const row = asRecord(input, "identity");
  return {
    appId: asNonempty(row.appId, "identity.appId"),
    version: asNonempty(row.version, "identity.version"),
    publisherKey: asHex64(row.publisherKey, "identity.publisherKey"),
    packageHash: asHex64(row.packageHash, "identity.packageHash"),
  };
}

function parseHost(input: unknown): AppTraceHost {
  const row = asRecord(input, "host");
  return {
    platform: asNonempty(row.platform, "host.platform"),
    hostVersion: asNonempty(row.hostVersion, "host.hostVersion"),
    hostApiVersion: asNonempty(row.hostApiVersion, "host.hostApiVersion"),
  };
}

function parseGrantEntry(
  row: Record<string, unknown>,
  at: number,
  path: string,
): AppTraceEntry {
  const change = asNonempty(row.change, `${path}.change`);
  if (!GRANT_CHANGES.has(change)) {
    throw new AppTraceFormatError(`${path}.change is not a grant change`);
  }
  return {
    t: "grant",
    at,
    capability: asNonempty(row.capability, `${path}.capability`),
    change: change as "grant" | "revoke" | "deny",
  };
}

function parseBrokerEntry(
  row: Record<string, unknown>,
  at: number,
  path: string,
): AppTraceEntry {
  const outcome = asNonempty(row.outcome, `${path}.outcome`);
  if (!BROKER_OUTCOMES.has(outcome)) {
    throw new AppTraceFormatError(`${path}.outcome is not a broker outcome`);
  }
  return {
    t: "broker",
    at,
    namespace: asNonempty(row.namespace, `${path}.namespace`),
    method: asNonempty(row.method, `${path}.method`),
    capability:
      row.capability === null
        ? null
        : asNonempty(row.capability, `${path}.capability`),
    outcome: outcome as "allowed" | "denied" | "failed",
  };
}

function parseInboundEntry(
  row: Record<string, unknown>,
  at: number,
  path: string,
): AppTraceEntry {
  const kind = asNonempty(row.kind, `${path}.kind`);
  if (!INBOUND_KINDS.has(kind)) {
    throw new AppTraceFormatError(`${path}.kind is not an inbound kind`);
  }
  return {
    t: "inbound",
    at,
    kind: kind as AppTraceInboundKind,
    name: asNonempty(row.name, `${path}.name`),
  };
}

function parseAssertEntry(
  row: Record<string, unknown>,
  at: number,
  path: string,
): AppTraceEntry {
  const kind = asNonempty(row.kind, `${path}.kind`);
  if (!ASSERT_KINDS.has(kind)) {
    throw new AppTraceFormatError(`${path}.kind is not an assert kind`);
  }
  if (kind === "widget") {
    return {
      t: "assert",
      at,
      kind: "widget",
      nodes: asTime(row.nodes, `${path}.nodes`),
    };
  }
  return { t: "assert", at, kind: "call" };
}

function parseEntry(input: unknown, path: string): AppTraceEntry {
  const row = asRecord(input, path);
  const t = asNonempty(row.t, `${path}.t`);
  const at = asTime(row.at, `${path}.at`);
  switch (t) {
    case "clock":
      return { t, at };
    case "entropy":
      return { t, at, byteCount: asTime(row.byteCount, `${path}.byteCount`) };
    case "grant":
      return parseGrantEntry(row, at, path);
    case "broker":
      return parseBrokerEntry(row, at, path);
    case "inbound":
      return parseInboundEntry(row, at, path);
    case "assert":
      return parseAssertEntry(row, at, path);
    default:
      throw new AppTraceFormatError(`${path}.t is not a known entry type`);
  }
}

function assertNoForbiddenKeys(value: unknown, path: string): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenKeys(item, `${path}[${index}]`),
    );
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, child] of Object.entries(value)) {
    if ((APP_TRACE_SHAPE_FORBIDDEN_KEYS as readonly string[]).includes(key)) {
      throw new AppTraceFormatError(
        `${path}.${key} is not allowed on a shape-only trace`,
      );
    }
    assertNoForbiddenKeys(child, `${path}.${key}`);
  }
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AppTraceFormatError(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new AppTraceFormatError(`${path} must be an array`);
  }
  return value;
}

function asStringArray(value: unknown, path: string): string[] {
  return asArray(value, path).map((item, index) =>
    asNonempty(item, `${path}[${index}]`),
  );
}

function asNonempty(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new AppTraceFormatError(`${path} must be a nonempty string`);
  }
  return value;
}

function asHex64(value: unknown, path: string): string {
  const text = asNonempty(value, path);
  if (!HEX64.test(text)) {
    throw new AppTraceFormatError(
      `${path} must be 64 lowercase hex characters`,
    );
  }
  return text;
}

function asTime(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new AppTraceFormatError(`${path} must be a nonnegative integer`);
  }
  return value;
}
