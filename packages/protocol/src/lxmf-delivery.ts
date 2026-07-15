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
  type LxmfUnverifiedReasonValue
} from "./lxmf-fields.js";

export const LxmfDeliveryMethod = {
  OPPORTUNISTIC: 0x01,
  DIRECT: 0x02,
  PROPAGATED: 0x03,
  PAPER: 0x05
} as const;

export type LxmfDeliveryMethodValue =
  (typeof LxmfDeliveryMethod)[keyof typeof LxmfDeliveryMethod];

export const LxmfDeliveryRepresentation = {
  UNKNOWN: 0x00,
  PACKET: 0x01,
  RESOURCE: 0x02
} as const;

export type LxmfDeliveryRepresentationValue =
  (typeof LxmfDeliveryRepresentation)[keyof typeof LxmfDeliveryRepresentation];

export const LXMF_DESTINATION_LENGTH = 16;
export const LXMF_SIGNATURE_LENGTH = 64;
export const LXMF_TIMESTAMP_SIZE = 8;
export const LXMF_STRUCT_OVERHEAD = 8;

/** Full LXMF structural overhead (dest×2 + signature + timestamp + struct). */
export const LXMF_OVERHEAD =
  2 * LXMF_DESTINATION_LENGTH +
  LXMF_SIGNATURE_LENGTH +
  LXMF_TIMESTAMP_SIZE +
  LXMF_STRUCT_OVERHEAD;

/** Mirrors LXMF encrypted / link packet MDUs. */
export const LXMF_ENCRYPTED_PACKET_MDU = 391;
export const LXMF_LINK_PACKET_MDU = 431;

/**
 * Max opportunistic content that fits an encrypted packet.
 * Opportunistic frames omit one destination hash from the wire envelope.
 */
export const LXMF_ENCRYPTED_PACKET_MAX_CONTENT =
  LXMF_ENCRYPTED_PACKET_MDU - LXMF_OVERHEAD + LXMF_DESTINATION_LENGTH;

/** Max direct/propagated content that fits a link packet. */
export const LXMF_LINK_PACKET_MAX_CONTENT = LXMF_LINK_PACKET_MDU - LXMF_OVERHEAD;

export function lxmfContentSizeFromPackedLength(
  packedLength: number,
  destinationLength: number = LXMF_DESTINATION_LENGTH,
  signatureLength: number = LXMF_SIGNATURE_LENGTH,
  timestampSize: number = LXMF_TIMESTAMP_SIZE,
  structOverhead: number = LXMF_STRUCT_OVERHEAD
): number {
  const payloadLength = packedLength - (2 * destinationLength + signatureLength);
  return payloadLength - timestampSize - structOverhead;
}

export type LxmfDeliveryPlan =
  | {
      readonly kind: "deliver";
      readonly method: LxmfDeliveryMethodValue;
      readonly representation: LxmfDeliveryRepresentationValue;
    }
  | {
      readonly kind: "reject-opportunistic-too-large";
      readonly contentSize: number;
      readonly maxContent: number;
    }
  | {
      readonly kind: "reject-unsupported-method";
      readonly method: number;
    };

/**
 * Plan delivery parameters.
 * For PROPAGATED, pass `propagationPackedLength` after the adapter builds the envelope.
 */
export function planLxmfDelivery(input: {
  readonly desiredMethod: number;
  readonly contentSize: number;
  readonly encryptedPacketMaxContent: number;
  readonly linkPacketMaxContent: number;
  readonly propagationPackedLength?: number;
}): LxmfDeliveryPlan {
  const desiredMethod = input.desiredMethod;

  if (desiredMethod === LxmfDeliveryMethod.OPPORTUNISTIC) {
    if (input.contentSize > input.encryptedPacketMaxContent) {
      return {
        kind: "reject-opportunistic-too-large",
        contentSize: input.contentSize,
        maxContent: input.encryptedPacketMaxContent
      };
    }
    return {
      kind: "deliver",
      method: LxmfDeliveryMethod.OPPORTUNISTIC,
      representation: LxmfDeliveryRepresentation.PACKET
    };
  }

  if (desiredMethod === LxmfDeliveryMethod.DIRECT) {
    return {
      kind: "deliver",
      method: LxmfDeliveryMethod.DIRECT,
      representation:
        input.contentSize <= input.linkPacketMaxContent
          ? LxmfDeliveryRepresentation.PACKET
          : LxmfDeliveryRepresentation.RESOURCE
    };
  }

  if (desiredMethod === LxmfDeliveryMethod.PROPAGATED) {
    if (input.propagationPackedLength === undefined) {
      throw new Error("PROPAGATED delivery planning requires propagationPackedLength");
    }
    return {
      kind: "deliver",
      method: LxmfDeliveryMethod.PROPAGATED,
      representation:
        input.propagationPackedLength > input.linkPacketMaxContent
          ? LxmfDeliveryRepresentation.RESOURCE
          : LxmfDeliveryRepresentation.PACKET
    };
  }

  return { kind: "reject-unsupported-method", method: desiredMethod };
}

/**
 * Delivery-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfDelivery` /
 * `plan.kind` reads beside the step). Nested under
 * {@link stepLxmfDeliveryWithActions}.
 */
export type LxmfDeliveryPlanState = Record<string, never>;

export type LxmfDeliveryPlanEvent =
  | Event
  | {
      readonly kind: "delivery/plan-gate";
      readonly desiredMethod: number;
      readonly contentSize: number;
      readonly encryptedPacketMaxContent: number;
      readonly linkPacketMaxContent: number;
      readonly propagationPackedLength?: number;
    };

export type LxmfDeliveryPlanAction = LxmfDeliveryPlan;

export interface LxmfDeliveryPlanStepResult {
  readonly state: LxmfDeliveryPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfDeliveryPlanAction[];
}

export function initialLxmfDeliveryPlanState(): LxmfDeliveryPlanState {
  return {};
}

export function stepLxmfDeliveryPlanWithActions(
  state: LxmfDeliveryPlanState,
  event: LxmfDeliveryPlanEvent
): LxmfDeliveryPlanStepResult {
  if (event.kind === "delivery/plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        planLxmfDelivery({
          desiredMethod: event.desiredMethod,
          contentSize: event.contentSize,
          encryptedPacketMaxContent: event.encryptedPacketMaxContent,
          linkPacketMaxContent: event.linkPacketMaxContent,
          ...(event.propagationPackedLength !== undefined
            ? { propagationPackedLength: event.propagationPackedLength }
            : {})
        })
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether plan actions include deliver (set method + representation). */
export function shouldDeliverLxmfDeliveryPlan(
  actions: ReadonlyArray<LxmfDeliveryPlanAction>
): boolean {
  return actions.some((action) => action.kind === "deliver");
}

/** Whether plan actions reject opportunistic content as too large. */
export function shouldRejectLxmfDeliveryPlanOpportunisticTooLarge(
  actions: ReadonlyArray<LxmfDeliveryPlanAction>
): boolean {
  return actions.some((action) => action.kind === "reject-opportunistic-too-large");
}

/** Whether plan actions reject an unsupported delivery method. */
export function shouldRejectLxmfDeliveryPlanUnsupportedMethod(
  actions: ReadonlyArray<LxmfDeliveryPlanAction>
): boolean {
  return actions.some((action) => action.kind === "reject-unsupported-method");
}

/** Deliver method/representation from a deliver plan action, if present. */
export function lxmfDeliveryPlanDeliverParams(
  actions: ReadonlyArray<LxmfDeliveryPlanAction>
): {
  readonly method: LxmfDeliveryMethodValue;
  readonly representation: LxmfDeliveryRepresentationValue;
} | null {
  for (const action of actions) {
    if (action.kind === "deliver") {
      return { method: action.method, representation: action.representation };
    }
  }
  return null;
}

/** Size bounds from a reject-opportunistic-too-large plan action, if present. */
export function lxmfDeliveryPlanOpportunisticRejectSizes(
  actions: ReadonlyArray<LxmfDeliveryPlanAction>
): { readonly contentSize: number; readonly maxContent: number } | null {
  for (const action of actions) {
    if (action.kind === "reject-opportunistic-too-large") {
      return { contentSize: action.contentSize, maxContent: action.maxContent };
    }
  }
  return null;
}

/** Unsupported method from a reject-unsupported-method plan action, if present. */
export function lxmfDeliveryPlanUnsupportedMethod(
  actions: ReadonlyArray<LxmfDeliveryPlanAction>
): number | null {
  for (const action of actions) {
    if (action.kind === "reject-unsupported-method") {
      return action.method;
    }
  }
  return null;
}

/** Extract the delivery plan from actions; null when empty. */
export function lxmfDeliveryPlanFromActions(
  actions: ReadonlyArray<LxmfDeliveryPlanAction>
): LxmfDeliveryPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "deliver" ||
      entry.kind === "reject-opportunistic-too-large" ||
      entry.kind === "reject-unsupported-method"
  );
  return action ?? null;
}

/**
 * Delivery planning is event-driven; no durable session fields.
 */
export type LxmfDeliveryState = Record<string, never>;

export type LxmfDeliveryEvent =
  | Event
  | {
      readonly kind: "delivery/select";
      readonly desiredMethod: number;
      readonly contentSize: number;
      readonly encryptedPacketMaxContent: number;
      readonly linkPacketMaxContent: number;
      readonly propagationPackedLength?: number;
    };

/**
 * Adapter applies deliver / reject only from these actions.
 * Plan nested via {@link stepLxmfDeliveryPlanWithActions}
 * (`deliver`|`reject-opportunistic-too-large`|`reject-unsupported-method`).
 */
export type LxmfDeliveryAction =
  | {
      readonly kind: "deliver";
      readonly method: LxmfDeliveryMethodValue;
      readonly representation: LxmfDeliveryRepresentationValue;
    }
  | {
      readonly kind: "reject-opportunistic-too-large";
      readonly contentSize: number;
      readonly maxContent: number;
    }
  | {
      readonly kind: "reject-unsupported-method";
      readonly method: number;
    };

export interface LxmfDeliveryStepResult {
  readonly state: LxmfDeliveryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfDeliveryAction[];
}

export function initialLxmfDeliveryState(): LxmfDeliveryState {
  return {};
}

export const stepLxmfDelivery: StepFn<LxmfDeliveryState> = (state, event) => {
  const result = stepLxmfDeliveryInner(state, event as LxmfDeliveryEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLxmfDeliveryWithActions(
  state: LxmfDeliveryState,
  event: LxmfDeliveryEvent
): LxmfDeliveryStepResult {
  return stepLxmfDeliveryInner(state, event);
}

/** Whether step actions include deliver (set method + representation). */
export function shouldDeliverLxmf(
  actions: ReadonlyArray<LxmfDeliveryAction>
): boolean {
  return actions.some((action) => action.kind === "deliver");
}

/** Whether step actions reject opportunistic content as too large. */
export function shouldRejectLxmfOpportunisticTooLarge(
  actions: ReadonlyArray<LxmfDeliveryAction>
): boolean {
  return actions.some((action) => action.kind === "reject-opportunistic-too-large");
}

/** Whether step actions reject an unsupported delivery method. */
export function shouldRejectLxmfUnsupportedMethod(
  actions: ReadonlyArray<LxmfDeliveryAction>
): boolean {
  return actions.some((action) => action.kind === "reject-unsupported-method");
}

/** Deliver method/representation from a deliver action, if present. */
export function lxmfDeliveryDeliverParams(
  actions: ReadonlyArray<LxmfDeliveryAction>
): {
  readonly method: LxmfDeliveryMethodValue;
  readonly representation: LxmfDeliveryRepresentationValue;
} | null {
  for (const action of actions) {
    if (action.kind === "deliver") {
      return { method: action.method, representation: action.representation };
    }
  }
  return null;
}

/** Size bounds from a reject-opportunistic-too-large action, if present. */
export function lxmfDeliveryOpportunisticRejectSizes(
  actions: ReadonlyArray<LxmfDeliveryAction>
): { readonly contentSize: number; readonly maxContent: number } | null {
  for (const action of actions) {
    if (action.kind === "reject-opportunistic-too-large") {
      return { contentSize: action.contentSize, maxContent: action.maxContent };
    }
  }
  return null;
}

function stepLxmfDeliveryInner(
  state: LxmfDeliveryState,
  event: LxmfDeliveryEvent
): LxmfDeliveryStepResult {
  if (event.kind === "delivery/select") {
    const planActions = stepLxmfDeliveryPlanWithActions(initialLxmfDeliveryPlanState(), {
      kind: "delivery/plan-gate",
      desiredMethod: event.desiredMethod,
      contentSize: event.contentSize,
      encryptedPacketMaxContent: event.encryptedPacketMaxContent,
      linkPacketMaxContent: event.linkPacketMaxContent,
      ...(event.propagationPackedLength !== undefined
        ? { propagationPackedLength: event.propagationPackedLength }
        : {})
    }).actions;
    if (shouldRejectLxmfDeliveryPlanOpportunisticTooLarge(planActions)) {
      const sizes = lxmfDeliveryPlanOpportunisticRejectSizes(planActions);
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "reject-opportunistic-too-large",
            contentSize: sizes?.contentSize ?? 0,
            maxContent: sizes?.maxContent ?? 0
          }
        ]
      };
    }
    if (shouldRejectLxmfDeliveryPlanUnsupportedMethod(planActions)) {
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "reject-unsupported-method",
            method: lxmfDeliveryPlanUnsupportedMethod(planActions) ?? 0
          }
        ]
      };
    }
    if (!shouldDeliverLxmfDeliveryPlan(planActions)) {
      return { state, intents: [], actions: [] };
    }
    const params = lxmfDeliveryPlanDeliverParams(planActions);
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "deliver",
          method: params?.method ?? LxmfDeliveryMethod.OPPORTUNISTIC,
          representation: params?.representation ?? LxmfDeliveryRepresentation.UNKNOWN
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export type LxMessagePackGate = "ok" | "bad-destination" | "bad-source";

/** Whether LXMessage.pack may proceed given destination/source direction and identity. */
export function planLxMessagePack(input: {
  readonly destinationDirectionOut: boolean;
  readonly sourceDirectionIn: boolean;
  readonly sourceIdentityPresent: boolean;
}): LxMessagePackGate {
  if (!input.destinationDirectionOut) {
    return "bad-destination";
  }
  if (!input.sourceDirectionIn || !input.sourceIdentityPresent) {
    return "bad-source";
  }
  return "ok";
}

/**
 * Static LXMessage.pack destination/source gates are event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc plan reads
 * beside the step).
 */
export type LxMessagePackState = Record<string, never>;

export type LxMessagePackEvent =
  | Event
  | {
      readonly kind: "lxmessage-pack/gate";
      readonly destinationDirectionOut: boolean;
      readonly sourceDirectionIn: boolean;
      readonly sourceIdentityPresent: boolean;
    };

export type LxMessagePackAction =
  | { readonly kind: "proceed" }
  | { readonly kind: "reject-bad-destination" }
  | { readonly kind: "reject-bad-source" };

export interface LxMessagePackStepResult {
  readonly state: LxMessagePackState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxMessagePackAction[];
}

export function initialLxMessagePackState(): LxMessagePackState {
  return {};
}

export const stepLxMessagePack: StepFn<LxMessagePackState> = (state, event) => {
  const result = stepLxMessagePackInner(state, event as LxMessagePackEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLxMessagePackWithActions(
  state: LxMessagePackState,
  event: LxMessagePackEvent
): LxMessagePackStepResult {
  return stepLxMessagePackInner(state, event);
}

export function shouldProceedLxMessagePack(
  actions: ReadonlyArray<LxMessagePackAction>
): boolean {
  return actions.some((action) => action.kind === "proceed");
}

export function shouldRejectLxMessagePackBadDestination(
  actions: ReadonlyArray<LxMessagePackAction>
): boolean {
  return actions.some((action) => action.kind === "reject-bad-destination");
}

export function shouldRejectLxMessagePackBadSource(
  actions: ReadonlyArray<LxMessagePackAction>
): boolean {
  return actions.some((action) => action.kind === "reject-bad-source");
}

function stepLxMessagePackInner(
  state: LxMessagePackState,
  event: LxMessagePackEvent
): LxMessagePackStepResult {
  if (event.kind === "lxmessage-pack/gate") {
    const plan = planLxMessagePack({
      destinationDirectionOut: event.destinationDirectionOut,
      sourceDirectionIn: event.sourceDirectionIn,
      sourceIdentityPresent: event.sourceIdentityPresent
    });
    if (plan === "bad-destination") {
      return { state, intents: [], actions: [{ kind: "reject-bad-destination" }] };
    }
    if (plan === "bad-source") {
      return { state, intents: [], actions: [{ kind: "reject-bad-source" }] };
    }
    return { state, intents: [], actions: [{ kind: "proceed" }] };
  }

  return { state, intents: [], actions: [] };
}

export type LxmfPackTimestampPlan = "use-timestamp" | "use-now" | "reject";

/** How LXMessage.pack should obtain its timestamp (explicit / injected now / reject). */
export function planLxmfPackTimestamp(input: {
  readonly hasTimestamp: boolean;
  readonly hasNow: boolean;
}): LxmfPackTimestampPlan {
  if (input.hasTimestamp) {
    return "use-timestamp";
  }
  if (input.hasNow) {
    return "use-now";
  }
  return "reject";
}

/**
 * LXMessage.pack timestamp selection is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type LxmfPackTimestampState = Record<string, never>;

export type LxmfPackTimestampEvent =
  | Event
  | {
      readonly kind: "pack-timestamp/select";
      readonly hasTimestamp: boolean;
      readonly hasNow: boolean;
    };

export type LxmfPackTimestampAction =
  | { readonly kind: "use-timestamp" }
  | { readonly kind: "use-now" }
  | { readonly kind: "reject" };

export interface LxmfPackTimestampStepResult {
  readonly state: LxmfPackTimestampState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPackTimestampAction[];
}

export function initialLxmfPackTimestampState(): LxmfPackTimestampState {
  return {};
}

export const stepLxmfPackTimestamp: StepFn<LxmfPackTimestampState> = (state, event) => {
  const result = stepLxmfPackTimestampInner(state, event as LxmfPackTimestampEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLxmfPackTimestampWithActions(
  state: LxmfPackTimestampState,
  event: LxmfPackTimestampEvent
): LxmfPackTimestampStepResult {
  return stepLxmfPackTimestampInner(state, event);
}

export function shouldUseLxmfPackTimestamp(
  actions: ReadonlyArray<LxmfPackTimestampAction>
): boolean {
  return actions.some((action) => action.kind === "use-timestamp");
}

export function shouldUseLxmfPackNow(
  actions: ReadonlyArray<LxmfPackTimestampAction>
): boolean {
  return actions.some((action) => action.kind === "use-now");
}

export function shouldRejectLxmfPackTimestampSelect(
  actions: ReadonlyArray<LxmfPackTimestampAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

function stepLxmfPackTimestampInner(
  state: LxmfPackTimestampState,
  event: LxmfPackTimestampEvent
): LxmfPackTimestampStepResult {
  if (event.kind === "pack-timestamp/select") {
    const plan = planLxmfPackTimestamp({
      hasTimestamp: event.hasTimestamp,
      hasNow: event.hasNow
    });
    if (plan === "use-timestamp") {
      return { state, intents: [], actions: [{ kind: "use-timestamp" }] };
    }
    if (plan === "use-now") {
      return { state, intents: [], actions: [{ kind: "use-now" }] };
    }
    return { state, intents: [], actions: [{ kind: "reject" }] };
  }

  return { state, intents: [], actions: [] };
}

/** Whether packing should include a stamp field (omit when deferStamp is true). */
export function shouldIncludeLxmfStamp(deferStamp: boolean | undefined): boolean {
  return deferStamp !== true;
}

/**
 * shouldIncludeLxmfStamp gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldIncludeLxmfStamp`
 * reads beside the step).
 */
export type IncludeLxmfStampState = Record<string, never>;

export type IncludeLxmfStampEvent =
  | Event
  | {
      readonly kind: "lxmf/include-stamp-gate";
      readonly deferStamp: boolean | undefined;
    };

export type IncludeLxmfStampAction =
  | { readonly kind: "include" }
  | { readonly kind: "skip" };

export interface IncludeLxmfStampStepResult {
  readonly state: IncludeLxmfStampState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IncludeLxmfStampAction[];
}

export function initialIncludeLxmfStampState(): IncludeLxmfStampState {
  return {};
}

export function stepIncludeLxmfStampWithActions(
  state: IncludeLxmfStampState,
  event: IncludeLxmfStampEvent
): IncludeLxmfStampStepResult {
  if (event.kind === "lxmf/include-stamp-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldIncludeLxmfStamp(event.deferStamp) ? "include" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldIncludeLxmfStampNow(
  actions: ReadonlyArray<IncludeLxmfStampAction>
): boolean {
  return actions.some((action) => action.kind === "include");
}

export function shouldSkipIncludeLxmfStamp(
  actions: ReadonlyArray<IncludeLxmfStampAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

export type LxmfDeliverableAcceptPlan = "accept" | "reject-unsigned" | "reject-seen";

/** Whether an unpacked LXMF deliverable should be accepted (sig + seen-hash). */
export function planLxmfDeliverableAccept(input: {
  readonly signatureValidated: boolean;
  readonly hasHash: boolean;
  readonly alreadySeen: boolean;
}): LxmfDeliverableAcceptPlan {
  if (!input.signatureValidated) {
    return "reject-unsigned";
  }
  if (input.hasHash && input.alreadySeen) {
    return "reject-seen";
  }
  return "accept";
}

/**
 * Deliverable accept gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type LxmfDeliverableAcceptState = Record<string, never>;

export type LxmfDeliverableAcceptEvent =
  | Event
  | {
      readonly kind: "deliverable/accept-gate";
      readonly signatureValidated: boolean;
      readonly hasHash: boolean;
      readonly alreadySeen: boolean;
    };

export type LxmfDeliverableAcceptAction =
  | { readonly kind: "accept" }
  | { readonly kind: "reject-unsigned" }
  | { readonly kind: "reject-seen" };

export interface LxmfDeliverableAcceptStepResult {
  readonly state: LxmfDeliverableAcceptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfDeliverableAcceptAction[];
}

export function initialLxmfDeliverableAcceptState(): LxmfDeliverableAcceptState {
  return {};
}

export const stepLxmfDeliverableAccept: StepFn<LxmfDeliverableAcceptState> = (
  state,
  event
) => {
  const result = stepLxmfDeliverableAcceptInner(
    state,
    event as LxmfDeliverableAcceptEvent
  );
  return { state: result.state, intents: result.intents };
};

export function stepLxmfDeliverableAcceptWithActions(
  state: LxmfDeliverableAcceptState,
  event: LxmfDeliverableAcceptEvent
): LxmfDeliverableAcceptStepResult {
  return stepLxmfDeliverableAcceptInner(state, event);
}

export function shouldAcceptLxmfDeliverable(
  actions: ReadonlyArray<LxmfDeliverableAcceptAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldRejectLxmfDeliverableUnsigned(
  actions: ReadonlyArray<LxmfDeliverableAcceptAction>
): boolean {
  return actions.some((action) => action.kind === "reject-unsigned");
}

export function shouldRejectLxmfDeliverableSeen(
  actions: ReadonlyArray<LxmfDeliverableAcceptAction>
): boolean {
  return actions.some((action) => action.kind === "reject-seen");
}

function stepLxmfDeliverableAcceptInner(
  state: LxmfDeliverableAcceptState,
  event: LxmfDeliverableAcceptEvent
): LxmfDeliverableAcceptStepResult {
  if (event.kind === "deliverable/accept-gate") {
    const plan = planLxmfDeliverableAccept({
      signatureValidated: event.signatureValidated,
      hasHash: event.hasHash,
      alreadySeen: event.alreadySeen
    });
    if (plan === "reject-unsigned") {
      return { state, intents: [], actions: [{ kind: "reject-unsigned" }] };
    }
    if (plan === "reject-seen") {
      return { state, intents: [], actions: [{ kind: "reject-seen" }] };
    }
    return { state, intents: [], actions: [{ kind: "accept" }] };
  }

  return { state, intents: [], actions: [] };
}

/** Whether an accepted LXMF deliverable hash should be remembered in the seen set. */
export function shouldRememberLxmfMessage(hasHash: boolean): boolean {
  return hasHash;
}

/**
 * shouldRememberLxmfMessage gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldRememberLxmfMessage`
 * reads beside the step).
 */
export type RememberLxmfMessageState = Record<string, never>;

export type RememberLxmfMessageEvent =
  | Event
  | {
      readonly kind: "lxmf/remember-message-gate";
      readonly hasHash: boolean;
    };

export type RememberLxmfMessageAction =
  | { readonly kind: "remember" }
  | { readonly kind: "skip" };

export interface RememberLxmfMessageStepResult {
  readonly state: RememberLxmfMessageState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RememberLxmfMessageAction[];
}

export function initialRememberLxmfMessageState(): RememberLxmfMessageState {
  return {};
}

export function stepRememberLxmfMessageWithActions(
  state: RememberLxmfMessageState,
  event: RememberLxmfMessageEvent
): RememberLxmfMessageStepResult {
  if (event.kind === "lxmf/remember-message-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldRememberLxmfMessage(event.hasHash) ? "remember" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldRememberLxmfMessageNow(
  actions: ReadonlyArray<RememberLxmfMessageAction>
): boolean {
  return actions.some((action) => action.kind === "remember");
}

export function shouldSkipRememberLxmfMessage(
  actions: ReadonlyArray<RememberLxmfMessageAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/**
 * Whether remember-message may commit after {@link shouldRememberLxmfMessage}
 * and the hash reference remains present for narrowing.
 */
export function shouldCommitRememberedLxmfHash(hashPresent: boolean): boolean {
  return hashPresent;
}

/**
 * shouldCommitRememberedLxmfHash gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldCommitRememberedLxmfHash`
 * reads beside the step).
 */
export type CommitRememberedLxmfHashState = Record<string, never>;

export type CommitRememberedLxmfHashEvent =
  | Event
  | {
      readonly kind: "lxmf/commit-remembered-hash-gate";
      readonly hashPresent: boolean;
    };

export type CommitRememberedLxmfHashAction =
  | { readonly kind: "commit" }
  | { readonly kind: "skip" };

export interface CommitRememberedLxmfHashStepResult {
  readonly state: CommitRememberedLxmfHashState;
  readonly intents: readonly Intent[];
  readonly actions: readonly CommitRememberedLxmfHashAction[];
}

export function initialCommitRememberedLxmfHashState(): CommitRememberedLxmfHashState {
  return {};
}

export function stepCommitRememberedLxmfHashWithActions(
  state: CommitRememberedLxmfHashState,
  event: CommitRememberedLxmfHashEvent
): CommitRememberedLxmfHashStepResult {
  if (event.kind === "lxmf/commit-remembered-hash-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldCommitRememberedLxmfHash(event.hashPresent)
            ? "commit"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldCommitRememberedLxmfHashNow(
  actions: ReadonlyArray<CommitRememberedLxmfHashAction>
): boolean {
  return actions.some((action) => action.kind === "commit");
}

export function shouldSkipCommitRememberedLxmfHash(
  actions: ReadonlyArray<CommitRememberedLxmfHashAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether LXMF wire bytes may unpack after split WithActions `use-fields`. */
export function shouldAcceptLxmfWireFrame(wirePresent: boolean): boolean {
  return wirePresent;
}

/**
 * shouldAcceptLxmfWireFrame gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAcceptLxmfWireFrame`
 * reads beside the step).
 */
export type AcceptLxmfWireFrameState = Record<string, never>;

export type AcceptLxmfWireFrameEvent =
  | Event
  | {
      readonly kind: "lxmf/accept-wire-frame-gate";
      readonly wirePresent: boolean;
    };

export type AcceptLxmfWireFrameAction =
  | { readonly kind: "accept" }
  | { readonly kind: "skip" };

export interface AcceptLxmfWireFrameStepResult {
  readonly state: AcceptLxmfWireFrameState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptLxmfWireFrameAction[];
}

export function initialAcceptLxmfWireFrameState(): AcceptLxmfWireFrameState {
  return {};
}

export function stepAcceptLxmfWireFrameWithActions(
  state: AcceptLxmfWireFrameState,
  event: AcceptLxmfWireFrameEvent
): AcceptLxmfWireFrameStepResult {
  if (event.kind === "lxmf/accept-wire-frame-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptLxmfWireFrame(event.wirePresent) ? "accept" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptLxmfWireFrameNow(
  actions: ReadonlyArray<AcceptLxmfWireFrameAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldSkipAcceptLxmfWireFrame(
  actions: ReadonlyArray<AcceptLxmfWireFrameAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether a router may register its (only) delivery identity. */
export function canRegisterLxmfDeliveryIdentity(
  deliveryDestinationPresent: boolean
): boolean {
  return !deliveryDestinationPresent;
}

/**
 * canRegisterLxmfDeliveryIdentity gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canRegisterLxmfDeliveryIdentity`
 * reads beside the step).
 */
export type RegisterLxmfDeliveryIdentityState = Record<string, never>;

export type RegisterLxmfDeliveryIdentityEvent =
  | Event
  | {
      readonly kind: "lxmf/register-delivery-identity-gate";
      readonly deliveryDestinationPresent: boolean;
    };

export type RegisterLxmfDeliveryIdentityAction =
  | { readonly kind: "register" }
  | { readonly kind: "skip" };

export interface RegisterLxmfDeliveryIdentityStepResult {
  readonly state: RegisterLxmfDeliveryIdentityState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RegisterLxmfDeliveryIdentityAction[];
}

export function initialRegisterLxmfDeliveryIdentityState(): RegisterLxmfDeliveryIdentityState {
  return {};
}

export function stepRegisterLxmfDeliveryIdentityWithActions(
  state: RegisterLxmfDeliveryIdentityState,
  event: RegisterLxmfDeliveryIdentityEvent
): RegisterLxmfDeliveryIdentityStepResult {
  if (event.kind === "lxmf/register-delivery-identity-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canRegisterLxmfDeliveryIdentity(event.deliveryDestinationPresent)
            ? "register"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldRegisterLxmfDeliveryIdentityNow(
  actions: ReadonlyArray<RegisterLxmfDeliveryIdentityAction>
): boolean {
  return actions.some((action) => action.kind === "register");
}

export function shouldSkipRegisterLxmfDeliveryIdentity(
  actions: ReadonlyArray<RegisterLxmfDeliveryIdentityAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/**
 * Whether changing the outbound/propagation node hash should tear down an
 * existing propagation link before the adapter clears it.
 */
export function shouldTeardownLxmfPropagationLink(linkPresent: boolean): boolean {
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
  | { readonly kind: "teardown" }
  | { readonly kind: "skip" };

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
  event: TeardownLxmfPropagationLinkEvent
): TeardownLxmfPropagationLinkStepResult {
  if (event.kind === "lxmf/teardown-propagation-link-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldTeardownLxmfPropagationLink(event.linkPresent)
            ? "teardown"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldTeardownLxmfPropagationLinkNow(
  actions: ReadonlyArray<TeardownLxmfPropagationLinkAction>
): boolean {
  return actions.some((action) => action.kind === "teardown");
}

export function shouldSkipTeardownLxmfPropagationLink(
  actions: ReadonlyArray<TeardownLxmfPropagationLinkAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether opportunistic payload extraction may proceed (message packed). */
export function canExtractLxmfOpportunisticPayload(packedPresent: boolean): boolean {
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
  | { readonly kind: "extract" }
  | { readonly kind: "skip" };

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
  event: ExtractLxmfOpportunisticPayloadEvent
): ExtractLxmfOpportunisticPayloadStepResult {
  if (event.kind === "lxmf/extract-opportunistic-payload-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canExtractLxmfOpportunisticPayload(event.packedPresent)
            ? "extract"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldExtractLxmfOpportunisticPayloadNow(
  actions: ReadonlyArray<ExtractLxmfOpportunisticPayloadAction>
): boolean {
  return actions.some((action) => action.kind === "extract");
}

export function shouldSkipExtractLxmfOpportunisticPayload(
  actions: ReadonlyArray<ExtractLxmfOpportunisticPayloadAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether delivery-parameter selection may run (message packed). */
export function shouldSelectLxmfDeliveryParameters(packedPresent: boolean): boolean {
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
  | { readonly kind: "select" }
  | { readonly kind: "skip" };

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
  event: SelectLxmfDeliveryParametersEvent
): SelectLxmfDeliveryParametersStepResult {
  if (event.kind === "lxmf/select-delivery-parameters-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldSelectLxmfDeliveryParameters(event.packedPresent)
            ? "select"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldSelectLxmfDeliveryParametersNow(
  actions: ReadonlyArray<SelectLxmfDeliveryParametersAction>
): boolean {
  return actions.some((action) => action.kind === "select");
}

export function shouldSkipSelectLxmfDeliveryParameters(
  actions: ReadonlyArray<SelectLxmfDeliveryParametersAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

export type LxmfPropagationSyncPrepPlan =
  | "missing-node"
  | "missing-delivery-identity"
  | "ok";

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
 * Propagation sync-prep gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type LxmfPropagationSyncPrepState = Record<string, never>;

export type LxmfPropagationSyncPrepEvent =
  | Event
  | {
      readonly kind: "propagation-sync-prep/gate";
      readonly nodeConfigured: boolean;
      readonly deliveryIdentityPresent: boolean;
    };

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

export const stepLxmfPropagationSyncPrep: StepFn<LxmfPropagationSyncPrepState> = (
  state,
  event
) => {
  const result = stepLxmfPropagationSyncPrepInner(
    state,
    event as LxmfPropagationSyncPrepEvent
  );
  return { state: result.state, intents: result.intents };
};

export function stepLxmfPropagationSyncPrepWithActions(
  state: LxmfPropagationSyncPrepState,
  event: LxmfPropagationSyncPrepEvent
): LxmfPropagationSyncPrepStepResult {
  return stepLxmfPropagationSyncPrepInner(state, event);
}

export function shouldProceedLxmfPropagationSyncPrep(
  actions: ReadonlyArray<LxmfPropagationSyncPrepAction>
): boolean {
  return actions.some((action) => action.kind === "proceed");
}

export function shouldRejectLxmfPropagationSyncMissingNode(
  actions: ReadonlyArray<LxmfPropagationSyncPrepAction>
): boolean {
  return actions.some((action) => action.kind === "reject-missing-node");
}

export function shouldRejectLxmfPropagationSyncMissingDeliveryIdentity(
  actions: ReadonlyArray<LxmfPropagationSyncPrepAction>
): boolean {
  return actions.some((action) => action.kind === "reject-missing-delivery-identity");
}

function stepLxmfPropagationSyncPrepInner(
  state: LxmfPropagationSyncPrepState,
  event: LxmfPropagationSyncPrepEvent
): LxmfPropagationSyncPrepStepResult {
  if (event.kind === "propagation-sync-prep/gate") {
    const plan = planLxmfPropagationSyncPrep({
      nodeConfigured: event.nodeConfigured,
      deliveryIdentityPresent: event.deliveryIdentityPresent
    });
    if (plan === "missing-node") {
      return { state, intents: [], actions: [{ kind: "reject-missing-node" }] };
    }
    if (plan === "missing-delivery-identity") {
      return {
        state,
        intents: [],
        actions: [{ kind: "reject-missing-delivery-identity" }]
      };
    }
    return { state, intents: [], actions: [{ kind: "proceed" }] };
  }

  return { state, intents: [], actions: [] };
}

/** Whether propagation inbound targets this router's local delivery destination. */
export function canAcceptLxmfPropagationLocalDelivery(input: {
  readonly deliveryDestinationPresent: boolean;
  readonly destinationHashMatches: boolean;
}): boolean {
  return input.deliveryDestinationPresent && input.destinationHashMatches;
}

/**
 * Propagation local-delivery accept gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `canAcceptLxmfPropagationLocalDelivery` reads beside the step).
 */
export type AcceptLxmfPropagationLocalDeliveryState = Record<string, never>;

export type AcceptLxmfPropagationLocalDeliveryEvent =
  | Event
  | {
      readonly kind: "propagation-local-delivery/accept-gate";
      readonly deliveryDestinationPresent: boolean;
      readonly destinationHashMatches: boolean;
    };

export type AcceptLxmfPropagationLocalDeliveryAction =
  | { readonly kind: "accept" }
  | { readonly kind: "skip" };

export interface AcceptLxmfPropagationLocalDeliveryStepResult {
  readonly state: AcceptLxmfPropagationLocalDeliveryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptLxmfPropagationLocalDeliveryAction[];
}

export function initialAcceptLxmfPropagationLocalDeliveryState(): AcceptLxmfPropagationLocalDeliveryState {
  return {};
}

export function stepAcceptLxmfPropagationLocalDeliveryWithActions(
  state: AcceptLxmfPropagationLocalDeliveryState,
  event: AcceptLxmfPropagationLocalDeliveryEvent
): AcceptLxmfPropagationLocalDeliveryStepResult {
  if (event.kind === "propagation-local-delivery/accept-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canAcceptLxmfPropagationLocalDelivery({
            deliveryDestinationPresent: event.deliveryDestinationPresent,
            destinationHashMatches: event.destinationHashMatches
          })
            ? "accept"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptLxmfPropagationLocalDeliveryNow(
  actions: ReadonlyArray<AcceptLxmfPropagationLocalDeliveryAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldSkipAcceptLxmfPropagationLocalDelivery(
  actions: ReadonlyArray<AcceptLxmfPropagationLocalDeliveryAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

export type LxmfPropagationLocalIngressPlan =
  | "reject-prefix"
  | "reject-destination"
  | "reject-decrypt"
  | "deliver";

/**
 * Whether propagation local-delivery ingress may unpack+callback.
 * Decrypt stays at the adapter edge (supply decryptedPresent).
 */
export function planLxmfPropagationLocalIngress(input: {
  readonly prefixedPresent: boolean;
  readonly deliveryDestinationPresent: boolean;
  readonly destinationHashMatches: boolean;
  readonly decryptedPresent: boolean;
}): LxmfPropagationLocalIngressPlan {
  if (!input.prefixedPresent) {
    return "reject-prefix";
  }
  if (
    !canAcceptLxmfPropagationLocalDelivery({
      deliveryDestinationPresent: input.deliveryDestinationPresent,
      destinationHashMatches: input.destinationHashMatches
    })
  ) {
    return "reject-destination";
  }
  if (!input.decryptedPresent) {
    return "reject-decrypt";
  }
  return "deliver";
}

/**
 * Propagation local-ingress gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type LxmfPropagationLocalIngressState = Record<string, never>;

export type LxmfPropagationLocalIngressEvent =
  | Event
  | {
      readonly kind: "propagation-local-ingress/gate";
      readonly prefixedPresent: boolean;
      readonly deliveryDestinationPresent: boolean;
      readonly destinationHashMatches: boolean;
      readonly decryptedPresent: boolean;
    };

export type LxmfPropagationLocalIngressAction =
  | { readonly kind: "deliver" }
  | { readonly kind: "reject-prefix" }
  | { readonly kind: "reject-destination" }
  | { readonly kind: "reject-decrypt" };

export interface LxmfPropagationLocalIngressStepResult {
  readonly state: LxmfPropagationLocalIngressState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPropagationLocalIngressAction[];
}

export function initialLxmfPropagationLocalIngressState(): LxmfPropagationLocalIngressState {
  return {};
}

export const stepLxmfPropagationLocalIngress: StepFn<LxmfPropagationLocalIngressState> = (
  state,
  event
) => {
  const result = stepLxmfPropagationLocalIngressInner(
    state,
    event as LxmfPropagationLocalIngressEvent
  );
  return { state: result.state, intents: result.intents };
};

export function stepLxmfPropagationLocalIngressWithActions(
  state: LxmfPropagationLocalIngressState,
  event: LxmfPropagationLocalIngressEvent
): LxmfPropagationLocalIngressStepResult {
  return stepLxmfPropagationLocalIngressInner(state, event);
}

export function shouldDeliverLxmfPropagationLocalIngress(
  actions: ReadonlyArray<LxmfPropagationLocalIngressAction>
): boolean {
  return actions.some((action) => action.kind === "deliver");
}

export function shouldRejectLxmfPropagationLocalPrefix(
  actions: ReadonlyArray<LxmfPropagationLocalIngressAction>
): boolean {
  return actions.some((action) => action.kind === "reject-prefix");
}

export function shouldRejectLxmfPropagationLocalDestination(
  actions: ReadonlyArray<LxmfPropagationLocalIngressAction>
): boolean {
  return actions.some((action) => action.kind === "reject-destination");
}

export function shouldRejectLxmfPropagationLocalDecrypt(
  actions: ReadonlyArray<LxmfPropagationLocalIngressAction>
): boolean {
  return actions.some((action) => action.kind === "reject-decrypt");
}

/**
 * Whether propagation local ingress may unpack after a deliver action
 * and prefixed/decrypted references remain present for narrowing.
 */
export function canUnpackLxmfPropagationLocalIngress(input: {
  readonly deliver: boolean;
  readonly prefixedPresent: boolean;
  readonly decryptedPresent: boolean;
}): boolean {
  return input.deliver && input.prefixedPresent && input.decryptedPresent;
}

/**
 * Propagation local-ingress unpack gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `canUnpackLxmfPropagationLocalIngress` reads beside the step).
 */
export type UnpackLxmfPropagationLocalIngressState = Record<string, never>;

export type UnpackLxmfPropagationLocalIngressEvent =
  | Event
  | {
      readonly kind: "propagation-local-ingress/unpack-gate";
      readonly deliver: boolean;
      readonly prefixedPresent: boolean;
      readonly decryptedPresent: boolean;
    };

export type UnpackLxmfPropagationLocalIngressAction =
  | { readonly kind: "unpack" }
  | { readonly kind: "skip" };

export interface UnpackLxmfPropagationLocalIngressStepResult {
  readonly state: UnpackLxmfPropagationLocalIngressState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackLxmfPropagationLocalIngressAction[];
}

export function initialUnpackLxmfPropagationLocalIngressState(): UnpackLxmfPropagationLocalIngressState {
  return {};
}

export function stepUnpackLxmfPropagationLocalIngressWithActions(
  state: UnpackLxmfPropagationLocalIngressState,
  event: UnpackLxmfPropagationLocalIngressEvent
): UnpackLxmfPropagationLocalIngressStepResult {
  if (event.kind === "propagation-local-ingress/unpack-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canUnpackLxmfPropagationLocalIngress({
            deliver: event.deliver,
            prefixedPresent: event.prefixedPresent,
            decryptedPresent: event.decryptedPresent
          })
            ? "unpack"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUnpackLxmfPropagationLocalIngressNow(
  actions: ReadonlyArray<UnpackLxmfPropagationLocalIngressAction>
): boolean {
  return actions.some((action) => action.kind === "unpack");
}

export function shouldSkipUnpackLxmfPropagationLocalIngress(
  actions: ReadonlyArray<UnpackLxmfPropagationLocalIngressAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

function stepLxmfPropagationLocalIngressInner(
  state: LxmfPropagationLocalIngressState,
  event: LxmfPropagationLocalIngressEvent
): LxmfPropagationLocalIngressStepResult {
  if (event.kind === "propagation-local-ingress/gate") {
    const plan = planLxmfPropagationLocalIngress({
      prefixedPresent: event.prefixedPresent,
      deliveryDestinationPresent: event.deliveryDestinationPresent,
      destinationHashMatches: event.destinationHashMatches,
      decryptedPresent: event.decryptedPresent
    });
    if (plan === "reject-prefix") {
      return { state, intents: [], actions: [{ kind: "reject-prefix" }] };
    }
    if (plan === "reject-destination") {
      return { state, intents: [], actions: [{ kind: "reject-destination" }] };
    }
    if (plan === "reject-decrypt") {
      return { state, intents: [], actions: [{ kind: "reject-decrypt" }] };
    }
    return { state, intents: [], actions: [{ kind: "deliver" }] };
  }

  return { state, intents: [], actions: [] };
}

export type LxmfPropagationLinkReadyPlan =
  | "reuse"
  | "missing-node"
  | "missing-identity"
  | "establish";

/** Whether outbound propagation may reuse a link, establish, or must abort. */
export function planLxmfPropagationLinkReady(input: {
  readonly canReuseLink: boolean;
  readonly nodeConfigured: boolean;
  readonly nodeIdentityPresent: boolean;
}): LxmfPropagationLinkReadyPlan {
  if (input.canReuseLink) {
    return "reuse";
  }
  if (!input.nodeConfigured) {
    return "missing-node";
  }
  if (!input.nodeIdentityPresent) {
    return "missing-identity";
  }
  return "establish";
}

/**
 * Propagation link-ready gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type LxmfPropagationLinkReadyState = Record<string, never>;

export type LxmfPropagationLinkReadyEvent =
  | Event
  | {
      readonly kind: "propagation-link/gate";
      readonly canReuseLink: boolean;
      readonly nodeConfigured: boolean;
      readonly nodeIdentityPresent: boolean;
    };

export type LxmfPropagationLinkReadyAction =
  | { readonly kind: "reuse" }
  | { readonly kind: "establish" }
  | { readonly kind: "reject-missing-node" }
  | { readonly kind: "reject-missing-identity" };

export interface LxmfPropagationLinkReadyStepResult {
  readonly state: LxmfPropagationLinkReadyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPropagationLinkReadyAction[];
}

export function initialLxmfPropagationLinkReadyState(): LxmfPropagationLinkReadyState {
  return {};
}

export const stepLxmfPropagationLinkReady: StepFn<LxmfPropagationLinkReadyState> = (
  state,
  event
) => {
  const result = stepLxmfPropagationLinkReadyInner(
    state,
    event as LxmfPropagationLinkReadyEvent
  );
  return { state: result.state, intents: result.intents };
};

export function stepLxmfPropagationLinkReadyWithActions(
  state: LxmfPropagationLinkReadyState,
  event: LxmfPropagationLinkReadyEvent
): LxmfPropagationLinkReadyStepResult {
  return stepLxmfPropagationLinkReadyInner(state, event);
}

export function shouldReuseLxmfPropagationLink(
  actions: ReadonlyArray<LxmfPropagationLinkReadyAction>
): boolean {
  return actions.some((action) => action.kind === "reuse");
}

export function shouldEstablishLxmfPropagationLink(
  actions: ReadonlyArray<LxmfPropagationLinkReadyAction>
): boolean {
  return actions.some((action) => action.kind === "establish");
}

export function shouldRejectLxmfPropagationMissingNode(
  actions: ReadonlyArray<LxmfPropagationLinkReadyAction>
): boolean {
  return actions.some((action) => action.kind === "reject-missing-node");
}

export function shouldRejectLxmfPropagationMissingIdentity(
  actions: ReadonlyArray<LxmfPropagationLinkReadyAction>
): boolean {
  return actions.some((action) => action.kind === "reject-missing-identity");
}

function stepLxmfPropagationLinkReadyInner(
  state: LxmfPropagationLinkReadyState,
  event: LxmfPropagationLinkReadyEvent
): LxmfPropagationLinkReadyStepResult {
  if (event.kind === "propagation-link/gate") {
    const plan = planLxmfPropagationLinkReady({
      canReuseLink: event.canReuseLink,
      nodeConfigured: event.nodeConfigured,
      nodeIdentityPresent: event.nodeIdentityPresent
    });
    if (plan === "reuse") {
      return { state, intents: [], actions: [{ kind: "reuse" }] };
    }
    if (plan === "missing-node") {
      return { state, intents: [], actions: [{ kind: "reject-missing-node" }] };
    }
    if (plan === "missing-identity") {
      return { state, intents: [], actions: [{ kind: "reject-missing-identity" }] };
    }
    return { state, intents: [], actions: [{ kind: "establish" }] };
  }

  return { state, intents: [], actions: [] };
}

export type LxmfPropagatedSendPlan =
  | "ok"
  | "missing-node"
  | "missing-packed"
  | "resource-unimplemented";

/** Whether PROPAGATED send may proceed (node + packed envelope + PACKET representation). */
export function planLxmfPropagatedSend(input: {
  readonly nodeConfigured: boolean;
  readonly hasPropagationPacked: boolean;
  readonly representation: number;
}): LxmfPropagatedSendPlan {
  if (!input.nodeConfigured) {
    return "missing-node";
  }
  if (!input.hasPropagationPacked) {
    return "missing-packed";
  }
  if (input.representation !== LxmfDeliveryRepresentation.PACKET) {
    return "resource-unimplemented";
  }
  return "ok";
}

/**
 * PROPAGATED send-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfPropagatedSend` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxmfPropagatedSendWithActions}.
 */
export type LxmfPropagatedSendPlanState = Record<string, never>;

export type LxmfPropagatedSendPlanEvent =
  | Event
  | {
      readonly kind: "propagated-send/plan-gate";
      readonly nodeConfigured: boolean;
      readonly hasPropagationPacked: boolean;
      readonly representation: number;
    };

export type LxmfPropagatedSendPlanAction =
  | { readonly kind: "ok" }
  | { readonly kind: "missing-node" }
  | { readonly kind: "missing-packed" }
  | { readonly kind: "resource-unimplemented" };

export interface LxmfPropagatedSendPlanStepResult {
  readonly state: LxmfPropagatedSendPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPropagatedSendPlanAction[];
}

export function initialLxmfPropagatedSendPlanState(): LxmfPropagatedSendPlanState {
  return {};
}

export function stepLxmfPropagatedSendPlanWithActions(
  state: LxmfPropagatedSendPlanState,
  event: LxmfPropagatedSendPlanEvent
): LxmfPropagatedSendPlanStepResult {
  if (event.kind === "propagated-send/plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLxmfPropagatedSend({
            nodeConfigured: event.nodeConfigured,
            hasPropagationPacked: event.hasPropagationPacked,
            representation: event.representation
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether plan actions allow PROPAGATED send to proceed. */
export function shouldPlanLxmfPropagatedSendOk(
  actions: ReadonlyArray<LxmfPropagatedSendPlanAction>
): boolean {
  return actions.some((action) => action.kind === "ok");
}

/** Whether plan actions reject a missing propagation node. */
export function shouldRejectLxmfPropagatedSendPlanMissingNode(
  actions: ReadonlyArray<LxmfPropagatedSendPlanAction>
): boolean {
  return actions.some((action) => action.kind === "missing-node");
}

/** Whether plan actions reject a missing packed envelope. */
export function shouldRejectLxmfPropagatedSendPlanMissingPacked(
  actions: ReadonlyArray<LxmfPropagatedSendPlanAction>
): boolean {
  return actions.some((action) => action.kind === "missing-packed");
}

/** Whether plan actions reject unimplemented RESOURCE representation. */
export function shouldRejectLxmfPropagatedSendPlanResourceUnimplemented(
  actions: ReadonlyArray<LxmfPropagatedSendPlanAction>
): boolean {
  return actions.some((action) => action.kind === "resource-unimplemented");
}

/** Extract the PROPAGATED send plan from actions; null when empty. */
export function lxmfPropagatedSendPlanFromActions(
  actions: ReadonlyArray<LxmfPropagatedSendPlanAction>
): LxmfPropagatedSendPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "ok" ||
      entry.kind === "missing-node" ||
      entry.kind === "missing-packed" ||
      entry.kind === "resource-unimplemented"
  );
  return action?.kind ?? null;
}

/**
 * PROPAGATED send gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfPropagatedSendPlanWithActions}
 * (`ok`|`missing-node`|`missing-packed`|`resource-unimplemented`).
 */
export type LxmfPropagatedSendState = Record<string, never>;

export type LxmfPropagatedSendEvent =
  | Event
  | {
      readonly kind: "propagated-send/gate";
      readonly nodeConfigured: boolean;
      readonly hasPropagationPacked: boolean;
      readonly representation: number;
    };

/**
 * Adapter applies proceed / reject only from these actions.
 * Plan nested via {@link stepLxmfPropagatedSendPlanWithActions}
 * (`ok`|`missing-node`|`missing-packed`|`resource-unimplemented`).
 */
export type LxmfPropagatedSendAction =
  | { readonly kind: "proceed" }
  | { readonly kind: "reject-missing-node" }
  | { readonly kind: "reject-missing-packed" }
  | { readonly kind: "reject-resource-unimplemented" };

export interface LxmfPropagatedSendStepResult {
  readonly state: LxmfPropagatedSendState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPropagatedSendAction[];
}

export function initialLxmfPropagatedSendState(): LxmfPropagatedSendState {
  return {};
}

export const stepLxmfPropagatedSend: StepFn<LxmfPropagatedSendState> = (state, event) => {
  const result = stepLxmfPropagatedSendInner(state, event as LxmfPropagatedSendEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLxmfPropagatedSendWithActions(
  state: LxmfPropagatedSendState,
  event: LxmfPropagatedSendEvent
): LxmfPropagatedSendStepResult {
  return stepLxmfPropagatedSendInner(state, event);
}

export function shouldProceedLxmfPropagatedSend(
  actions: ReadonlyArray<LxmfPropagatedSendAction>
): boolean {
  return actions.some((action) => action.kind === "proceed");
}

export function shouldRejectLxmfPropagatedMissingNode(
  actions: ReadonlyArray<LxmfPropagatedSendAction>
): boolean {
  return actions.some((action) => action.kind === "reject-missing-node");
}

export function shouldRejectLxmfPropagatedMissingPacked(
  actions: ReadonlyArray<LxmfPropagatedSendAction>
): boolean {
  return actions.some((action) => action.kind === "reject-missing-packed");
}

export function shouldRejectLxmfPropagatedResourceUnimplemented(
  actions: ReadonlyArray<LxmfPropagatedSendAction>
): boolean {
  return actions.some((action) => action.kind === "reject-resource-unimplemented");
}

function stepLxmfPropagatedSendInner(
  state: LxmfPropagatedSendState,
  event: LxmfPropagatedSendEvent
): LxmfPropagatedSendStepResult {
  if (event.kind === "propagated-send/gate") {
    const planActions = stepLxmfPropagatedSendPlanWithActions(
      initialLxmfPropagatedSendPlanState(),
      {
        kind: "propagated-send/plan-gate",
        nodeConfigured: event.nodeConfigured,
        hasPropagationPacked: event.hasPropagationPacked,
        representation: event.representation
      }
    ).actions;
    if (shouldRejectLxmfPropagatedSendPlanMissingNode(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-missing-node" }] };
    }
    if (shouldRejectLxmfPropagatedSendPlanMissingPacked(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-missing-packed" }] };
    }
    if (shouldRejectLxmfPropagatedSendPlanResourceUnimplemented(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-resource-unimplemented" }] };
    }
    if (!shouldPlanLxmfPropagatedSendOk(planActions)) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: "proceed" }] };
  }

  return { state, intents: [], actions: [] };
}

/** Whether outbound LXMF should await / poll a delivery receipt. */
export function shouldAwaitLxmfDeliveryReceipt(receiptPresent: boolean): boolean {
  return receiptPresent;
}

/**
 * LXMF delivery-receipt await gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldAwaitLxmfDeliveryReceipt` reads beside the step).
 */
export type AwaitLxmfDeliveryReceiptState = Record<string, never>;

export type AwaitLxmfDeliveryReceiptEvent =
  | Event
  | {
      readonly kind: "lxmf/await-delivery-receipt-gate";
      readonly receiptPresent: boolean;
    };

export type AwaitLxmfDeliveryReceiptAction =
  | { readonly kind: "await" }
  | { readonly kind: "skip" };

export interface AwaitLxmfDeliveryReceiptStepResult {
  readonly state: AwaitLxmfDeliveryReceiptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AwaitLxmfDeliveryReceiptAction[];
}

export function initialAwaitLxmfDeliveryReceiptState(): AwaitLxmfDeliveryReceiptState {
  return {};
}

export function stepAwaitLxmfDeliveryReceiptWithActions(
  state: AwaitLxmfDeliveryReceiptState,
  event: AwaitLxmfDeliveryReceiptEvent
): AwaitLxmfDeliveryReceiptStepResult {
  if (event.kind === "lxmf/await-delivery-receipt-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAwaitLxmfDeliveryReceipt(event.receiptPresent) ? "await" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAwaitLxmfDeliveryReceiptNow(
  actions: ReadonlyArray<AwaitLxmfDeliveryReceiptAction>
): boolean {
  return actions.some((action) => action.kind === "await");
}

export function shouldSkipAwaitLxmfDeliveryReceipt(
  actions: ReadonlyArray<AwaitLxmfDeliveryReceiptAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether an unpacked deliverable should invoke the delivery callback. */
export function shouldInvokeLxmfDeliveryCallback(messagePresent: boolean): boolean {
  return messagePresent;
}

/**
 * LXMF delivery-callback invoke gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldInvokeLxmfDeliveryCallback` reads beside the step).
 */
export type InvokeLxmfDeliveryCallbackState = Record<string, never>;

export type InvokeLxmfDeliveryCallbackEvent =
  | Event
  | {
      readonly kind: "lxmf/invoke-delivery-callback-gate";
      readonly messagePresent: boolean;
    };

export type InvokeLxmfDeliveryCallbackAction =
  | { readonly kind: "invoke" }
  | { readonly kind: "skip" };

export interface InvokeLxmfDeliveryCallbackStepResult {
  readonly state: InvokeLxmfDeliveryCallbackState;
  readonly intents: readonly Intent[];
  readonly actions: readonly InvokeLxmfDeliveryCallbackAction[];
}

export function initialInvokeLxmfDeliveryCallbackState(): InvokeLxmfDeliveryCallbackState {
  return {};
}

export function stepInvokeLxmfDeliveryCallbackWithActions(
  state: InvokeLxmfDeliveryCallbackState,
  event: InvokeLxmfDeliveryCallbackEvent
): InvokeLxmfDeliveryCallbackStepResult {
  if (event.kind === "lxmf/invoke-delivery-callback-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldInvokeLxmfDeliveryCallback(event.messagePresent) ? "invoke" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldInvokeLxmfDeliveryCallbackNow(
  actions: ReadonlyArray<InvokeLxmfDeliveryCallbackAction>
): boolean {
  return actions.some((action) => action.kind === "invoke");
}

export function shouldSkipInvokeLxmfDeliveryCallback(
  actions: ReadonlyArray<InvokeLxmfDeliveryCallbackAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** LXMFRouter.send method dispatch after packed-envelope check. */
export type LxmfSendMethodPlan =
  | "opportunistic"
  | "direct"
  | "propagated"
  | "reject-unpacked"
  | "reject-unsupported";

export function planLxmfSendMethod(input: {
  readonly packed: boolean;
  readonly method: number;
}): LxmfSendMethodPlan {
  if (!input.packed) {
    return "reject-unpacked";
  }
  if (input.method === LxmfDeliveryMethod.OPPORTUNISTIC) {
    return "opportunistic";
  }
  if (input.method === LxmfDeliveryMethod.DIRECT) {
    return "direct";
  }
  if (input.method === LxmfDeliveryMethod.PROPAGATED) {
    return "propagated";
  }
  return "reject-unsupported";
}

/**
 * Send-method-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfSendMethod` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxmfSendMethodWithActions}.
 */
export type LxmfSendMethodPlanState = Record<string, never>;

export type LxmfSendMethodPlanEvent =
  | Event
  | {
      readonly kind: "send/plan-gate";
      readonly packed: boolean;
      readonly method: number;
    };

export type LxmfSendMethodPlanAction =
  | { readonly kind: "opportunistic" }
  | { readonly kind: "direct" }
  | { readonly kind: "propagated" }
  | { readonly kind: "reject-unpacked" }
  | { readonly kind: "reject-unsupported" };

export interface LxmfSendMethodPlanStepResult {
  readonly state: LxmfSendMethodPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfSendMethodPlanAction[];
}

export function initialLxmfSendMethodPlanState(): LxmfSendMethodPlanState {
  return {};
}

export function stepLxmfSendMethodPlanWithActions(
  state: LxmfSendMethodPlanState,
  event: LxmfSendMethodPlanEvent
): LxmfSendMethodPlanStepResult {
  if (event.kind === "send/plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLxmfSendMethod({
            packed: event.packed,
            method: event.method
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether plan actions reject an unpacked send. */
export function shouldRejectLxmfSendMethodPlanUnpacked(
  actions: ReadonlyArray<LxmfSendMethodPlanAction>
): boolean {
  return actions.some((action) => action.kind === "reject-unpacked");
}

/** Whether plan actions select opportunistic send. */
export function shouldPlanLxmfSendMethodOpportunistic(
  actions: ReadonlyArray<LxmfSendMethodPlanAction>
): boolean {
  return actions.some((action) => action.kind === "opportunistic");
}

/** Whether plan actions select direct send. */
export function shouldPlanLxmfSendMethodDirect(
  actions: ReadonlyArray<LxmfSendMethodPlanAction>
): boolean {
  return actions.some((action) => action.kind === "direct");
}

/** Whether plan actions select propagated send. */
export function shouldPlanLxmfSendMethodPropagated(
  actions: ReadonlyArray<LxmfSendMethodPlanAction>
): boolean {
  return actions.some((action) => action.kind === "propagated");
}

/** Whether plan actions reject an unsupported delivery method. */
export function shouldRejectLxmfSendMethodPlanUnsupported(
  actions: ReadonlyArray<LxmfSendMethodPlanAction>
): boolean {
  return actions.some((action) => action.kind === "reject-unsupported");
}

/** Extract the send-method plan from actions; null when empty. */
export function lxmfSendMethodPlanFromActions(
  actions: ReadonlyArray<LxmfSendMethodPlanAction>
): LxmfSendMethodPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "opportunistic" ||
      entry.kind === "direct" ||
      entry.kind === "propagated" ||
      entry.kind === "reject-unpacked" ||
      entry.kind === "reject-unsupported"
  );
  return action?.kind ?? null;
}

/**
 * Send-method dispatch is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfSendMethodPlanWithActions}
 * (`opportunistic`|`direct`|`propagated`|`reject-unpacked`|`reject-unsupported`).
 */
export type LxmfSendMethodState = Record<string, never>;

export type LxmfSendMethodEvent =
  | Event
  | {
      readonly kind: "send/dispatch";
      readonly packed: boolean;
      readonly method: number;
    };

/**
 * Adapter applies reject / method-send only from these actions.
 * Plan nested via {@link stepLxmfSendMethodPlanWithActions}
 * (`opportunistic`|`direct`|`propagated`|`reject-unpacked`|`reject-unsupported`).
 */
export type LxmfSendMethodAction =
  | { readonly kind: "reject-unpacked" }
  | { readonly kind: "send-opportunistic" }
  | { readonly kind: "send-direct" }
  | { readonly kind: "send-propagated" }
  | { readonly kind: "reject-unsupported"; readonly method: number };

export interface LxmfSendMethodStepResult {
  readonly state: LxmfSendMethodState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfSendMethodAction[];
}

export function initialLxmfSendMethodState(): LxmfSendMethodState {
  return {};
}

export const stepLxmfSendMethod: StepFn<LxmfSendMethodState> = (state, event) => {
  const result = stepLxmfSendMethodInner(state, event as LxmfSendMethodEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLxmfSendMethodWithActions(
  state: LxmfSendMethodState,
  event: LxmfSendMethodEvent
): LxmfSendMethodStepResult {
  return stepLxmfSendMethodInner(state, event);
}

/** Whether step actions reject an unpacked send. */
export function shouldRejectLxmfSendUnpacked(
  actions: ReadonlyArray<LxmfSendMethodAction>
): boolean {
  return actions.some((action) => action.kind === "reject-unpacked");
}

/** Whether step actions dispatch opportunistic send. */
export function shouldSendLxmfOpportunistic(
  actions: ReadonlyArray<LxmfSendMethodAction>
): boolean {
  return actions.some((action) => action.kind === "send-opportunistic");
}

/** Whether step actions dispatch direct send. */
export function shouldSendLxmfDirect(
  actions: ReadonlyArray<LxmfSendMethodAction>
): boolean {
  return actions.some((action) => action.kind === "send-direct");
}

/** Whether step actions dispatch propagated send. */
export function shouldSendLxmfPropagated(
  actions: ReadonlyArray<LxmfSendMethodAction>
): boolean {
  return actions.some((action) => action.kind === "send-propagated");
}

/** Whether step actions reject an unsupported delivery method. */
export function shouldRejectLxmfSendUnsupported(
  actions: ReadonlyArray<LxmfSendMethodAction>
): boolean {
  return actions.some((action) => action.kind === "reject-unsupported");
}

/** Unsupported method code from a reject-unsupported action, if present. */
export function lxmfSendUnsupportedMethod(
  actions: ReadonlyArray<LxmfSendMethodAction>
): number | null {
  for (const action of actions) {
    if (action.kind === "reject-unsupported") {
      return action.method;
    }
  }
  return null;
}

function stepLxmfSendMethodInner(
  state: LxmfSendMethodState,
  event: LxmfSendMethodEvent
): LxmfSendMethodStepResult {
  if (event.kind === "send/dispatch") {
    const planActions = stepLxmfSendMethodPlanWithActions(initialLxmfSendMethodPlanState(), {
      kind: "send/plan-gate",
      packed: event.packed,
      method: event.method
    }).actions;
    if (shouldRejectLxmfSendMethodPlanUnpacked(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-unpacked" }] };
    }
    if (shouldPlanLxmfSendMethodOpportunistic(planActions)) {
      return { state, intents: [], actions: [{ kind: "send-opportunistic" }] };
    }
    if (shouldPlanLxmfSendMethodDirect(planActions)) {
      return { state, intents: [], actions: [{ kind: "send-direct" }] };
    }
    if (shouldPlanLxmfSendMethodPropagated(planActions)) {
      return { state, intents: [], actions: [{ kind: "send-propagated" }] };
    }
    if (!shouldRejectLxmfSendMethodPlanUnsupported(planActions)) {
      return { state, intents: [], actions: [] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "reject-unsupported", method: event.method }]
    };
  }

  return { state, intents: [], actions: [] };
}

export type LxmfDirectSendPlan = "ok" | "missing-destination" | "missing-packed";

/** Whether DIRECT send may proceed (destination identity + packed envelope). */
export function planLxmfDirectSend(input: {
  readonly destinationPresent: boolean;
  readonly destinationIdentityPresent: boolean;
  readonly packed: boolean;
}): LxmfDirectSendPlan {
  if (!input.destinationPresent || !input.destinationIdentityPresent) {
    return "missing-destination";
  }
  if (!input.packed) {
    return "missing-packed";
  }
  return "ok";
}

/**
 * DIRECT send-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfDirectSend` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxmfDirectSendWithActions}.
 */
export type LxmfDirectSendPlanState = Record<string, never>;

export type LxmfDirectSendPlanEvent =
  | Event
  | {
      readonly kind: "direct-send/plan-gate";
      readonly destinationPresent: boolean;
      readonly destinationIdentityPresent: boolean;
      readonly packed: boolean;
    };

export type LxmfDirectSendPlanAction =
  | { readonly kind: "ok" }
  | { readonly kind: "missing-destination" }
  | { readonly kind: "missing-packed" };

export interface LxmfDirectSendPlanStepResult {
  readonly state: LxmfDirectSendPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfDirectSendPlanAction[];
}

export function initialLxmfDirectSendPlanState(): LxmfDirectSendPlanState {
  return {};
}

export function stepLxmfDirectSendPlanWithActions(
  state: LxmfDirectSendPlanState,
  event: LxmfDirectSendPlanEvent
): LxmfDirectSendPlanStepResult {
  if (event.kind === "direct-send/plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLxmfDirectSend({
            destinationPresent: event.destinationPresent,
            destinationIdentityPresent: event.destinationIdentityPresent,
            packed: event.packed
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether plan actions allow DIRECT send to proceed. */
export function shouldPlanLxmfDirectSendOk(
  actions: ReadonlyArray<LxmfDirectSendPlanAction>
): boolean {
  return actions.some((action) => action.kind === "ok");
}

/** Whether plan actions reject a missing destination / identity. */
export function shouldRejectLxmfDirectSendPlanMissingDestination(
  actions: ReadonlyArray<LxmfDirectSendPlanAction>
): boolean {
  return actions.some((action) => action.kind === "missing-destination");
}

/** Whether plan actions reject a missing packed envelope. */
export function shouldRejectLxmfDirectSendPlanMissingPacked(
  actions: ReadonlyArray<LxmfDirectSendPlanAction>
): boolean {
  return actions.some((action) => action.kind === "missing-packed");
}

/** Extract the DIRECT send plan from actions; null when empty. */
export function lxmfDirectSendPlanFromActions(
  actions: ReadonlyArray<LxmfDirectSendPlanAction>
): LxmfDirectSendPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "ok" ||
      entry.kind === "missing-destination" ||
      entry.kind === "missing-packed"
  );
  return action?.kind ?? null;
}

/**
 * DIRECT send gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfDirectSendPlanWithActions}
 * (`ok`|`missing-destination`|`missing-packed`).
 */
export type LxmfDirectSendState = Record<string, never>;

export type LxmfDirectSendEvent =
  | Event
  | {
      readonly kind: "direct-send/gate";
      readonly destinationPresent: boolean;
      readonly destinationIdentityPresent: boolean;
      readonly packed: boolean;
    };

/**
 * Adapter applies proceed / reject only from these actions.
 * Plan nested via {@link stepLxmfDirectSendPlanWithActions}
 * (`ok`|`missing-destination`|`missing-packed`).
 */
export type LxmfDirectSendAction =
  | { readonly kind: "proceed" }
  | { readonly kind: "reject-missing-destination" }
  | { readonly kind: "reject-missing-packed" };

export interface LxmfDirectSendStepResult {
  readonly state: LxmfDirectSendState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfDirectSendAction[];
}

export function initialLxmfDirectSendState(): LxmfDirectSendState {
  return {};
}

export const stepLxmfDirectSend: StepFn<LxmfDirectSendState> = (state, event) => {
  const result = stepLxmfDirectSendInner(state, event as LxmfDirectSendEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLxmfDirectSendWithActions(
  state: LxmfDirectSendState,
  event: LxmfDirectSendEvent
): LxmfDirectSendStepResult {
  return stepLxmfDirectSendInner(state, event);
}

export function shouldProceedLxmfDirectSend(
  actions: ReadonlyArray<LxmfDirectSendAction>
): boolean {
  return actions.some((action) => action.kind === "proceed");
}

export function shouldRejectLxmfDirectMissingDestination(
  actions: ReadonlyArray<LxmfDirectSendAction>
): boolean {
  return actions.some((action) => action.kind === "reject-missing-destination");
}

export function shouldRejectLxmfDirectMissingPacked(
  actions: ReadonlyArray<LxmfDirectSendAction>
): boolean {
  return actions.some((action) => action.kind === "reject-missing-packed");
}

function stepLxmfDirectSendInner(
  state: LxmfDirectSendState,
  event: LxmfDirectSendEvent
): LxmfDirectSendStepResult {
  if (event.kind === "direct-send/gate") {
    const planActions = stepLxmfDirectSendPlanWithActions(initialLxmfDirectSendPlanState(), {
      kind: "direct-send/plan-gate",
      destinationPresent: event.destinationPresent,
      destinationIdentityPresent: event.destinationIdentityPresent,
      packed: event.packed
    }).actions;
    if (shouldRejectLxmfDirectSendPlanMissingDestination(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-missing-destination" }] };
    }
    if (shouldRejectLxmfDirectSendPlanMissingPacked(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-missing-packed" }] };
    }
    if (!shouldPlanLxmfDirectSendOk(planActions)) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: "proceed" }] };
  }

  return { state, intents: [], actions: [] };
}

export type LxmfOpportunisticSendPlan = "ok" | "missing-destination";

/** Whether OPPORTUNISTIC send may proceed (destination present). */
export function planLxmfOpportunisticSend(input: {
  readonly destinationPresent: boolean;
}): LxmfOpportunisticSendPlan {
  if (!input.destinationPresent) {
    return "missing-destination";
  }
  return "ok";
}

/**
 * OPPORTUNISTIC send-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfOpportunisticSend` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxmfOpportunisticSendWithActions}.
 */
export type LxmfOpportunisticSendPlanState = Record<string, never>;

export type LxmfOpportunisticSendPlanEvent =
  | Event
  | {
      readonly kind: "opportunistic-send/plan-gate";
      readonly destinationPresent: boolean;
    };

export type LxmfOpportunisticSendPlanAction =
  | { readonly kind: "ok" }
  | { readonly kind: "missing-destination" };

export interface LxmfOpportunisticSendPlanStepResult {
  readonly state: LxmfOpportunisticSendPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfOpportunisticSendPlanAction[];
}

export function initialLxmfOpportunisticSendPlanState(): LxmfOpportunisticSendPlanState {
  return {};
}

export function stepLxmfOpportunisticSendPlanWithActions(
  state: LxmfOpportunisticSendPlanState,
  event: LxmfOpportunisticSendPlanEvent
): LxmfOpportunisticSendPlanStepResult {
  if (event.kind === "opportunistic-send/plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLxmfOpportunisticSend({
            destinationPresent: event.destinationPresent
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether plan actions allow OPPORTUNISTIC send to proceed. */
export function shouldPlanLxmfOpportunisticSendOk(
  actions: ReadonlyArray<LxmfOpportunisticSendPlanAction>
): boolean {
  return actions.some((action) => action.kind === "ok");
}

/** Whether plan actions reject a missing destination. */
export function shouldRejectLxmfOpportunisticSendPlanMissingDestination(
  actions: ReadonlyArray<LxmfOpportunisticSendPlanAction>
): boolean {
  return actions.some((action) => action.kind === "missing-destination");
}

/** Extract the OPPORTUNISTIC send plan from actions; null when empty. */
export function lxmfOpportunisticSendPlanFromActions(
  actions: ReadonlyArray<LxmfOpportunisticSendPlanAction>
): LxmfOpportunisticSendPlan | null {
  const action = actions.find(
    (entry) => entry.kind === "ok" || entry.kind === "missing-destination"
  );
  return action?.kind ?? null;
}

/**
 * OPPORTUNISTIC send gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfOpportunisticSendPlanWithActions}
 * (`ok`|`missing-destination`).
 */
export type LxmfOpportunisticSendState = Record<string, never>;

export type LxmfOpportunisticSendEvent =
  | Event
  | {
      readonly kind: "opportunistic-send/gate";
      readonly destinationPresent: boolean;
    };

/**
 * Adapter applies proceed / reject only from these actions.
 * Plan nested via {@link stepLxmfOpportunisticSendPlanWithActions}
 * (`ok`|`missing-destination`).
 */
export type LxmfOpportunisticSendAction =
  | { readonly kind: "proceed" }
  | { readonly kind: "reject-missing-destination" };

export interface LxmfOpportunisticSendStepResult {
  readonly state: LxmfOpportunisticSendState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfOpportunisticSendAction[];
}

export function initialLxmfOpportunisticSendState(): LxmfOpportunisticSendState {
  return {};
}

export const stepLxmfOpportunisticSend: StepFn<LxmfOpportunisticSendState> = (state, event) => {
  const result = stepLxmfOpportunisticSendInner(state, event as LxmfOpportunisticSendEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLxmfOpportunisticSendWithActions(
  state: LxmfOpportunisticSendState,
  event: LxmfOpportunisticSendEvent
): LxmfOpportunisticSendStepResult {
  return stepLxmfOpportunisticSendInner(state, event);
}

export function shouldProceedLxmfOpportunisticSend(
  actions: ReadonlyArray<LxmfOpportunisticSendAction>
): boolean {
  return actions.some((action) => action.kind === "proceed");
}

export function shouldRejectLxmfOpportunisticMissingDestination(
  actions: ReadonlyArray<LxmfOpportunisticSendAction>
): boolean {
  return actions.some((action) => action.kind === "reject-missing-destination");
}

function stepLxmfOpportunisticSendInner(
  state: LxmfOpportunisticSendState,
  event: LxmfOpportunisticSendEvent
): LxmfOpportunisticSendStepResult {
  if (event.kind === "opportunistic-send/gate") {
    const planActions = stepLxmfOpportunisticSendPlanWithActions(
      initialLxmfOpportunisticSendPlanState(),
      {
        kind: "opportunistic-send/plan-gate",
        destinationPresent: event.destinationPresent
      }
    ).actions;
    if (shouldRejectLxmfOpportunisticSendPlanMissingDestination(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject-missing-destination" }] };
    }
    if (!shouldPlanLxmfOpportunisticSendOk(planActions)) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: "proceed" }] };
  }

  return { state, intents: [], actions: [] };
}

export type LxMessageInstancePackGate =
  | "ok"
  | "already-packed"
  | "missing-endpoints"
  | "missing-timestamp";

/** Whether an LXMessage instance may pack (already-packed / endpoints / timestamp). */
export function planLxMessageInstancePack(input: {
  readonly alreadyPacked: boolean;
  readonly destinationPresent: boolean;
  readonly sourcePresent: boolean;
  readonly sourceIdentityPresent: boolean;
  readonly timestampPresent: boolean;
}): LxMessageInstancePackGate {
  if (input.alreadyPacked) {
    return "already-packed";
  }
  if (
    !input.destinationPresent ||
    !input.sourcePresent ||
    !input.sourceIdentityPresent
  ) {
    return "missing-endpoints";
  }
  if (!input.timestampPresent) {
    return "missing-timestamp";
  }
  return "ok";
}

/**
 * LXMessage instance pack gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type LxMessageInstancePackState = Record<string, never>;

export type LxMessageInstancePackEvent =
  | Event
  | {
      readonly kind: "instance-pack/gate";
      readonly alreadyPacked: boolean;
      readonly destinationPresent: boolean;
      readonly sourcePresent: boolean;
      readonly sourceIdentityPresent: boolean;
      readonly timestampPresent: boolean;
    };

export type LxMessageInstancePackAction =
  | { readonly kind: "proceed" }
  | { readonly kind: "reject-already-packed" }
  | { readonly kind: "reject-missing-endpoints" }
  | { readonly kind: "reject-missing-timestamp" };

export interface LxMessageInstancePackStepResult {
  readonly state: LxMessageInstancePackState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxMessageInstancePackAction[];
}

export function initialLxMessageInstancePackState(): LxMessageInstancePackState {
  return {};
}

export const stepLxMessageInstancePack: StepFn<LxMessageInstancePackState> = (
  state,
  event
) => {
  const result = stepLxMessageInstancePackInner(
    state,
    event as LxMessageInstancePackEvent
  );
  return { state: result.state, intents: result.intents };
};

export function stepLxMessageInstancePackWithActions(
  state: LxMessageInstancePackState,
  event: LxMessageInstancePackEvent
): LxMessageInstancePackStepResult {
  return stepLxMessageInstancePackInner(state, event);
}

export function shouldProceedLxMessageInstancePack(
  actions: ReadonlyArray<LxMessageInstancePackAction>
): boolean {
  return actions.some((action) => action.kind === "proceed");
}

export function shouldRejectLxMessageInstanceAlreadyPacked(
  actions: ReadonlyArray<LxMessageInstancePackAction>
): boolean {
  return actions.some((action) => action.kind === "reject-already-packed");
}

export function shouldRejectLxMessageInstanceMissingEndpoints(
  actions: ReadonlyArray<LxMessageInstancePackAction>
): boolean {
  return actions.some((action) => action.kind === "reject-missing-endpoints");
}

export function shouldRejectLxMessageInstanceMissingTimestamp(
  actions: ReadonlyArray<LxMessageInstancePackAction>
): boolean {
  return actions.some((action) => action.kind === "reject-missing-timestamp");
}

function stepLxMessageInstancePackInner(
  state: LxMessageInstancePackState,
  event: LxMessageInstancePackEvent
): LxMessageInstancePackStepResult {
  if (event.kind === "instance-pack/gate") {
    const plan = planLxMessageInstancePack({
      alreadyPacked: event.alreadyPacked,
      destinationPresent: event.destinationPresent,
      sourcePresent: event.sourcePresent,
      sourceIdentityPresent: event.sourceIdentityPresent,
      timestampPresent: event.timestampPresent
    });
    if (plan === "already-packed") {
      return { state, intents: [], actions: [{ kind: "reject-already-packed" }] };
    }
    if (plan === "missing-endpoints") {
      return { state, intents: [], actions: [{ kind: "reject-missing-endpoints" }] };
    }
    if (plan === "missing-timestamp") {
      return { state, intents: [], actions: [{ kind: "reject-missing-timestamp" }] };
    }
    return { state, intents: [], actions: [{ kind: "proceed" }] };
  }

  return { state, intents: [], actions: [] };
}

/**
 * Whether LXMessage.pack should reject for missing destination/source endpoints
 * after {@link planLxMessageInstancePack}.
 */
export function shouldRejectLxmfPackEndpoints(input: {
  readonly gateMissingEndpoints: boolean;
  readonly destinationPresent: boolean;
  readonly sourcePresent: boolean;
  readonly sourceIdentityPresent: boolean;
}): boolean {
  return (
    input.gateMissingEndpoints ||
    !input.destinationPresent ||
    !input.sourcePresent ||
    !input.sourceIdentityPresent
  );
}

/**
 * Whether LXMessage.pack should reject for a missing timestamp after
 * {@link planLxMessageInstancePack}.
 */
export function shouldRejectLxmfPackTimestamp(input: {
  readonly gateMissingTimestamp: boolean;
  readonly timestampPresent: boolean;
}): boolean {
  return input.gateMissingTimestamp || !input.timestampPresent;
}

export type LxmfSignatureOutcome = {
  readonly signatureValidated: boolean;
  readonly unverifiedReason: LxmfUnverifiedReasonValue | null;
};

/** Signature status / unverified reason after edge crypto validation. */
export function planLxmfSignatureOutcome(input: {
  readonly sourceIdentityPresent: boolean;
  readonly signatureValid: boolean;
}): LxmfSignatureOutcome {
  if (input.sourceIdentityPresent) {
    return {
      signatureValidated: input.signatureValid,
      unverifiedReason: input.signatureValid
        ? null
        : LxmfUnverifiedReason.SIGNATURE_INVALID
    };
  }
  return {
    signatureValidated: false,
    unverifiedReason: LxmfUnverifiedReason.SOURCE_UNKNOWN
  };
}

/**
 * Signature outcome gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type LxmfSignatureState = Record<string, never>;

export type LxmfSignatureEvent =
  | Event
  | {
      readonly kind: "signature/outcome-gate";
      readonly sourceIdentityPresent: boolean;
      readonly signatureValid: boolean;
    };

export type LxmfSignatureAction = {
  readonly kind: "apply";
  readonly signatureValidated: boolean;
  readonly unverifiedReason: LxmfUnverifiedReasonValue | null;
};

export interface LxmfSignatureStepResult {
  readonly state: LxmfSignatureState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfSignatureAction[];
}

export function initialLxmfSignatureState(): LxmfSignatureState {
  return {};
}

export const stepLxmfSignature: StepFn<LxmfSignatureState> = (state, event) => {
  const result = stepLxmfSignatureInner(state, event as LxmfSignatureEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLxmfSignatureWithActions(
  state: LxmfSignatureState,
  event: LxmfSignatureEvent
): LxmfSignatureStepResult {
  return stepLxmfSignatureInner(state, event);
}

export function shouldApplyLxmfSignature(
  actions: ReadonlyArray<LxmfSignatureAction>
): boolean {
  return actions.some((action) => action.kind === "apply");
}

/** Outcome fields from an apply action, if present. */
export function lxmfSignatureOutcomeFromActions(
  actions: ReadonlyArray<LxmfSignatureAction>
): LxmfSignatureOutcome | null {
  for (const action of actions) {
    if (action.kind === "apply") {
      return {
        signatureValidated: action.signatureValidated,
        unverifiedReason: action.unverifiedReason
      };
    }
  }
  return null;
}

function stepLxmfSignatureInner(
  state: LxmfSignatureState,
  event: LxmfSignatureEvent
): LxmfSignatureStepResult {
  if (event.kind === "signature/outcome-gate") {
    const outcome = planLxmfSignatureOutcome({
      sourceIdentityPresent: event.sourceIdentityPresent,
      signatureValid: event.signatureValid
    });
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "apply",
          signatureValidated: outcome.signatureValidated,
          unverifiedReason: outcome.unverifiedReason
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export type LxmfPropagatedPackPrepPlan =
  | "skip"
  | "ok"
  | "missing-identity"
  | "missing-timestamp";

/**
 * Whether PROPAGATED pack prep (encrypt + envelope) may run during selectDeliveryParameters.
 * Returns `skip` when not packed or not PROPAGATED.
 */
export function planLxmfPropagatedPackPrep(input: {
  readonly packedPresent: boolean;
  readonly desiredMethod: number;
  readonly destinationIdentityPresent: boolean;
  readonly timestampPresent: boolean;
}): LxmfPropagatedPackPrepPlan {
  if (!input.packedPresent || input.desiredMethod !== LxmfDeliveryMethod.PROPAGATED) {
    return "skip";
  }
  if (!input.destinationIdentityPresent) {
    return "missing-identity";
  }
  if (!input.timestampPresent) {
    return "missing-timestamp";
  }
  return "ok";
}

/**
 * PROPAGATED pack prep gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type LxmfPropagatedPackPrepState = Record<string, never>;

export type LxmfPropagatedPackPrepEvent =
  | Event
  | {
      readonly kind: "propagated-pack-prep/gate";
      readonly packedPresent: boolean;
      readonly desiredMethod: number;
      readonly destinationIdentityPresent: boolean;
      readonly timestampPresent: boolean;
    };

export type LxmfPropagatedPackPrepAction =
  | { readonly kind: "skip" }
  | { readonly kind: "proceed" }
  | { readonly kind: "reject-missing-identity" }
  | { readonly kind: "reject-missing-timestamp" };

export interface LxmfPropagatedPackPrepStepResult {
  readonly state: LxmfPropagatedPackPrepState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPropagatedPackPrepAction[];
}

export function initialLxmfPropagatedPackPrepState(): LxmfPropagatedPackPrepState {
  return {};
}

export const stepLxmfPropagatedPackPrep: StepFn<LxmfPropagatedPackPrepState> = (
  state,
  event
) => {
  const result = stepLxmfPropagatedPackPrepInner(
    state,
    event as LxmfPropagatedPackPrepEvent
  );
  return { state: result.state, intents: result.intents };
};

export function stepLxmfPropagatedPackPrepWithActions(
  state: LxmfPropagatedPackPrepState,
  event: LxmfPropagatedPackPrepEvent
): LxmfPropagatedPackPrepStepResult {
  return stepLxmfPropagatedPackPrepInner(state, event);
}

export function shouldSkipLxmfPropagatedPackPrep(
  actions: ReadonlyArray<LxmfPropagatedPackPrepAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

export function shouldProceedLxmfPropagatedPackPrep(
  actions: ReadonlyArray<LxmfPropagatedPackPrepAction>
): boolean {
  return actions.some((action) => action.kind === "proceed");
}

export function shouldRejectLxmfPropagatedPackMissingIdentity(
  actions: ReadonlyArray<LxmfPropagatedPackPrepAction>
): boolean {
  return actions.some((action) => action.kind === "reject-missing-identity");
}

export function shouldRejectLxmfPropagatedPackMissingTimestamp(
  actions: ReadonlyArray<LxmfPropagatedPackPrepAction>
): boolean {
  return actions.some((action) => action.kind === "reject-missing-timestamp");
}

function stepLxmfPropagatedPackPrepInner(
  state: LxmfPropagatedPackPrepState,
  event: LxmfPropagatedPackPrepEvent
): LxmfPropagatedPackPrepStepResult {
  if (event.kind === "propagated-pack-prep/gate") {
    const plan = planLxmfPropagatedPackPrep({
      packedPresent: event.packedPresent,
      desiredMethod: event.desiredMethod,
      destinationIdentityPresent: event.destinationIdentityPresent,
      timestampPresent: event.timestampPresent
    });
    if (plan === "skip") {
      return { state, intents: [], actions: [{ kind: "skip" }] };
    }
    if (plan === "missing-identity") {
      return { state, intents: [], actions: [{ kind: "reject-missing-identity" }] };
    }
    if (plan === "missing-timestamp") {
      return { state, intents: [], actions: [{ kind: "reject-missing-timestamp" }] };
    }
    return { state, intents: [], actions: [{ kind: "proceed" }] };
  }

  return { state, intents: [], actions: [] };
}
