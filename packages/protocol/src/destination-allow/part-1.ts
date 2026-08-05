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

export const DestinationAllowPolicyCode = {
  ALLOW_NONE: 0x00,
  ALLOW_ALL: 0x01,
  ALLOW_LIST: 0x02,
} as const;

export type DestinationAllowPolicyCodeValue =
  (typeof DestinationAllowPolicyCode)[keyof typeof DestinationAllowPolicyCode];

/** Whether a destination request-handler path is non-empty (RNS register_request_handler). */
export function isValidDestinationRequestPath(path: string): boolean {
  return path.length > 0;
}

/**
 * Destination request-path validity gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `isValidDestinationRequestPath` reads beside the step).
 */
export type DestinationRequestPathValidState = Record<string, never>;

export type DestinationRequestPathValidEvent =
  | Event
  | {
      readonly kind: "destination/request-path-valid-gate";
      readonly path: string;
    };

export type DestinationRequestPathValidAction =
  { readonly kind: "valid" } | { readonly kind: "invalid" };

export interface DestinationRequestPathValidStepResult {
  readonly state: DestinationRequestPathValidState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationRequestPathValidAction[];
}

export function initialDestinationRequestPathValidState(): DestinationRequestPathValidState {
  return {};
}

export function stepDestinationRequestPathValidWithActions(
  state: DestinationRequestPathValidState,
  event: DestinationRequestPathValidEvent,
): DestinationRequestPathValidStepResult {
  if (event.kind === "destination/request-path-valid-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: isValidDestinationRequestPath(event.path) ? "valid" : "invalid",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptDestinationRequestPath(
  actions: ReadonlyArray<DestinationRequestPathValidAction>,
): boolean {
  return actions.some((action) => action.kind === "valid");
}

export function shouldRejectDestinationRequestPath(
  actions: ReadonlyArray<DestinationRequestPathValidAction>,
): boolean {
  return actions.some((action) => action.kind === "invalid");
}

/** Whether this destination should validate and accept inbound link requests. */
export function canAcceptDestinationLinkRequest(input: {
  readonly acceptLinkRequests: boolean;
  readonly directionIn: boolean;
}): boolean {
  return input.acceptLinkRequests && input.directionIn;
}

/**
 * Destination inbound link-request accept gate is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `canAcceptDestinationLinkRequest` reads beside the step).
 */
export type AcceptDestinationLinkRequestState = Record<string, never>;

export type AcceptDestinationLinkRequestEvent =
  | Event
  | {
      readonly kind: "destination/accept-link-request-gate";
      readonly acceptLinkRequests: boolean;
      readonly directionIn: boolean;
    };

export type AcceptDestinationLinkRequestAction =
  { readonly kind: "allow" } | { readonly kind: "deny" };

export interface AcceptDestinationLinkRequestStepResult {
  readonly state: AcceptDestinationLinkRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptDestinationLinkRequestAction[];
}

export function initialAcceptDestinationLinkRequestState(): AcceptDestinationLinkRequestState {
  return {};
}

export function stepAcceptDestinationLinkRequestWithActions(
  state: AcceptDestinationLinkRequestState,
  event: AcceptDestinationLinkRequestEvent,
): AcceptDestinationLinkRequestStepResult {
  if (event.kind === "destination/accept-link-request-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canAcceptDestinationLinkRequest({
            acceptLinkRequests: event.acceptLinkRequests,
            directionIn: event.directionIn,
          })
            ? "allow"
            : "deny",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowDestinationLinkRequest(
  actions: ReadonlyArray<AcceptDestinationLinkRequestAction>,
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyDestinationLinkRequest(
  actions: ReadonlyArray<AcceptDestinationLinkRequestAction>,
): boolean {
  return actions.some((action) => action.kind === "deny");
}

/** Whether this destination may emit announces (IN SINGLE only). */
export function canAnnounceDestination(input: {
  readonly typeSingle: boolean;
  readonly directionIn: boolean;
}): boolean {
  return input.typeSingle && input.directionIn;
}

/**
 * Destination announce allow gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canAnnounceDestination`
 * reads beside the step).
 */
export type AnnounceDestinationState = Record<string, never>;

export type AnnounceDestinationEvent =
  | Event
  | {
      readonly kind: "destination/announce-gate";
      readonly typeSingle: boolean;
      readonly directionIn: boolean;
    };

export type AnnounceDestinationAction =
  { readonly kind: "allow" } | { readonly kind: "deny" };

export interface AnnounceDestinationStepResult {
  readonly state: AnnounceDestinationState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceDestinationAction[];
}

export function initialAnnounceDestinationState(): AnnounceDestinationState {
  return {};
}

export function stepAnnounceDestinationWithActions(
  state: AnnounceDestinationState,
  event: AnnounceDestinationEvent,
): AnnounceDestinationStepResult {
  if (event.kind === "destination/announce-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canAnnounceDestination({
            typeSingle: event.typeSingle,
            directionIn: event.directionIn,
          })
            ? "allow"
            : "deny",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowDestinationAnnounce(
  actions: ReadonlyArray<AnnounceDestinationAction>,
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyDestinationAnnounce(
  actions: ReadonlyArray<AnnounceDestinationAction>,
): boolean {
  return actions.some((action) => action.kind === "deny");
}

/** Whether announce/send/requestLink may run (destination attached to transport). */
export function canOperateAttachedDestination(
  transportPresent: boolean,
): boolean {
  return transportPresent;
}

/**
 * Destination attached-operation gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `canOperateAttachedDestination` reads beside the step).
 */
export type OperateAttachedDestinationState = Record<string, never>;

export type OperateAttachedDestinationEvent =
  | Event
  | {
      readonly kind: "destination/operate-attached-gate";
      readonly transportPresent: boolean;
    };

export type OperateAttachedDestinationAction =
  { readonly kind: "allow" } | { readonly kind: "deny" };

export interface OperateAttachedDestinationStepResult {
  readonly state: OperateAttachedDestinationState;
  readonly intents: readonly Intent[];
  readonly actions: readonly OperateAttachedDestinationAction[];
}

export function initialOperateAttachedDestinationState(): OperateAttachedDestinationState {
  return {};
}

export function stepOperateAttachedDestinationWithActions(
  state: OperateAttachedDestinationState,
  event: OperateAttachedDestinationEvent,
): OperateAttachedDestinationStepResult {
  if (event.kind === "destination/operate-attached-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canOperateAttachedDestination(event.transportPresent)
            ? "allow"
            : "deny",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowOperateAttachedDestination(
  actions: ReadonlyArray<OperateAttachedDestinationAction>,
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyOperateAttachedDestination(
  actions: ReadonlyArray<OperateAttachedDestinationAction>,
): boolean {
  return actions.some((action) => action.kind === "deny");
}

/** Whether announce may proceed after type/direction allow (identity required). */
export function canAnnounceWithIdentity(identityPresent: boolean): boolean {
  return identityPresent;
}

/**
 * Destination announce-with-identity gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `canAnnounceWithIdentity` reads beside the step).
 */
export type AnnounceWithIdentityState = Record<string, never>;

export type AnnounceWithIdentityEvent =
  | Event
  | {
      readonly kind: "destination/announce-with-identity-gate";
      readonly identityPresent: boolean;
    };

export type AnnounceWithIdentityAction =
  { readonly kind: "allow" } | { readonly kind: "deny" };

export interface AnnounceWithIdentityStepResult {
  readonly state: AnnounceWithIdentityState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceWithIdentityAction[];
}

export function initialAnnounceWithIdentityState(): AnnounceWithIdentityState {
  return {};
}

export function stepAnnounceWithIdentityWithActions(
  state: AnnounceWithIdentityState,
  event: AnnounceWithIdentityEvent,
): AnnounceWithIdentityStepResult {
  if (event.kind === "destination/announce-with-identity-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canAnnounceWithIdentity(event.identityPresent)
            ? "allow"
            : "deny",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowAnnounceWithIdentity(
  actions: ReadonlyArray<AnnounceWithIdentityAction>,
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyAnnounceWithIdentity(
  actions: ReadonlyArray<AnnounceWithIdentityAction>,
): boolean {
  return actions.some((action) => action.kind === "deny");
}

/** Whether PROVE_APP should invoke the destination proof-requested callback. */
export function shouldInvokeDestinationProofCallback(
  callbackPresent: boolean,
): boolean {
  return callbackPresent;
}

/**
 * Destination proof-callback invoke gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldInvokeDestinationProofCallback` reads beside the step).
 */
export type DestinationProofCallbackState = Record<string, never>;

export type DestinationProofCallbackEvent =
  | Event
  | {
      readonly kind: "destination/proof-callback-gate";
      readonly callbackPresent: boolean;
    };

export type DestinationProofCallbackAction =
  { readonly kind: "invoke" } | { readonly kind: "skip" };

export interface DestinationProofCallbackStepResult {
  readonly state: DestinationProofCallbackState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationProofCallbackAction[];
}

export function initialDestinationProofCallbackState(): DestinationProofCallbackState {
  return {};
}

export function stepDestinationProofCallbackWithActions(
  state: DestinationProofCallbackState,
  event: DestinationProofCallbackEvent,
): DestinationProofCallbackStepResult {
  if (event.kind === "destination/proof-callback-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldInvokeDestinationProofCallback(event.callbackPresent)
            ? "invoke"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldInvokeDestinationProofCallbackNow(
  actions: ReadonlyArray<DestinationProofCallbackAction>,
): boolean {
  return actions.some((action) => action.kind === "invoke");
}

export function shouldSkipDestinationProofCallback(
  actions: ReadonlyArray<DestinationProofCallbackAction>,
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether a validated link should wrap the destination link-established callback. */
export function shouldInvokeDestinationLinkEstablishedCallback(
  callbackPresent: boolean,
): boolean {
  return callbackPresent;
}

/**
 * Destination link-established-callback invoke gate is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldInvokeDestinationLinkEstablishedCallback` reads beside the step).
 */
export type DestinationLinkEstablishedCallbackState = Record<string, never>;

export type DestinationLinkEstablishedCallbackEvent =
  | Event
  | {
      readonly kind: "destination/link-established-callback-gate";
      readonly callbackPresent: boolean;
    };

export type DestinationLinkEstablishedCallbackAction =
  { readonly kind: "invoke" } | { readonly kind: "skip" };
