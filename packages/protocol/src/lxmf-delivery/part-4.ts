/** Extracted from lxmf-delivery.ts; the original module remains the public composition point. */
/**
 * Pure LXMF delivery method / representation planning.
 * Encryption and hashing stay at the adapter edge.
 * Conclusions leave via machine actions (no ad-hoc `plan.kind` /
 * `planLxmfDelivery` /
 * `canAcceptLxmfPropagationLocalDelivery` /
 * `canUnpackLxmfPropagationLocalIngress` /
 * `shouldAwaitLxmfDeliveryReceipt` / `shouldInvokeLxmfDeliveryCallback`
 * reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  LxmfUnverifiedReason,
  type LxmfUnverifiedReasonValue,
} from "../lxmf-fields.js";
import { canRegisterLxmfDeliveryIdentity } from "./part-3.js";
import type {
  RegisterLxmfDeliveryIdentityAction,
  RegisterLxmfDeliveryIdentityEvent,
  RegisterLxmfDeliveryIdentityState,
  RegisterLxmfDeliveryIdentityStepResult,
} from "./part-3.js";
export function stepRegisterLxmfDeliveryIdentityWithActions(
  state: RegisterLxmfDeliveryIdentityState,
  event: RegisterLxmfDeliveryIdentityEvent,
): RegisterLxmfDeliveryIdentityStepResult {
  if (event.kind === "lxmf/register-delivery-identity-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canRegisterLxmfDeliveryIdentity(
            event.deliveryDestinationPresent,
          )
            ? "register"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldRegisterLxmfDeliveryIdentityNow(
  actions: ReadonlyArray<RegisterLxmfDeliveryIdentityAction>,
): boolean {
  return actions.some((action) => action.kind === "register");
}

export function shouldSkipRegisterLxmfDeliveryIdentity(
  actions: ReadonlyArray<RegisterLxmfDeliveryIdentityAction>,
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/**
 * Whether changing the outbound/propagation node hash should tear down an
 * existing propagation link before the adapter clears it.
 */
export function shouldTeardownLxmfPropagationLink(
  linkPresent: boolean,
): boolean {
  return linkPresent;
}

/**
 * shouldTeardownLxmfPropagationLink gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldTeardownLxmfPropagationLink`
 * reads beside the step).
 */
export type TeardownLxmfPropagationLinkState = Record<string, never>;

export type TeardownLxmfPropagationLinkEvent =
  | Event
  | {
      readonly kind: "lxmf/teardown-propagation-link-gate";
      readonly linkPresent: boolean;
    };

export type TeardownLxmfPropagationLinkAction =
  { readonly kind: "teardown" } | { readonly kind: "skip" };

export interface TeardownLxmfPropagationLinkStepResult {
  readonly state: TeardownLxmfPropagationLinkState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TeardownLxmfPropagationLinkAction[];
}

export function initialTeardownLxmfPropagationLinkState(): TeardownLxmfPropagationLinkState {
  return {};
}

export function stepTeardownLxmfPropagationLinkWithActions(
  state: TeardownLxmfPropagationLinkState,
  event: TeardownLxmfPropagationLinkEvent,
): TeardownLxmfPropagationLinkStepResult {
  if (event.kind === "lxmf/teardown-propagation-link-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldTeardownLxmfPropagationLink(event.linkPresent)
            ? "teardown"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldTeardownLxmfPropagationLinkNow(
  actions: ReadonlyArray<TeardownLxmfPropagationLinkAction>,
): boolean {
  return actions.some((action) => action.kind === "teardown");
}

export function shouldSkipTeardownLxmfPropagationLink(
  actions: ReadonlyArray<TeardownLxmfPropagationLinkAction>,
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether opportunistic payload extraction may proceed (message packed). */
export function canExtractLxmfOpportunisticPayload(
  packedPresent: boolean,
): boolean {
  return packedPresent;
}

/**
 * canExtractLxmfOpportunisticPayload gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canExtractLxmfOpportunisticPayload`
 * reads beside the step).
 */
export type ExtractLxmfOpportunisticPayloadState = Record<string, never>;

export type ExtractLxmfOpportunisticPayloadEvent =
  | Event
  | {
      readonly kind: "lxmf/extract-opportunistic-payload-gate";
      readonly packedPresent: boolean;
    };

export type ExtractLxmfOpportunisticPayloadAction =
  { readonly kind: "extract" } | { readonly kind: "skip" };

export interface ExtractLxmfOpportunisticPayloadStepResult {
  readonly state: ExtractLxmfOpportunisticPayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ExtractLxmfOpportunisticPayloadAction[];
}

export function initialExtractLxmfOpportunisticPayloadState(): ExtractLxmfOpportunisticPayloadState {
  return {};
}

export function stepExtractLxmfOpportunisticPayloadWithActions(
  state: ExtractLxmfOpportunisticPayloadState,
  event: ExtractLxmfOpportunisticPayloadEvent,
): ExtractLxmfOpportunisticPayloadStepResult {
  if (event.kind === "lxmf/extract-opportunistic-payload-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canExtractLxmfOpportunisticPayload(event.packedPresent)
            ? "extract"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldExtractLxmfOpportunisticPayloadNow(
  actions: ReadonlyArray<ExtractLxmfOpportunisticPayloadAction>,
): boolean {
  return actions.some((action) => action.kind === "extract");
}

export function shouldSkipExtractLxmfOpportunisticPayload(
  actions: ReadonlyArray<ExtractLxmfOpportunisticPayloadAction>,
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether delivery-parameter selection may run (message packed). */
export function shouldSelectLxmfDeliveryParameters(
  packedPresent: boolean,
): boolean {
  return packedPresent;
}

/**
 * shouldSelectLxmfDeliveryParameters gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldSelectLxmfDeliveryParameters`
 * reads beside the step).
 */
export type SelectLxmfDeliveryParametersState = Record<string, never>;

export type SelectLxmfDeliveryParametersEvent =
  | Event
  | {
      readonly kind: "lxmf/select-delivery-parameters-gate";
      readonly packedPresent: boolean;
    };

export type SelectLxmfDeliveryParametersAction =
  { readonly kind: "select" } | { readonly kind: "skip" };

export interface SelectLxmfDeliveryParametersStepResult {
  readonly state: SelectLxmfDeliveryParametersState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SelectLxmfDeliveryParametersAction[];
}

export function initialSelectLxmfDeliveryParametersState(): SelectLxmfDeliveryParametersState {
  return {};
}

export function stepSelectLxmfDeliveryParametersWithActions(
  state: SelectLxmfDeliveryParametersState,
  event: SelectLxmfDeliveryParametersEvent,
): SelectLxmfDeliveryParametersStepResult {
  if (event.kind === "lxmf/select-delivery-parameters-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldSelectLxmfDeliveryParameters(event.packedPresent)
            ? "select"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldSelectLxmfDeliveryParametersNow(
  actions: ReadonlyArray<SelectLxmfDeliveryParametersAction>,
): boolean {
  return actions.some((action) => action.kind === "select");
}

export function shouldSkipSelectLxmfDeliveryParameters(
  actions: ReadonlyArray<SelectLxmfDeliveryParametersAction>,
): boolean {
  return actions.some((action) => action.kind === "skip");
}

export type LxmfPropagationSyncPrepPlan =
  "missing-node" | "missing-delivery-identity" | "ok";

/** Preflight for PropagationClient.syncMessages (node + delivery identity). */
export function planLxmfPropagationSyncPrep(input: {
  readonly nodeConfigured: boolean;
  readonly deliveryIdentityPresent: boolean;
}): LxmfPropagationSyncPrepPlan {
  if (!input.nodeConfigured) {
    return "missing-node";
  }
  if (!input.deliveryIdentityPresent) {
    return "missing-delivery-identity";
  }
  return "ok";
}

/**
 * Propagation sync-prep-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfPropagationSyncPrep` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxmfPropagationSyncPrepWithActions}.
 */
export type LxmfPropagationSyncPrepPlanState = Record<string, never>;

export type LxmfPropagationSyncPrepPlanEvent =
  | Event
  | {
      readonly kind: "propagation-sync-prep/plan-gate";
      readonly nodeConfigured: boolean;
      readonly deliveryIdentityPresent: boolean;
    };

export type LxmfPropagationSyncPrepPlanAction =
  | { readonly kind: "ok" }
  | { readonly kind: "missing-node" }
  | { readonly kind: "missing-delivery-identity" };

export interface LxmfPropagationSyncPrepPlanStepResult {
  readonly state: LxmfPropagationSyncPrepPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPropagationSyncPrepPlanAction[];
}

export function initialLxmfPropagationSyncPrepPlanState(): LxmfPropagationSyncPrepPlanState {
  return {};
}

export function stepLxmfPropagationSyncPrepPlanWithActions(
  state: LxmfPropagationSyncPrepPlanState,
  event: LxmfPropagationSyncPrepPlanEvent,
): LxmfPropagationSyncPrepPlanStepResult {
  if (event.kind === "propagation-sync-prep/plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLxmfPropagationSyncPrep({
            nodeConfigured: event.nodeConfigured,
            deliveryIdentityPresent: event.deliveryIdentityPresent,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether plan actions allow propagation sync to proceed. */
export function shouldPlanLxmfPropagationSyncPrepOk(
  actions: ReadonlyArray<LxmfPropagationSyncPrepPlanAction>,
): boolean {
  return actions.some((action) => action.kind === "ok");
}

/** Whether plan actions reject a missing propagation node. */
export function shouldRejectLxmfPropagationSyncPrepPlanMissingNode(
  actions: ReadonlyArray<LxmfPropagationSyncPrepPlanAction>,
): boolean {
  return actions.some((action) => action.kind === "missing-node");
}

/** Whether plan actions reject a missing delivery identity. */
export function shouldRejectLxmfPropagationSyncPrepPlanMissingDeliveryIdentity(
  actions: ReadonlyArray<LxmfPropagationSyncPrepPlanAction>,
): boolean {
  return actions.some((action) => action.kind === "missing-delivery-identity");
}

/** Extract the sync-prep plan from actions; null when empty. */
export function lxmfPropagationSyncPrepPlanFromActions(
  actions: ReadonlyArray<LxmfPropagationSyncPrepPlanAction>,
): LxmfPropagationSyncPrepPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "ok" ||
      entry.kind === "missing-node" ||
      entry.kind === "missing-delivery-identity",
  );
  return action?.kind ?? null;
}

/**
 * Propagation sync-prep gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfPropagationSyncPrepPlanWithActions}
 * (`ok`|`missing-node`|`missing-delivery-identity`).
 */
export type LxmfPropagationSyncPrepState = Record<string, never>;

export type LxmfPropagationSyncPrepEvent =
  | Event
  | {
      readonly kind: "propagation-sync-prep/gate";
      readonly nodeConfigured: boolean;
      readonly deliveryIdentityPresent: boolean;
    };

/**
 * Adapter applies proceed / reject only from these actions.
 * Plan nested via {@link stepLxmfPropagationSyncPrepPlanWithActions}
 * (`ok`|`missing-node`|`missing-delivery-identity`).
 */
export type LxmfPropagationSyncPrepAction =
  | { readonly kind: "proceed" }
  | { readonly kind: "reject-missing-node" }
  | { readonly kind: "reject-missing-delivery-identity" };

export interface LxmfPropagationSyncPrepStepResult {
  readonly state: LxmfPropagationSyncPrepState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPropagationSyncPrepAction[];
}

export function initialLxmfPropagationSyncPrepState(): LxmfPropagationSyncPrepState {
  return {};
}

export const stepLxmfPropagationSyncPrep: StepFn<
  LxmfPropagationSyncPrepState
> = (state, event) => {
  const result = stepLxmfPropagationSyncPrepInner(
    state,
    event as LxmfPropagationSyncPrepEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepLxmfPropagationSyncPrepWithActions(
  state: LxmfPropagationSyncPrepState,
  event: LxmfPropagationSyncPrepEvent,
): LxmfPropagationSyncPrepStepResult {
  return stepLxmfPropagationSyncPrepInner(state, event);
}

export function shouldProceedLxmfPropagationSyncPrep(
  actions: ReadonlyArray<LxmfPropagationSyncPrepAction>,
): boolean {
  return actions.some((action) => action.kind === "proceed");
}

export function shouldRejectLxmfPropagationSyncMissingNode(
  actions: ReadonlyArray<LxmfPropagationSyncPrepAction>,
): boolean {
  return actions.some((action) => action.kind === "reject-missing-node");
}

export function shouldRejectLxmfPropagationSyncMissingDeliveryIdentity(
  actions: ReadonlyArray<LxmfPropagationSyncPrepAction>,
): boolean {
  return actions.some(
    (action) => action.kind === "reject-missing-delivery-identity",
  );
}

function stepLxmfPropagationSyncPrepInner(
  state: LxmfPropagationSyncPrepState,
  event: LxmfPropagationSyncPrepEvent,
): LxmfPropagationSyncPrepStepResult {
  if (event.kind === "propagation-sync-prep/gate") {
    const planActions = stepLxmfPropagationSyncPrepPlanWithActions(
      initialLxmfPropagationSyncPrepPlanState(),
      {
        kind: "propagation-sync-prep/plan-gate",
        nodeConfigured: event.nodeConfigured,
        deliveryIdentityPresent: event.deliveryIdentityPresent,
      },
    ).actions;
    if (shouldRejectLxmfPropagationSyncPrepPlanMissingNode(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-missing-node" }] };
    }
    if (
      shouldRejectLxmfPropagationSyncPrepPlanMissingDeliveryIdentity(
        planActions,
      )
    ) {
      return {
        state,
        intents: [],
        actions: [{ kind: "reject-missing-delivery-identity" }],
      };
    }
    if (!shouldPlanLxmfPropagationSyncPrepOk(planActions)) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: "proceed" }] };
  }

  return { state, intents: [], actions: [] };
}
