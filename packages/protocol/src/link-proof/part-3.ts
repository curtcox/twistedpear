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
import { linkProofSignedMaterial, linkRequestHashablePart } from "./part-1.js";
/**
 * Link-proof signed-material assembly is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `linkProofSignedMaterial`
 * reads beside the step).
 */
export type LinkProofSignedMaterialState = Record<string, never>;

export type LinkProofSignedMaterialEvent =
  | Event
  | {
      readonly kind: "link-proof/signed-material-gate";
      readonly linkId: Uint8Array;
      readonly publicKey: Uint8Array;
      readonly ownerSigPublicKey: Uint8Array;
      readonly signallingBytes: Uint8Array;
    };

export type LinkProofSignedMaterialAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface LinkProofSignedMaterialStepResult {
  readonly state: LinkProofSignedMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkProofSignedMaterialAction[];
}

export function initialLinkProofSignedMaterialState(): LinkProofSignedMaterialState {
  return {};
}

export function stepLinkProofSignedMaterialWithActions(
  state: LinkProofSignedMaterialState,
  event: LinkProofSignedMaterialEvent
): LinkProofSignedMaterialStepResult {
  if (event.kind === "link-proof/signed-material-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: linkProofSignedMaterial(
            event.linkId,
            event.publicKey,
            event.ownerSigPublicKey,
            event.signallingBytes
          )
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseLinkProofSignedMaterial(
  actions: ReadonlyArray<LinkProofSignedMaterialAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract link-proof signed material from step actions; null when no `use-raw`. */
export function linkProofSignedMaterialRawFromActions(
  actions: ReadonlyArray<LinkProofSignedMaterialAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Link-request hashable truncation is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `linkRequestHashablePart`
 * reads beside the step).
 */
export type LinkRequestHashablePartState = Record<string, never>;

export type LinkRequestHashablePartEvent =
  | Event
  | {
      readonly kind: "link-proof/request-hashable-gate";
      readonly hashablePart: Uint8Array;
      readonly requestDataLength: number;
    };

export type LinkRequestHashablePartAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface LinkRequestHashablePartStepResult {
  readonly state: LinkRequestHashablePartState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkRequestHashablePartAction[];
}

export function initialLinkRequestHashablePartState(): LinkRequestHashablePartState {
  return {};
}

export function stepLinkRequestHashablePartWithActions(
  state: LinkRequestHashablePartState,
  event: LinkRequestHashablePartEvent
): LinkRequestHashablePartStepResult {
  if (event.kind === "link-proof/request-hashable-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: linkRequestHashablePart(event.hashablePart, event.requestDataLength)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseLinkRequestHashablePart(
  actions: ReadonlyArray<LinkRequestHashablePartAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract truncated link-request hashable bytes from step actions; null when no `use-raw`. */
export function linkRequestHashablePartRawFromActions(
  actions: ReadonlyArray<LinkRequestHashablePartAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}
