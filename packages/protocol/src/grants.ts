/**
 * Pure capability-grant lifecycle for a single app on a host.
 * Persists via store/write intents; time arrives only as event.at.
 * Encode / decode conclusions leave via machine actions (no ad-hoc
 * `encodeGrantRecord` / `decodeGrantRecord` reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";

export interface GrantRecord {
  readonly appId: string;
  readonly publisherPublicKey: string;
  readonly granted: readonly string[];
  readonly updatedAt: number;
}

export interface GrantHostState {
  readonly appId: string;
  readonly publisherPublicKey: string;
  readonly record: GrantRecord | null;
  readonly lastError: string | null;
}

export type GrantEvent =
  | Event
  | {
      readonly kind: "grant/set";
      readonly at: number;
      readonly declared: readonly string[];
      readonly requested: readonly string[];
    }
  | { readonly kind: "grant/revoke"; readonly at: number; readonly capability: string };

export function grantStoreKey(appId: string, publisherPublicKey: string): string {
  return `miniapp-grants:${publisherPublicKey}:${appId}`;
}

export function initialGrantHostState(appId: string, publisherPublicKey: string): GrantHostState {
  return { appId, publisherPublicKey, record: null, lastError: null };
}

export const stepGrantHost: StepFn<GrantHostState> = (state, event) =>
  stepGrantHostInner(state, event as GrantEvent);

function stepGrantHostInner(state: GrantHostState, event: GrantEvent): {
  state: GrantHostState;
  intents: import("@twistedpear/effects").Intent[];
} {
  if (event.kind === "start") {
    return {
      state,
      intents: [
        {
          kind: "store/read",
          read: { key: grantStoreKey(state.appId, state.publisherPublicKey) }
        }
      ]
    };
  }

  if (event.kind === "store/value") {
    const key = grantStoreKey(state.appId, state.publisherPublicKey);
    if (event.key !== key) {
      return { state, intents: [] };
    }
    if (event.value === undefined) {
      return { state, intents: [] };
    }
    const decodeStepped = stepDecodeGrantRecordWithActions(initialDecodeGrantRecordState(), {
      kind: "grant/decode-gate",
      bytes: event.value
    });
    if (
      shouldRejectDecodeGrantRecord(decodeStepped.actions) ||
      !shouldUseDecodeGrantRecord(decodeStepped.actions)
    ) {
      return { state: { ...state, lastError: "grant record decode failed" }, intents: [] };
    }
    const record = grantRecordFromActions(decodeStepped.actions);
    if (record === null) {
      return { state: { ...state, lastError: "grant record decode failed" }, intents: [] };
    }
    if (record.appId !== state.appId || record.publisherPublicKey !== state.publisherPublicKey) {
      return {
        state: { ...state, lastError: "grant record identity mismatch" },
        intents: []
      };
    }
    return { state: { ...state, record, lastError: null }, intents: [] };
  }

  if (event.kind === "grant/set") {
    const declaredSet = new Set(event.declared);
    for (const capability of event.requested) {
      if (!declaredSet.has(capability)) {
        return {
          state: { ...state, lastError: `undeclared capability: ${capability}` },
          intents: []
        };
      }
    }

    const granted = dedupe(event.requested);
    const record: GrantRecord = {
      appId: state.appId,
      publisherPublicKey: state.publisherPublicKey,
      granted,
      updatedAt: event.at
    };
    const encoded = encodeGrantRecordRawFromGate(record);
    if (encoded === null) {
      return { state: { ...state, lastError: "grant record encode failed" }, intents: [] };
    }
    return {
      state: { ...state, record, lastError: null },
      intents: [
        {
          kind: "store/write",
          write: {
            key: grantStoreKey(state.appId, state.publisherPublicKey),
            value: encoded
          }
        }
      ]
    };
  }

  if (event.kind === "grant/revoke") {
    if (state.record === null) {
      return { state, intents: [] };
    }
    const granted = state.record.granted.filter((entry) => entry !== event.capability);
    const record: GrantRecord = {
      ...state.record,
      granted,
      updatedAt: event.at
    };
    const encoded = encodeGrantRecordRawFromGate(record);
    if (encoded === null) {
      return { state: { ...state, lastError: "grant record encode failed" }, intents: [] };
    }
    return {
      state: { ...state, record, lastError: null },
      intents: [
        {
          kind: "store/write",
          write: {
            key: grantStoreKey(state.appId, state.publisherPublicKey),
            value: encoded
          }
        }
      ]
    };
  }

  return { state, intents: [] };
}

function encodeGrantRecordRawFromGate(record: GrantRecord): Uint8Array | null {
  const encodeStepped = stepEncodeGrantRecordWithActions(initialEncodeGrantRecordState(), {
    kind: "grant/encode-gate",
    record
  });
  if (
    shouldRejectEncodeGrantRecord(encodeStepped.actions) ||
    !shouldUseEncodeGrantRecord(encodeStepped.actions)
  ) {
    return null;
  }
  return encodeGrantRecordRawFromActions(encodeStepped.actions);
}

export function encodeGrantRecord(record: GrantRecord): Uint8Array {
  const text = JSON.stringify({
    appId: record.appId,
    publisherPublicKey: record.publisherPublicKey,
    granted: [...record.granted],
    updatedAt: record.updatedAt
  });
  return utf8Encode(text);
}

export function decodeGrantRecord(bytes: Uint8Array): GrantRecord {
  const parsed = JSON.parse(utf8Decode(bytes)) as GrantRecord;
  if (
    typeof parsed.appId !== "string" ||
    typeof parsed.publisherPublicKey !== "string" ||
    !Array.isArray(parsed.granted) ||
    typeof parsed.updatedAt !== "number"
  ) {
    throw new Error("invalid grant record");
  }
  return {
    appId: parsed.appId,
    publisherPublicKey: parsed.publisherPublicKey,
    granted: dedupe(parsed.granted.map(String)),
    updatedAt: parsed.updatedAt
  };
}

/**
 * Grant-record encode framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `encodeGrantRecord`
 * reads beside the step). Encode failures become `reject`.
 */
export type EncodeGrantRecordState = Record<string, never>;

export type EncodeGrantRecordEvent =
  | Event
  | {
      readonly kind: "grant/encode-gate";
      readonly record: GrantRecord;
    };

export type EncodeGrantRecordAction =
  | { readonly kind: "use-raw"; readonly raw: Uint8Array }
  | { readonly kind: "reject" };

export interface EncodeGrantRecordStepResult {
  readonly state: EncodeGrantRecordState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EncodeGrantRecordAction[];
}

export function initialEncodeGrantRecordState(): EncodeGrantRecordState {
  return {};
}

export function stepEncodeGrantRecordWithActions(
  state: EncodeGrantRecordState,
  event: EncodeGrantRecordEvent
): EncodeGrantRecordStepResult {
  if (event.kind === "grant/encode-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [{ kind: "use-raw", raw: encodeGrantRecord(event.record) }]
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseEncodeGrantRecord(
  actions: ReadonlyArray<EncodeGrantRecordAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

export function shouldRejectEncodeGrantRecord(
  actions: ReadonlyArray<EncodeGrantRecordAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract encoded grant record from step actions; null when no `use-raw`. */
export function encodeGrantRecordRawFromActions(
  actions: ReadonlyArray<EncodeGrantRecordAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Grant-record decode framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `decodeGrantRecord`
 * reads beside the step). Invalid JSON / shape become `reject`.
 */
export type DecodeGrantRecordState = Record<string, never>;

export type DecodeGrantRecordEvent =
  | Event
  | {
      readonly kind: "grant/decode-gate";
      readonly bytes: Uint8Array;
    };

export type DecodeGrantRecordAction =
  | { readonly kind: "use-fields"; readonly fields: GrantRecord }
  | { readonly kind: "reject" };

export interface DecodeGrantRecordStepResult {
  readonly state: DecodeGrantRecordState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DecodeGrantRecordAction[];
}

export function initialDecodeGrantRecordState(): DecodeGrantRecordState {
  return {};
}

export function stepDecodeGrantRecordWithActions(
  state: DecodeGrantRecordState,
  event: DecodeGrantRecordEvent
): DecodeGrantRecordStepResult {
  if (event.kind === "grant/decode-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [{ kind: "use-fields", fields: decodeGrantRecord(event.bytes) }]
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseDecodeGrantRecord(
  actions: ReadonlyArray<DecodeGrantRecordAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectDecodeGrantRecord(
  actions: ReadonlyArray<DecodeGrantRecordAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract decoded grant record from step actions; null when no `use-fields`. */
export function grantRecordFromActions(
  actions: ReadonlyArray<DecodeGrantRecordAction>
): GrantRecord | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

function dedupe(values: readonly string[]): readonly string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}

function utf8Encode(text: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return new Uint8Array(bytes);
}

function utf8Decode(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; ) {
    const b0 = bytes[i]!;
    if (b0 < 0x80) {
      out += String.fromCharCode(b0);
      i += 1;
    } else if ((b0 & 0xe0) === 0xc0 && i + 1 < bytes.length) {
      out += String.fromCharCode(((b0 & 0x1f) << 6) | (bytes[i + 1]! & 0x3f));
      i += 2;
    } else if ((b0 & 0xf0) === 0xe0 && i + 2 < bytes.length) {
      out += String.fromCharCode(
        ((b0 & 0x0f) << 12) | ((bytes[i + 1]! & 0x3f) << 6) | (bytes[i + 2]! & 0x3f)
      );
      i += 3;
    } else {
      i += 1;
    }
  }
  return out;
}
