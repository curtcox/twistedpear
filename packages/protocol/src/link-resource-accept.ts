/**
 * Pure link inbound resource-advertisement acceptance planning.
 * Decrypt / unpack / app callbacks stay at the adapter edge.
 */
import {
  LinkResourceStrategy,
  type LinkResourceStrategyValue
} from "./link-watchdog.js";

export type LinkResourceAcceptPlan =
  | { readonly kind: "ignore" }
  | { readonly kind: "accept" }
  | { readonly kind: "ask-app" };

export function planLinkResourceAccept(
  strategy: LinkResourceStrategyValue | number
): LinkResourceAcceptPlan {
  if (strategy === LinkResourceStrategy.ACCEPT_NONE) {
    return { kind: "ignore" };
  }
  if (strategy === LinkResourceStrategy.ACCEPT_APP) {
    return { kind: "ask-app" };
  }
  return { kind: "accept" };
}

/** After ask-app, map the app callback result to accept/reject. */
export function planLinkResourceAcceptAppResult(appAccepted: boolean): "accept" | "reject" {
  return appAccepted ? "accept" : "reject";
}
