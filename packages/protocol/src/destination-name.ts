/**
 * Pure RNS destination name expansion and hash-input material.
 * SHA truncation stays at the crypto adapter edge.
 * Identity-hash resolution conclusions leave via machine actions (no ad-hoc
 * `planDestinationIdentityHash` / `plan === "..."` reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";
import { NAME_HASH_BYTES, TRUNCATED_HASH_BYTES } from "./hash-truncate.js";
import { utf8Encode } from "./utf8.js";

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

export function validateDestinationNamePart(value: string, label: string): void {
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
  aspects: ReadonlyArray<string> = []
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
      throw new Error(`Identity hash must be ${DESTINATION_IDENTITY_HASH_BYTES} bytes`);
    }
    name += `.${bytesToHexLower(identityHash)}`;
  }

  return name;
}

/** UTF-8 bytes hashed (then truncated) for the destination name hash. */
export function destinationNameHashMaterial(
  appName: string,
  aspects: ReadonlyArray<string> = []
): Uint8Array {
  return utf8Encode(expandDestinationName(null, appName, aspects));
}

/** Bytes hashed (then truncated) for the full destination hash. */
export function destinationHashMaterial(
  nameHash: Uint8Array,
  identityHash: Uint8Array | null
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
  | "missing"
  | "use-object"
  | "reject-length"
  | "use-bytes";

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
 * Destination identity-hash resolution is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planDestinationIdentityHash`
 * / `plan === "..."` reads beside the step).
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
  event: DestinationIdentityHashEvent
): DestinationIdentityHashStepResult {
  if (event.kind === "destination/identity-hash-gate") {
    const plan = planDestinationIdentityHash({
      kind: event.identityKind,
      ...(event.bytesLength !== undefined ? { bytesLength: event.bytesLength } : {}),
      ...(event.expectedLength !== undefined ? { expectedLength: event.expectedLength } : {})
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

export function destinationIdentityHashFromActions(
  actions: ReadonlyArray<DestinationIdentityHashAction>
): DestinationIdentityHashPlan | null {
  return actions[0]?.kind ?? null;
}

export function shouldUseObjectDestinationIdentityHash(
  actions: ReadonlyArray<DestinationIdentityHashAction>
): boolean {
  return actions.some((action) => action.kind === "use-object");
}

export function shouldUseBytesDestinationIdentityHash(
  actions: ReadonlyArray<DestinationIdentityHashAction>
): boolean {
  return actions.some((action) => action.kind === "use-bytes");
}

export function shouldRejectLengthDestinationIdentityHash(
  actions: ReadonlyArray<DestinationIdentityHashAction>
): boolean {
  return actions.some((action) => action.kind === "reject-length");
}

export function shouldMissDestinationIdentityHash(
  actions: ReadonlyArray<DestinationIdentityHashAction>
): boolean {
  return actions.some((action) => action.kind === "missing");
}
