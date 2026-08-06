/**
 * Pure link MTU→MDU conversion and hop-matching decisions.
 * Initiator/responder MTU selection and hops-match conclusions leave via
 * machine actions (no ad-hoc `planLinkInitiatorMtu` /
 * `planLinkRequestResponderMtu` / `linkHopsMatch` reads beside the step).
 * Initiator/responder MTU plans nested via
 * {@link stepLinkInitiatorMtuPlanWithActions} /
 * {@link stepLinkRequestResponderMtuPlanWithActions} (`use-mtu`).
 * MDU computation conclusions leave via machine actions (no ad-hoc
 * `computeLinkMdu` reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";

export const LINK_MDU_HEADER_MAX = 18;
export const LINK_MDU_IFAC_MIN = 0;
export const LINK_MDU_TOKEN_OVERHEAD = 48;
export const LINK_MDU_BLOCK_SIZE = 16;

export function computeLinkMdu(mtu: number): number {
  return (
    Math.floor(
      (mtu -
        LINK_MDU_IFAC_MIN -
        LINK_MDU_HEADER_MAX -
        LINK_MDU_TOKEN_OVERHEAD) /
        LINK_MDU_BLOCK_SIZE,
    ) *
      LINK_MDU_BLOCK_SIZE -
    1
  );
}

/**
 * Link MDU computation is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `computeLinkMdu`
 * reads beside the step).
 */
export type ComputeLinkMduState = Record<string, never>;

export type ComputeLinkMduEvent =
  | Event
  | {
      readonly kind: "link/mdu-gate";
      readonly mtu: number;
    };

export type ComputeLinkMduAction = {
  readonly kind: "use-mdu";
  readonly mdu: number;
};

export interface ComputeLinkMduStepResult {
  readonly state: ComputeLinkMduState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ComputeLinkMduAction[];
}

export function initialComputeLinkMduState(): ComputeLinkMduState {
  return {};
}

export function stepComputeLinkMduWithActions(
  state: ComputeLinkMduState,
  event: ComputeLinkMduEvent,
): ComputeLinkMduStepResult {
  if (event.kind === "link/mdu-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-mdu",
          mdu: computeLinkMdu(event.mtu),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseLinkMdu(
  actions: ReadonlyArray<ComputeLinkMduAction>,
): boolean {
  return actions.some((action) => action.kind === "use-mdu");
}

/** Extract MDU from step actions; null when no `use-mdu`. */
export function linkMduFromActions(
  actions: ReadonlyArray<ComputeLinkMduAction>,
): number | null {
  const action = actions.find((entry) => entry.kind === "use-mdu");
  return action?.kind === "use-mdu" ? action.mdu : null;
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
 * Link initiator MTU plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkInitiatorMtu`
 * reads beside the step). Nested under {@link stepLinkInitiatorMtuWithActions}.
 */
export type LinkInitiatorMtuPlanState = Record<string, never>;

export type LinkInitiatorMtuPlanEvent =
  | Event
  | {
      readonly kind: "link/initiator-mtu-plan-gate";
      readonly discoveryEnabled: boolean;
      readonly nextHopMtu: number | null;
      readonly defaultMtu: number;
    };

export type LinkInitiatorMtuPlanAction = {
  readonly kind: "use-mtu";
  readonly mtu: number;
};

export interface LinkInitiatorMtuPlanStepResult {
  readonly state: LinkInitiatorMtuPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkInitiatorMtuPlanAction[];
}

export function initialLinkInitiatorMtuPlanState(): LinkInitiatorMtuPlanState {
  return {};
}

export function stepLinkInitiatorMtuPlanWithActions(
  state: LinkInitiatorMtuPlanState,
  event: LinkInitiatorMtuPlanEvent,
): LinkInitiatorMtuPlanStepResult {
  if (event.kind === "link/initiator-mtu-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-mtu",
          mtu: planLinkInitiatorMtu({
            discoveryEnabled: event.discoveryEnabled,
            nextHopMtu: event.nextHopMtu,
            defaultMtu: event.defaultMtu,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract initiator MTU from plan actions; null when no `use-mtu` action. */
export function linkInitiatorMtuPlanFromActions(
  actions: ReadonlyArray<LinkInitiatorMtuPlanAction>,
): number | null {
  const action = actions.find((entry) => entry.kind === "use-mtu");
  return action?.kind === "use-mtu" ? action.mtu : null;
}

export function shouldUseLinkInitiatorMtuPlan(
  actions: ReadonlyArray<LinkInitiatorMtuPlanAction>,
): boolean {
  return actions.some((action) => action.kind === "use-mtu");
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

/**
 * Link responder MTU plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkRequestResponderMtu`
 * reads beside the step). Nested under
 * {@link stepLinkRequestResponderMtuWithActions}.
 */
export type LinkRequestResponderMtuPlanState = Record<string, never>;

export type LinkRequestResponderMtuPlanEvent =
  | Event
  | {
      readonly kind: "link/request-responder-mtu-plan-gate";
      readonly signallingPresent: boolean;
      readonly signallingMtu: number | null;
      readonly currentMtu: number;
      readonly defaultMtu: number;
    };

export type LinkRequestResponderMtuPlanAction = {
  readonly kind: "use-mtu";
  readonly mtu: number;
};

export interface LinkRequestResponderMtuPlanStepResult {
  readonly state: LinkRequestResponderMtuPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkRequestResponderMtuPlanAction[];
}

export function initialLinkRequestResponderMtuPlanState(): LinkRequestResponderMtuPlanState {
  return {};
}

export function stepLinkRequestResponderMtuPlanWithActions(
  state: LinkRequestResponderMtuPlanState,
  event: LinkRequestResponderMtuPlanEvent,
): LinkRequestResponderMtuPlanStepResult {
  if (event.kind === "link/request-responder-mtu-plan-gate") {
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
            defaultMtu: event.defaultMtu,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract responder MTU from plan actions; null when no `use-mtu` action. */
export function linkRequestResponderMtuPlanFromActions(
  actions: ReadonlyArray<LinkRequestResponderMtuPlanAction>,
): number | null {
  const action = actions.find((entry) => entry.kind === "use-mtu");
  return action?.kind === "use-mtu" ? action.mtu : null;
}

export function shouldUseLinkRequestResponderMtuPlan(
  actions: ReadonlyArray<LinkRequestResponderMtuPlanAction>,
): boolean {
  return actions.some((action) => action.kind === "use-mtu");
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
 * Link hops-match is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `linkHopsMatch` reads
 * beside the step).
 */
export type LinkHopsMatchState = Record<string, never>;

export type LinkHopsMatchEvent =
  | Event
  | {
      readonly kind: "link/hops-match-gate";
      readonly expectedHops: number | null;
      readonly packetHops: number;
      readonly pathfinderMaxHops: number;
    };

export type LinkHopsMatchAction =
  { readonly kind: "match" } | { readonly kind: "mismatch" };

export interface LinkHopsMatchStepResult {
  readonly state: LinkHopsMatchState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkHopsMatchAction[];
}

export function initialLinkHopsMatchState(): LinkHopsMatchState {
  return {};
}

export function stepLinkHopsMatchWithActions(
  state: LinkHopsMatchState,
  event: LinkHopsMatchEvent,
): LinkHopsMatchStepResult {
  if (event.kind === "link/hops-match-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: linkHopsMatch({
            expectedHops: event.expectedHops,
            packetHops: event.packetHops,
            pathfinderMaxHops: event.pathfinderMaxHops,
          })
            ? "match"
            : "mismatch",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldMatchLinkHops(
  actions: ReadonlyArray<LinkHopsMatchAction>,
): boolean {
  return actions.some((action) => action.kind === "match");
}

export function shouldMismatchLinkHops(
  actions: ReadonlyArray<LinkHopsMatchAction>,
): boolean {
  return actions.some((action) => action.kind === "mismatch");
}

/**
 * Link initiator MTU selection is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkInitiatorMtu`
 * reads beside the step).
 * Plan nested via {@link stepLinkInitiatorMtuPlanWithActions} (`use-mtu`).
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
  event: LinkInitiatorMtuEvent,
): LinkInitiatorMtuStepResult {
  if (event.kind === "link/initiator-mtu-gate") {
    const planActions = stepLinkInitiatorMtuPlanWithActions(
      initialLinkInitiatorMtuPlanState(),
      {
        kind: "link/initiator-mtu-plan-gate",
        discoveryEnabled: event.discoveryEnabled,
        nextHopMtu: event.nextHopMtu,
        defaultMtu: event.defaultMtu,
      },
    ).actions;
    const mtu = linkInitiatorMtuPlanFromActions(planActions);
    if (mtu === null) {
      return { state, intents: [], actions: [] };
    }
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-mtu",
          mtu,
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract initiator MTU from step actions; null when no `use-mtu` action. */
export function linkInitiatorMtuFromActions(
  actions: ReadonlyArray<LinkInitiatorMtuAction>,
): number | null {
  const action = actions.find((entry) => entry.kind === "use-mtu");
  return action?.kind === "use-mtu" ? action.mtu : null;
}

export function shouldUseLinkInitiatorMtu(
  actions: ReadonlyArray<LinkInitiatorMtuAction>,
): boolean {
  return actions.some((action) => action.kind === "use-mtu");
}

/**
 * Link responder MTU selection is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkRequestResponderMtu`
 * reads beside the step).
 * Plan nested via {@link stepLinkRequestResponderMtuPlanWithActions} (`use-mtu`).
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
  event: LinkRequestResponderMtuEvent,
): LinkRequestResponderMtuStepResult {
  if (event.kind === "link/request-responder-mtu-gate") {
    const planActions = stepLinkRequestResponderMtuPlanWithActions(
      initialLinkRequestResponderMtuPlanState(),
      {
        kind: "link/request-responder-mtu-plan-gate",
        signallingPresent: event.signallingPresent,
        signallingMtu: event.signallingMtu,
        currentMtu: event.currentMtu,
        defaultMtu: event.defaultMtu,
      },
    ).actions;
    const mtu = linkRequestResponderMtuPlanFromActions(planActions);
    if (mtu === null) {
      return { state, intents: [], actions: [] };
    }
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-mtu",
          mtu,
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract responder MTU from step actions; null when no `use-mtu` action. */
export function linkRequestResponderMtuFromActions(
  actions: ReadonlyArray<LinkRequestResponderMtuAction>,
): number | null {
  const action = actions.find((entry) => entry.kind === "use-mtu");
  return action?.kind === "use-mtu" ? action.mtu : null;
}

export function shouldUseLinkRequestResponderMtu(
  actions: ReadonlyArray<LinkRequestResponderMtuAction>,
): boolean {
  return actions.some((action) => action.kind === "use-mtu");
}
