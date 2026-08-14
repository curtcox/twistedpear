/**
 * Pure capability-grant lifecycle for a single app on a host.
 * Persists via store/write intents; time arrives only as event.at.
 * Encode / decode conclusions leave via machine actions (no ad-hoc
 * `encodeGrantRecord` / `decodeGrantRecord` reads beside the step).
 */
import {
  interpret,
  type Event,
  type EventClass,
  type Intent,
  type Machine,
  type StepFn,
} from "@twistedpear/effects";
import {
  initialGrantParserState,
  stepGrantParser,
  type GrantParserToken,
} from "./grant-parser-machine.js";
import { migrateLegacyGrantRecord } from "./grant-storage-migration.js";
import {
  initialGrantLifecycleState,
  stepGrantLifecycle,
  type GrantLifecycleEvent,
  type GrantLifecycleState,
} from "./grant-machine.js";
import { utf8Decode, utf8Encode } from "./utf8.js";
import { firstActionOfKind, hasActionOfKind } from "./action-kind.js";

export class InvalidGrantRecordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidGrantRecordError";
  }
}

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
  /** The formally checked lifecycle table is the authority for every capability. */
  readonly lifecycles?: Readonly<Record<string, GrantLifecycleState>>;
}

export type GrantEvent =
  | Event
  | {
      readonly kind: "grant/set";
      readonly at: number;
      readonly declared: readonly string[];
      readonly requested: readonly string[];
      readonly ttlMs?: number;
    }
  | {
      readonly kind: "grant/revoke";
      readonly at: number;
      readonly capability: string;
    }
  | {
      readonly kind: "grant/deny";
      readonly at: number;
      readonly capability: string;
    }
  | {
      readonly kind: "grant/first-use";
      readonly at: number;
      readonly capability: string;
    }
  | {
      readonly kind: "grant/ttl";
      readonly at: number;
      readonly capability: string;
    };

export function grantStoreKey(
  appId: string,
  publisherPublicKey: string,
): string {
  return `miniapp-grants:${publisherPublicKey}:${appId}`;
}

export function initialGrantHostState(
  appId: string,
  publisherPublicKey: string,
): GrantHostState {
  return {
    appId,
    publisherPublicKey,
    record: null,
    lastError: null,
    lifecycles: {},
  };
}

const hostStart: EventClass<GrantEvent> = {
  name: "start",
  matches: (event) => event.kind === "start",
};
const hostStoreValue: EventClass<GrantEvent> = {
  name: "store/value",
  matches: (event) => event.kind === "store/value",
};
const hostSet: EventClass<GrantEvent> = {
  name: "grant/set",
  matches: (event) => event.kind === "grant/set",
};
const hostRevoke: EventClass<GrantEvent> = {
  name: "grant/revoke",
  matches: (event) => event.kind === "grant/revoke",
};

export const grantHostMachine: Machine<GrantHostState, GrantEvent> = {
  states: ["ready"],
  events: [hostStart, hostStoreValue, hostSet, hostRevoke],
  initial: "ready",
  stateOf: () => "ready",
  withState: (state) => state,
  table: [
    {
      from: "ready",
      on: hostStart,
      to: "ready",
      emit: (state) => [
        {
          kind: "store/read",
          read: { key: grantStoreKey(state.appId, state.publisherPublicKey) },
        },
      ],
    },
    {
      from: "ready",
      on: hostStoreValue,
      to: "ready",
      reduce: loadGrantRecord,
      emit: persistMigratedGrant,
    },
    {
      from: "ready",
      on: hostSet,
      to: "ready",
      reduce: setGrantRecord,
      emit: persistChangedGrant,
    },
    {
      from: "ready",
      on: hostRevoke,
      to: "ready",
      reduce: revokeGrantCapability,
      emit: persistChangedGrant,
    },
  ],
};

const interpretedGrantHost = interpret(grantHostMachine);
export const stepGrantHost: StepFn<GrantHostState> = (state, rawEvent) => {
  const event = rawEvent as GrantEvent;
  if (event.kind === "grant/set") return applyGrantSet(state, event);
  if (
    event.kind === "grant/revoke" ||
    event.kind === "grant/deny" ||
    event.kind === "grant/first-use" ||
    event.kind === "grant/ttl"
  ) {
    return stepLifecycleHostEvent(state, event);
  }
  return interpretedGrantHost(state, event);
};

function applyGrantSet(
  state: GrantHostState,
  event: Extract<GrantEvent, { kind: "grant/set" }>,
): ReturnType<StepFn<GrantHostState>> {
  const approved = new Map<string, GrantLifecycleState>();
  for (const capability of event.requested) {
    const current =
      state.lifecycles?.[capability] ?? initialGrantLifecycleState(event.at);
    const next = stepGrantLifecycle(current, {
      kind: "grant/approve",
      at: event.at,
      ttlMs: event.ttlMs ?? Number.MAX_SAFE_INTEGER - event.at,
    }).state;
    if (state.lifecycles?.[capability] !== undefined && next === current)
      return { state, intents: [] };
    approved.set(capability, next);
  }
  const stepped = interpretedGrantHost(state, event);
  if (stepped.state.lastError !== null) return stepped;
  const lifecycles = { ...stepped.state.lifecycles };
  for (const [capability, lifecycle] of approved)
    lifecycles[capability] = lifecycle;
  return { ...stepped, state: { ...stepped.state, lifecycles } };
}

function stepLifecycleHostEvent(
  state: GrantHostState,
  event: Extract<GrantEvent, { capability: string }>,
): ReturnType<StepFn<GrantHostState>> {
  const explicit = state.lifecycles?.[event.capability];
  const current =
    explicit ??
    (state.record?.granted.includes(event.capability) === true
      ? {
          ...initialGrantLifecycleState(state.record.updatedAt),
          phase: "granted" as const,
          expiresAt: Number.MAX_SAFE_INTEGER,
        }
      : undefined);
  if (current === undefined) {
    if (event.kind !== "grant/deny") return { state, intents: [] };
    const requested = initialGrantLifecycleState(event.at);
    const lifecycle = stepGrantLifecycle(
      requested,
      lifecycleEvent(event),
    ).state;
    return {
      state: {
        ...state,
        lifecycles: { ...state.lifecycles, [event.capability]: lifecycle },
      },
      intents: [],
    };
  }
  const lifecycle = stepGrantLifecycle(current, lifecycleEvent(event)).state;
  if (lifecycle === current) return { state, intents: [] };
  const next = {
    ...state,
    lifecycles: { ...state.lifecycles, [event.capability]: lifecycle },
  };
  if (event.kind !== "grant/revoke" && event.kind !== "grant/ttl")
    return { state: next, intents: [] };
  const persisted = interpretedGrantHost(next, {
    kind: "grant/revoke",
    at: event.at,
    capability: event.capability,
  });
  return persisted;
}

function lifecycleEvent(
  event: Extract<GrantEvent, { capability: string }>,
): GrantLifecycleEvent {
  if (event.kind === "grant/revoke")
    return { kind: "grant/revoke", at: event.at };
  if (event.kind === "grant/deny") return { kind: "grant/deny", at: event.at };
  if (event.kind === "grant/first-use")
    return { kind: "grant/first-use", at: event.at };
  return { kind: "grant/ttl", at: event.at };
}

function decodeStoredGrantBytes(bytes: Uint8Array) {
  let candidate = bytes;
  let decodeStepped = stepDecodeGrantRecordWithActions(
    initialDecodeGrantRecordState(),
    { kind: "grant/decode-gate", bytes: candidate },
  );
  if (shouldRejectDecodeGrantRecord(decodeStepped.actions)) {
    const migrated = migrateLegacyGrantRecord(bytes);
    if (migrated !== null) {
      candidate = migrated;
      decodeStepped = stepDecodeGrantRecordWithActions(
        initialDecodeGrantRecordState(),
        { kind: "grant/decode-gate", bytes: candidate },
      );
    }
  }
  return { candidate, decodeStepped };
}

function loadGrantRecord(
  state: GrantHostState,
  event: GrantEvent,
): GrantHostState {
  if (event.kind !== "store/value") return state;
  const key = grantStoreKey(state.appId, state.publisherPublicKey);
  if (event.key !== key || event.value === undefined) return state;
  const { decodeStepped } = decodeStoredGrantBytes(event.value);
  if (
    shouldRejectDecodeGrantRecord(decodeStepped.actions) ||
    !shouldUseDecodeGrantRecord(decodeStepped.actions)
  ) {
    return { ...state, lastError: "grant record decode failed" };
  }
  const record = grantRecordFromActions(decodeStepped.actions);
  if (record === null) {
    return { ...state, lastError: "grant record decode failed" };
  }
  if (
    record.appId !== state.appId ||
    record.publisherPublicKey !== state.publisherPublicKey
  ) {
    return { ...state, lastError: "grant record identity mismatch" };
  }
  const lifecycles = Object.fromEntries(
    record.granted.map((capability) => [
      capability,
      {
        ...initialGrantLifecycleState(record.updatedAt),
        phase: "granted" as const,
        expiresAt: Number.MAX_SAFE_INTEGER,
      },
    ]),
  );
  return { ...state, record, lastError: null, lifecycles };
}

function persistMigratedGrant(
  state: GrantHostState,
  event: GrantEvent,
): readonly Intent[] {
  if (
    event.kind !== "store/value" ||
    event.value === undefined ||
    state.record === null ||
    state.lastError !== null
  )
    return [];
  try {
    decodeGrantRecord(event.value);
    return [];
  } catch {
    const migrated = migrateLegacyGrantRecord(event.value);
    return migrated === null
      ? []
      : [{ kind: "store/write", write: { key: event.key, value: migrated } }];
  }
}

function setGrantRecord(
  state: GrantHostState,
  event: GrantEvent,
): GrantHostState {
  if (event.kind === "grant/set") {
    const declaredSet = new Set(event.declared);
    for (const capability of event.requested) {
      if (!declaredSet.has(capability)) {
        return { ...state, lastError: `undeclared capability: ${capability}` };
      }
    }

    const granted = dedupe(event.requested);
    const record: GrantRecord = {
      appId: state.appId,
      publisherPublicKey: state.publisherPublicKey,
      granted,
      updatedAt: event.at,
    };
    return { ...state, record, lastError: null };
  }
  return state;
}

function revokeGrantCapability(
  state: GrantHostState,
  event: GrantEvent,
): GrantHostState {
  if (event.kind === "grant/revoke") {
    if (state.record === null) {
      return state;
    }
    const granted = state.record.granted.filter(
      (entry) => entry !== event.capability,
    );
    const record: GrantRecord = {
      ...state.record,
      granted,
      updatedAt: event.at,
    };
    return { ...state, record, lastError: null };
  }
  return state;
}

function persistChangedGrant(
  state: GrantHostState,
  event: GrantEvent,
): readonly Intent[] {
  if (
    (event.kind !== "grant/set" && event.kind !== "grant/revoke") ||
    state.record === null ||
    state.lastError !== null ||
    state.record.updatedAt !== event.at
  ) {
    return [];
  }
  const encoded = encodeGrantRecordRawFromGate(state.record);
  if (encoded === null) return [];
  return [
    {
      kind: "store/write",
      write: {
        key: grantStoreKey(state.appId, state.publisherPublicKey),
        value: encoded,
      },
    },
  ];
}

function encodeGrantRecordRawFromGate(record: GrantRecord): Uint8Array | null {
  const encodeStepped = stepEncodeGrantRecordWithActions(
    initialEncodeGrantRecordState(),
    {
      kind: "grant/encode-gate",
      record,
    },
  );
  if (
    shouldRejectEncodeGrantRecord(encodeStepped.actions) ||
    !shouldUseEncodeGrantRecord(encodeStepped.actions)
  ) {
    return null;
  }
  return encodeGrantRecordRawFromActions(encodeStepped.actions);
}

export function encodeGrantRecord(record: GrantRecord): Uint8Array {
  validateGrantRecord(record);
  const text = JSON.stringify({
    appId: record.appId,
    publisherPublicKey: record.publisherPublicKey,
    granted: [...record.granted],
    updatedAt: record.updatedAt,
  });
  return utf8Encode(text);
}

export function decodeGrantRecord(bytes: Uint8Array): GrantRecord {
  const text = strictUtf8Decode(bytes);
  let state = initialGrantParserState();
  for (const token of lexGrantRecord(text)) {
    const result = stepGrantParser(state, token);
    if (result.state === state)
      throw new InvalidGrantRecordError(
        `unexpected ${token.kind} in ${state.phase}`,
      );
    state = result.state;
  }
  if (
    state.phase !== "accept" ||
    state.appId === undefined ||
    state.publisherPublicKey === undefined ||
    state.updatedAt === undefined
  ) {
    throw new InvalidGrantRecordError("incomplete grant record");
  }
  const record: GrantRecord = {
    appId: state.appId,
    publisherPublicKey: state.publisherPublicKey,
    granted: state.granted,
    updatedAt: state.updatedAt,
  };
  validateGrantRecord(record);
  const canonical = encodeGrantRecord(record);
  if (!bytesEqual(bytes, canonical))
    throw new InvalidGrantRecordError("grant record is not canonical");
  return record;
}

function validateGrantRecord(record: GrantRecord): void {
  if (
    typeof record.appId !== "string" ||
    typeof record.publisherPublicKey !== "string" ||
    !Array.isArray(record.granted) ||
    record.granted.some((entry) => typeof entry !== "string") ||
    new Set(record.granted).size !== record.granted.length ||
    !Number.isSafeInteger(record.updatedAt) ||
    record.updatedAt < 0
  ) {
    throw new InvalidGrantRecordError("invalid grant record fields");
  }
}

function* lexGrantRecord(text: string): Generator<GrantParserToken> {
  let offset = 0;
  while (offset < text.length) {
    const char = text[offset]!;
    const punctuation: Record<string, GrantParserToken["kind"]> = {
      "{": "open",
      "}": "close",
      ":": "colon",
      ",": "comma",
      "[": "array-open",
      "]": "array-close",
    };
    const kind = punctuation[char];
    if (kind !== undefined) {
      yield { kind } as GrantParserToken;
      offset += 1;
      continue;
    }
    if (char === '"') {
      const parsed = readJsonString(text, offset);
      yield { kind: "string", value: parsed.value };
      offset = parsed.next;
      continue;
    }
    const number = /^(0|[1-9][0-9]*)/.exec(text.slice(offset));
    if (number !== null) {
      const value = Number(number[0]);
      if (!Number.isSafeInteger(value))
        throw new InvalidGrantRecordError("integer is outside the safe range");
      yield { kind: "integer", value };
      offset += number[0].length;
      continue;
    }
    throw new InvalidGrantRecordError(`invalid byte at character ${offset}`);
  }
  yield { kind: "eof" };
}

function readJsonString(
  text: string,
  start: number,
): { readonly value: string; readonly next: number } {
  let out = "";
  for (let offset = start + 1; offset < text.length; offset += 1) {
    const char = text[offset]!;
    if (char === '"') return { value: out, next: offset + 1 };
    if (char.charCodeAt(0) < 0x20)
      throw new InvalidGrantRecordError("unescaped control character");
    if (char !== "\\") {
      out += char;
      continue;
    }
    const escape = text[++offset];
    if (escape === undefined)
      throw new InvalidGrantRecordError("unterminated escape");
    const simple: Record<string, string> = {
      '"': '"',
      "\\": "\\",
      "/": "/",
      b: "\b",
      f: "\f",
      n: "\n",
      r: "\r",
      t: "\t",
    };
    if (simple[escape] !== undefined) {
      out += simple[escape];
      continue;
    }
    if (
      escape !== "u" ||
      !/^[0-9a-fA-F]{4}$/.test(text.slice(offset + 1, offset + 5))
    )
      throw new InvalidGrantRecordError("invalid string escape");
    out += String.fromCharCode(
      Number.parseInt(text.slice(offset + 1, offset + 5), 16),
    );
    offset += 4;
  }
  throw new InvalidGrantRecordError("unterminated string");
}

function strictUtf8Decode(bytes: Uint8Array): string {
  const text = utf8Decode(bytes);
  if (!bytesEqual(utf8Encode(text), bytes))
    throw new InvalidGrantRecordError("invalid or non-canonical UTF-8");
  return text;
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return (
    left.length === right.length &&
    left.every((byte, index) => byte === right[index])
  );
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
  event: EncodeGrantRecordEvent,
): EncodeGrantRecordStepResult {
  if (event.kind === "grant/encode-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [{ kind: "use-raw", raw: encodeGrantRecord(event.record) }],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseEncodeGrantRecord(
  actions: ReadonlyArray<EncodeGrantRecordAction>,
): boolean {
  return hasActionOfKind(actions, "use-raw");
}

export function shouldRejectEncodeGrantRecord(
  actions: ReadonlyArray<EncodeGrantRecordAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Extract encoded grant record from step actions; null when no `use-raw`. */
export function encodeGrantRecordRawFromActions(
  actions: ReadonlyArray<EncodeGrantRecordAction>,
): Uint8Array | null {
  return firstActionOfKind(actions, "use-raw")?.raw ?? null;
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
  event: DecodeGrantRecordEvent,
): DecodeGrantRecordStepResult {
  if (event.kind === "grant/decode-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          { kind: "use-fields", fields: decodeGrantRecord(event.bytes) },
        ],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseDecodeGrantRecord(
  actions: ReadonlyArray<DecodeGrantRecordAction>,
): boolean {
  return hasActionOfKind(actions, "use-fields");
}

export function shouldRejectDecodeGrantRecord(
  actions: ReadonlyArray<DecodeGrantRecordAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Extract decoded grant record from step actions; null when no `use-fields`. */
export function grantRecordFromActions(
  actions: ReadonlyArray<DecodeGrantRecordAction>,
): GrantRecord | null {
  return firstActionOfKind(actions, "use-fields")?.fields ?? null;
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
