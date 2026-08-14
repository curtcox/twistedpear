/** Extracted from link-proof.ts; the original module remains the public composition point. */
/**
 * Pure RNS link-request / link-proof signalling and payload layout helpers.
 * Pack / split / signed-material / hashable truncate / signalling encode /
 * mode-MTU decode / proof-payload classify conclusions leave via machine
 * actions (no ad-hoc `packLinkProofData` / `splitLinkProofBody` /
 * `packLinkRequestData` / `splitLinkRequestData` /
 * `linkProofSignedMaterial` / `linkRequestHashablePart` /
 * `encodeLinkSignallingBytes` / `encodeLinkMtuBytes` /
 * `modeFromLinkRequestData` / `modeFromLinkProofData` /
 * `mtuFromLinkRequestData` / `mtuFromLinkProofData` /
 * `classifyLinkProofPayload` reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";
import {
  classifyLinkProofPayload,
  encodeLinkMtuBytes,
  encodeLinkSignallingBytes,
  modeFromLinkProofData,
  modeFromLinkRequestData,
  mtuFromLinkProofData,
  mtuFromLinkRequestData,
} from "./part-1.js";
import { firstActionOfKind, hasActionOfKind } from "../action-kind.js";
/**
 * Link signalling-byte encode framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `encodeLinkSignallingBytes`
 * reads beside the step).
 */
export type EncodeLinkSignallingBytesState = Record<string, never>;

export type EncodeLinkSignallingBytesEvent =
  | Event
  | {
      readonly kind: "link-proof/encode-signalling-gate";
      readonly mtu: number;
      readonly mode: number;
    };

export type EncodeLinkSignallingBytesAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface EncodeLinkSignallingBytesStepResult {
  readonly state: EncodeLinkSignallingBytesState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EncodeLinkSignallingBytesAction[];
}

export function initialEncodeLinkSignallingBytesState(): EncodeLinkSignallingBytesState {
  return {};
}

export function stepEncodeLinkSignallingBytesWithActions(
  state: EncodeLinkSignallingBytesState,
  event: EncodeLinkSignallingBytesEvent,
): EncodeLinkSignallingBytesStepResult {
  if (event.kind === "link-proof/encode-signalling-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: encodeLinkSignallingBytes(event.mtu, event.mode),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseEncodeLinkSignallingBytes(
  actions: ReadonlyArray<EncodeLinkSignallingBytesAction>,
): boolean {
  return hasActionOfKind(actions, "use-raw");
}

/** Extract encoded signalling bytes from step actions; null when no `use-raw`. */
export function encodeLinkSignallingBytesRawFromActions(
  actions: ReadonlyArray<EncodeLinkSignallingBytesAction>,
): Uint8Array | null {
  return firstActionOfKind(actions, "use-raw")?.raw ?? null;
}

/**
 * Link MTU-byte encode framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `encodeLinkMtuBytes` reads
 * beside the step).
 */
export type EncodeLinkMtuBytesState = Record<string, never>;

export type EncodeLinkMtuBytesEvent =
  | Event
  | {
      readonly kind: "link-proof/encode-mtu-gate";
      readonly mtu: number;
    };

export type EncodeLinkMtuBytesAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface EncodeLinkMtuBytesStepResult {
  readonly state: EncodeLinkMtuBytesState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EncodeLinkMtuBytesAction[];
}

export function initialEncodeLinkMtuBytesState(): EncodeLinkMtuBytesState {
  return {};
}

export function stepEncodeLinkMtuBytesWithActions(
  state: EncodeLinkMtuBytesState,
  event: EncodeLinkMtuBytesEvent,
): EncodeLinkMtuBytesStepResult {
  if (event.kind === "link-proof/encode-mtu-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: "use-raw", raw: encodeLinkMtuBytes(event.mtu) }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseEncodeLinkMtuBytes(
  actions: ReadonlyArray<EncodeLinkMtuBytesAction>,
): boolean {
  return hasActionOfKind(actions, "use-raw");
}

/** Extract encoded MTU bytes from step actions; null when no `use-raw`. */
export function encodeLinkMtuBytesRawFromActions(
  actions: ReadonlyArray<EncodeLinkMtuBytesAction>,
): Uint8Array | null {
  return firstActionOfKind(actions, "use-raw")?.raw ?? null;
}

/**
 * Link-request mode decode is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `modeFromLinkRequestData`
 * reads beside the step).
 */
export type ModeFromLinkRequestDataState = Record<string, never>;

export type ModeFromLinkRequestDataEvent =
  | Event
  | {
      readonly kind: "link-proof/mode-from-request-gate";
      readonly data: Uint8Array;
      readonly defaultMode: number;
    };

export type ModeFromLinkRequestDataAction = {
  readonly kind: "use-mode";
  readonly mode: number;
};

export interface ModeFromLinkRequestDataStepResult {
  readonly state: ModeFromLinkRequestDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ModeFromLinkRequestDataAction[];
}

export function initialModeFromLinkRequestDataState(): ModeFromLinkRequestDataState {
  return {};
}

export function stepModeFromLinkRequestDataWithActions(
  state: ModeFromLinkRequestDataState,
  event: ModeFromLinkRequestDataEvent,
): ModeFromLinkRequestDataStepResult {
  if (event.kind === "link-proof/mode-from-request-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-mode",
          mode: modeFromLinkRequestData(event.data, event.defaultMode),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseModeFromLinkRequestData(
  actions: ReadonlyArray<ModeFromLinkRequestDataAction>,
): boolean {
  return hasActionOfKind(actions, "use-mode");
}

/** Extract decoded link-request mode from step actions; null when no `use-mode`. */
export function modeFromLinkRequestDataFromActions(
  actions: ReadonlyArray<ModeFromLinkRequestDataAction>,
): number | null {
  return firstActionOfKind(actions, "use-mode")?.mode ?? null;
}

/**
 * Link-proof mode decode is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `modeFromLinkProofData`
 * reads beside the step).
 */
export type ModeFromLinkProofDataState = Record<string, never>;

export type ModeFromLinkProofDataEvent =
  | Event
  | {
      readonly kind: "link-proof/mode-from-proof-gate";
      readonly data: Uint8Array;
      readonly defaultMode: number;
    };

export type ModeFromLinkProofDataAction = {
  readonly kind: "use-mode";
  readonly mode: number;
};

export interface ModeFromLinkProofDataStepResult {
  readonly state: ModeFromLinkProofDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ModeFromLinkProofDataAction[];
}

export function initialModeFromLinkProofDataState(): ModeFromLinkProofDataState {
  return {};
}

export function stepModeFromLinkProofDataWithActions(
  state: ModeFromLinkProofDataState,
  event: ModeFromLinkProofDataEvent,
): ModeFromLinkProofDataStepResult {
  if (event.kind === "link-proof/mode-from-proof-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-mode",
          mode: modeFromLinkProofData(event.data, event.defaultMode),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseModeFromLinkProofData(
  actions: ReadonlyArray<ModeFromLinkProofDataAction>,
): boolean {
  return hasActionOfKind(actions, "use-mode");
}

/** Extract decoded link-proof mode from step actions; null when no `use-mode`. */
export function modeFromLinkProofDataFromActions(
  actions: ReadonlyArray<ModeFromLinkProofDataAction>,
): number | null {
  return firstActionOfKind(actions, "use-mode")?.mode ?? null;
}

/**
 * Link-request MTU decode is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `mtuFromLinkRequestData`
 * reads beside the step).
 */
export type MtuFromLinkRequestDataState = Record<string, never>;

export type MtuFromLinkRequestDataEvent =
  | Event
  | {
      readonly kind: "link-proof/mtu-from-request-gate";
      readonly data: Uint8Array;
    };

export type MtuFromLinkRequestDataAction =
  | { readonly kind: "use-mtu"; readonly mtu: number }
  | { readonly kind: "reject" };

export interface MtuFromLinkRequestDataStepResult {
  readonly state: MtuFromLinkRequestDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly MtuFromLinkRequestDataAction[];
}

export function initialMtuFromLinkRequestDataState(): MtuFromLinkRequestDataState {
  return {};
}

export function stepMtuFromLinkRequestDataWithActions(
  state: MtuFromLinkRequestDataState,
  event: MtuFromLinkRequestDataEvent,
): MtuFromLinkRequestDataStepResult {
  if (event.kind === "link-proof/mtu-from-request-gate") {
    const mtu = mtuFromLinkRequestData(event.data);
    if (mtu === null) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return { state, intents: [], actions: [{ kind: "use-mtu", mtu }] };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseMtuFromLinkRequestData(
  actions: ReadonlyArray<MtuFromLinkRequestDataAction>,
): boolean {
  return hasActionOfKind(actions, "use-mtu");
}

export function shouldRejectMtuFromLinkRequestData(
  actions: ReadonlyArray<MtuFromLinkRequestDataAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Extract decoded link-request MTU from step actions; null when no `use-mtu`. */
export function mtuFromLinkRequestDataFromActions(
  actions: ReadonlyArray<MtuFromLinkRequestDataAction>,
): number | null {
  return firstActionOfKind(actions, "use-mtu")?.mtu ?? null;
}

/**
 * Link-proof MTU decode is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `mtuFromLinkProofData`
 * reads beside the step).
 */
export type MtuFromLinkProofDataState = Record<string, never>;

export type MtuFromLinkProofDataEvent =
  | Event
  | {
      readonly kind: "link-proof/mtu-from-proof-gate";
      readonly data: Uint8Array;
    };

export type MtuFromLinkProofDataAction =
  | { readonly kind: "use-mtu"; readonly mtu: number }
  | { readonly kind: "reject" };

export interface MtuFromLinkProofDataStepResult {
  readonly state: MtuFromLinkProofDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly MtuFromLinkProofDataAction[];
}

export function initialMtuFromLinkProofDataState(): MtuFromLinkProofDataState {
  return {};
}

export function stepMtuFromLinkProofDataWithActions(
  state: MtuFromLinkProofDataState,
  event: MtuFromLinkProofDataEvent,
): MtuFromLinkProofDataStepResult {
  if (event.kind === "link-proof/mtu-from-proof-gate") {
    const mtu = mtuFromLinkProofData(event.data);
    if (mtu === null) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return { state, intents: [], actions: [{ kind: "use-mtu", mtu }] };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseMtuFromLinkProofData(
  actions: ReadonlyArray<MtuFromLinkProofDataAction>,
): boolean {
  return hasActionOfKind(actions, "use-mtu");
}

export function shouldRejectMtuFromLinkProofData(
  actions: ReadonlyArray<MtuFromLinkProofDataAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Extract decoded link-proof MTU from step actions; null when no `use-mtu`. */
export function mtuFromLinkProofDataFromActions(
  actions: ReadonlyArray<MtuFromLinkProofDataAction>,
): number | null {
  return firstActionOfKind(actions, "use-mtu")?.mtu ?? null;
}

/**
 * Link-proof payload classify is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `classifyLinkProofPayload`
 * reads beside the step).
 */
export type ClassifyLinkProofPayloadState = Record<string, never>;

export type ClassifyLinkProofPayloadEvent =
  | Event
  | {
      readonly kind: "link-proof/classify-payload-gate";
      readonly dataLength: number;
    };

export type ClassifyLinkProofPayloadAction =
  | { readonly kind: "body-only" }
  | { readonly kind: "body-with-mtu" }
  | { readonly kind: "reject" };

export interface ClassifyLinkProofPayloadStepResult {
  readonly state: ClassifyLinkProofPayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ClassifyLinkProofPayloadAction[];
}

export function initialClassifyLinkProofPayloadState(): ClassifyLinkProofPayloadState {
  return {};
}

export function stepClassifyLinkProofPayloadWithActions(
  state: ClassifyLinkProofPayloadState,
  event: ClassifyLinkProofPayloadEvent,
): ClassifyLinkProofPayloadStepResult {
  if (event.kind === "link-proof/classify-payload-gate") {
    const kind = classifyLinkProofPayload(event.dataLength);
    if (kind === "body-only") {
      return { state, intents: [], actions: [{ kind: "body-only" }] };
    }
    if (kind === "body-with-mtu") {
      return { state, intents: [], actions: [{ kind: "body-with-mtu" }] };
    }
    return { state, intents: [], actions: [{ kind: "reject" }] };
  }

  return { state, intents: [], actions: [] };
}

export function shouldClassifyLinkProofPayloadBodyOnly(
  actions: ReadonlyArray<ClassifyLinkProofPayloadAction>,
): boolean {
  return hasActionOfKind(actions, "body-only");
}

export function shouldClassifyLinkProofPayloadBodyWithMtu(
  actions: ReadonlyArray<ClassifyLinkProofPayloadAction>,
): boolean {
  return hasActionOfKind(actions, "body-with-mtu");
}

export function shouldRejectClassifyLinkProofPayload(
  actions: ReadonlyArray<ClassifyLinkProofPayloadAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}
