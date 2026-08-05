/**
 * Pure LXMF msgpack payload codecs built on msgpack-core.
 * Pack / unpack conclusions leave via machine actions (no ad-hoc
 * `packLxmPayload` / `unpackLxmPayload` / `packPropagationRequest` /
 * `unpackPropagationRequest` / `packPropagationEnvelope` /
 * `unpackPropagationEnvelope` / `unpackBinList` reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";
import {
  msgpackPackArray,
  msgpackPackBin,
  msgpackPackFloat64,
  msgpackPackIntMap,
  msgpackPackNil,
  msgpackUnpack,
  type MsgpackValue,
} from "./msgpack-core.js";

export type LxmFields = Readonly<Record<number, Uint8Array>>;

export function packLxmFields(fields: LxmFields): Uint8Array {
  const entries = Object.entries(fields).map(
    ([key, value]) => [Number.parseInt(key, 10), value] as [number, Uint8Array],
  );
  return msgpackPackIntMap(entries);
}

export function packLxmPayload(
  timestamp: number,
  title: Uint8Array,
  content: Uint8Array,
  fields: LxmFields,
  stamp?: Uint8Array | null,
): Uint8Array {
  const items = [
    msgpackPackFloat64(timestamp),
    msgpackPackBin(title),
    msgpackPackBin(content),
    packLxmFields(fields),
  ];
  if (stamp !== undefined && stamp !== null) {
    items.push(msgpackPackBin(stamp));
  }
  return msgpackPackArray(items);
}

export interface UnpackedLxmPayload {
  readonly timestamp: number;
  readonly title: Uint8Array;
  readonly content: Uint8Array;
  readonly fields: LxmFields;
  readonly stamp: Uint8Array | null;
}

export function unpackLxmPayload(bytes: Uint8Array): UnpackedLxmPayload {
  const value = msgpackUnpack(bytes);
  if (value.type !== "array" || value.array.length < 4) {
    throw new Error("Invalid LXMF payload");
  }

  const [timestampValue, titleValue, contentValue, fieldsValue, stampValue] =
    value.array;
  if (
    timestampValue === undefined ||
    titleValue === undefined ||
    contentValue === undefined ||
    fieldsValue === undefined ||
    timestampValue.type !== "float" ||
    titleValue.type !== "bin" ||
    contentValue.type !== "bin" ||
    fieldsValue.type !== "map"
  ) {
    throw new Error("Invalid LXMF payload fields");
  }

  const fields: Record<number, Uint8Array> = {};
  for (const [key, entryValue] of fieldsValue.map) {
    if (entryValue.type === "bin") {
      fields[key] = Uint8Array.from(entryValue.bin);
    }
  }

  const stamp =
    stampValue === undefined || stampValue.type === "nil"
      ? null
      : stampValue.type === "bin"
        ? Uint8Array.from(stampValue.bin)
        : null;

  return {
    timestamp: timestampValue.float,
    title: Uint8Array.from(titleValue.bin),
    content: Uint8Array.from(contentValue.bin),
    fields,
    stamp,
  };
}

export function packPropagationRequest(
  wants: ReadonlyArray<Uint8Array> | null,
  haves: ReadonlyArray<Uint8Array> | null,
  transferLimitKb?: number | null,
): Uint8Array {
  const items = [
    wants === null
      ? msgpackPackNil()
      : msgpackPackArray(wants.map((entry) => msgpackPackBin(entry))),
    haves === null
      ? msgpackPackNil()
      : msgpackPackArray(haves.map((entry) => msgpackPackBin(entry))),
  ];
  if (transferLimitKb !== undefined && transferLimitKb !== null) {
    items.push(msgpackPackFloat64(transferLimitKb));
  }
  return msgpackPackArray(items);
}

export interface UnpackedPropagationRequest {
  readonly wants: ReadonlyArray<Uint8Array> | null;
  readonly haves: ReadonlyArray<Uint8Array> | null;
  readonly transferLimitKb: number | null;
}

export function unpackPropagationRequest(
  bytes: Uint8Array,
): [
  ReadonlyArray<Uint8Array> | null,
  ReadonlyArray<Uint8Array> | null,
  number | null,
] {
  const fields = unpackPropagationRequestFields(bytes);
  return [fields.wants, fields.haves, fields.transferLimitKb];
}

export function unpackPropagationRequestFields(
  bytes: Uint8Array,
): UnpackedPropagationRequest {
  const value = msgpackUnpack(bytes);
  if (value.type !== "array" || value.array.length < 2) {
    throw new Error("Invalid propagation request payload");
  }

  const [wantsValue, havesValue, limitValue] = value.array;
  const decodeList = (
    entry: MsgpackValue | undefined,
  ): ReadonlyArray<Uint8Array> | null => {
    if (entry === undefined || entry.type === "nil") {
      return null;
    }
    if (entry.type !== "array") {
      throw new Error("Invalid propagation request list");
    }
    return entry.array.map((item) => {
      if (item.type !== "bin") {
        throw new Error("Invalid propagation request list entry");
      }
      return Uint8Array.from(item.bin);
    });
  };

  const transferLimitKb =
    limitValue === undefined || limitValue.type === "nil"
      ? null
      : limitValue.type === "float"
        ? limitValue.float
        : null;

  return {
    wants: decodeList(wantsValue),
    haves: decodeList(havesValue),
    transferLimitKb,
  };
}

export function packPropagationEnvelope(
  timestamp: number,
  messages: ReadonlyArray<Uint8Array>,
): Uint8Array {
  return msgpackPackArray([
    msgpackPackFloat64(timestamp),
    msgpackPackArray(messages.map((message) => msgpackPackBin(message))),
  ]);
}

export interface UnpackedPropagationEnvelope {
  readonly messages: ReadonlyArray<Uint8Array>;
}

export function unpackPropagationEnvelope(
  bytes: Uint8Array,
): ReadonlyArray<Uint8Array> {
  return unpackPropagationEnvelopeFields(bytes).messages;
}

export function unpackPropagationEnvelopeFields(
  bytes: Uint8Array,
): UnpackedPropagationEnvelope {
  const value = msgpackUnpack(bytes);
  if (value.type !== "array" || value.array.length !== 2) {
    throw new Error("Invalid propagation envelope");
  }
  const messagesValue = value.array[1];
  if (messagesValue === undefined || messagesValue.type !== "array") {
    throw new Error("Invalid propagation envelope messages");
  }
  return {
    messages: messagesValue.array.map((item) => {
      if (item.type !== "bin") {
        throw new Error("Invalid propagation envelope message");
      }
      return Uint8Array.from(item.bin);
    }),
  };
}

export interface UnpackedBinList {
  readonly entries: ReadonlyArray<Uint8Array>;
}

export function unpackBinList(
  bytes: Uint8Array,
  label: string,
): ReadonlyArray<Uint8Array> {
  return unpackBinListFields(bytes, label).entries;
}

export function unpackBinListFields(
  bytes: Uint8Array,
  label: string,
): UnpackedBinList {
  const value = msgpackUnpack(bytes);
  if (value.type === "int") {
    throw new Error(`${label} returned an error code`);
  }
  if (value.type !== "array") {
    throw new Error(`Invalid ${label}`);
  }
  return {
    entries: value.array.map((item) => {
      if (item.type !== "bin") {
        throw new Error(`Invalid ${label} entry`);
      }
      return Uint8Array.from(item.bin);
    }),
  };
}

/**
 * LXM payload pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packLxmPayload` reads
 * beside the step).
 */
export type PackLxmPayloadState = Record<string, never>;

export type PackLxmPayloadEvent =
  | Event
  | {
      readonly kind: "lxmf-codec/pack-payload-gate";
      readonly timestamp: number;
      readonly title: Uint8Array;
      readonly content: Uint8Array;
      readonly fields: LxmFields;
      readonly stamp?: Uint8Array | null;
    };

export type PackLxmPayloadAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface PackLxmPayloadStepResult {
  readonly state: PackLxmPayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackLxmPayloadAction[];
}

export function initialPackLxmPayloadState(): PackLxmPayloadState {
  return {};
}

export function stepPackLxmPayloadWithActions(
  state: PackLxmPayloadState,
  event: PackLxmPayloadEvent,
): PackLxmPayloadStepResult {
  if (event.kind === "lxmf-codec/pack-payload-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: packLxmPayload(
            event.timestamp,
            event.title,
            event.content,
            event.fields,
            event.stamp,
          ),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackLxmPayload(
  actions: ReadonlyArray<PackLxmPayloadAction>,
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract LXM payload pack bytes from step actions; null when no `use-raw`. */
export function packLxmPayloadRawFromActions(
  actions: ReadonlyArray<PackLxmPayloadAction>,
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * LXM payload unpack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `unpackLxmPayload` reads
 * beside the step). Malformed frames become `reject` (helpers may throw).
 */
export type UnpackLxmPayloadState = Record<string, never>;

export type UnpackLxmPayloadEvent =
  | Event
  | {
      readonly kind: "lxmf-codec/unpack-payload-gate";
      readonly data: Uint8Array;
    };

export type UnpackLxmPayloadAction =
  | { readonly kind: "use-fields"; readonly fields: UnpackedLxmPayload }
  | { readonly kind: "reject" };

export interface UnpackLxmPayloadStepResult {
  readonly state: UnpackLxmPayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackLxmPayloadAction[];
}

export function initialUnpackLxmPayloadState(): UnpackLxmPayloadState {
  return {};
}

export function stepUnpackLxmPayloadWithActions(
  state: UnpackLxmPayloadState,
  event: UnpackLxmPayloadEvent,
): UnpackLxmPayloadStepResult {
  if (event.kind === "lxmf-codec/unpack-payload-gate") {
    try {
      const fields = unpackLxmPayload(event.data);
      return {
        state,
        intents: [],
        actions: [{ kind: "use-fields", fields }],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseUnpackLxmPayload(
  actions: ReadonlyArray<UnpackLxmPayloadAction>,
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectUnpackLxmPayload(
  actions: ReadonlyArray<UnpackLxmPayloadAction>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract unpacked LXM payload from step actions; null when no `use-fields`. */
export function lxmPayloadFieldsFromActions(
  actions: ReadonlyArray<UnpackLxmPayloadAction>,
): UnpackedLxmPayload | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

/**
 * Propagation-request pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packPropagationRequest`
 * reads beside the step).
 */
export type PackPropagationRequestState = Record<string, never>;

export type PackPropagationRequestEvent =
  | Event
  | {
      readonly kind: "lxmf-codec/pack-propagation-request-gate";
      readonly wants: ReadonlyArray<Uint8Array> | null;
      readonly haves: ReadonlyArray<Uint8Array> | null;
      readonly transferLimitKb?: number | null;
    };

export type PackPropagationRequestAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface PackPropagationRequestStepResult {
  readonly state: PackPropagationRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackPropagationRequestAction[];
}

export function initialPackPropagationRequestState(): PackPropagationRequestState {
  return {};
}

export function stepPackPropagationRequestWithActions(
  state: PackPropagationRequestState,
  event: PackPropagationRequestEvent,
): PackPropagationRequestStepResult {
  if (event.kind === "lxmf-codec/pack-propagation-request-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: packPropagationRequest(
            event.wants,
            event.haves,
            event.transferLimitKb,
          ),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackPropagationRequest(
  actions: ReadonlyArray<PackPropagationRequestAction>,
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract propagation-request pack bytes from step actions; null when no `use-raw`. */
export function packPropagationRequestRawFromActions(
  actions: ReadonlyArray<PackPropagationRequestAction>,
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Propagation-request unpack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `unpackPropagationRequest`
 * reads beside the step). Malformed frames become `reject` (helpers may throw).
 */
export type UnpackPropagationRequestState = Record<string, never>;

export type UnpackPropagationRequestEvent =
  | Event
  | {
      readonly kind: "lxmf-codec/unpack-propagation-request-gate";
      readonly data: Uint8Array;
    };

export type UnpackPropagationRequestAction =
  | { readonly kind: "use-fields"; readonly fields: UnpackedPropagationRequest }
  | { readonly kind: "reject" };

export interface UnpackPropagationRequestStepResult {
  readonly state: UnpackPropagationRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackPropagationRequestAction[];
}

export function initialUnpackPropagationRequestState(): UnpackPropagationRequestState {
  return {};
}

export function stepUnpackPropagationRequestWithActions(
  state: UnpackPropagationRequestState,
  event: UnpackPropagationRequestEvent,
): UnpackPropagationRequestStepResult {
  if (event.kind === "lxmf-codec/unpack-propagation-request-gate") {
    try {
      const fields = unpackPropagationRequestFields(event.data);
      return {
        state,
        intents: [],
        actions: [{ kind: "use-fields", fields }],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseUnpackPropagationRequest(
  actions: ReadonlyArray<UnpackPropagationRequestAction>,
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectUnpackPropagationRequest(
  actions: ReadonlyArray<UnpackPropagationRequestAction>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract unpacked propagation-request fields from step actions; null when no `use-fields`. */
export function propagationRequestFieldsFromActions(
  actions: ReadonlyArray<UnpackPropagationRequestAction>,
): UnpackedPropagationRequest | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

/**
 * Propagation-envelope pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packPropagationEnvelope`
 * reads beside the step).
 */
export type PackPropagationEnvelopeState = Record<string, never>;

export type PackPropagationEnvelopeEvent =
  | Event
  | {
      readonly kind: "lxmf-codec/pack-propagation-envelope-gate";
      readonly timestamp: number;
      readonly messages: ReadonlyArray<Uint8Array>;
    };

export type PackPropagationEnvelopeAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface PackPropagationEnvelopeStepResult {
  readonly state: PackPropagationEnvelopeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackPropagationEnvelopeAction[];
}

export function initialPackPropagationEnvelopeState(): PackPropagationEnvelopeState {
  return {};
}

export function stepPackPropagationEnvelopeWithActions(
  state: PackPropagationEnvelopeState,
  event: PackPropagationEnvelopeEvent,
): PackPropagationEnvelopeStepResult {
  if (event.kind === "lxmf-codec/pack-propagation-envelope-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: packPropagationEnvelope(event.timestamp, event.messages),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackPropagationEnvelope(
  actions: ReadonlyArray<PackPropagationEnvelopeAction>,
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract propagation-envelope pack bytes from step actions; null when no `use-raw`. */
export function packPropagationEnvelopeRawFromActions(
  actions: ReadonlyArray<PackPropagationEnvelopeAction>,
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Propagation-envelope unpack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `unpackPropagationEnvelope`
 * reads beside the step). Malformed frames become `reject` (helpers may throw).
 */
export type UnpackPropagationEnvelopeState = Record<string, never>;

export type UnpackPropagationEnvelopeEvent =
  | Event
  | {
      readonly kind: "lxmf-codec/unpack-propagation-envelope-gate";
      readonly data: Uint8Array;
    };

export type UnpackPropagationEnvelopeAction =
  | {
      readonly kind: "use-fields";
      readonly fields: UnpackedPropagationEnvelope;
    }
  | { readonly kind: "reject" };

export interface UnpackPropagationEnvelopeStepResult {
  readonly state: UnpackPropagationEnvelopeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackPropagationEnvelopeAction[];
}

export function initialUnpackPropagationEnvelopeState(): UnpackPropagationEnvelopeState {
  return {};
}

export function stepUnpackPropagationEnvelopeWithActions(
  state: UnpackPropagationEnvelopeState,
  event: UnpackPropagationEnvelopeEvent,
): UnpackPropagationEnvelopeStepResult {
  if (event.kind === "lxmf-codec/unpack-propagation-envelope-gate") {
    try {
      const fields = unpackPropagationEnvelopeFields(event.data);
      return {
        state,
        intents: [],
        actions: [{ kind: "use-fields", fields }],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseUnpackPropagationEnvelope(
  actions: ReadonlyArray<UnpackPropagationEnvelopeAction>,
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectUnpackPropagationEnvelope(
  actions: ReadonlyArray<UnpackPropagationEnvelopeAction>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract unpacked propagation-envelope fields from step actions; null when no `use-fields`. */
export function propagationEnvelopeFieldsFromActions(
  actions: ReadonlyArray<UnpackPropagationEnvelopeAction>,
): UnpackedPropagationEnvelope | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

/**
 * Bin-list unpack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `unpackBinList` reads
 * beside the step). Malformed frames become `reject` (helpers may throw).
 */
export type UnpackBinListState = Record<string, never>;

export type UnpackBinListEvent =
  | Event
  | {
      readonly kind: "lxmf-codec/unpack-bin-list-gate";
      readonly data: Uint8Array;
      readonly label: string;
    };

export type UnpackBinListAction =
  | { readonly kind: "use-fields"; readonly fields: UnpackedBinList }
  | { readonly kind: "reject" };

export interface UnpackBinListStepResult {
  readonly state: UnpackBinListState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackBinListAction[];
}

export function initialUnpackBinListState(): UnpackBinListState {
  return {};
}

export function stepUnpackBinListWithActions(
  state: UnpackBinListState,
  event: UnpackBinListEvent,
): UnpackBinListStepResult {
  if (event.kind === "lxmf-codec/unpack-bin-list-gate") {
    try {
      const fields = unpackBinListFields(event.data, event.label);
      return {
        state,
        intents: [],
        actions: [{ kind: "use-fields", fields }],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseUnpackBinList(
  actions: ReadonlyArray<UnpackBinListAction>,
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectUnpackBinList(
  actions: ReadonlyArray<UnpackBinListAction>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract unpacked bin-list fields from step actions; null when no `use-fields`. */
export function binListFieldsFromActions(
  actions: ReadonlyArray<UnpackBinListAction>,
): UnpackedBinList | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}
