/**
 * Pure link teardown gate and reason planning.
 * Packet send / decrypt stay at the adapter edge.
 * Conclusions leave via machine actions (no ad-hoc `plan.kind` /
 * `planLinkTeardown` / `shouldAcceptLinkTeardown` / `planLinkTeardownReason`
 * reads beside the step).
 * Teardown plan nested via {@link stepLinkTeardownPlanWithActions}.
 * Reason plan nested via {@link stepLinkTeardownReasonPlanWithActions}.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  LinkStatus,
  LinkTeardownReason,
  type LinkStatusValue,
  type LinkTeardownReasonValue,
} from "./link-watchdog.js";
import { firstActionOfKind, hasActionOfKind } from "./action-kind.js";

export type LinkTeardownPlan =
  | { readonly kind: "close-only" }
  | { readonly kind: "send-teardown-then-close" };

export interface LinkTeardownState {
  readonly status: LinkStatusValue | number;
  readonly initiator: boolean;
}

export type LinkTeardownEvent =
  | Event
  | { readonly kind: "teardown/local" }
  | {
      readonly kind: "teardown/remote";
      readonly plaintextPresent: boolean;
      readonly linkIdMatches: boolean;
    };

/**
 * Adapter applies close / send-LINKCLOSE / remote-close only from these actions.
 */
export type LinkTeardownAction =
  | { readonly kind: "close-only" }
  | {
      readonly kind: "send-teardown-then-close";
      readonly reason: LinkTeardownReasonValue;
    }
  | {
      readonly kind: "accept-remote-close";
      readonly reason: LinkTeardownReasonValue;
    };

export interface LinkTeardownStepResult {
  readonly state: LinkTeardownState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkTeardownAction[];
}

export function initialLinkTeardownState(input: {
  readonly status: LinkStatusValue | number;
  readonly initiator: boolean;
}): LinkTeardownState {
  return {
    status: input.status,
    initiator: input.initiator,
  };
}

/** PENDING/CLOSED links only close; otherwise send LINKCLOSE first. */
export function planLinkTeardown(
  status: LinkStatusValue | number,
): LinkTeardownPlan {
  if (status === LinkStatus.PENDING || status === LinkStatus.CLOSED) {
    return { kind: "close-only" };
  }
  return { kind: "send-teardown-then-close" };
}

/**
 * planLinkTeardown planning is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkTeardown` /
 * `plan.kind` reads beside the step).
 */
export type LinkTeardownPlanState = Record<string, never>;

export type LinkTeardownPlanEvent =
  | Event
  | {
      readonly kind: "link/teardown-plan-gate";
      readonly status: LinkStatusValue | number;
    };

export type LinkTeardownPlanAction =
  | { readonly kind: "close-only" }
  | { readonly kind: "send-teardown-then-close" };

export interface LinkTeardownPlanStepResult {
  readonly state: LinkTeardownPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkTeardownPlanAction[];
}

export function initialLinkTeardownPlanState(): LinkTeardownPlanState {
  return {};
}

export function stepLinkTeardownPlanWithActions(
  state: LinkTeardownPlanState,
  event: LinkTeardownPlanEvent,
): LinkTeardownPlanStepResult {
  if (event.kind === "link/teardown-plan-gate") {
    return {
      state,
      intents: [],
      actions: [planLinkTeardown(event.status)],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether step actions include close-only. */
export function shouldCloseOnlyLinkTeardownPlan(
  actions: ReadonlyArray<LinkTeardownPlanAction>,
): boolean {
  return hasActionOfKind(actions, "close-only");
}

/** Whether step actions include send-teardown-then-close. */
export function shouldSendLinkTeardownThenClosePlan(
  actions: ReadonlyArray<LinkTeardownPlanAction>,
): boolean {
  return hasActionOfKind(actions, "send-teardown-then-close");
}

/** Extract teardown plan from step actions; null when empty. */
export function linkTeardownPlanFromActions(
  actions: ReadonlyArray<LinkTeardownPlanAction>,
): LinkTeardownPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "close-only" || entry.kind === "send-teardown-then-close",
  );
  return action ?? null;
}

/**
 * Local teardown: initiator closed vs destination closed.
 * Remote peer teardown inverts the reason relative to this node.
 */
export function planLinkTeardownReason(input: {
  readonly initiator: boolean;
  readonly remote: boolean;
}): LinkTeardownReasonValue {
  if (input.remote) {
    return input.initiator
      ? LinkTeardownReason.DESTINATION_CLOSED
      : LinkTeardownReason.INITIATOR_CLOSED;
  }
  return input.initiator
    ? LinkTeardownReason.INITIATOR_CLOSED
    : LinkTeardownReason.DESTINATION_CLOSED;
}

/**
 * planLinkTeardownReason planning is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkTeardownReason`
 * reads beside the step). Nested under {@link stepLinkTeardownReasonWithActions}.
 */
export type LinkTeardownReasonPlanState = Record<string, never>;

export type LinkTeardownReasonPlanEvent =
  | Event
  | {
      readonly kind: "link/teardown-reason-plan-gate";
      readonly initiator: boolean;
      readonly remote: boolean;
    };

export type LinkTeardownReasonPlanAction = {
  readonly kind: "use-reason";
  readonly reason: LinkTeardownReasonValue;
};

export interface LinkTeardownReasonPlanStepResult {
  readonly state: LinkTeardownReasonPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkTeardownReasonPlanAction[];
}

export function initialLinkTeardownReasonPlanState(): LinkTeardownReasonPlanState {
  return {};
}

export function stepLinkTeardownReasonPlanWithActions(
  state: LinkTeardownReasonPlanState,
  event: LinkTeardownReasonPlanEvent,
): LinkTeardownReasonPlanStepResult {
  if (event.kind === "link/teardown-reason-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-reason",
          reason: planLinkTeardownReason({
            initiator: event.initiator,
            remote: event.remote,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseLinkTeardownReasonPlan(
  actions: ReadonlyArray<LinkTeardownReasonPlanAction>,
): boolean {
  return hasActionOfKind(actions, "use-reason");
}

/** Extract teardown reason from plan-step actions; null when no `use-reason`. */
export function linkTeardownReasonPlanFromActions(
  actions: ReadonlyArray<LinkTeardownReasonPlanAction>,
): LinkTeardownReasonValue | null {
  return firstActionOfKind(actions, "use-reason")?.reason ?? null;
}

/**
 * Teardown-reason gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkTeardownReason`
 * reads beside the step).
 * Plan nested via {@link stepLinkTeardownReasonPlanWithActions} (`use-reason`).
 */
export type LinkTeardownReasonState = Record<string, never>;

export type LinkTeardownReasonEvent =
  | Event
  | {
      readonly kind: "link/teardown-reason-gate";
      readonly initiator: boolean;
      readonly remote: boolean;
    };

export type LinkTeardownReasonAction = {
  readonly kind: "use-reason";
  readonly reason: LinkTeardownReasonValue;
};

export interface LinkTeardownReasonStepResult {
  readonly state: LinkTeardownReasonState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkTeardownReasonAction[];
}

export function initialLinkTeardownReasonState(): LinkTeardownReasonState {
  return {};
}

export function stepLinkTeardownReasonWithActions(
  state: LinkTeardownReasonState,
  event: LinkTeardownReasonEvent,
): LinkTeardownReasonStepResult {
  if (event.kind === "link/teardown-reason-gate") {
    const planActions = stepLinkTeardownReasonPlanWithActions(
      initialLinkTeardownReasonPlanState(),
      {
        kind: "link/teardown-reason-plan-gate",
        initiator: event.initiator,
        remote: event.remote,
      },
    ).actions;
    const reason = linkTeardownReasonPlanFromActions(planActions);
    if (reason === null) {
      return { state, intents: [], actions: [] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "use-reason", reason }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseLinkTeardownReason(
  actions: ReadonlyArray<LinkTeardownReasonAction>,
): boolean {
  return hasActionOfKind(actions, "use-reason");
}

/** Extract teardown reason from step actions; null when no `use-reason`. */
export function linkTeardownReasonFromActions(
  actions: ReadonlyArray<LinkTeardownReasonAction>,
): LinkTeardownReasonValue | null {
  return firstActionOfKind(actions, "use-reason")?.reason ?? null;
}

/** Whether a decrypted LINKCLOSE payload is acceptable for this link. */
export function shouldAcceptLinkTeardown(input: {
  readonly plaintextPresent: boolean;
  readonly linkIdMatches: boolean;
}): boolean {
  return input.plaintextPresent && input.linkIdMatches;
}

/**
 * shouldAcceptLinkTeardown gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAcceptLinkTeardown`
 * reads beside the step).
 */
export type AcceptLinkTeardownState = Record<string, never>;

export type AcceptLinkTeardownEvent =
  | Event
  | {
      readonly kind: "link/accept-teardown-gate";
      readonly plaintextPresent: boolean;
      readonly linkIdMatches: boolean;
    };

export type AcceptLinkTeardownAction =
  { readonly kind: "accept" } | { readonly kind: "skip" };

export interface AcceptLinkTeardownStepResult {
  readonly state: AcceptLinkTeardownState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptLinkTeardownAction[];
}

export function initialAcceptLinkTeardownState(): AcceptLinkTeardownState {
  return {};
}

export function stepAcceptLinkTeardownWithActions(
  state: AcceptLinkTeardownState,
  event: AcceptLinkTeardownEvent,
): AcceptLinkTeardownStepResult {
  if (event.kind === "link/accept-teardown-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptLinkTeardown({
            plaintextPresent: event.plaintextPresent,
            linkIdMatches: event.linkIdMatches,
          })
            ? "accept"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptLinkTeardownNow(
  actions: ReadonlyArray<AcceptLinkTeardownAction>,
): boolean {
  return hasActionOfKind(actions, "accept");
}

export function shouldSkipLinkTeardownAccept(
  actions: ReadonlyArray<AcceptLinkTeardownAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

export const stepLinkTeardown: StepFn<LinkTeardownState> = (state, event) => {
  const result = stepLinkTeardownInner(state, event as LinkTeardownEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLinkTeardownWithActions(
  state: LinkTeardownState,
  event: LinkTeardownEvent,
): LinkTeardownStepResult {
  return stepLinkTeardownInner(state, event);
}

/** Whether step actions include close-only. */
export function shouldCloseOnlyLinkTeardown(
  actions: ReadonlyArray<LinkTeardownAction>,
): boolean {
  return hasActionOfKind(actions, "close-only");
}

/** Whether step actions include send-teardown-then-close. */
export function shouldSendLinkTeardownThenClose(
  actions: ReadonlyArray<LinkTeardownAction>,
): boolean {
  return hasActionOfKind(actions, "send-teardown-then-close");
}

/** Whether step actions include accept-remote-close. */
export function shouldAcceptRemoteLinkTeardown(
  actions: ReadonlyArray<LinkTeardownAction>,
): boolean {
  return hasActionOfKind(actions, "accept-remote-close");
}

/** Extract the send-teardown-then-close action, if any. */
export function linkTeardownSendThenCloseAction(
  actions: ReadonlyArray<LinkTeardownAction>,
): Extract<LinkTeardownAction, { kind: "send-teardown-then-close" }> | null {
  for (const action of actions) {
    if (action.kind === "send-teardown-then-close") {
      return action;
    }
  }
  return null;
}

/** Extract the accept-remote-close action, if any. */
export function linkTeardownRemoteCloseAction(
  actions: ReadonlyArray<LinkTeardownAction>,
): Extract<LinkTeardownAction, { kind: "accept-remote-close" }> | null {
  for (const action of actions) {
    if (action.kind === "accept-remote-close") {
      return action;
    }
  }
  return null;
}

function stepLinkTeardownInner(
  state: LinkTeardownState,
  event: LinkTeardownEvent,
): LinkTeardownStepResult {
  if (event.kind === "teardown/local") {
    const planActions = stepLinkTeardownPlanWithActions(
      initialLinkTeardownPlanState(),
      {
        kind: "link/teardown-plan-gate",
        status: state.status,
      },
    ).actions;
    if (shouldCloseOnlyLinkTeardownPlan(planActions)) {
      return {
        state: { ...state, status: LinkStatus.CLOSED },
        intents: [],
        actions: [{ kind: "close-only" }],
      };
    }
    if (!shouldSendLinkTeardownThenClosePlan(planActions)) {
      return { state, intents: [], actions: [] };
    }
    const reason = linkTeardownReasonFromActions(
      stepLinkTeardownReasonWithActions(initialLinkTeardownReasonState(), {
        kind: "link/teardown-reason-gate",
        initiator: state.initiator,
        remote: false,
      }).actions,
    );
    if (reason === null) {
      return { state, intents: [], actions: [] };
    }
    return {
      state: { ...state, status: LinkStatus.CLOSED },
      intents: [],
      actions: [{ kind: "send-teardown-then-close", reason }],
    };
  }

  if (event.kind === "teardown/remote") {
    if (
      !shouldAcceptLinkTeardownNow(
        stepAcceptLinkTeardownWithActions(initialAcceptLinkTeardownState(), {
          kind: "link/accept-teardown-gate",
          plaintextPresent: event.plaintextPresent,
          linkIdMatches: event.linkIdMatches,
        }).actions,
      )
    ) {
      return { state, intents: [], actions: [] };
    }
    const reason = linkTeardownReasonFromActions(
      stepLinkTeardownReasonWithActions(initialLinkTeardownReasonState(), {
        kind: "link/teardown-reason-gate",
        initiator: state.initiator,
        remote: true,
      }).actions,
    );
    if (reason === null) {
      return { state, intents: [], actions: [] };
    }
    return {
      state: { ...state, status: LinkStatus.CLOSED },
      intents: [],
      actions: [{ kind: "accept-remote-close", reason }],
    };
  }

  return { state, intents: [], actions: [] };
}
