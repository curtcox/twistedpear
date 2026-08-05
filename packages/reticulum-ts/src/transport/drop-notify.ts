/**
 * Adapter helpers that map announce-ingress gate conclusions to observe/drop
 * intents and notify host DropObservers. Protocol remains pure; census lives
 * in the host.
 */
import {
  observeDropFromAnnounceValidate,
  observeDropFromIngressDispatch,
  observeDropFromLocalAnnounce,
  observeDropFromParsedAnnounce,
  observeDropFromPathEntry,
  type ObserveDropIntent,
  type AnnounceValidatePlan,
  type AcceptParsedAnnounceAction,
  type IgnoreLocalAnnounceAction,
  type AddPathEntryAction,
  type TransportIngressDispatchAction,
} from "@twistedpear/protocol";
export type DropObserver = (drop: ObserveDropIntent) => void;

export function notifyDropObservers(
  observers: ReadonlyArray<DropObserver>,
  drop: ObserveDropIntent | null,
): void {
  if (drop === null) {
    return;
  }
  for (const observer of observers) {
    observer(drop);
  }
}

export function dropFromIngressIgnore(
  actions: ReadonlyArray<TransportIngressDispatchAction>,
  ifaceId: string,
): ObserveDropIntent | null {
  return observeDropFromIngressDispatch(actions, { ifaceId });
}

export function dropFromValidatePlan(
  plan: AnnounceValidatePlan | null,
  destinationKey: string,
  ifaceId: string,
): ObserveDropIntent | null {
  return observeDropFromAnnounceValidate(plan, { destinationKey, ifaceId });
}

export function dropFromParsedSkip(
  actions: ReadonlyArray<AcceptParsedAnnounceAction>,
  destinationKey: string,
  ifaceId: string,
): ObserveDropIntent | null {
  return observeDropFromParsedAnnounce(actions, { destinationKey, ifaceId });
}

export function dropFromLocalEcho(
  actions: ReadonlyArray<IgnoreLocalAnnounceAction>,
  destinationKey: string,
  ifaceId: string,
): ObserveDropIntent | null {
  return observeDropFromLocalAnnounce(actions, { destinationKey, ifaceId });
}

export function dropFromPathSkip(
  actions: ReadonlyArray<AddPathEntryAction>,
  destinationKey: string,
  ifaceId: string,
): ObserveDropIntent | null {
  return observeDropFromPathEntry(actions, { destinationKey, ifaceId });
}
