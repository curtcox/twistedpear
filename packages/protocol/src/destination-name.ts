/**
 * Pure RNS destination name expansion and hash-input material.
 * SHA truncation stays at the crypto adapter edge.
 * Expansion / material / aspect-filter / name-part validation conclusions leave
 * via machine actions (no ad-hoc `expandDestinationName` /
 * `destinationNameHashMaterial` / `destinationHashMaterial` /
 * `parseAspectFilter` / `validateDestinationNamePart` reads beside the step).
 * Identity-hash resolution conclusions leave via machine actions (no ad-hoc
 * `planDestinationIdentityHash` / `plan === "..."` reads beside the step).
 * Identity-hash plan nested via
 * {@link stepDestinationIdentityHashPlanWithActions}
 * (`missing`|`use-object`|`reject-length`|`use-bytes`).
 */
import type { Event, Intent } from "@twistedpear/effects";
import { NAME_HASH_BYTES, TRUNCATED_HASH_BYTES } from "./hash-truncate.js";
import { utf8Encode } from "./utf8.js";
import {
  firstAction,
  firstActionOfKind,
  hasActionOfKind,
} from "./action-kind.js";

/** NAME_HASH_LENGTH (80 bits) / 8 */
export const DESTINATION_NAME_HASH_BYTES = NAME_HASH_BYTES;
/** TRUNCATED_HASH_LENGTH (128 bits) / 8 */
export const DESTINATION_IDENTITY_HASH_BYTES = TRUNCATED_HASH_BYTES;

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

export function bytesToHexLower(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, "0");
  }
  return out;
}

export function hexToBytesLower(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Hex strings must contain an even number of characters");
  }
  const output = new Uint8Array(hex.length / 2);
  for (let index = 0; index < output.length; index += 1) {
    output[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return output;
}

export function validateDestinationNamePart(
  value: string,
  label: string,
): void {
  if (value.length === 0) {
    throw new Error(`Destination ${label} cannot be empty`);
  }
  if (value.includes(".")) {
    throw new Error(`Dots cannot be used in destination ${label}s`);
  }
}

/**
 * Expand an RNS destination name: `app.aspect...[.identityHex]`.
 */
export function expandDestinationName(
  identityHash: Uint8Array | null,
  appName: string,
  aspects: ReadonlyArray<string> = [],
): string {
  validateDestinationNamePart(appName, "app name");
  for (const aspect of aspects) {
    validateDestinationNamePart(aspect, "aspect");
  }

  let name = appName;
  for (const aspect of aspects) {
    name += `.${aspect}`;
  }

  if (identityHash !== null) {
    if (identityHash.length !== DESTINATION_IDENTITY_HASH_BYTES) {
      throw new Error(
        `Identity hash must be ${DESTINATION_IDENTITY_HASH_BYTES} bytes`,
      );
    }
    name += `.${bytesToHexLower(identityHash)}`;
  }

  return name;
}

/** UTF-8 bytes hashed (then truncated) for the destination name hash. */
export function destinationNameHashMaterial(
  appName: string,
  aspects: ReadonlyArray<string> = [],
): Uint8Array {
  return utf8Encode(expandDestinationName(null, appName, aspects));
}

/** Bytes hashed (then truncated) for the full destination hash. */
export function destinationHashMaterial(
  nameHash: Uint8Array,
  identityHash: Uint8Array | null,
): Uint8Array {
  if (identityHash === null) {
    return nameHash;
  }
  return concatBytes(nameHash, identityHash);
}

export interface ParsedAspectFilter {
  readonly appName: string;
  readonly aspects: readonly string[];
}

/**
 * Parse an announce-handler aspect filter (`app.aspect...`).
 * Empty / all-empty parts → null (adapter skips the handler).
 */
export function parseAspectFilter(filter: string): ParsedAspectFilter | null {
  const parts = filter.split(".").filter((part) => part.length > 0);
  const appName = parts[0];
  if (appName === undefined) {
    return null;
  }
  return { appName, aspects: parts.slice(1) };
}

export type DestinationIdentityHashPlan =
  "missing" | "use-object" | "reject-length" | "use-bytes";

/**
 * Destination construction identity-hash resolution.
 * Identity instanceof / .hash stay at the adapter.
 */
export function planDestinationIdentityHash(input: {
  readonly kind: "missing" | "object" | "bytes";
  readonly bytesLength?: number;
  readonly expectedLength?: number;
}): DestinationIdentityHashPlan {
  if (input.kind === "missing") {
    return "missing";
  }
  if (input.kind === "object") {
    return "use-object";
  }
  const expected = input.expectedLength ?? DESTINATION_IDENTITY_HASH_BYTES;
  if ((input.bytesLength ?? 0) !== expected) {
    return "reject-length";
  }
  return "use-bytes";
}

/**
 * Destination identity-hash plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planDestinationIdentityHash`
 * / `plan === "..."` reads beside the step). Nested under
 * {@link stepDestinationIdentityHashWithActions}.
 */
export type DestinationIdentityHashPlanState = Record<string, never>;

export type DestinationIdentityHashPlanEvent =
  | Event
  | {
      readonly kind: "destination/identity-hash-plan-gate";
      readonly identityKind: "missing" | "object" | "bytes";
      readonly bytesLength?: number;
      readonly expectedLength?: number;
    };

export type DestinationIdentityHashPlanAction =
  | { readonly kind: "missing" }
  | { readonly kind: "use-object" }
  | { readonly kind: "reject-length" }
  | { readonly kind: "use-bytes" };

export interface DestinationIdentityHashPlanStepResult {
  readonly state: DestinationIdentityHashPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationIdentityHashPlanAction[];
}

export function initialDestinationIdentityHashPlanState(): DestinationIdentityHashPlanState {
  return {};
}

export function stepDestinationIdentityHashPlanWithActions(
  state: DestinationIdentityHashPlanState,
  event: DestinationIdentityHashPlanEvent,
): DestinationIdentityHashPlanStepResult {
  if (event.kind === "destination/identity-hash-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planDestinationIdentityHash({
            kind: event.identityKind,
            ...(event.bytesLength !== undefined
              ? { bytesLength: event.bytesLength }
              : {}),
            ...(event.expectedLength !== undefined
              ? { expectedLength: event.expectedLength }
              : {}),
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the identity-hash plan from actions; null when empty. */
export function destinationIdentityHashPlanFromActions(
  actions: ReadonlyArray<DestinationIdentityHashPlanAction>,
): DestinationIdentityHashPlan | null {
  const action = firstAction(actions);
  return action?.kind ?? null;
}

export function shouldMissDestinationIdentityHashPlan(
  actions: ReadonlyArray<DestinationIdentityHashPlanAction>,
): boolean {
  return hasActionOfKind(actions, "missing");
}

export function shouldUseObjectDestinationIdentityHashPlan(
  actions: ReadonlyArray<DestinationIdentityHashPlanAction>,
): boolean {
  return hasActionOfKind(actions, "use-object");
}

export function shouldUseBytesDestinationIdentityHashPlan(
  actions: ReadonlyArray<DestinationIdentityHashPlanAction>,
): boolean {
  return hasActionOfKind(actions, "use-bytes");
}

export function shouldRejectLengthDestinationIdentityHashPlan(
  actions: ReadonlyArray<DestinationIdentityHashPlanAction>,
): boolean {
  return hasActionOfKind(actions, "reject-length");
}

/**
 * Destination identity-hash resolution is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planDestinationIdentityHash`
 * / `plan === "..."` reads beside the step).
 * Plan nested via {@link stepDestinationIdentityHashPlanWithActions}
 * (`missing`|`use-object`|`reject-length`|`use-bytes`).
 */
export type DestinationIdentityHashState = Record<string, never>;

export type DestinationIdentityHashEvent =
  | Event
  | {
      readonly kind: "destination/identity-hash-gate";
      readonly identityKind: "missing" | "object" | "bytes";
      readonly bytesLength?: number;
      readonly expectedLength?: number;
    };

export type DestinationIdentityHashAction =
  | { readonly kind: "missing" }
  | { readonly kind: "use-object" }
  | { readonly kind: "reject-length" }
  | { readonly kind: "use-bytes" };

export interface DestinationIdentityHashStepResult {
  readonly state: DestinationIdentityHashState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationIdentityHashAction[];
}

export function initialDestinationIdentityHashState(): DestinationIdentityHashState {
  return {};
}

export function stepDestinationIdentityHashWithActions(
  state: DestinationIdentityHashState,
  event: DestinationIdentityHashEvent,
): DestinationIdentityHashStepResult {
  if (event.kind === "destination/identity-hash-gate") {
    const planActions = stepDestinationIdentityHashPlanWithActions(
      initialDestinationIdentityHashPlanState(),
      {
        kind: "destination/identity-hash-plan-gate",
        identityKind: event.identityKind,
        ...(event.bytesLength !== undefined
          ? { bytesLength: event.bytesLength }
          : {}),
        ...(event.expectedLength !== undefined
          ? { expectedLength: event.expectedLength }
          : {}),
      },
    ).actions;
    const plan = destinationIdentityHashPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

export function destinationIdentityHashFromActions(
  actions: ReadonlyArray<DestinationIdentityHashAction>,
): DestinationIdentityHashPlan | null {
  return actions[0]?.kind ?? null;
}

export function shouldUseObjectDestinationIdentityHash(
  actions: ReadonlyArray<DestinationIdentityHashAction>,
): boolean {
  return hasActionOfKind(actions, "use-object");
}

export function shouldUseBytesDestinationIdentityHash(
  actions: ReadonlyArray<DestinationIdentityHashAction>,
): boolean {
  return hasActionOfKind(actions, "use-bytes");
}

export function shouldRejectLengthDestinationIdentityHash(
  actions: ReadonlyArray<DestinationIdentityHashAction>,
): boolean {
  return hasActionOfKind(actions, "reject-length");
}

export function shouldMissDestinationIdentityHash(
  actions: ReadonlyArray<DestinationIdentityHashAction>,
): boolean {
  return hasActionOfKind(actions, "missing");
}

/**
 * Destination name-part validation is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `validateDestinationNamePart` reads beside the step). Empty / dotted parts
 * become `reject`.
 */
export type ValidateDestinationNamePartState = Record<string, never>;

export type ValidateDestinationNamePartEvent =
  | Event
  | {
      readonly kind: "destination/name-part-gate";
      readonly value: string;
      readonly label: string;
    };

export type ValidateDestinationNamePartAction =
  { readonly kind: "proceed" } | { readonly kind: "reject" };

export interface ValidateDestinationNamePartStepResult {
  readonly state: ValidateDestinationNamePartState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ValidateDestinationNamePartAction[];
}

export function initialValidateDestinationNamePartState(): ValidateDestinationNamePartState {
  return {};
}

export function stepValidateDestinationNamePartWithActions(
  state: ValidateDestinationNamePartState,
  event: ValidateDestinationNamePartEvent,
): ValidateDestinationNamePartStepResult {
  if (event.kind === "destination/name-part-gate") {
    try {
      validateDestinationNamePart(event.value, event.label);
      return { state, intents: [], actions: [{ kind: "proceed" }] };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldProceedValidateDestinationNamePart(
  actions: ReadonlyArray<ValidateDestinationNamePartAction>,
): boolean {
  return hasActionOfKind(actions, "proceed");
}

export function shouldRejectValidateDestinationNamePart(
  actions: ReadonlyArray<ValidateDestinationNamePartAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

export interface ExpandDestinationNameFields {
  readonly name: string;
}

/**
 * Destination name expansion is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `expandDestinationName`
 * reads beside the step). Invalid parts / identity-hash length become `reject`.
 */
export type ExpandDestinationNameState = Record<string, never>;

export type ExpandDestinationNameEvent =
  | Event
  | {
      readonly kind: "destination/expand-name-gate";
      readonly identityHash: Uint8Array | null;
      readonly appName: string;
      readonly aspects?: ReadonlyArray<string>;
    };

export type ExpandDestinationNameAction =
  | {
      readonly kind: "use-fields";
      readonly fields: ExpandDestinationNameFields;
    }
  | { readonly kind: "reject" };

export interface ExpandDestinationNameStepResult {
  readonly state: ExpandDestinationNameState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ExpandDestinationNameAction[];
}

export function initialExpandDestinationNameState(): ExpandDestinationNameState {
  return {};
}

export function stepExpandDestinationNameWithActions(
  state: ExpandDestinationNameState,
  event: ExpandDestinationNameEvent,
): ExpandDestinationNameStepResult {
  if (event.kind === "destination/expand-name-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "use-fields",
            fields: {
              name: expandDestinationName(
                event.identityHash,
                event.appName,
                event.aspects ?? [],
              ),
            },
          },
        ],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseExpandDestinationName(
  actions: ReadonlyArray<ExpandDestinationNameAction>,
): boolean {
  return hasActionOfKind(actions, "use-fields");
}

export function shouldRejectExpandDestinationName(
  actions: ReadonlyArray<ExpandDestinationNameAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Extract expanded destination name from step actions; null when no `use-fields`. */
export function expandedDestinationNameFromActions(
  actions: ReadonlyArray<ExpandDestinationNameAction>,
): string | null {
  return firstActionOfKind(actions, "use-fields")?.fields.name ?? null;
}

/**
 * Destination name-hash material is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `destinationNameHashMaterial` reads beside the step). Invalid name parts
 * become `reject`.
 */
export type DestinationNameHashMaterialState = Record<string, never>;

export type DestinationNameHashMaterialEvent =
  | Event
  | {
      readonly kind: "destination/name-hash-material-gate";
      readonly appName: string;
      readonly aspects?: ReadonlyArray<string>;
    };

export type DestinationNameHashMaterialAction =
  | { readonly kind: "use-raw"; readonly raw: Uint8Array }
  | { readonly kind: "reject" };

export interface DestinationNameHashMaterialStepResult {
  readonly state: DestinationNameHashMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationNameHashMaterialAction[];
}

export function initialDestinationNameHashMaterialState(): DestinationNameHashMaterialState {
  return {};
}

export function stepDestinationNameHashMaterialWithActions(
  state: DestinationNameHashMaterialState,
  event: DestinationNameHashMaterialEvent,
): DestinationNameHashMaterialStepResult {
  if (event.kind === "destination/name-hash-material-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "use-raw",
            raw: destinationNameHashMaterial(
              event.appName,
              event.aspects ?? [],
            ),
          },
        ],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseDestinationNameHashMaterial(
  actions: ReadonlyArray<DestinationNameHashMaterialAction>,
): boolean {
  return hasActionOfKind(actions, "use-raw");
}

export function shouldRejectDestinationNameHashMaterial(
  actions: ReadonlyArray<DestinationNameHashMaterialAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Extract name-hash material bytes from step actions; null when no `use-raw`. */
export function destinationNameHashMaterialRawFromActions(
  actions: ReadonlyArray<DestinationNameHashMaterialAction>,
): Uint8Array | null {
  return firstActionOfKind(actions, "use-raw")?.raw ?? null;
}

/**
 * Destination hash material is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `destinationHashMaterial`
 * reads beside the step).
 */
export type DestinationHashMaterialState = Record<string, never>;

export type DestinationHashMaterialEvent =
  | Event
  | {
      readonly kind: "destination/hash-material-gate";
      readonly nameHash: Uint8Array;
      readonly identityHash: Uint8Array | null;
    };

export type DestinationHashMaterialAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface DestinationHashMaterialStepResult {
  readonly state: DestinationHashMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationHashMaterialAction[];
}

export function initialDestinationHashMaterialState(): DestinationHashMaterialState {
  return {};
}

export function stepDestinationHashMaterialWithActions(
  state: DestinationHashMaterialState,
  event: DestinationHashMaterialEvent,
): DestinationHashMaterialStepResult {
  if (event.kind === "destination/hash-material-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: destinationHashMaterial(event.nameHash, event.identityHash),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseDestinationHashMaterial(
  actions: ReadonlyArray<DestinationHashMaterialAction>,
): boolean {
  return hasActionOfKind(actions, "use-raw");
}

/** Extract destination hash material bytes from step actions; null when no `use-raw`. */
export function destinationHashMaterialRawFromActions(
  actions: ReadonlyArray<DestinationHashMaterialAction>,
): Uint8Array | null {
  return firstActionOfKind(actions, "use-raw")?.raw ?? null;
}

/**
 * Aspect-filter parse is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `parseAspectFilter` reads
 * beside the step). Empty / all-empty filters become `reject`.
 */
export type ParseAspectFilterState = Record<string, never>;

export type ParseAspectFilterEvent =
  | Event
  | {
      readonly kind: "destination/aspect-filter-gate";
      readonly filter: string;
    };

export type ParseAspectFilterAction =
  | { readonly kind: "use-fields"; readonly fields: ParsedAspectFilter }
  | { readonly kind: "reject" };

export interface ParseAspectFilterStepResult {
  readonly state: ParseAspectFilterState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ParseAspectFilterAction[];
}

export function initialParseAspectFilterState(): ParseAspectFilterState {
  return {};
}

export function stepParseAspectFilterWithActions(
  state: ParseAspectFilterState,
  event: ParseAspectFilterEvent,
): ParseAspectFilterStepResult {
  if (event.kind === "destination/aspect-filter-gate") {
    const fields = parseAspectFilter(event.filter);
    if (fields === null) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return { state, intents: [], actions: [{ kind: "use-fields", fields }] };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseParseAspectFilter(
  actions: ReadonlyArray<ParseAspectFilterAction>,
): boolean {
  return hasActionOfKind(actions, "use-fields");
}

export function shouldRejectParseAspectFilter(
  actions: ReadonlyArray<ParseAspectFilterAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Extract parsed aspect filter from step actions; null when no `use-fields`. */
export function aspectFilterFromActions(
  actions: ReadonlyArray<ParseAspectFilterAction>,
): ParsedAspectFilter | null {
  return firstActionOfKind(actions, "use-fields")?.fields ?? null;
}
