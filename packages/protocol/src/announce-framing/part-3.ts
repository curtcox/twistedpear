/** Extracted from announce-framing.ts; the original module remains the public composition point. */
/**
 * Pure RNS announce payload framing and signed-material assembly.
 * Signing / hashing stay at the crypto adapter edge.
 * Pack / parse / validate / build / signed-material / destination-hash
 * material and match / packet-type conclusions leave via machine actions (no
 * ad-hoc `packAnnouncePayload` / `parseAnnouncePayload` /
 * `announceSignedMaterial` / `announceDestinationHashMaterial` /
 * `announceDestinationHashMatches` / `isAnnouncePacketType` / `plan` string
 * reads beside the step).
 * Payload / parsed-announce accept gates conclude via machine actions (no
 * ad-hoc `shouldAcceptAnnouncePayload` / `shouldAcceptParsedAnnounce` reads
 * beside the step).
 * Signature-attempt / destination-hash-check gates conclude via machine
 * actions (no ad-hoc `shouldAttemptAnnounceSignatureValidate` /
 * `shouldCheckAnnounceDestinationHash` reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  ANNOUNCE_RANDOM_HASH_SIZE,
  ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE,
} from "./part-1.js";
import { planAnnounceValidateOutcome } from "./part-2.js";
import type { AnnounceValidatePlan } from "./part-2.js";
import { firstAction, hasActionOfKind } from "../action-kind.js";
/**
 * Announce-validate-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planAnnounceValidateOutcome`
 * / `plan ===` reads beside the step). Nested under
 * {@link stepAnnounceValidateWithActions}.
 */
export type AnnounceValidateOutcomePlanState = Record<string, never>;

export type AnnounceValidateOutcomePlanEvent =
  | Event
  | {
      readonly kind: "announce/validate-outcome-plan-gate";
      readonly parsedOk: boolean;
      readonly publicKeyLoaded: boolean;
      readonly signatureValid: boolean;
      readonly onlyValidateSignature: boolean;
      readonly destinationHashMatches: boolean;
    };

export type AnnounceValidateOutcomePlanAction = {
  readonly kind: AnnounceValidatePlan;
};

export interface AnnounceValidateOutcomePlanStepResult {
  readonly state: AnnounceValidateOutcomePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceValidateOutcomePlanAction[];
}

export function initialAnnounceValidateOutcomePlanState(): AnnounceValidateOutcomePlanState {
  return {};
}

export function stepAnnounceValidateOutcomePlanWithActions(
  state: AnnounceValidateOutcomePlanState,
  event: AnnounceValidateOutcomePlanEvent,
): AnnounceValidateOutcomePlanStepResult {
  if (event.kind === "announce/validate-outcome-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planAnnounceValidateOutcome({
            parsedOk: event.parsedOk,
            publicKeyLoaded: event.publicKeyLoaded,
            signatureValid: event.signatureValid,
            onlyValidateSignature: event.onlyValidateSignature,
            destinationHashMatches: event.destinationHashMatches,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether plan actions accept (full or signature-only). */
export function shouldAcceptAnnounceValidateOutcomePlan(
  actions: ReadonlyArray<AnnounceValidateOutcomePlanAction>,
): boolean {
  return actions.some(
    (action) =>
      action.kind === "accept" || action.kind === "accept-signature-only",
  );
}

/** Extract the validate plan from actions; null when empty. */
export function announceValidateOutcomePlanFromActions(
  actions: ReadonlyArray<AnnounceValidateOutcomePlanAction>,
): AnnounceValidatePlan | null {
  const action = firstAction(actions);
  return action?.kind ?? null;
}

/**
 * Announce validate gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepAnnounceValidateOutcomePlanWithActions}
 * (`accept`|`accept-signature-only`|`reject-*`).
 */
export type AnnounceValidateState = Record<string, never>;

export type AnnounceValidateEvent =
  | Event
  | {
      readonly kind: "announce/validate-gate";
      readonly parsedOk: boolean;
      readonly publicKeyLoaded: boolean;
      readonly signatureValid: boolean;
      readonly onlyValidateSignature: boolean;
      readonly destinationHashMatches: boolean;
    };

/**
 * Adapter returns true / false only from these actions.
 * Plan nested via {@link stepAnnounceValidateOutcomePlanWithActions}
 * (`accept`|`accept-signature-only`|`reject-*`).
 */
export type AnnounceValidateAction = { readonly kind: AnnounceValidatePlan };

export interface AnnounceValidateStepResult {
  readonly state: AnnounceValidateState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceValidateAction[];
}

export function initialAnnounceValidateState(): AnnounceValidateState {
  return {};
}

export const stepAnnounceValidate: StepFn<AnnounceValidateState> = (
  state,
  event,
) => {
  const result = stepAnnounceValidateInner(
    state,
    event as AnnounceValidateEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepAnnounceValidateWithActions(
  state: AnnounceValidateState,
  event: AnnounceValidateEvent,
): AnnounceValidateStepResult {
  return stepAnnounceValidateInner(state, event);
}

/** Whether validate may return true from accept / accept-signature-only actions. */
export function shouldAcceptAnnounceValidate(
  actions: ReadonlyArray<AnnounceValidateAction>,
): boolean {
  return actions.some(
    (action) =>
      action.kind === "accept" || action.kind === "accept-signature-only",
  );
}

function stepAnnounceValidateInner(
  state: AnnounceValidateState,
  event: AnnounceValidateEvent,
): AnnounceValidateStepResult {
  if (event.kind === "announce/validate-gate") {
    const planActions = stepAnnounceValidateOutcomePlanWithActions(
      initialAnnounceValidateOutcomePlanState(),
      {
        kind: "announce/validate-outcome-plan-gate",
        parsedOk: event.parsedOk,
        publicKeyLoaded: event.publicKeyLoaded,
        signatureValid: event.signatureValid,
        onlyValidateSignature: event.onlyValidateSignature,
        destinationHashMatches: event.destinationHashMatches,
      },
    ).actions;
    const plan = announceValidateOutcomePlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

export type AnnounceBuildPlan =
  | "ok"
  | "not-announceable-type"
  | "not-announceable-direction"
  | "missing-identity"
  | "bad-random-hash"
  | "bad-ratchet";

/**
 * Whether Announce.buildPacket may proceed (SINGLE IN + identity + material sizes).
 * Entropy/signing stay at the adapter edge.
 */
export function planAnnounceBuild(input: {
  readonly typeSingle: boolean;
  readonly directionIn: boolean;
  readonly identityPresent: boolean;
  readonly randomHashLength: number;
  readonly ratchetPublicKeyLength: number | null;
}): AnnounceBuildPlan {
  if (!input.typeSingle) {
    return "not-announceable-type";
  }
  if (!input.directionIn) {
    return "not-announceable-direction";
  }
  if (!input.identityPresent) {
    return "missing-identity";
  }
  if (input.randomHashLength !== ANNOUNCE_RANDOM_HASH_SIZE) {
    return "bad-random-hash";
  }
  if (
    input.ratchetPublicKeyLength !== null &&
    input.ratchetPublicKeyLength !== ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE
  ) {
    return "bad-ratchet";
  }
  return "ok";
}

/**
 * Announce-build-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planAnnounceBuild` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepAnnounceBuildWithActions}.
 */
export type AnnounceBuildPlanState = Record<string, never>;

export type AnnounceBuildPlanEvent =
  | Event
  | {
      readonly kind: "announce/build-plan-gate";
      readonly typeSingle: boolean;
      readonly directionIn: boolean;
      readonly identityPresent: boolean;
      readonly randomHashLength: number;
      readonly ratchetPublicKeyLength: number | null;
    };

export type AnnounceBuildPlanAction = { readonly kind: AnnounceBuildPlan };

export interface AnnounceBuildPlanStepResult {
  readonly state: AnnounceBuildPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceBuildPlanAction[];
}

export function initialAnnounceBuildPlanState(): AnnounceBuildPlanState {
  return {};
}

export function stepAnnounceBuildPlanWithActions(
  state: AnnounceBuildPlanState,
  event: AnnounceBuildPlanEvent,
): AnnounceBuildPlanStepResult {
  if (event.kind === "announce/build-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planAnnounceBuild({
            typeSingle: event.typeSingle,
            directionIn: event.directionIn,
            identityPresent: event.identityPresent,
            randomHashLength: event.randomHashLength,
            ratchetPublicKeyLength: event.ratchetPublicKeyLength,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldOkAnnounceBuildPlan(
  actions: ReadonlyArray<AnnounceBuildPlanAction>,
): boolean {
  return hasActionOfKind(actions, "ok");
}

export function shouldRejectAnnounceBuildPlanNotAnnounceableType(
  actions: ReadonlyArray<AnnounceBuildPlanAction>,
): boolean {
  return hasActionOfKind(actions, "not-announceable-type");
}

export function shouldRejectAnnounceBuildPlanNotAnnounceableDirection(
  actions: ReadonlyArray<AnnounceBuildPlanAction>,
): boolean {
  return hasActionOfKind(actions, "not-announceable-direction");
}

export function shouldRejectAnnounceBuildPlanMissingIdentity(
  actions: ReadonlyArray<AnnounceBuildPlanAction>,
): boolean {
  return hasActionOfKind(actions, "missing-identity");
}

export function shouldRejectAnnounceBuildPlanBadRandomHash(
  actions: ReadonlyArray<AnnounceBuildPlanAction>,
): boolean {
  return hasActionOfKind(actions, "bad-random-hash");
}

export function shouldRejectAnnounceBuildPlanBadRatchet(
  actions: ReadonlyArray<AnnounceBuildPlanAction>,
): boolean {
  return hasActionOfKind(actions, "bad-ratchet");
}

/** Extract the build plan from actions; null when empty. */
export function announceBuildPlanFromActions(
  actions: ReadonlyArray<AnnounceBuildPlanAction>,
): AnnounceBuildPlan | null {
  const action = firstAction(actions);
  return action?.kind ?? null;
}

/**
 * Announce build gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepAnnounceBuildPlanWithActions}
 * (`ok`|`not-announceable-type`|`not-announceable-direction`|`missing-identity`|
 * `bad-random-hash`|`bad-ratchet`).
 */
export type AnnounceBuildState = Record<string, never>;

export type AnnounceBuildEvent =
  | Event
  | {
      readonly kind: "announce/build-gate";
      readonly typeSingle: boolean;
      readonly directionIn: boolean;
      readonly identityPresent: boolean;
      readonly randomHashLength: number;
      readonly ratchetPublicKeyLength: number | null;
    };

/**
 * Adapter throws or continues only from these actions.
 * Plan nested via {@link stepAnnounceBuildPlanWithActions}
 * (`ok`|`not-announceable-type`|`not-announceable-direction`|`missing-identity`|
 * `bad-random-hash`|`bad-ratchet`).
 */
export type AnnounceBuildAction =
  | { readonly kind: "proceed" }
  | { readonly kind: "reject-not-announceable-type" }
  | { readonly kind: "reject-not-announceable-direction" }
  | { readonly kind: "reject-missing-identity" }
  | { readonly kind: "reject-bad-random-hash" }
  | { readonly kind: "reject-bad-ratchet" };

export interface AnnounceBuildStepResult {
  readonly state: AnnounceBuildState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceBuildAction[];
}

export function initialAnnounceBuildState(): AnnounceBuildState {
  return {};
}

export const stepAnnounceBuild: StepFn<AnnounceBuildState> = (state, event) => {
  const result = stepAnnounceBuildInner(state, event as AnnounceBuildEvent);
  return { state: result.state, intents: result.intents };
};

export function stepAnnounceBuildWithActions(
  state: AnnounceBuildState,
  event: AnnounceBuildEvent,
): AnnounceBuildStepResult {
  return stepAnnounceBuildInner(state, event);
}

export function shouldProceedAnnounceBuild(
  actions: ReadonlyArray<AnnounceBuildAction>,
): boolean {
  return hasActionOfKind(actions, "proceed");
}

export function shouldRejectAnnounceBuildNotAnnounceableType(
  actions: ReadonlyArray<AnnounceBuildAction>,
): boolean {
  return actions.some(
    (action) => action.kind === "reject-not-announceable-type",
  );
}

export function shouldRejectAnnounceBuildNotAnnounceableDirection(
  actions: ReadonlyArray<AnnounceBuildAction>,
): boolean {
  return actions.some(
    (action) => action.kind === "reject-not-announceable-direction",
  );
}

export function shouldRejectAnnounceBuildMissingIdentity(
  actions: ReadonlyArray<AnnounceBuildAction>,
): boolean {
  return hasActionOfKind(actions, "reject-missing-identity");
}

export function shouldRejectAnnounceBuildBadRandomHash(
  actions: ReadonlyArray<AnnounceBuildAction>,
): boolean {
  return hasActionOfKind(actions, "reject-bad-random-hash");
}

export function shouldRejectAnnounceBuildBadRatchet(
  actions: ReadonlyArray<AnnounceBuildAction>,
): boolean {
  return hasActionOfKind(actions, "reject-bad-ratchet");
}

function stepAnnounceBuildInner(
  state: AnnounceBuildState,
  event: AnnounceBuildEvent,
): AnnounceBuildStepResult {
  if (event.kind === "announce/build-gate") {
    const planActions = stepAnnounceBuildPlanWithActions(
      initialAnnounceBuildPlanState(),
      {
        kind: "announce/build-plan-gate",
        typeSingle: event.typeSingle,
        directionIn: event.directionIn,
        identityPresent: event.identityPresent,
        randomHashLength: event.randomHashLength,
        ratchetPublicKeyLength: event.ratchetPublicKeyLength,
      },
    ).actions;
    if (shouldRejectAnnounceBuildPlanNotAnnounceableType(planActions)) {
      return {
        state,
        intents: [],
        actions: [{ kind: "reject-not-announceable-type" }],
      };
    }
    if (shouldRejectAnnounceBuildPlanNotAnnounceableDirection(planActions)) {
      return {
        state,
        intents: [],
        actions: [{ kind: "reject-not-announceable-direction" }],
      };
    }
    if (shouldRejectAnnounceBuildPlanMissingIdentity(planActions)) {
      return {
        state,
        intents: [],
        actions: [{ kind: "reject-missing-identity" }],
      };
    }
    if (shouldRejectAnnounceBuildPlanBadRandomHash(planActions)) {
      return {
        state,
        intents: [],
        actions: [{ kind: "reject-bad-random-hash" }],
      };
    }
    if (shouldRejectAnnounceBuildPlanBadRatchet(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-bad-ratchet" }] };
    }
    if (!shouldOkAnnounceBuildPlan(planActions)) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: "proceed" }] };
  }

  return { state, intents: [], actions: [] };
}
