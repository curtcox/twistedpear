/**
 * Pure link teardown gate and reason planning.
 * Packet send / decrypt stay at the adapter edge.
 * Conclusions leave via machine actions (no ad-hoc `plan.kind` reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  LinkStatus,
  LinkTeardownReason,
  type LinkStatusValue,
  type LinkTeardownReasonValue
} from "./link-watchdog.js";

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
    initiator: input.initiator
  };
}

/** PENDING/CLOSED links only close; otherwise send LINKCLOSE first. */
export function planLinkTeardown(status: LinkStatusValue | number): LinkTeardownPlan {
  if (status === LinkStatus.PENDING || status === LinkStatus.CLOSED) {
    return { kind: "close-only" };
  }
  return { kind: "send-teardown-then-close" };
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

/** Whether a decrypted LINKCLOSE payload is acceptable for this link. */
export function shouldAcceptLinkTeardown(input: {
  readonly plaintextPresent: boolean;
  readonly linkIdMatches: boolean;
}): boolean {
  return input.plaintextPresent && input.linkIdMatches;
}

export const stepLinkTeardown: StepFn<LinkTeardownState> = (state, event) => {
  const result = stepLinkTeardownInner(state, event as LinkTeardownEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLinkTeardownWithActions(
  state: LinkTeardownState,
  event: LinkTeardownEvent
): LinkTeardownStepResult {
  return stepLinkTeardownInner(state, event);
}

/** Whether step actions include close-only. */
export function shouldCloseOnlyLinkTeardown(
  actions: ReadonlyArray<LinkTeardownAction>
): boolean {
  return actions.some((action) => action.kind === "close-only");
}

/** Whether step actions include send-teardown-then-close. */
export function shouldSendLinkTeardownThenClose(
  actions: ReadonlyArray<LinkTeardownAction>
): boolean {
  return actions.some((action) => action.kind === "send-teardown-then-close");
}

/** Whether step actions include accept-remote-close. */
export function shouldAcceptRemoteLinkTeardown(
  actions: ReadonlyArray<LinkTeardownAction>
): boolean {
  return actions.some((action) => action.kind === "accept-remote-close");
}

/** Extract the send-teardown-then-close action, if any. */
export function linkTeardownSendThenCloseAction(
  actions: ReadonlyArray<LinkTeardownAction>
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
  actions: ReadonlyArray<LinkTeardownAction>
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
  event: LinkTeardownEvent
): LinkTeardownStepResult {
  if (event.kind === "teardown/local") {
    const plan = planLinkTeardown(state.status);
    if (plan.kind === "close-only") {
      return {
        state: { ...state, status: LinkStatus.CLOSED },
        intents: [],
        actions: [{ kind: "close-only" }]
      };
    }
    const reason = planLinkTeardownReason({
      initiator: state.initiator,
      remote: false
    });
    return {
      state: { ...state, status: LinkStatus.CLOSED },
      intents: [],
      actions: [{ kind: "send-teardown-then-close", reason }]
    };
  }

  if (event.kind === "teardown/remote") {
    if (
      !shouldAcceptLinkTeardown({
        plaintextPresent: event.plaintextPresent,
        linkIdMatches: event.linkIdMatches
      })
    ) {
      return { state, intents: [], actions: [] };
    }
    const reason = planLinkTeardownReason({
      initiator: state.initiator,
      remote: true
    });
    return {
      state: { ...state, status: LinkStatus.CLOSED },
      intents: [],
      actions: [{ kind: "accept-remote-close", reason }]
    };
  }

  return { state, intents: [], actions: [] };
}
