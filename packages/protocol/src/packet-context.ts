/**
 * Pure RNS packet context byte constants.
 * Packet construction stays at the adapter edge.
 * Link DATA context dispatch conclusions leave via machine actions (no ad-hoc
 * plan reads beside the step). Plan nested via
 * {@link stepLinkDataContextPlanWithActions}.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";

export const PacketContextCode = {
  NONE: 0x00,
  RESOURCE: 0x01,
  RESOURCE_ADV: 0x02,
  RESOURCE_REQ: 0x03,
  RESOURCE_HMU: 0x04,
  RESOURCE_PRF: 0x05,
  RESOURCE_ICL: 0x06,
  RESOURCE_RCL: 0x07,
  CACHE_REQUEST: 0x08,
  REQUEST: 0x09,
  RESPONSE: 0x0a,
  PATH_RESPONSE: 0x0b,
  COMMAND: 0x0c,
  COMMAND_STATUS: 0x0d,
  CHANNEL: 0x0e,
  KEEPALIVE: 0xfa,
  LINKIDENTIFY: 0xfb,
  LINKCLOSE: 0xfc,
  LINKPROOF: 0xfd,
  LRRTT: 0xfe,
  LRPROOF: 0xff,
} as const;

export type PacketContextCodeValue =
  (typeof PacketContextCode)[keyof typeof PacketContextCode];

/** Keep transport-announce aliases aligned with PacketContextCode. */
export const PACKET_CONTEXT_NONE = PacketContextCode.NONE;
export const PACKET_CONTEXT_PATH_RESPONSE = PacketContextCode.PATH_RESPONSE;

/** Pure link DATA packet context → handler kind. */
export type LinkDataContextKind =
  | "rtt"
  | "keepalive"
  | "close"
  | "identify"
  | "request"
  | "response"
  | "channel"
  | "resource-adv"
  | "resource-req"
  | "resource-hmu"
  | "resource-icl"
  | "resource-rcl"
  | "resource"
  | "plaintext"
  | "ignore";

const LINK_DATA_CONTEXT_KIND: Readonly<Record<number, LinkDataContextKind>> = {
  [PacketContextCode.LRRTT]: "rtt",
  [PacketContextCode.KEEPALIVE]: "keepalive",
  [PacketContextCode.LINKCLOSE]: "close",
  [PacketContextCode.LINKIDENTIFY]: "identify",
  [PacketContextCode.REQUEST]: "request",
  [PacketContextCode.RESPONSE]: "response",
  [PacketContextCode.CHANNEL]: "channel",
  [PacketContextCode.RESOURCE_ADV]: "resource-adv",
  [PacketContextCode.RESOURCE_REQ]: "resource-req",
  [PacketContextCode.RESOURCE_HMU]: "resource-hmu",
  [PacketContextCode.RESOURCE_ICL]: "resource-icl",
  [PacketContextCode.RESOURCE_RCL]: "resource-rcl",
  [PacketContextCode.RESOURCE]: "resource",
  [PacketContextCode.NONE]: "plaintext",
};

export function planLinkDataContext(context: number): LinkDataContextKind {
  return LINK_DATA_CONTEXT_KIND[context] ?? "ignore";
}

/** Whether a packet context byte is the link keepalive context. */
export function isLinkKeepaliveContext(context: number): boolean {
  return context === PacketContextCode.KEEPALIVE;
}

/**
 * Link keepalive-context gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isLinkKeepaliveContext`
 * reads beside the step).
 */
export type LinkKeepaliveContextState = Record<string, never>;

export type LinkKeepaliveContextEvent =
  | Event
  | {
      readonly kind: "link/keepalive-context-gate";
      readonly context: number;
    };

export type LinkKeepaliveContextAction =
  { readonly kind: "keepalive" } | { readonly kind: "other" };

export interface LinkKeepaliveContextStepResult {
  readonly state: LinkKeepaliveContextState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkKeepaliveContextAction[];
}

export function initialLinkKeepaliveContextState(): LinkKeepaliveContextState {
  return {};
}

export function stepLinkKeepaliveContextWithActions(
  state: LinkKeepaliveContextState,
  event: LinkKeepaliveContextEvent,
): LinkKeepaliveContextStepResult {
  if (event.kind === "link/keepalive-context-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: isLinkKeepaliveContext(event.context) ? "keepalive" : "other",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldTreatLinkKeepaliveContext(
  actions: ReadonlyArray<LinkKeepaliveContextAction>,
): boolean {
  return actions.some((action) => action.kind === "keepalive");
}

export function shouldTreatLinkKeepaliveOther(
  actions: ReadonlyArray<LinkKeepaliveContextAction>,
): boolean {
  return actions.some((action) => action.kind === "other");
}

/**
 * Link DATA context plan gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkDataContext` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLinkDataContextWithActions}.
 */
export type LinkDataContextPlanState = Record<string, never>;

export type LinkDataContextPlanEvent =
  | Event
  | {
      readonly kind: "link/data-context-plan-gate";
      readonly context: number;
    };

export type LinkDataContextPlanAction = {
  readonly kind: LinkDataContextKind;
};

export interface LinkDataContextPlanStepResult {
  readonly state: LinkDataContextPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkDataContextPlanAction[];
}

export function initialLinkDataContextPlanState(): LinkDataContextPlanState {
  return {};
}

export function stepLinkDataContextPlanWithActions(
  state: LinkDataContextPlanState,
  event: LinkDataContextPlanEvent,
): LinkDataContextPlanStepResult {
  if (event.kind === "link/data-context-plan-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: planLinkDataContext(event.context) }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function linkDataContextPlanFromActions(
  actions: ReadonlyArray<LinkDataContextPlanAction>,
): LinkDataContextKind | null {
  const action = actions[0];
  return action?.kind ?? null;
}

/**
 * Link DATA context dispatch is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkDataContextPlanWithActions}
 * (`rtt`|`keepalive`|`close`|`identify`|`request`|`response`|`channel`|
 * `resource-*`|`plaintext`|`ignore`).
 */
export type LinkDataContextState = Record<string, never>;

export type LinkDataContextEvent =
  | Event
  | {
      readonly kind: "link/data-context-gate";
      readonly context: number;
    };

/**
 * Plan nested via {@link stepLinkDataContextPlanWithActions}
 * (`rtt`|`keepalive`|`close`|`identify`|`request`|`response`|`channel`|
 * `resource-*`|`plaintext`|`ignore`).
 */
export type LinkDataContextAction = {
  readonly kind: LinkDataContextKind;
};

export interface LinkDataContextStepResult {
  readonly state: LinkDataContextState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkDataContextAction[];
}

export function initialLinkDataContextState(): LinkDataContextState {
  return {};
}

export const stepLinkDataContext: StepFn<LinkDataContextState> = (
  state,
  event,
) => {
  const result = stepLinkDataContextInner(state, event as LinkDataContextEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLinkDataContextWithActions(
  state: LinkDataContextState,
  event: LinkDataContextEvent,
): LinkDataContextStepResult {
  return stepLinkDataContextInner(state, event);
}

export function linkDataContextFromActions(
  actions: ReadonlyArray<LinkDataContextAction>,
): LinkDataContextKind | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldHandleLinkDataRtt(
  actions: ReadonlyArray<LinkDataContextAction>,
): boolean {
  return actions.some((action) => action.kind === "rtt");
}

export function shouldHandleLinkDataKeepalive(
  actions: ReadonlyArray<LinkDataContextAction>,
): boolean {
  return actions.some((action) => action.kind === "keepalive");
}

export function shouldHandleLinkDataClose(
  actions: ReadonlyArray<LinkDataContextAction>,
): boolean {
  return actions.some((action) => action.kind === "close");
}

export function shouldHandleLinkDataIdentify(
  actions: ReadonlyArray<LinkDataContextAction>,
): boolean {
  return actions.some((action) => action.kind === "identify");
}

export function shouldHandleLinkDataRequest(
  actions: ReadonlyArray<LinkDataContextAction>,
): boolean {
  return actions.some((action) => action.kind === "request");
}

export function shouldHandleLinkDataResponse(
  actions: ReadonlyArray<LinkDataContextAction>,
): boolean {
  return actions.some((action) => action.kind === "response");
}

export function shouldHandleLinkDataChannel(
  actions: ReadonlyArray<LinkDataContextAction>,
): boolean {
  return actions.some((action) => action.kind === "channel");
}

export function shouldHandleLinkDataResourceAdv(
  actions: ReadonlyArray<LinkDataContextAction>,
): boolean {
  return actions.some((action) => action.kind === "resource-adv");
}

export function shouldHandleLinkDataResourceReq(
  actions: ReadonlyArray<LinkDataContextAction>,
): boolean {
  return actions.some((action) => action.kind === "resource-req");
}

export function shouldHandleLinkDataResourceHmu(
  actions: ReadonlyArray<LinkDataContextAction>,
): boolean {
  return actions.some((action) => action.kind === "resource-hmu");
}

export function shouldHandleLinkDataResourceIcl(
  actions: ReadonlyArray<LinkDataContextAction>,
): boolean {
  return actions.some((action) => action.kind === "resource-icl");
}

export function shouldHandleLinkDataResourceRcl(
  actions: ReadonlyArray<LinkDataContextAction>,
): boolean {
  return actions.some((action) => action.kind === "resource-rcl");
}

export function shouldHandleLinkDataResource(
  actions: ReadonlyArray<LinkDataContextAction>,
): boolean {
  return actions.some((action) => action.kind === "resource");
}

export function shouldHandleLinkDataPlaintext(
  actions: ReadonlyArray<LinkDataContextAction>,
): boolean {
  return actions.some((action) => action.kind === "plaintext");
}

export function shouldIgnoreLinkDataContext(
  actions: ReadonlyArray<LinkDataContextAction>,
): boolean {
  return actions.some((action) => action.kind === "ignore");
}

function stepLinkDataContextInner(
  state: LinkDataContextState,
  event: LinkDataContextEvent,
): LinkDataContextStepResult {
  if (event.kind === "link/data-context-gate") {
    const planActions = stepLinkDataContextPlanWithActions(
      initialLinkDataContextPlanState(),
      {
        kind: "link/data-context-plan-gate",
        context: event.context,
      },
    ).actions;
    const plan = linkDataContextPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}
