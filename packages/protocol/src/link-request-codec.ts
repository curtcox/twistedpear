/**
 * Pure RNS link request/response msgpack payloads.
 * Pack / unpack conclusions leave via machine actions (no ad-hoc
 * `msgpackPackLinkRequest` / `msgpackPackLinkResponse` /
 * `msgpackUnpackLinkRequest` / `msgpackUnpackLinkResponse` reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";
import {
  msgpackPackArray,
  msgpackPackBin,
  msgpackPackFloat64,
  msgpackPackNil,
  msgpackPackUInt,
  msgpackUnpack,
  msgpackUnpackAt,
  type MsgpackValue,
} from "./msgpack-core.js";

export interface LinkRequestFields {
  readonly requestedAt: number;
  readonly pathHash: Uint8Array;
  readonly data: Uint8Array | null;
}

export interface LinkResponseFields {
  readonly requestId: Uint8Array;
  readonly response: Uint8Array | null;
}

export function msgpackPackLinkRequest(
  requestedAt: number,
  pathHash: Uint8Array,
  data: Uint8Array | null,
): Uint8Array {
  // `data` is already a msgpack-encoded value (e.g. LXMF `[None, None]` or
  // `msgpackPackBin(raw)` for opaque payloads). Embed it directly so Python
  // umsgpack.unpackb yields a native object, not a bytes blob.
  return msgpackPackArray([
    msgpackPackFloat64(requestedAt),
    msgpackPackBin(pathHash),
    data === null ? msgpackPackNil() : data,
  ]);
}

export function msgpackPackLinkResponse(
  requestId: Uint8Array,
  response: Uint8Array | null,
): Uint8Array {
  // `response` is already a msgpack-encoded value (e.g. a packed ID list). Embed it
  // directly so Python umsgpack.unpackb yields a native object, not a bytes blob.
  return msgpackPackArray([
    msgpackPackBin(requestId),
    response === null ? msgpackPackNil() : response,
  ]);
}

export function msgpackUnpackLinkRequest(bytes: Uint8Array): LinkRequestFields {
  const [value, endOffset] = msgpackUnpackAt(bytes, 0);
  if (
    value.type !== "array" ||
    value.array.length !== 3 ||
    endOffset !== bytes.length
  ) {
    throw new Error("Invalid request payload");
  }

  const [requestedAtValue, pathHashValue, dataValue] = value.array;
  if (
    requestedAtValue === undefined ||
    pathHashValue === undefined ||
    dataValue === undefined ||
    requestedAtValue.type !== "float" ||
    pathHashValue.type !== "bin"
  ) {
    throw new Error("Invalid request payload fields");
  }

  return {
    requestedAt: requestedAtValue.float,
    pathHash: Uint8Array.from(pathHashValue.bin),
    data: unpackOptionalMsgpackBytes(dataValue),
  };
}

/** RNS embeds `data` as nil, a binary frame, or a nested msgpack value. */
function unpackOptionalMsgpackBytes(value: MsgpackValue): Uint8Array | null {
  if (value.type === "nil") return null;
  if (value.type === "bin") return Uint8Array.from(value.bin);
  return msgpackRepackValue(value);
}

/** Re-encode a decoded msgpack value so nested Python payloads become byte frames. */
function msgpackRepackValue(value: MsgpackValue): Uint8Array {
  switch (value.type) {
    case "nil":
      return msgpackPackNil();
    case "bin":
      return msgpackPackBin(value.bin);
    case "float":
      return msgpackPackFloat64(value.float);
    case "int":
      return msgpackPackUInt(value.int);
    case "array":
      return msgpackPackArray(
        value.array.map((entry) => msgpackRepackValue(entry)),
      );
    default:
      throw new Error("Unsupported link-request data msgpack type");
  }
}

export function msgpackUnpackLinkResponse(
  bytes: Uint8Array,
): LinkResponseFields {
  const value = msgpackUnpack(bytes);
  if (value.type !== "array" || value.array.length !== 2) {
    throw new Error("Invalid response payload");
  }

  const [requestIdValue, responseValue] = value.array;
  if (
    requestIdValue === undefined ||
    responseValue === undefined ||
    requestIdValue.type !== "bin"
  ) {
    throw new Error("Invalid response payload fields");
  }

  let response: Uint8Array | null;
  if (responseValue.type === "nil") {
    response = null;
  } else if (responseValue.type === "bin") {
    // Older TS peers framed the payload as bin; keep accepting that form.
    response = Uint8Array.from(responseValue.bin);
  } else {
    response = msgpackRepackValue(responseValue);
  }

  return {
    requestId: Uint8Array.from(requestIdValue.bin),
    response,
  };
}

/** Tuple form matching legacy reticulum-ts helpers. */
export function msgpackUnpackLinkRequestTuple(
  bytes: Uint8Array,
): [number, Uint8Array, Uint8Array | null] {
  const unpacked = msgpackUnpackLinkRequest(bytes);
  return [unpacked.requestedAt, unpacked.pathHash, unpacked.data];
}

export function msgpackUnpackLinkResponseTuple(
  bytes: Uint8Array,
): [Uint8Array, Uint8Array | null] {
  const unpacked = msgpackUnpackLinkResponse(bytes);
  return [unpacked.requestId, unpacked.response];
}

/**
 * Link-request pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `msgpackPackLinkRequest`
 * reads beside the step).
 */
export type PackLinkRequestState = Record<string, never>;

export type PackLinkRequestEvent =
  | Event
  | {
      readonly kind: "link-request-codec/pack-gate";
      readonly requestedAt: number;
      readonly pathHash: Uint8Array;
      readonly data: Uint8Array | null;
    };

export type PackLinkRequestAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface PackLinkRequestStepResult {
  readonly state: PackLinkRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackLinkRequestAction[];
}

export function initialPackLinkRequestState(): PackLinkRequestState {
  return {};
}

export function stepPackLinkRequestWithActions(
  state: PackLinkRequestState,
  event: PackLinkRequestEvent,
): PackLinkRequestStepResult {
  if (event.kind === "link-request-codec/pack-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: msgpackPackLinkRequest(
            event.requestedAt,
            event.pathHash,
            event.data,
          ),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackLinkRequest(
  actions: ReadonlyArray<PackLinkRequestAction>,
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract link-request pack bytes from step actions; null when no `use-raw`. */
export function packLinkRequestRawFromActions(
  actions: ReadonlyArray<PackLinkRequestAction>,
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Link-response pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `msgpackPackLinkResponse`
 * reads beside the step).
 */
export type PackLinkResponseState = Record<string, never>;

export type PackLinkResponseEvent =
  | Event
  | {
      readonly kind: "link-response-codec/pack-gate";
      readonly requestId: Uint8Array;
      readonly response: Uint8Array | null;
    };

export type PackLinkResponseAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface PackLinkResponseStepResult {
  readonly state: PackLinkResponseState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackLinkResponseAction[];
}

export function initialPackLinkResponseState(): PackLinkResponseState {
  return {};
}

export function stepPackLinkResponseWithActions(
  state: PackLinkResponseState,
  event: PackLinkResponseEvent,
): PackLinkResponseStepResult {
  if (event.kind === "link-response-codec/pack-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: msgpackPackLinkResponse(event.requestId, event.response),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackLinkResponse(
  actions: ReadonlyArray<PackLinkResponseAction>,
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract link-response pack bytes from step actions; null when no `use-raw`. */
export function packLinkResponseRawFromActions(
  actions: ReadonlyArray<PackLinkResponseAction>,
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Link-request unpack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `msgpackUnpackLinkRequest`
 * reads beside the step). Malformed frames become `reject` (helpers may throw).
 */
export type UnpackLinkRequestState = Record<string, never>;

export type UnpackLinkRequestEvent =
  | Event
  | {
      readonly kind: "link-request-codec/unpack-gate";
      readonly data: Uint8Array;
    };

export type UnpackLinkRequestAction =
  | { readonly kind: "use-fields"; readonly fields: LinkRequestFields }
  | { readonly kind: "reject" };

export interface UnpackLinkRequestStepResult {
  readonly state: UnpackLinkRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackLinkRequestAction[];
}

export function initialUnpackLinkRequestState(): UnpackLinkRequestState {
  return {};
}

export function stepUnpackLinkRequestWithActions(
  state: UnpackLinkRequestState,
  event: UnpackLinkRequestEvent,
): UnpackLinkRequestStepResult {
  if (event.kind === "link-request-codec/unpack-gate") {
    try {
      const fields = msgpackUnpackLinkRequest(event.data);
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

export function shouldUseUnpackLinkRequest(
  actions: ReadonlyArray<UnpackLinkRequestAction>,
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectUnpackLinkRequest(
  actions: ReadonlyArray<UnpackLinkRequestAction>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract unpacked link-request fields from step actions; null when no `use-fields`. */
export function linkRequestFieldsFromActions(
  actions: ReadonlyArray<UnpackLinkRequestAction>,
): LinkRequestFields | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

/**
 * Link-response unpack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `msgpackUnpackLinkResponse`
 * reads beside the step). Malformed frames become `reject` (helpers may throw).
 */
export type UnpackLinkResponseState = Record<string, never>;

export type UnpackLinkResponseEvent =
  | Event
  | {
      readonly kind: "link-response-codec/unpack-gate";
      readonly data: Uint8Array;
    };

export type UnpackLinkResponseAction =
  | { readonly kind: "use-fields"; readonly fields: LinkResponseFields }
  | { readonly kind: "reject" };

export interface UnpackLinkResponseStepResult {
  readonly state: UnpackLinkResponseState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackLinkResponseAction[];
}

export function initialUnpackLinkResponseState(): UnpackLinkResponseState {
  return {};
}

export function stepUnpackLinkResponseWithActions(
  state: UnpackLinkResponseState,
  event: UnpackLinkResponseEvent,
): UnpackLinkResponseStepResult {
  if (event.kind === "link-response-codec/unpack-gate") {
    try {
      const fields = msgpackUnpackLinkResponse(event.data);
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

export function shouldUseUnpackLinkResponse(
  actions: ReadonlyArray<UnpackLinkResponseAction>,
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectUnpackLinkResponse(
  actions: ReadonlyArray<UnpackLinkResponseAction>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract unpacked link-response fields from step actions; null when no `use-fields`. */
export function linkResponseFieldsFromActions(
  actions: ReadonlyArray<UnpackLinkResponseAction>,
): LinkResponseFields | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}
