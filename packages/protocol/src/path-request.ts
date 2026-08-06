/**
 * Pure RNS path-request payload framing.
 * Destination hashing stays at the crypto adapter edge.
 * Build / parse / tag-key conclusions leave via machine actions
 * (no ad-hoc `buildPathRequestData` / `parsePathRequestData` /
 * `pathRequestTagKey` reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";
import { bytesToHexLower } from "./destination-name.js";
import { TRANSPORT_ID_BYTES } from "./transport-framing.js";

export const PATH_REQUEST_HASH_BYTES = TRANSPORT_ID_BYTES;
export const TRANSPORT_PATH_REQUEST_APP = "rnstransport";
export const TRANSPORT_PATH_REQUEST_ASPECTS = ["path", "request"] as const;

export interface PathRequestFields {
  readonly destinationHash: Uint8Array;
  readonly requestorTransportId: Uint8Array | null;
  readonly tag: Uint8Array | null;
}

function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export function buildPathRequestData(
  destinationHash: Uint8Array,
  requestorTransportId: Uint8Array | null,
  tag: Uint8Array,
): Uint8Array {
  if (destinationHash.length !== PATH_REQUEST_HASH_BYTES) {
    throw new Error(
      `destination hash must be ${PATH_REQUEST_HASH_BYTES} bytes`,
    );
  }
  if (requestorTransportId === null) {
    return concatBytes(destinationHash, tag);
  }
  if (requestorTransportId.length !== PATH_REQUEST_HASH_BYTES) {
    throw new Error(
      `requestor transport id must be ${PATH_REQUEST_HASH_BYTES} bytes`,
    );
  }
  return concatBytes(destinationHash, requestorTransportId, tag);
}

export function parsePathRequestData(
  data: Uint8Array,
): PathRequestFields | null {
  if (data.length < PATH_REQUEST_HASH_BYTES) {
    return null;
  }

  const destinationHash = data.subarray(0, PATH_REQUEST_HASH_BYTES);
  let requestorTransportId: Uint8Array | null = null;
  let tag: Uint8Array | null = null;

  if (data.length > PATH_REQUEST_HASH_BYTES * 2) {
    requestorTransportId = data.subarray(
      PATH_REQUEST_HASH_BYTES,
      PATH_REQUEST_HASH_BYTES * 2,
    );
    tag = data.subarray(PATH_REQUEST_HASH_BYTES * 2);
  } else if (data.length > PATH_REQUEST_HASH_BYTES) {
    tag = data.subarray(PATH_REQUEST_HASH_BYTES);
  }

  if (tag !== null && tag.length > PATH_REQUEST_HASH_BYTES) {
    tag = tag.subarray(0, PATH_REQUEST_HASH_BYTES);
  }

  return { destinationHash, requestorTransportId, tag };
}

export function pathRequestTagKey(
  destinationHash: Uint8Array,
  tag: Uint8Array,
): string {
  return bytesToHexLower(destinationHash) + bytesToHexLower(tag);
}

/**
 * Path-request build framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `buildPathRequestData`
 * reads beside the step).
 */
export type BuildPathRequestDataState = Record<string, never>;

export type BuildPathRequestDataEvent =
  | Event
  | {
      readonly kind: "path-request/build-data-gate";
      readonly destinationHash: Uint8Array;
      readonly requestorTransportId: Uint8Array | null;
      readonly tag: Uint8Array;
    };

export type BuildPathRequestDataAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface BuildPathRequestDataStepResult {
  readonly state: BuildPathRequestDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly BuildPathRequestDataAction[];
}

export function initialBuildPathRequestDataState(): BuildPathRequestDataState {
  return {};
}

export function stepBuildPathRequestDataWithActions(
  state: BuildPathRequestDataState,
  event: BuildPathRequestDataEvent,
): BuildPathRequestDataStepResult {
  if (event.kind === "path-request/build-data-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: buildPathRequestData(
            event.destinationHash,
            event.requestorTransportId,
            event.tag,
          ),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseBuildPathRequestData(
  actions: ReadonlyArray<BuildPathRequestDataAction>,
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract path-request build bytes from step actions; null when no `use-raw`. */
export function buildPathRequestDataRawFromActions(
  actions: ReadonlyArray<BuildPathRequestDataAction>,
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Path-request parse framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `parsePathRequestData`
 * reads beside the step).
 */
export type ParsePathRequestDataState = Record<string, never>;

export type ParsePathRequestDataEvent =
  | Event
  | {
      readonly kind: "path-request/parse-data-gate";
      readonly data: Uint8Array;
    };

export type ParsePathRequestDataAction =
  | { readonly kind: "use-fields"; readonly fields: PathRequestFields }
  | { readonly kind: "reject" };

export interface ParsePathRequestDataStepResult {
  readonly state: ParsePathRequestDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ParsePathRequestDataAction[];
}

export function initialParsePathRequestDataState(): ParsePathRequestDataState {
  return {};
}

export function stepParsePathRequestDataWithActions(
  state: ParsePathRequestDataState,
  event: ParsePathRequestDataEvent,
): ParsePathRequestDataStepResult {
  if (event.kind === "path-request/parse-data-gate") {
    const fields = parsePathRequestData(event.data);
    if (fields === null) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "use-fields", fields }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseParsePathRequestData(
  actions: ReadonlyArray<ParsePathRequestDataAction>,
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectParsePathRequestData(
  actions: ReadonlyArray<ParsePathRequestDataAction>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract parsed path-request fields from step actions; null when no `use-fields`. */
export function pathRequestFieldsFromActions(
  actions: ReadonlyArray<ParsePathRequestDataAction>,
): PathRequestFields | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

/**
 * Path-request tag-key framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `pathRequestTagKey`
 * reads beside the step).
 */
export type PathRequestTagKeyState = Record<string, never>;

export type PathRequestTagKeyEvent =
  | Event
  | {
      readonly kind: "path-request/tag-key-gate";
      readonly destinationHash: Uint8Array;
      readonly tag: Uint8Array;
    };

export type PathRequestTagKeyAction = {
  readonly kind: "use-key";
  readonly key: string;
};

export interface PathRequestTagKeyStepResult {
  readonly state: PathRequestTagKeyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathRequestTagKeyAction[];
}

export function initialPathRequestTagKeyState(): PathRequestTagKeyState {
  return {};
}

export function stepPathRequestTagKeyWithActions(
  state: PathRequestTagKeyState,
  event: PathRequestTagKeyEvent,
): PathRequestTagKeyStepResult {
  if (event.kind === "path-request/tag-key-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-key",
          key: pathRequestTagKey(event.destinationHash, event.tag),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePathRequestTagKey(
  actions: ReadonlyArray<PathRequestTagKeyAction>,
): boolean {
  return actions.some((action) => action.kind === "use-key");
}

/** Extract path-request tag key from step actions; null when no `use-key`. */
export function pathRequestTagKeyFromActions(
  actions: ReadonlyArray<PathRequestTagKeyAction>,
): string | null {
  const action = actions.find((entry) => entry.kind === "use-key");
  return action?.kind === "use-key" ? action.key : null;
}
