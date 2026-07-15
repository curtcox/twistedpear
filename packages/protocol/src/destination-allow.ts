/**
 * Pure destination request allow-policy codes and allow decision.
 * Construction / encrypt / decrypt conclusions leave via machine actions
 * (no ad-hoc plan reads beside the step). Link-accept / announce / send /
 * attached / announce-identity / request-link / proof-callback /
 * link-established-callback / register-link / request-path gates conclude via
 * machine actions (no ad-hoc `canAcceptDestinationLinkRequest` /
 * `canAnnounceDestination` / `canDestinationSend` /
 * `canOperateAttachedDestination` / `canAnnounceWithIdentity` /
 * `canRequestLinkDestination` / `planDestinationRequestAllow` /
 * `shouldInvokeDestinationProofCallback` /
 * `shouldInvokeDestinationLinkEstablishedCallback` /
 * `shouldRegisterDestinationLink` / `isValidDestinationRequestPath` reads
 * beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  DestinationTypeCode,
  isDestinationDirectionCode,
  isDestinationTypeCode
} from "./packet-header.js";
import { equalByteArrays } from "./path-table.js";

export const DestinationAllowPolicyCode = {
  ALLOW_NONE: 0x00,
  ALLOW_ALL: 0x01,
  ALLOW_LIST: 0x02
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
  | { readonly kind: "valid" }
  | { readonly kind: "invalid" };

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
  event: DestinationRequestPathValidEvent
): DestinationRequestPathValidStepResult {
  if (event.kind === "destination/request-path-valid-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: isValidDestinationRequestPath(event.path) ? "valid" : "invalid"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptDestinationRequestPath(
  actions: ReadonlyArray<DestinationRequestPathValidAction>
): boolean {
  return actions.some((action) => action.kind === "valid");
}

export function shouldRejectDestinationRequestPath(
  actions: ReadonlyArray<DestinationRequestPathValidAction>
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
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

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
  event: AcceptDestinationLinkRequestEvent
): AcceptDestinationLinkRequestStepResult {
  if (event.kind === "destination/accept-link-request-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canAcceptDestinationLinkRequest({
            acceptLinkRequests: event.acceptLinkRequests,
            directionIn: event.directionIn
          })
            ? "allow"
            : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowDestinationLinkRequest(
  actions: ReadonlyArray<AcceptDestinationLinkRequestAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyDestinationLinkRequest(
  actions: ReadonlyArray<AcceptDestinationLinkRequestAction>
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
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

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
  event: AnnounceDestinationEvent
): AnnounceDestinationStepResult {
  if (event.kind === "destination/announce-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canAnnounceDestination({
            typeSingle: event.typeSingle,
            directionIn: event.directionIn
          })
            ? "allow"
            : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowDestinationAnnounce(
  actions: ReadonlyArray<AnnounceDestinationAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyDestinationAnnounce(
  actions: ReadonlyArray<AnnounceDestinationAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
}

/** Whether announce/send/requestLink may run (destination attached to transport). */
export function canOperateAttachedDestination(transportPresent: boolean): boolean {
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
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

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
  event: OperateAttachedDestinationEvent
): OperateAttachedDestinationStepResult {
  if (event.kind === "destination/operate-attached-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canOperateAttachedDestination(event.transportPresent) ? "allow" : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowOperateAttachedDestination(
  actions: ReadonlyArray<OperateAttachedDestinationAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyOperateAttachedDestination(
  actions: ReadonlyArray<OperateAttachedDestinationAction>
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
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

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
  event: AnnounceWithIdentityEvent
): AnnounceWithIdentityStepResult {
  if (event.kind === "destination/announce-with-identity-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canAnnounceWithIdentity(event.identityPresent) ? "allow" : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowAnnounceWithIdentity(
  actions: ReadonlyArray<AnnounceWithIdentityAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyAnnounceWithIdentity(
  actions: ReadonlyArray<AnnounceWithIdentityAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
}

/** Whether PROVE_APP should invoke the destination proof-requested callback. */
export function shouldInvokeDestinationProofCallback(callbackPresent: boolean): boolean {
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
  | { readonly kind: "invoke" }
  | { readonly kind: "skip" };

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
  event: DestinationProofCallbackEvent
): DestinationProofCallbackStepResult {
  if (event.kind === "destination/proof-callback-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldInvokeDestinationProofCallback(event.callbackPresent)
            ? "invoke"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldInvokeDestinationProofCallbackNow(
  actions: ReadonlyArray<DestinationProofCallbackAction>
): boolean {
  return actions.some((action) => action.kind === "invoke");
}

export function shouldSkipDestinationProofCallback(
  actions: ReadonlyArray<DestinationProofCallbackAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether a validated link should wrap the destination link-established callback. */
export function shouldInvokeDestinationLinkEstablishedCallback(
  callbackPresent: boolean
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
  | { readonly kind: "invoke" }
  | { readonly kind: "skip" };

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
  event: DestinationLinkEstablishedCallbackEvent
): DestinationLinkEstablishedCallbackStepResult {
  if (event.kind === "destination/link-established-callback-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldInvokeDestinationLinkEstablishedCallback(event.callbackPresent)
            ? "invoke"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldInvokeDestinationLinkEstablishedCallbackNow(
  actions: ReadonlyArray<DestinationLinkEstablishedCallbackAction>
): boolean {
  return actions.some((action) => action.kind === "invoke");
}

export function shouldSkipDestinationLinkEstablishedCallback(
  actions: ReadonlyArray<DestinationLinkEstablishedCallbackAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
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
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

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
  event: DestinationSendEvent
): DestinationSendStepResult {
  if (event.kind === "destination/send-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canDestinationSend(event.directionOut) ? "allow" : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowDestinationSend(
  actions: ReadonlyArray<DestinationSendAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyDestinationSend(
  actions: ReadonlyArray<DestinationSendAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
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
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

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
  event: RequestLinkDestinationEvent
): RequestLinkDestinationStepResult {
  if (event.kind === "destination/request-link-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canRequestLinkDestination({
            typeSingle: event.typeSingle,
            directionOut: event.directionOut
          })
            ? "allow"
            : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowRequestLinkDestination(
  actions: ReadonlyArray<RequestLinkDestinationAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyRequestLinkDestination(
  actions: ReadonlyArray<RequestLinkDestinationAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
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

export type DestinationConstructionPlan =
  | "ok"
  | "bad-direction"
  | "bad-type"
  | "bad-identity-binding";

/** Whether destination construction may proceed (direction / type / identity). */
export function planDestinationConstruction(input: {
  readonly direction: number;
  readonly type: number;
  readonly identityPresent: boolean;
}): DestinationConstructionPlan {
  if (!isDestinationDirectionCode(input.direction)) {
    return "bad-direction";
  }
  if (!isDestinationTypeCode(input.type)) {
    return "bad-type";
  }
  if (
    !isValidDestinationIdentityBinding({
      typePlain: input.type === DestinationTypeCode.PLAIN,
      identityPresent: input.identityPresent
    })
  ) {
    return "bad-identity-binding";
  }
  return "ok";
}

/**
 * Destination construction gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
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

export type DestinationConstructionAction = { readonly kind: DestinationConstructionPlan };

export interface DestinationConstructionStepResult {
  readonly state: DestinationConstructionState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationConstructionAction[];
}

export function initialDestinationConstructionState(): DestinationConstructionState {
  return {};
}

export const stepDestinationConstruction: StepFn<DestinationConstructionState> = (
  state,
  event
) => {
  const result = stepDestinationConstructionInner(
    state,
    event as DestinationConstructionEvent
  );
  return { state: result.state, intents: result.intents };
};

export function stepDestinationConstructionWithActions(
  state: DestinationConstructionState,
  event: DestinationConstructionEvent
): DestinationConstructionStepResult {
  return stepDestinationConstructionInner(state, event);
}

export function shouldProceedDestinationConstruction(
  actions: ReadonlyArray<DestinationConstructionAction>
): boolean {
  return actions.some((action) => action.kind === "ok");
}

export function shouldRejectDestinationConstructionBadDirection(
  actions: ReadonlyArray<DestinationConstructionAction>
): boolean {
  return actions.some((action) => action.kind === "bad-direction");
}

export function shouldRejectDestinationConstructionBadType(
  actions: ReadonlyArray<DestinationConstructionAction>
): boolean {
  return actions.some((action) => action.kind === "bad-type");
}

export function shouldRejectDestinationConstructionBadIdentityBinding(
  actions: ReadonlyArray<DestinationConstructionAction>
): boolean {
  return actions.some((action) => action.kind === "bad-identity-binding");
}

function stepDestinationConstructionInner(
  state: DestinationConstructionState,
  event: DestinationConstructionEvent
): DestinationConstructionStepResult {
  if (event.kind === "destination/construction-gate") {
    const plan = planDestinationConstruction({
      direction: event.direction,
      type: event.type,
      identityPresent: event.identityPresent
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

export type DestinationDecryptPlan =
  | "return-ciphertext"
  | "reject"
  | "decrypt-with-identity";

/** How destination decrypt should proceed for inbound ciphertext. */
export function planDestinationDecrypt(input: {
  readonly typePlain: boolean;
  readonly identityPresent: boolean;
}): DestinationDecryptPlan {
  if (input.typePlain) {
    return "return-ciphertext";
  }
  if (!input.identityPresent) {
    return "reject";
  }
  return "decrypt-with-identity";
}

/**
 * Destination decrypt gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type DestinationDecryptState = Record<string, never>;

export type DestinationDecryptEvent =
  | Event
  | {
      readonly kind: "destination/decrypt-gate";
      readonly typePlain: boolean;
      readonly identityPresent: boolean;
    };

export type DestinationDecryptAction = { readonly kind: DestinationDecryptPlan };

export interface DestinationDecryptStepResult {
  readonly state: DestinationDecryptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationDecryptAction[];
}

export function initialDestinationDecryptState(): DestinationDecryptState {
  return {};
}

export const stepDestinationDecrypt: StepFn<DestinationDecryptState> = (state, event) => {
  const result = stepDestinationDecryptInner(state, event as DestinationDecryptEvent);
  return { state: result.state, intents: result.intents };
};

export function stepDestinationDecryptWithActions(
  state: DestinationDecryptState,
  event: DestinationDecryptEvent
): DestinationDecryptStepResult {
  return stepDestinationDecryptInner(state, event);
}

export function shouldReturnDestinationDecryptCiphertext(
  actions: ReadonlyArray<DestinationDecryptAction>
): boolean {
  return actions.some((action) => action.kind === "return-ciphertext");
}

export function shouldRejectDestinationDecrypt(
  actions: ReadonlyArray<DestinationDecryptAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

export function shouldDecryptDestinationWithIdentity(
  actions: ReadonlyArray<DestinationDecryptAction>
): boolean {
  return actions.some((action) => action.kind === "decrypt-with-identity");
}

function stepDestinationDecryptInner(
  state: DestinationDecryptState,
  event: DestinationDecryptEvent
): DestinationDecryptStepResult {
  if (event.kind === "destination/decrypt-gate") {
    const plan = planDestinationDecrypt({
      typePlain: event.typePlain,
      identityPresent: event.identityPresent
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

export type DestinationEncryptPlan =
  | "use-plaintext"
  | "reject"
  | "encrypt-with-identity";

/** How destination send should proceed for outbound data. */
export function planDestinationEncrypt(input: {
  readonly typePlain: boolean;
  readonly identityPresent: boolean;
}): DestinationEncryptPlan {
  if (input.typePlain) {
    return "use-plaintext";
  }
  if (!input.identityPresent) {
    return "reject";
  }
  return "encrypt-with-identity";
}

/**
 * Destination encrypt gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type DestinationEncryptState = Record<string, never>;

export type DestinationEncryptEvent =
  | Event
  | {
      readonly kind: "destination/encrypt-gate";
      readonly typePlain: boolean;
      readonly identityPresent: boolean;
    };

export type DestinationEncryptAction = { readonly kind: DestinationEncryptPlan };

export interface DestinationEncryptStepResult {
  readonly state: DestinationEncryptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationEncryptAction[];
}

export function initialDestinationEncryptState(): DestinationEncryptState {
  return {};
}

export const stepDestinationEncrypt: StepFn<DestinationEncryptState> = (state, event) => {
  const result = stepDestinationEncryptInner(state, event as DestinationEncryptEvent);
  return { state: result.state, intents: result.intents };
};

export function stepDestinationEncryptWithActions(
  state: DestinationEncryptState,
  event: DestinationEncryptEvent
): DestinationEncryptStepResult {
  return stepDestinationEncryptInner(state, event);
}

export function shouldUseDestinationEncryptPlaintext(
  actions: ReadonlyArray<DestinationEncryptAction>
): boolean {
  return actions.some((action) => action.kind === "use-plaintext");
}

export function shouldRejectDestinationEncrypt(
  actions: ReadonlyArray<DestinationEncryptAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

export function shouldEncryptDestinationWithIdentity(
  actions: ReadonlyArray<DestinationEncryptAction>
): boolean {
  return actions.some((action) => action.kind === "encrypt-with-identity");
}

function stepDestinationEncryptInner(
  state: DestinationEncryptState,
  event: DestinationEncryptEvent
): DestinationEncryptStepResult {
  if (event.kind === "destination/encrypt-gate") {
    const plan = planDestinationEncrypt({
      typePlain: event.typePlain,
      identityPresent: event.identityPresent
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

export function planDestinationRequestAllow(input: {
  readonly allow: number;
  readonly allowedList: ReadonlyArray<Uint8Array>;
  readonly remoteIdentityHash: Uint8Array | null;
}): boolean {
  if (input.allow === DestinationAllowPolicyCode.ALLOW_ALL) {
    return true;
  }
  if (input.allow !== DestinationAllowPolicyCode.ALLOW_LIST) {
    return false;
  }
  if (input.remoteIdentityHash === null) {
    return false;
  }
  for (const allowed of input.allowedList) {
    if (equalByteArrays(allowed, input.remoteIdentityHash)) {
      return true;
    }
  }
  return false;
}

/**
 * Destination request-allow (ALLOW_ALL / ALLOW_LIST) gate is event-driven; no
 * durable session fields. Conclusions leave via machine actions (no ad-hoc
 * `planDestinationRequestAllow` reads beside the step).
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
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

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
  event: DestinationRequestAllowEvent
): DestinationRequestAllowStepResult {
  if (event.kind === "destination/request-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planDestinationRequestAllow({
            allow: event.allow,
            allowedList: event.allowedList,
            remoteIdentityHash: event.remoteIdentityHash
          })
            ? "allow"
            : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowDestinationRequest(
  actions: ReadonlyArray<DestinationRequestAllowAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyDestinationRequest(
  actions: ReadonlyArray<DestinationRequestAllowAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
}

/** Whether a validated link should be registered on the destination link list. */
export function shouldRegisterDestinationLink(validatedLinkPresent: boolean): boolean {
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
  | { readonly kind: "register" }
  | { readonly kind: "skip" };

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
  event: RegisterDestinationLinkEvent
): RegisterDestinationLinkStepResult {
  if (event.kind === "destination/register-link-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldRegisterDestinationLink(event.validatedLinkPresent)
            ? "register"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldRegisterDestinationLinkNow(
  actions: ReadonlyArray<RegisterDestinationLinkAction>
): boolean {
  return actions.some((action) => action.kind === "register");
}

export function shouldSkipDestinationLinkRegister(
  actions: ReadonlyArray<RegisterDestinationLinkAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}
