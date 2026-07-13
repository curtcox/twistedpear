/**
 * Pure link teardown gate and reason planning.
 * Packet send / decrypt stay at the adapter edge.
 */
import {
  LinkStatus,
  LinkTeardownReason,
  type LinkStatusValue,
  type LinkTeardownReasonValue
} from "./link-watchdog.js";

export type LinkTeardownPlan =
  | { readonly kind: "close-only" }
  | { readonly kind: "send-teardown-then-close" };

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
