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
import { DestinationAllowPolicyCode } from "./part-1.js";
import { stepDestinationConstructionInner } from "./part-2.js";
import type {
  DestinationConstructionAction,
  DestinationConstructionEvent,
  DestinationConstructionState,
} from "./part-2.js";
import { hasActionOfKind } from "../action-kind.js";
export function initialDestinationConstructionState(): DestinationConstructionState {
  return {};
}

export const stepDestinationConstruction: StepFn<
  DestinationConstructionState
> = (state, event) => {
  const result = stepDestinationConstructionInner(
    state,
    event as DestinationConstructionEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function shouldProceedDestinationConstruction(
  actions: ReadonlyArray<DestinationConstructionAction>,
): boolean {
  return hasActionOfKind(actions, "ok");
}

export function shouldRejectDestinationConstructionBadDirection(
  actions: ReadonlyArray<DestinationConstructionAction>,
): boolean {
  return hasActionOfKind(actions, "bad-direction");
}

export function shouldRejectDestinationConstructionBadType(
  actions: ReadonlyArray<DestinationConstructionAction>,
): boolean {
  return hasActionOfKind(actions, "bad-type");
}

export function shouldRejectDestinationConstructionBadIdentityBinding(
  actions: ReadonlyArray<DestinationConstructionAction>,
): boolean {
  return hasActionOfKind(actions, "bad-identity-binding");
}

export type DestinationDecryptPlan =
  "return-ciphertext" | "reject" | "decrypt-with-identity";

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
 * Destination-decrypt-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planDestinationDecrypt` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepDestinationDecryptWithActions}.
 */
export type DestinationDecryptPlanState = Record<string, never>;

export type DestinationDecryptPlanEvent =
  | Event
  | {
      readonly kind: "destination/decrypt-plan-gate";
      readonly typePlain: boolean;
      readonly identityPresent: boolean;
    };

export type DestinationDecryptPlanAction = {
  readonly kind: DestinationDecryptPlan;
};

export interface DestinationDecryptPlanStepResult {
  readonly state: DestinationDecryptPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationDecryptPlanAction[];
}

export function initialDestinationDecryptPlanState(): DestinationDecryptPlanState {
  return {};
}

export function stepDestinationDecryptPlanWithActions(
  state: DestinationDecryptPlanState,
  event: DestinationDecryptPlanEvent,
): DestinationDecryptPlanStepResult {
  if (event.kind === "destination/decrypt-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planDestinationDecrypt({
            typePlain: event.typePlain,
            identityPresent: event.identityPresent,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the decrypt plan from actions; null when empty. */
export function destinationDecryptPlanFromActions(
  actions: ReadonlyArray<DestinationDecryptPlanAction>,
): DestinationDecryptPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "return-ciphertext" ||
      entry.kind === "reject" ||
      entry.kind === "decrypt-with-identity",
  );
  return action?.kind ?? null;
}

export function shouldReturnDestinationDecryptPlanCiphertext(
  actions: ReadonlyArray<DestinationDecryptPlanAction>,
): boolean {
  return hasActionOfKind(actions, "return-ciphertext");
}

export function shouldRejectDestinationDecryptPlan(
  actions: ReadonlyArray<DestinationDecryptPlanAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

export function shouldDecryptDestinationPlanWithIdentity(
  actions: ReadonlyArray<DestinationDecryptPlanAction>,
): boolean {
  return hasActionOfKind(actions, "decrypt-with-identity");
}

/**
 * Destination decrypt gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepDestinationDecryptPlanWithActions}
 * (`return-ciphertext`|`reject`|`decrypt-with-identity`).
 */
export type DestinationDecryptState = Record<string, never>;

export type DestinationDecryptEvent =
  | Event
  | {
      readonly kind: "destination/decrypt-gate";
      readonly typePlain: boolean;
      readonly identityPresent: boolean;
    };

/**
 * Adapter applies decrypt outcomes only from these actions.
 * Plan nested via {@link stepDestinationDecryptPlanWithActions}
 * (`return-ciphertext`|`reject`|`decrypt-with-identity`).
 */
export type DestinationDecryptAction = {
  readonly kind: DestinationDecryptPlan;
};

export interface DestinationDecryptStepResult {
  readonly state: DestinationDecryptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationDecryptAction[];
}

export function initialDestinationDecryptState(): DestinationDecryptState {
  return {};
}

export const stepDestinationDecrypt: StepFn<DestinationDecryptState> = (
  state,
  event,
) => {
  const result = stepDestinationDecryptInner(
    state,
    event as DestinationDecryptEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepDestinationDecryptWithActions(
  state: DestinationDecryptState,
  event: DestinationDecryptEvent,
): DestinationDecryptStepResult {
  return stepDestinationDecryptInner(state, event);
}

export function shouldReturnDestinationDecryptCiphertext(
  actions: ReadonlyArray<DestinationDecryptAction>,
): boolean {
  return hasActionOfKind(actions, "return-ciphertext");
}

export function shouldRejectDestinationDecrypt(
  actions: ReadonlyArray<DestinationDecryptAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

export function shouldDecryptDestinationWithIdentity(
  actions: ReadonlyArray<DestinationDecryptAction>,
): boolean {
  return hasActionOfKind(actions, "decrypt-with-identity");
}

function stepDestinationDecryptInner(
  state: DestinationDecryptState,
  event: DestinationDecryptEvent,
): DestinationDecryptStepResult {
  if (event.kind === "destination/decrypt-gate") {
    const planActions = stepDestinationDecryptPlanWithActions(
      initialDestinationDecryptPlanState(),
      {
        kind: "destination/decrypt-plan-gate",
        typePlain: event.typePlain,
        identityPresent: event.identityPresent,
      },
    ).actions;
    const plan = destinationDecryptPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

export type DestinationEncryptPlan =
  "use-plaintext" | "reject" | "encrypt-with-identity";

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
 * Destination-encrypt-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planDestinationEncrypt` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepDestinationEncryptWithActions}.
 */
export type DestinationEncryptPlanState = Record<string, never>;

export type DestinationEncryptPlanEvent =
  | Event
  | {
      readonly kind: "destination/encrypt-plan-gate";
      readonly typePlain: boolean;
      readonly identityPresent: boolean;
    };

export type DestinationEncryptPlanAction = {
  readonly kind: DestinationEncryptPlan;
};

export interface DestinationEncryptPlanStepResult {
  readonly state: DestinationEncryptPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationEncryptPlanAction[];
}

export function initialDestinationEncryptPlanState(): DestinationEncryptPlanState {
  return {};
}

export function stepDestinationEncryptPlanWithActions(
  state: DestinationEncryptPlanState,
  event: DestinationEncryptPlanEvent,
): DestinationEncryptPlanStepResult {
  if (event.kind === "destination/encrypt-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planDestinationEncrypt({
            typePlain: event.typePlain,
            identityPresent: event.identityPresent,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the encrypt plan from actions; null when empty. */
export function destinationEncryptPlanFromActions(
  actions: ReadonlyArray<DestinationEncryptPlanAction>,
): DestinationEncryptPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "use-plaintext" ||
      entry.kind === "reject" ||
      entry.kind === "encrypt-with-identity",
  );
  return action?.kind ?? null;
}

export function shouldUseDestinationEncryptPlanPlaintext(
  actions: ReadonlyArray<DestinationEncryptPlanAction>,
): boolean {
  return hasActionOfKind(actions, "use-plaintext");
}

export function shouldRejectDestinationEncryptPlan(
  actions: ReadonlyArray<DestinationEncryptPlanAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

export function shouldEncryptDestinationPlanWithIdentity(
  actions: ReadonlyArray<DestinationEncryptPlanAction>,
): boolean {
  return hasActionOfKind(actions, "encrypt-with-identity");
}

/**
 * Destination encrypt gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepDestinationEncryptPlanWithActions}
 * (`use-plaintext`|`reject`|`encrypt-with-identity`).
 */
export type DestinationEncryptState = Record<string, never>;

export type DestinationEncryptEvent =
  | Event
  | {
      readonly kind: "destination/encrypt-gate";
      readonly typePlain: boolean;
      readonly identityPresent: boolean;
    };

/**
 * Adapter applies encrypt outcomes only from these actions.
 * Plan nested via {@link stepDestinationEncryptPlanWithActions}
 * (`use-plaintext`|`reject`|`encrypt-with-identity`).
 */
export type DestinationEncryptAction = {
  readonly kind: DestinationEncryptPlan;
};

export interface DestinationEncryptStepResult {
  readonly state: DestinationEncryptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationEncryptAction[];
}

export function initialDestinationEncryptState(): DestinationEncryptState {
  return {};
}

export const stepDestinationEncrypt: StepFn<DestinationEncryptState> = (
  state,
  event,
) => {
  const result = stepDestinationEncryptInner(
    state,
    event as DestinationEncryptEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepDestinationEncryptWithActions(
  state: DestinationEncryptState,
  event: DestinationEncryptEvent,
): DestinationEncryptStepResult {
  return stepDestinationEncryptInner(state, event);
}

export function shouldUseDestinationEncryptPlaintext(
  actions: ReadonlyArray<DestinationEncryptAction>,
): boolean {
  return hasActionOfKind(actions, "use-plaintext");
}

export function shouldRejectDestinationEncrypt(
  actions: ReadonlyArray<DestinationEncryptAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

export function shouldEncryptDestinationWithIdentity(
  actions: ReadonlyArray<DestinationEncryptAction>,
): boolean {
  return hasActionOfKind(actions, "encrypt-with-identity");
}

function stepDestinationEncryptInner(
  state: DestinationEncryptState,
  event: DestinationEncryptEvent,
): DestinationEncryptStepResult {
  if (event.kind === "destination/encrypt-gate") {
    const planActions = stepDestinationEncryptPlanWithActions(
      initialDestinationEncryptPlanState(),
      {
        kind: "destination/encrypt-plan-gate",
        typePlain: event.typePlain,
        identityPresent: event.identityPresent,
      },
    ).actions;
    const plan = destinationEncryptPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
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

export type DestinationRequestAllowPlanState = Record<string, never>;

export function initialDestinationRequestAllowPlanState(): DestinationRequestAllowPlanState {
  return {};
}
