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
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  DestinationTypeCode,
  isDestinationDirectionCode,
  isDestinationTypeCode,
} from "../packet-header.js";
import { equalByteArrays } from "../path-table.js";
import {
  initialDestinationRequestAllowPlanState,
  planDestinationRequestAllow,
} from "./part-3.js";
import type { DestinationRequestAllowPlanState } from "./part-3.js";
import { hasActionOfKind } from "../action-kind.js";
/**
 * Destination request-allow plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planDestinationRequestAllow`
 * reads beside the step). Nested under
 * {@link stepDestinationRequestAllowWithActions}.
 */
export type DestinationRequestAllowPlan = "allow" | "deny";

export type DestinationRequestAllowPlanEvent =
  | Event
  | {
      readonly kind: "destination/request-allow-plan-gate";
      readonly allow: number;
      readonly allowedList: ReadonlyArray<Uint8Array>;
      readonly remoteIdentityHash: Uint8Array | null;
    };

export type DestinationRequestAllowPlanAction = {
  readonly kind: DestinationRequestAllowPlan;
};

export interface DestinationRequestAllowPlanStepResult {
  readonly state: DestinationRequestAllowPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationRequestAllowPlanAction[];
}

export function stepDestinationRequestAllowPlanWithActions(
  state: DestinationRequestAllowPlanState,
  event: DestinationRequestAllowPlanEvent,
): DestinationRequestAllowPlanStepResult {
  if (event.kind === "destination/request-allow-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planDestinationRequestAllow({
            allow: event.allow,
            allowedList: event.allowedList,
            remoteIdentityHash: event.remoteIdentityHash,
          })
            ? "allow"
            : "deny",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the request-allow plan from actions; null when empty. */
export function destinationRequestAllowPlanFromActions(
  actions: ReadonlyArray<DestinationRequestAllowPlanAction>,
): DestinationRequestAllowPlan | null {
  return actions[0]?.kind ?? null;
}

export function shouldAllowDestinationRequestPlan(
  actions: ReadonlyArray<DestinationRequestAllowPlanAction>,
): boolean {
  return hasActionOfKind(actions, "allow");
}

export function shouldDenyDestinationRequestPlan(
  actions: ReadonlyArray<DestinationRequestAllowPlanAction>,
): boolean {
  return hasActionOfKind(actions, "deny");
}

/**
 * Destination request-allow (ALLOW_ALL / ALLOW_LIST) gate is event-driven; no
 * durable session fields. Conclusions leave via machine actions (no ad-hoc
 * `planDestinationRequestAllow` reads beside the step).
 * Plan nested via {@link stepDestinationRequestAllowPlanWithActions}
 * (`allow`|`deny`).
 */
export type DestinationRequestAllowState = Record<string, never>;

export type DestinationRequestAllowEvent =
  | Event
  | {
      readonly kind: "destination/request-allow-gate";
      readonly allow: number;
      readonly allowedList: ReadonlyArray<Uint8Array>;
      readonly remoteIdentityHash: Uint8Array | null;
    };

export type DestinationRequestAllowAction =
  { readonly kind: "allow" } | { readonly kind: "deny" };

export interface DestinationRequestAllowStepResult {
  readonly state: DestinationRequestAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationRequestAllowAction[];
}

export function initialDestinationRequestAllowState(): DestinationRequestAllowState {
  return {};
}

export function stepDestinationRequestAllowWithActions(
  state: DestinationRequestAllowState,
  event: DestinationRequestAllowEvent,
): DestinationRequestAllowStepResult {
  if (event.kind === "destination/request-allow-gate") {
    const planActions = stepDestinationRequestAllowPlanWithActions(
      initialDestinationRequestAllowPlanState(),
      {
        kind: "destination/request-allow-plan-gate",
        allow: event.allow,
        allowedList: event.allowedList,
        remoteIdentityHash: event.remoteIdentityHash,
      },
    ).actions;
    const plan = destinationRequestAllowPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowDestinationRequest(
  actions: ReadonlyArray<DestinationRequestAllowAction>,
): boolean {
  return hasActionOfKind(actions, "allow");
}

export function shouldDenyDestinationRequest(
  actions: ReadonlyArray<DestinationRequestAllowAction>,
): boolean {
  return hasActionOfKind(actions, "deny");
}

/** Whether a validated link should be registered on the destination link list. */
export function shouldRegisterDestinationLink(
  validatedLinkPresent: boolean,
): boolean {
  return validatedLinkPresent;
}

/**
 * Destination link-registration gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldRegisterDestinationLink` reads beside the step).
 */
export type RegisterDestinationLinkState = Record<string, never>;

export type RegisterDestinationLinkEvent =
  | Event
  | {
      readonly kind: "destination/register-link-gate";
      readonly validatedLinkPresent: boolean;
    };

export type RegisterDestinationLinkAction =
  { readonly kind: "register" } | { readonly kind: "skip" };

export interface RegisterDestinationLinkStepResult {
  readonly state: RegisterDestinationLinkState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RegisterDestinationLinkAction[];
}

export function initialRegisterDestinationLinkState(): RegisterDestinationLinkState {
  return {};
}

export function stepRegisterDestinationLinkWithActions(
  state: RegisterDestinationLinkState,
  event: RegisterDestinationLinkEvent,
): RegisterDestinationLinkStepResult {
  if (event.kind === "destination/register-link-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldRegisterDestinationLink(event.validatedLinkPresent)
            ? "register"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldRegisterDestinationLinkNow(
  actions: ReadonlyArray<RegisterDestinationLinkAction>,
): boolean {
  return hasActionOfKind(actions, "register");
}

export function shouldSkipDestinationLinkRegister(
  actions: ReadonlyArray<RegisterDestinationLinkAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}
