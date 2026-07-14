/**
 * Pure link MTU→MDU conversion and hop-matching decisions.
 * Initiator/responder MTU selection conclusions leave via machine actions
 * (no ad-hoc `planLinkInitiatorMtu` / `planLinkRequestResponderMtu` reads
 * beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";

export const LINK_MDU_HEADER_MAX = 18;
export const LINK_MDU_IFAC_MIN = 0;
export const LINK_MDU_TOKEN_OVERHEAD = 48;
export const LINK_MDU_BLOCK_SIZE = 16;

export function computeLinkMdu(mtu: number): number {
  return (
    Math.floor(
      (mtu - LINK_MDU_IFAC_MIN - LINK_MDU_HEADER_MAX - LINK_MDU_TOKEN_OVERHEAD) /
        LINK_MDU_BLOCK_SIZE
    ) *
      LINK_MDU_BLOCK_SIZE -
    1
  );
}

/** Whether a packed payload fits within the link (or outlet) MDU. */
export function linkPayloadFitsMdu(packedLength: number, mdu: number): boolean {
  return packedLength <= mdu;
}

/** Initiator MTU selection (optional next-hop discovery vs default). */
export function planLinkInitiatorMtu(input: {
  readonly discoveryEnabled: boolean;
  readonly nextHopMtu: number | null;
  readonly defaultMtu: number;
}): number {
  if (input.discoveryEnabled && input.nextHopMtu !== null) {
    return input.nextHopMtu;
  }
  return input.defaultMtu;
}

/**
 * Responder MTU from LINKREQUEST signalling (keep current when absent).
 * `signallingMtu` is pre-parsed via {@link mtuFromLinkRequestData} at the edge.
 */
export function planLinkRequestResponderMtu(input: {
  readonly signallingPresent: boolean;
  readonly signallingMtu: number | null;
  readonly currentMtu: number;
  readonly defaultMtu: number;
}): number {
  if (!input.signallingPresent) {
    return input.currentMtu;
  }
  return input.signallingMtu ?? input.defaultMtu;
}

export function linkHopsMatch(input: {
  readonly expectedHops: number | null;
  readonly packetHops: number;
  readonly pathfinderMaxHops: number;
}): boolean {
  if (input.expectedHops === null) {
    return true;
  }
  return (
    input.packetHops === input.expectedHops ||
    input.expectedHops === input.pathfinderMaxHops
  );
}

/**
 * Link initiator MTU selection is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkInitiatorMtu`
 * reads beside the step).
 */
export type LinkInitiatorMtuState = Record<string, never>;

export type LinkInitiatorMtuEvent =
  | Event
  | {
      readonly kind: "link/initiator-mtu-gate";
      readonly discoveryEnabled: boolean;
      readonly nextHopMtu: number | null;
      readonly defaultMtu: number;
    };

export type LinkInitiatorMtuAction = {
  readonly kind: "use-mtu";
  readonly mtu: number;
};

export interface LinkInitiatorMtuStepResult {
  readonly state: LinkInitiatorMtuState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkInitiatorMtuAction[];
}

export function initialLinkInitiatorMtuState(): LinkInitiatorMtuState {
  return {};
}

export function stepLinkInitiatorMtuWithActions(
  state: LinkInitiatorMtuState,
  event: LinkInitiatorMtuEvent
): LinkInitiatorMtuStepResult {
  if (event.kind === "link/initiator-mtu-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-mtu",
          mtu: planLinkInitiatorMtu({
            discoveryEnabled: event.discoveryEnabled,
            nextHopMtu: event.nextHopMtu,
            defaultMtu: event.defaultMtu
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract initiator MTU from step actions; null when no `use-mtu` action. */
export function linkInitiatorMtuFromActions(
  actions: ReadonlyArray<LinkInitiatorMtuAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "use-mtu");
  return action?.kind === "use-mtu" ? action.mtu : null;
}

export function shouldUseLinkInitiatorMtu(
  actions: ReadonlyArray<LinkInitiatorMtuAction>
): boolean {
  return actions.some((action) => action.kind === "use-mtu");
}

/**
 * Link responder MTU selection is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkRequestResponderMtu`
 * reads beside the step).
 */
export type LinkRequestResponderMtuState = Record<string, never>;

export type LinkRequestResponderMtuEvent =
  | Event
  | {
      readonly kind: "link/request-responder-mtu-gate";
      readonly signallingPresent: boolean;
      readonly signallingMtu: number | null;
      readonly currentMtu: number;
      readonly defaultMtu: number;
    };

export type LinkRequestResponderMtuAction = {
  readonly kind: "use-mtu";
  readonly mtu: number;
};

export interface LinkRequestResponderMtuStepResult {
  readonly state: LinkRequestResponderMtuState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkRequestResponderMtuAction[];
}

export function initialLinkRequestResponderMtuState(): LinkRequestResponderMtuState {
  return {};
}

export function stepLinkRequestResponderMtuWithActions(
  state: LinkRequestResponderMtuState,
  event: LinkRequestResponderMtuEvent
): LinkRequestResponderMtuStepResult {
  if (event.kind === "link/request-responder-mtu-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-mtu",
          mtu: planLinkRequestResponderMtu({
            signallingPresent: event.signallingPresent,
            signallingMtu: event.signallingMtu,
            currentMtu: event.currentMtu,
            defaultMtu: event.defaultMtu
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract responder MTU from step actions; null when no `use-mtu` action. */
export function linkRequestResponderMtuFromActions(
  actions: ReadonlyArray<LinkRequestResponderMtuAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "use-mtu");
  return action?.kind === "use-mtu" ? action.mtu : null;
}

export function shouldUseLinkRequestResponderMtu(
  actions: ReadonlyArray<LinkRequestResponderMtuAction>
): boolean {
  return actions.some((action) => action.kind === "use-mtu");
}
