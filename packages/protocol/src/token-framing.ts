/**
 * Pure RNS Token key split and frame layout (iv || ciphertext || hmac).
 * AES / HMAC stay at the crypto adapter edge.
 * Key-split / pack / split / signed-material / hmac-match conclusions leave via
 * machine actions (no ad-hoc `splitTokenKey` / `packTokenFrame` /
 * `splitTokenFrame` / `tokenSignedMaterial` / `tokenHmacMatches` reads beside
 * the step).
 */
import type { Event, Intent } from "@twistedpear/effects";
import { firstActionOfKind, hasActionOfKind } from "./action-kind.js";

export const TOKEN_IV_SIZE = 16;
export const TOKEN_HMAC_SIZE = 32;
export const TOKEN_OVERHEAD = TOKEN_IV_SIZE + TOKEN_HMAC_SIZE; // 48

export type TokenMode = "aes128" | "aes256";

export interface TokenKeyParts {
  readonly mode: TokenMode;
  readonly signingKey: Uint8Array;
  readonly encryptionKey: Uint8Array;
}

export interface TokenFrameParts {
  readonly iv: Uint8Array;
  readonly ciphertext: Uint8Array;
  readonly hmac: Uint8Array;
  readonly signedMaterial: Uint8Array;
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

export function splitTokenKey(key: Uint8Array): TokenKeyParts {
  if (key.length === 32) {
    return {
      mode: "aes128",
      signingKey: key.subarray(0, 16),
      encryptionKey: key.subarray(16, 32),
    };
  }
  if (key.length === 64) {
    return {
      mode: "aes256",
      signingKey: key.subarray(0, 32),
      encryptionKey: key.subarray(32, 64),
    };
  }
  throw new Error(`Token key must be 32 or 64 bytes, not ${key.length}`);
}

export function packTokenFrame(input: {
  readonly iv: Uint8Array;
  readonly ciphertext: Uint8Array;
  readonly hmac: Uint8Array;
}): Uint8Array {
  if (input.iv.length !== TOKEN_IV_SIZE) {
    throw new Error(`Token IV must be ${TOKEN_IV_SIZE} bytes`);
  }
  if (input.hmac.length !== TOKEN_HMAC_SIZE) {
    throw new Error(`Token HMAC must be ${TOKEN_HMAC_SIZE} bytes`);
  }
  return concatBytes(input.iv, input.ciphertext, input.hmac);
}

export function tokenSignedMaterial(
  iv: Uint8Array,
  ciphertext: Uint8Array,
): Uint8Array {
  if (iv.length !== TOKEN_IV_SIZE) {
    throw new Error(`Token IV must be ${TOKEN_IV_SIZE} bytes`);
  }
  return concatBytes(iv, ciphertext);
}

/**
 * Token signed-material assembly is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `tokenSignedMaterial` reads
 * beside the step). Invalid IV sizes become `reject`.
 */
export type TokenSignedMaterialState = Record<string, never>;

export type TokenSignedMaterialEvent =
  | Event
  | {
      readonly kind: "token-framing/signed-material-gate";
      readonly iv: Uint8Array;
      readonly ciphertext: Uint8Array;
    };

export type TokenSignedMaterialAction =
  | { readonly kind: "use-raw"; readonly raw: Uint8Array }
  | { readonly kind: "reject" };

export interface TokenSignedMaterialStepResult {
  readonly state: TokenSignedMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TokenSignedMaterialAction[];
}

export function initialTokenSignedMaterialState(): TokenSignedMaterialState {
  return {};
}

export function stepTokenSignedMaterialWithActions(
  state: TokenSignedMaterialState,
  event: TokenSignedMaterialEvent,
): TokenSignedMaterialStepResult {
  if (event.kind === "token-framing/signed-material-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "use-raw",
            raw: tokenSignedMaterial(event.iv, event.ciphertext),
          },
        ],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseTokenSignedMaterial(
  actions: ReadonlyArray<TokenSignedMaterialAction>,
): boolean {
  return hasActionOfKind(actions, "use-raw");
}

export function shouldRejectTokenSignedMaterial(
  actions: ReadonlyArray<TokenSignedMaterialAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Extract token signed material from step actions; null when no `use-raw`. */
export function tokenSignedMaterialRawFromActions(
  actions: ReadonlyArray<TokenSignedMaterialAction>,
): Uint8Array | null {
  return firstActionOfKind(actions, "use-raw")?.raw ?? null;
}

export function splitTokenFrame(token: Uint8Array): TokenFrameParts | null {
  if (token.length <= TOKEN_IV_SIZE + TOKEN_HMAC_SIZE) {
    return null;
  }
  const iv = token.subarray(0, TOKEN_IV_SIZE);
  const hmac = token.subarray(token.length - TOKEN_HMAC_SIZE);
  const ciphertext = token.subarray(
    TOKEN_IV_SIZE,
    token.length - TOKEN_HMAC_SIZE,
  );
  return {
    iv,
    ciphertext,
    hmac,
    signedMaterial: token.subarray(0, token.length - TOKEN_HMAC_SIZE),
  };
}

/** Constant-time HMAC compare for token verify. */
export function tokenHmacMatches(
  received: Uint8Array,
  expected: Uint8Array,
): boolean {
  if (received.length !== expected.length) {
    return false;
  }
  let mismatch = 0;
  for (let index = 0; index < received.length; index += 1) {
    mismatch |= (received[index] ?? 0) ^ (expected[index] ?? 0);
  }
  return mismatch === 0;
}

/**
 * Token HMAC match is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `tokenHmacMatches` reads
 * beside the step).
 */
export type TokenHmacMatchState = Record<string, never>;

export type TokenHmacMatchEvent =
  | Event
  | {
      readonly kind: "token-framing/hmac-match-gate";
      readonly received: Uint8Array;
      readonly expected: Uint8Array;
    };

export type TokenHmacMatchAction =
  { readonly kind: "match" } | { readonly kind: "mismatch" };

export interface TokenHmacMatchStepResult {
  readonly state: TokenHmacMatchState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TokenHmacMatchAction[];
}

export function initialTokenHmacMatchState(): TokenHmacMatchState {
  return {};
}

export function stepTokenHmacMatchWithActions(
  state: TokenHmacMatchState,
  event: TokenHmacMatchEvent,
): TokenHmacMatchStepResult {
  if (event.kind === "token-framing/hmac-match-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: tokenHmacMatches(event.received, event.expected)
            ? "match"
            : "mismatch",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldMatchTokenHmac(
  actions: ReadonlyArray<TokenHmacMatchAction>,
): boolean {
  return hasActionOfKind(actions, "match");
}

export function shouldMismatchTokenHmac(
  actions: ReadonlyArray<TokenHmacMatchAction>,
): boolean {
  return hasActionOfKind(actions, "mismatch");
}

/** Whether a Token IV matches the fixed RNS size. */
export function isValidTokenIvLength(length: number): boolean {
  return length === TOKEN_IV_SIZE;
}

/**
 * Token IV-length gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isValidTokenIvLength`
 * reads beside the step).
 */
export type TokenIvLengthValidState = Record<string, never>;

export type TokenIvLengthValidEvent =
  | Event
  | {
      readonly kind: "token-framing/iv-length-valid-gate";
      readonly length: number;
    };

export type TokenIvLengthValidAction =
  { readonly kind: "valid" } | { readonly kind: "invalid" };

export interface TokenIvLengthValidStepResult {
  readonly state: TokenIvLengthValidState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TokenIvLengthValidAction[];
}

export function initialTokenIvLengthValidState(): TokenIvLengthValidState {
  return {};
}

export function stepTokenIvLengthValidWithActions(
  state: TokenIvLengthValidState,
  event: TokenIvLengthValidEvent,
): TokenIvLengthValidStepResult {
  if (event.kind === "token-framing/iv-length-valid-gate") {
    return {
      state,
      intents: [],
      actions: [
        { kind: isValidTokenIvLength(event.length) ? "valid" : "invalid" },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptTokenIvLength(
  actions: ReadonlyArray<TokenIvLengthValidAction>,
): boolean {
  return hasActionOfKind(actions, "valid");
}

export function shouldRejectTokenIvLength(
  actions: ReadonlyArray<TokenIvLengthValidAction>,
): boolean {
  return hasActionOfKind(actions, "invalid");
}

/** Whether a Token frame split succeeded (HMAC/AES stay at the edge). */
export function shouldAcceptTokenFrame(framePresent: boolean): boolean {
  return framePresent;
}

/**
 * Token-frame accept gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAcceptTokenFrame`
 * reads beside the step).
 */
export type AcceptTokenFrameState = Record<string, never>;

export type AcceptTokenFrameEvent =
  | Event
  | {
      readonly kind: "token-framing/accept-frame-gate";
      readonly framePresent: boolean;
    };

export type AcceptTokenFrameAction =
  { readonly kind: "accept" } | { readonly kind: "skip" };

export interface AcceptTokenFrameStepResult {
  readonly state: AcceptTokenFrameState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptTokenFrameAction[];
}

export function initialAcceptTokenFrameState(): AcceptTokenFrameState {
  return {};
}

export function stepAcceptTokenFrameWithActions(
  state: AcceptTokenFrameState,
  event: AcceptTokenFrameEvent,
): AcceptTokenFrameStepResult {
  if (event.kind === "token-framing/accept-frame-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptTokenFrame(event.framePresent) ? "accept" : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptTokenFrameNow(
  actions: ReadonlyArray<AcceptTokenFrameAction>,
): boolean {
  return hasActionOfKind(actions, "accept");
}

export function shouldSkipAcceptTokenFrame(
  actions: ReadonlyArray<AcceptTokenFrameAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/**
 * Token key-split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitTokenKey` reads
 * beside the step). Invalid key lengths become `reject`.
 */
export type SplitTokenKeyState = Record<string, never>;

export type SplitTokenKeyEvent =
  | Event
  | {
      readonly kind: "token-framing/split-key-gate";
      readonly key: Uint8Array;
    };

export type SplitTokenKeyAction =
  | { readonly kind: "use-fields"; readonly fields: TokenKeyParts }
  | { readonly kind: "reject" };

export interface SplitTokenKeyStepResult {
  readonly state: SplitTokenKeyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitTokenKeyAction[];
}

export function initialSplitTokenKeyState(): SplitTokenKeyState {
  return {};
}

export function stepSplitTokenKeyWithActions(
  state: SplitTokenKeyState,
  event: SplitTokenKeyEvent,
): SplitTokenKeyStepResult {
  if (event.kind === "token-framing/split-key-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [{ kind: "use-fields", fields: splitTokenKey(event.key) }],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseSplitTokenKey(
  actions: ReadonlyArray<SplitTokenKeyAction>,
): boolean {
  return hasActionOfKind(actions, "use-fields");
}

export function shouldRejectSplitTokenKey(
  actions: ReadonlyArray<SplitTokenKeyAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Extract split token-key fields from step actions; null when no `use-fields`. */
export function tokenKeyFieldsFromActions(
  actions: ReadonlyArray<SplitTokenKeyAction>,
): TokenKeyParts | null {
  return firstActionOfKind(actions, "use-fields")?.fields ?? null;
}

/**
 * Token-frame pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packTokenFrame` reads
 * beside the step). Invalid sizes become `reject` (helper may throw).
 */
export type PackTokenFrameState = Record<string, never>;

export type PackTokenFrameEvent =
  | Event
  | {
      readonly kind: "token-framing/pack-gate";
      readonly iv: Uint8Array;
      readonly ciphertext: Uint8Array;
      readonly hmac: Uint8Array;
    };

export type PackTokenFrameAction =
  | { readonly kind: "use-raw"; readonly raw: Uint8Array }
  | { readonly kind: "reject" };

export interface PackTokenFrameStepResult {
  readonly state: PackTokenFrameState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackTokenFrameAction[];
}

export function initialPackTokenFrameState(): PackTokenFrameState {
  return {};
}

export function stepPackTokenFrameWithActions(
  state: PackTokenFrameState,
  event: PackTokenFrameEvent,
): PackTokenFrameStepResult {
  if (event.kind === "token-framing/pack-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "use-raw",
            raw: packTokenFrame({
              iv: event.iv,
              ciphertext: event.ciphertext,
              hmac: event.hmac,
            }),
          },
        ],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackTokenFrame(
  actions: ReadonlyArray<PackTokenFrameAction>,
): boolean {
  return hasActionOfKind(actions, "use-raw");
}

export function shouldRejectPackTokenFrame(
  actions: ReadonlyArray<PackTokenFrameAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Extract token-frame pack bytes from step actions; null when no `use-raw`. */
export function packTokenFrameRawFromActions(
  actions: ReadonlyArray<PackTokenFrameAction>,
): Uint8Array | null {
  return firstActionOfKind(actions, "use-raw")?.raw ?? null;
}

/**
 * Token-frame split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitTokenFrame` reads
 * beside the step). Short frames become `reject`.
 */
export type SplitTokenFrameState = Record<string, never>;

export type SplitTokenFrameEvent =
  | Event
  | {
      readonly kind: "token-framing/split-gate";
      readonly token: Uint8Array;
    };

export type SplitTokenFrameAction =
  | { readonly kind: "use-fields"; readonly fields: TokenFrameParts }
  | { readonly kind: "reject" };

export interface SplitTokenFrameStepResult {
  readonly state: SplitTokenFrameState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitTokenFrameAction[];
}

export function initialSplitTokenFrameState(): SplitTokenFrameState {
  return {};
}

export function stepSplitTokenFrameWithActions(
  state: SplitTokenFrameState,
  event: SplitTokenFrameEvent,
): SplitTokenFrameStepResult {
  if (event.kind === "token-framing/split-gate") {
    const fields = splitTokenFrame(event.token);
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

export function shouldUseSplitTokenFrame(
  actions: ReadonlyArray<SplitTokenFrameAction>,
): boolean {
  return hasActionOfKind(actions, "use-fields");
}

export function shouldRejectSplitTokenFrame(
  actions: ReadonlyArray<SplitTokenFrameAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Extract split token-frame fields from step actions; null when no `use-fields`. */
export function tokenFrameFieldsFromActions(
  actions: ReadonlyArray<SplitTokenFrameAction>,
): TokenFrameParts | null {
  return firstActionOfKind(actions, "use-fields")?.fields ?? null;
}
