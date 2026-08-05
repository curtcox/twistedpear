/**
 * Pure UTF-8 encode/decode without TextEncoder/TextDecoder (no DOM).
 * Conclusions leave via machine actions (no ad-hoc `utf8Encode` /
 * `utf8Decode` / `utf8OrBytes` reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";

export function utf8Encode(value: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < value.length; i += 1) {
    let code = value.charCodeAt(i);
    if (code < 0x80) {
      out.push(code);
    } else if (code < 0x800) {
      out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length) {
      const low = value.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
        i += 1;
        out.push(
          0xf0 | (code >> 18),
          0x80 | ((code >> 12) & 0x3f),
          0x80 | ((code >> 6) & 0x3f),
          0x80 | (code & 0x3f),
        );
        continue;
      }
      out.push(0xef, 0xbf, 0xbd);
    } else {
      out.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return Uint8Array.from(out);
}

export function utf8Decode(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length;) {
    const b0 = bytes[i]!;
    if (b0 < 0x80) {
      out += String.fromCharCode(b0);
      i += 1;
    } else if ((b0 & 0xe0) === 0xc0 && i + 1 < bytes.length) {
      const b1 = bytes[i + 1]!;
      out += String.fromCharCode(((b0 & 0x1f) << 6) | (b1 & 0x3f));
      i += 2;
    } else if ((b0 & 0xf0) === 0xe0 && i + 2 < bytes.length) {
      const b1 = bytes[i + 1]!;
      const b2 = bytes[i + 2]!;
      out += String.fromCharCode(
        ((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f),
      );
      i += 3;
    } else if ((b0 & 0xf8) === 0xf0 && i + 3 < bytes.length) {
      const b1 = bytes[i + 1]!;
      const b2 = bytes[i + 2]!;
      const b3 = bytes[i + 3]!;
      let code =
        ((b0 & 0x07) << 18) |
        ((b1 & 0x3f) << 12) |
        ((b2 & 0x3f) << 6) |
        (b3 & 0x3f);
      code -= 0x10000;
      out += String.fromCharCode(
        0xd800 + (code >> 10),
        0xdc00 + (code & 0x3ff),
      );
      i += 4;
    } else {
      out += "\ufffd";
      i += 1;
    }
  }
  return out;
}

/** Encode a string as UTF-8, or copy an existing byte array. */
export function utf8OrBytes(value: string | Uint8Array): Uint8Array {
  return typeof value === "string" ? utf8Encode(value) : Uint8Array.from(value);
}

/**
 * UTF-8 encode is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `utf8Encode` reads beside
 * the step).
 */
export type Utf8EncodeState = Record<string, never>;

export type Utf8EncodeEvent =
  | Event
  | {
      readonly kind: "utf8/encode-gate";
      readonly value: string;
    };

export type Utf8EncodeAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface Utf8EncodeStepResult {
  readonly state: Utf8EncodeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly Utf8EncodeAction[];
}

export function initialUtf8EncodeState(): Utf8EncodeState {
  return {};
}

export function stepUtf8EncodeWithActions(
  state: Utf8EncodeState,
  event: Utf8EncodeEvent,
): Utf8EncodeStepResult {
  if (event.kind === "utf8/encode-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: "use-raw", raw: utf8Encode(event.value) }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseUtf8Encode(
  actions: ReadonlyArray<Utf8EncodeAction>,
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract UTF-8 encoded bytes from step actions; null when no `use-raw`. */
export function utf8EncodeRawFromActions(
  actions: ReadonlyArray<Utf8EncodeAction>,
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

export interface Utf8DecodeFields {
  readonly text: string;
}

/**
 * UTF-8 decode is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `utf8Decode` reads beside
 * the step).
 */
export type Utf8DecodeState = Record<string, never>;

export type Utf8DecodeEvent =
  | Event
  | {
      readonly kind: "utf8/decode-gate";
      readonly bytes: Uint8Array;
    };

export type Utf8DecodeAction = {
  readonly kind: "use-fields";
  readonly fields: Utf8DecodeFields;
};

export interface Utf8DecodeStepResult {
  readonly state: Utf8DecodeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly Utf8DecodeAction[];
}

export function initialUtf8DecodeState(): Utf8DecodeState {
  return {};
}

export function stepUtf8DecodeWithActions(
  state: Utf8DecodeState,
  event: Utf8DecodeEvent,
): Utf8DecodeStepResult {
  if (event.kind === "utf8/decode-gate") {
    return {
      state,
      intents: [],
      actions: [
        { kind: "use-fields", fields: { text: utf8Decode(event.bytes) } },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseUtf8Decode(
  actions: ReadonlyArray<Utf8DecodeAction>,
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

/** Extract decoded UTF-8 text from step actions; null when no `use-fields`. */
export function utf8DecodeTextFromActions(
  actions: ReadonlyArray<Utf8DecodeAction>,
): string | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields.text : null;
}

/**
 * UTF-8-or-bytes is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `utf8OrBytes` reads beside
 * the step).
 */
export type Utf8OrBytesState = Record<string, never>;

export type Utf8OrBytesEvent =
  | Event
  | {
      readonly kind: "utf8/or-bytes-gate";
      readonly value: string | Uint8Array;
    };

export type Utf8OrBytesAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface Utf8OrBytesStepResult {
  readonly state: Utf8OrBytesState;
  readonly intents: readonly Intent[];
  readonly actions: readonly Utf8OrBytesAction[];
}

export function initialUtf8OrBytesState(): Utf8OrBytesState {
  return {};
}

export function stepUtf8OrBytesWithActions(
  state: Utf8OrBytesState,
  event: Utf8OrBytesEvent,
): Utf8OrBytesStepResult {
  if (event.kind === "utf8/or-bytes-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: "use-raw", raw: utf8OrBytes(event.value) }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseUtf8OrBytes(
  actions: ReadonlyArray<Utf8OrBytesAction>,
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract UTF-8-or-bytes result from step actions; null when no `use-raw`. */
export function utf8OrBytesRawFromActions(
  actions: ReadonlyArray<Utf8OrBytesAction>,
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}
