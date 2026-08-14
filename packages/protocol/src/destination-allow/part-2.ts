/** Extracted from destination-allow.ts; the original module remains the public composition point. */
/**
 * Pure destination request allow-policy codes and allow decision.
 * Construction / encrypt / decrypt conclusions leave via machine actions
 * (no ad-hoc `planDestinationConstruction` / `planDestinationDecrypt` /
 * `planDestinationEncrypt` / `plan ===` reads beside the step). Link-accept /
 * announce / send / attached / announce-identity / request-link /
 * proof-callback / link-established-callback / register-link / request-path
 * gates conclude via machine actions (no ad-hoc
 * `canAcceptDestinationLinkRequest` / `canAnnounceDestination` /
 * `canDestinationSend` / `canOperateAttachedDestination` /
 * `canAnnounceWithIdentity` / `canRequestLinkDestination` /
 * `planDestinationRequestAllow` (via {@link stepDestinationRequestAllowWithActions};
 * plan nested via {@link stepDestinationRequestAllowPlanWithActions}: allow|deny) /
 * `shouldInvokeDestinationProofCallback` /
 * `shouldInvokeDestinationLinkEstablishedCallback` /
 * `shouldRegisterDestinationLink` / `isValidDestinationRequestPath` /
 * `isValidDestinationIdentityBinding` reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";
import {
  DestinationTypeCode,
  isDestinationDirectionCode,
  isDestinationTypeCode,
} from "../packet-header.js";
import { shouldInvokeDestinationLinkEstablishedCallback } from "./part-1.js";
import type {
  DestinationLinkEstablishedCallbackAction,
  DestinationLinkEstablishedCallbackEvent,
  DestinationLinkEstablishedCallbackState,
} from "./part-1.js";
import { firstAction, hasActionOfKind } from "../action-kind.js";
export interface DestinationLinkEstablishedCallbackStepResult {
  readonly state: DestinationLinkEstablishedCallbackState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationLinkEstablishedCallbackAction[];
}

export function initialDestinationLinkEstablishedCallbackState(): DestinationLinkEstablishedCallbackState {
  return {};
}

export function stepDestinationLinkEstablishedCallbackWithActions(
  state: DestinationLinkEstablishedCallbackState,
  event: DestinationLinkEstablishedCallbackEvent,
): DestinationLinkEstablishedCallbackStepResult {
  if (event.kind === "destination/link-established-callback-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldInvokeDestinationLinkEstablishedCallback(
            event.callbackPresent,
          )
            ? "invoke"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldInvokeDestinationLinkEstablishedCallbackNow(
  actions: ReadonlyArray<DestinationLinkEstablishedCallbackAction>,
): boolean {
  return hasActionOfKind(actions, "invoke");
}

export function shouldSkipDestinationLinkEstablishedCallback(
  actions: ReadonlyArray<DestinationLinkEstablishedCallbackAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/** Whether this destination may send outbound packets (OUT only). */
export function canDestinationSend(directionOut: boolean): boolean {
  return directionOut;
}

/**
 * Destination outbound-send gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canDestinationSend` reads
 * beside the step).
 */
export type DestinationSendState = Record<string, never>;

export type DestinationSendEvent =
  | Event
  | {
      readonly kind: "destination/send-gate";
      readonly directionOut: boolean;
    };

export type DestinationSendAction =
  { readonly kind: "allow" } | { readonly kind: "deny" };

export interface DestinationSendStepResult {
  readonly state: DestinationSendState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationSendAction[];
}

export function initialDestinationSendState(): DestinationSendState {
  return {};
}

export function stepDestinationSendWithActions(
  state: DestinationSendState,
  event: DestinationSendEvent,
): DestinationSendStepResult {
  if (event.kind === "destination/send-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canDestinationSend(event.directionOut) ? "allow" : "deny",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowDestinationSend(
  actions: ReadonlyArray<DestinationSendAction>,
): boolean {
  return hasActionOfKind(actions, "allow");
}

export function shouldDenyDestinationSend(
  actions: ReadonlyArray<DestinationSendAction>,
): boolean {
  return hasActionOfKind(actions, "deny");
}

/** Whether a link may be requested to this destination (OUT SINGLE only). */
export function canRequestLinkDestination(input: {
  readonly typeSingle: boolean;
  readonly directionOut: boolean;
}): boolean {
  return input.typeSingle && input.directionOut;
}

/**
 * Destination request-link gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canRequestLinkDestination`
 * reads beside the step).
 */
export type RequestLinkDestinationState = Record<string, never>;

export type RequestLinkDestinationEvent =
  | Event
  | {
      readonly kind: "destination/request-link-gate";
      readonly typeSingle: boolean;
      readonly directionOut: boolean;
    };

export type RequestLinkDestinationAction =
  { readonly kind: "allow" } | { readonly kind: "deny" };

export interface RequestLinkDestinationStepResult {
  readonly state: RequestLinkDestinationState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RequestLinkDestinationAction[];
}

export function initialRequestLinkDestinationState(): RequestLinkDestinationState {
  return {};
}

export function stepRequestLinkDestinationWithActions(
  state: RequestLinkDestinationState,
  event: RequestLinkDestinationEvent,
): RequestLinkDestinationStepResult {
  if (event.kind === "destination/request-link-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canRequestLinkDestination({
            typeSingle: event.typeSingle,
            directionOut: event.directionOut,
          })
            ? "allow"
            : "deny",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowRequestLinkDestination(
  actions: ReadonlyArray<RequestLinkDestinationAction>,
): boolean {
  return hasActionOfKind(actions, "allow");
}

export function shouldDenyRequestLinkDestination(
  actions: ReadonlyArray<RequestLinkDestinationAction>,
): boolean {
  return hasActionOfKind(actions, "deny");
}

/** Whether destination type and identity binding are valid. */
export function isValidDestinationIdentityBinding(input: {
  readonly typePlain: boolean;
  readonly identityPresent: boolean;
}): boolean {
  if (input.typePlain) {
    return !input.identityPresent;
  }
  return input.identityPresent;
}

/**
 * isValidDestinationIdentityBinding gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `isValidDestinationIdentityBinding` reads beside the step).
 */
export type DestinationIdentityBindingValidState = Record<string, never>;

export type DestinationIdentityBindingValidEvent =
  | Event
  | {
      readonly kind: "destination/identity-binding-valid-gate";
      readonly typePlain: boolean;
      readonly identityPresent: boolean;
    };

export type DestinationIdentityBindingValidAction =
  { readonly kind: "valid" } | { readonly kind: "invalid" };

export interface DestinationIdentityBindingValidStepResult {
  readonly state: DestinationIdentityBindingValidState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationIdentityBindingValidAction[];
}

export function initialDestinationIdentityBindingValidState(): DestinationIdentityBindingValidState {
  return {};
}

export function stepDestinationIdentityBindingValidWithActions(
  state: DestinationIdentityBindingValidState,
  event: DestinationIdentityBindingValidEvent,
): DestinationIdentityBindingValidStepResult {
  if (event.kind === "destination/identity-binding-valid-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: isValidDestinationIdentityBinding({
            typePlain: event.typePlain,
            identityPresent: event.identityPresent,
          })
            ? "valid"
            : "invalid",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptDestinationIdentityBinding(
  actions: ReadonlyArray<DestinationIdentityBindingValidAction>,
): boolean {
  return hasActionOfKind(actions, "valid");
}

export function shouldRejectDestinationIdentityBinding(
  actions: ReadonlyArray<DestinationIdentityBindingValidAction>,
): boolean {
  return hasActionOfKind(actions, "invalid");
}

export type DestinationConstructionPlan =
  "ok" | "bad-direction" | "bad-type" | "bad-identity-binding";

/**
 * Whether destination construction may proceed (direction / type / identity).
 * Pass `identityBindingValid` from {@link stepDestinationIdentityBindingValidWithActions}
 * (`shouldAcceptDestinationIdentityBinding`); do not re-read
 * `isValidDestinationIdentityBinding` beside the step.
 */
export function planDestinationConstruction(input: {
  readonly direction: number;
  readonly type: number;
  readonly identityBindingValid: boolean;
}): DestinationConstructionPlan {
  if (!isDestinationDirectionCode(input.direction)) {
    return "bad-direction";
  }
  if (!isDestinationTypeCode(input.type)) {
    return "bad-type";
  }
  if (!input.identityBindingValid) {
    return "bad-identity-binding";
  }
  return "ok";
}

/**
 * Destination-construction-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planDestinationConstruction`
 * / `plan ===` reads beside the step). Nested under
 * {@link stepDestinationConstructionWithActions}.
 */
export type DestinationConstructionPlanState = Record<string, never>;

export type DestinationConstructionPlanEvent =
  | Event
  | {
      readonly kind: "destination/construction-plan-gate";
      readonly direction: number;
      readonly type: number;
      readonly identityBindingValid: boolean;
    };

export type DestinationConstructionPlanAction = {
  readonly kind: DestinationConstructionPlan;
};

export interface DestinationConstructionPlanStepResult {
  readonly state: DestinationConstructionPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationConstructionPlanAction[];
}

export function initialDestinationConstructionPlanState(): DestinationConstructionPlanState {
  return {};
}

export function stepDestinationConstructionPlanWithActions(
  state: DestinationConstructionPlanState,
  event: DestinationConstructionPlanEvent,
): DestinationConstructionPlanStepResult {
  if (event.kind === "destination/construction-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planDestinationConstruction({
            direction: event.direction,
            type: event.type,
            identityBindingValid: event.identityBindingValid,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the construction plan from actions; null when empty. */
export function destinationConstructionPlanFromActions(
  actions: ReadonlyArray<DestinationConstructionPlanAction>,
): DestinationConstructionPlan | null {
  const action = firstAction(actions);
  return action?.kind ?? null;
}

export function shouldProceedDestinationConstructionPlan(
  actions: ReadonlyArray<DestinationConstructionPlanAction>,
): boolean {
  return hasActionOfKind(actions, "ok");
}

export function shouldRejectDestinationConstructionPlanBadDirection(
  actions: ReadonlyArray<DestinationConstructionPlanAction>,
): boolean {
  return hasActionOfKind(actions, "bad-direction");
}

export function shouldRejectDestinationConstructionPlanBadType(
  actions: ReadonlyArray<DestinationConstructionPlanAction>,
): boolean {
  return hasActionOfKind(actions, "bad-type");
}

export function shouldRejectDestinationConstructionPlanBadIdentityBinding(
  actions: ReadonlyArray<DestinationConstructionPlanAction>,
): boolean {
  return hasActionOfKind(actions, "bad-identity-binding");
}

/**
 * Destination construction gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan /
 * `isValidDestinationIdentityBinding` reads beside the step).
 * Plan nested via {@link stepDestinationConstructionPlanWithActions}
 * (`ok`|`bad-direction`|`bad-type`|`bad-identity-binding`).
 */
export type DestinationConstructionState = Record<string, never>;

export type DestinationConstructionEvent =
  | Event
  | {
      readonly kind: "destination/construction-gate";
      readonly direction: number;
      readonly type: number;
      readonly identityPresent: boolean;
    };

/**
 * Adapter throws or continues only from these actions.
 * Plan nested via {@link stepDestinationConstructionPlanWithActions}
 * (`ok`|`bad-direction`|`bad-type`|`bad-identity-binding`).
 */
export type DestinationConstructionAction = {
  readonly kind: DestinationConstructionPlan;
};

export interface DestinationConstructionStepResult {
  readonly state: DestinationConstructionState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationConstructionAction[];
}

export function stepDestinationConstructionWithActions(
  state: DestinationConstructionState,
  event: DestinationConstructionEvent,
): DestinationConstructionStepResult {
  return stepDestinationConstructionInner(state, event);
}

export function stepDestinationConstructionInner(
  state: DestinationConstructionState,
  event: DestinationConstructionEvent,
): DestinationConstructionStepResult {
  if (event.kind === "destination/construction-gate") {
    const identityBindingValid = shouldAcceptDestinationIdentityBinding(
      stepDestinationIdentityBindingValidWithActions(
        initialDestinationIdentityBindingValidState(),
        {
          kind: "destination/identity-binding-valid-gate",
          typePlain: event.type === DestinationTypeCode.PLAIN,
          identityPresent: event.identityPresent,
        },
      ).actions,
    );
    const planActions = stepDestinationConstructionPlanWithActions(
      initialDestinationConstructionPlanState(),
      {
        kind: "destination/construction-plan-gate",
        direction: event.direction,
        type: event.type,
        identityBindingValid,
      },
    ).actions;
    const plan = destinationConstructionPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}
