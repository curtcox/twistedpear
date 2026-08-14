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
import { hasActionOfKind } from "../action-kind.js";

export const LxmfDeliveryMethod = {
  OPPORTUNISTIC: 0x01,
  DIRECT: 0x02,
  PROPAGATED: 0x03,
  PAPER: 0x05,
} as const;

export type LxmfDeliveryMethodValue =
  (typeof LxmfDeliveryMethod)[keyof typeof LxmfDeliveryMethod];

export const LxmfDeliveryRepresentation = {
  UNKNOWN: 0x00,
  PACKET: 0x01,
  RESOURCE: 0x02,
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
export const LXMF_LINK_PACKET_MAX_CONTENT =
  LXMF_LINK_PACKET_MDU - LXMF_OVERHEAD;

export function lxmfContentSizeFromPackedLength(
  packedLength: number,
  destinationLength: number = LXMF_DESTINATION_LENGTH,
  signatureLength: number = LXMF_SIGNATURE_LENGTH,
  timestampSize: number = LXMF_TIMESTAMP_SIZE,
  structOverhead: number = LXMF_STRUCT_OVERHEAD,
): number {
  const payloadLength =
    packedLength - (2 * destinationLength + signatureLength);
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
        maxContent: input.encryptedPacketMaxContent,
      };
    }
    return {
      kind: "deliver",
      method: LxmfDeliveryMethod.OPPORTUNISTIC,
      representation: LxmfDeliveryRepresentation.PACKET,
    };
  }

  if (desiredMethod === LxmfDeliveryMethod.DIRECT) {
    return {
      kind: "deliver",
      method: LxmfDeliveryMethod.DIRECT,
      representation:
        input.contentSize <= input.linkPacketMaxContent
          ? LxmfDeliveryRepresentation.PACKET
          : LxmfDeliveryRepresentation.RESOURCE,
    };
  }

  if (desiredMethod === LxmfDeliveryMethod.PROPAGATED) {
    if (input.propagationPackedLength === undefined) {
      throw new Error(
        "PROPAGATED delivery planning requires propagationPackedLength",
      );
    }
    return {
      kind: "deliver",
      method: LxmfDeliveryMethod.PROPAGATED,
      representation:
        input.propagationPackedLength > input.linkPacketMaxContent
          ? LxmfDeliveryRepresentation.RESOURCE
          : LxmfDeliveryRepresentation.PACKET,
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
  event: LxmfDeliveryPlanEvent,
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
            : {}),
        }),
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether plan actions include deliver (set method + representation). */
export function shouldDeliverLxmfDeliveryPlan(
  actions: ReadonlyArray<LxmfDeliveryPlanAction>,
): boolean {
  return hasActionOfKind(actions, "deliver");
}

/** Whether plan actions reject opportunistic content as too large. */
export function shouldRejectLxmfDeliveryPlanOpportunisticTooLarge(
  actions: ReadonlyArray<LxmfDeliveryPlanAction>,
): boolean {
  return actions.some(
    (action) => action.kind === "reject-opportunistic-too-large",
  );
}

/** Whether plan actions reject an unsupported delivery method. */
export function shouldRejectLxmfDeliveryPlanUnsupportedMethod(
  actions: ReadonlyArray<LxmfDeliveryPlanAction>,
): boolean {
  return hasActionOfKind(actions, "reject-unsupported-method");
}

/** Deliver method/representation from a deliver plan action, if present. */
export function lxmfDeliveryPlanDeliverParams(
  actions: ReadonlyArray<LxmfDeliveryPlanAction>,
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
  actions: ReadonlyArray<LxmfDeliveryPlanAction>,
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
  actions: ReadonlyArray<LxmfDeliveryPlanAction>,
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
  actions: ReadonlyArray<LxmfDeliveryPlanAction>,
): LxmfDeliveryPlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "deliver" ||
      entry.kind === "reject-opportunistic-too-large" ||
      entry.kind === "reject-unsupported-method",
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
  event: LxmfDeliveryEvent,
): LxmfDeliveryStepResult {
  return stepLxmfDeliveryInner(state, event);
}

/** Whether step actions include deliver (set method + representation). */
export function shouldDeliverLxmf(
  actions: ReadonlyArray<LxmfDeliveryAction>,
): boolean {
  return hasActionOfKind(actions, "deliver");
}

/** Whether step actions reject opportunistic content as too large. */
export function shouldRejectLxmfOpportunisticTooLarge(
  actions: ReadonlyArray<LxmfDeliveryAction>,
): boolean {
  return actions.some(
    (action) => action.kind === "reject-opportunistic-too-large",
  );
}

/** Whether step actions reject an unsupported delivery method. */
export function shouldRejectLxmfUnsupportedMethod(
  actions: ReadonlyArray<LxmfDeliveryAction>,
): boolean {
  return hasActionOfKind(actions, "reject-unsupported-method");
}

/** Deliver method/representation from a deliver action, if present. */
export function lxmfDeliveryDeliverParams(
  actions: ReadonlyArray<LxmfDeliveryAction>,
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
  actions: ReadonlyArray<LxmfDeliveryAction>,
): { readonly contentSize: number; readonly maxContent: number } | null {
  for (const action of actions) {
    if (action.kind === "reject-opportunistic-too-large") {
      return { contentSize: action.contentSize, maxContent: action.maxContent };
    }
  }
  return null;
}

function idleLxmfDeliveryResult(
  state: LxmfDeliveryState,
): LxmfDeliveryStepResult {
  return { state, intents: [], actions: [] };
}

function rejectOpportunisticTooLarge(
  state: LxmfDeliveryState,
  planActions: ReadonlyArray<LxmfDeliveryPlanAction>,
): LxmfDeliveryStepResult {
  const sizes = lxmfDeliveryPlanOpportunisticRejectSizes(planActions);
  return {
    state,
    intents: [],
    actions: [
      {
        kind: "reject-opportunistic-too-large",
        contentSize: sizes?.contentSize ?? 0,
        maxContent: sizes?.maxContent ?? 0,
      },
    ],
  };
}

function stepLxmfDeliverySelect(
  state: LxmfDeliveryState,
  event: Extract<LxmfDeliveryEvent, { kind: "delivery/select" }>,
): LxmfDeliveryStepResult {
  const planActions = stepLxmfDeliveryPlanWithActions(
    initialLxmfDeliveryPlanState(),
    {
      kind: "delivery/plan-gate",
      desiredMethod: event.desiredMethod,
      contentSize: event.contentSize,
      encryptedPacketMaxContent: event.encryptedPacketMaxContent,
      linkPacketMaxContent: event.linkPacketMaxContent,
      ...(event.propagationPackedLength !== undefined
        ? { propagationPackedLength: event.propagationPackedLength }
        : {}),
    },
  ).actions;
  if (shouldRejectLxmfDeliveryPlanOpportunisticTooLarge(planActions)) {
    return rejectOpportunisticTooLarge(state, planActions);
  }
  if (shouldRejectLxmfDeliveryPlanUnsupportedMethod(planActions)) {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "reject-unsupported-method",
          method: lxmfDeliveryPlanUnsupportedMethod(planActions) ?? 0,
        },
      ],
    };
  }
  if (!shouldDeliverLxmfDeliveryPlan(planActions)) {
    return idleLxmfDeliveryResult(state);
  }
  const params = lxmfDeliveryPlanDeliverParams(planActions);
  return {
    state,
    intents: [],
    actions: [
      {
        kind: "deliver",
        method: params?.method ?? LxmfDeliveryMethod.OPPORTUNISTIC,
        representation:
          params?.representation ?? LxmfDeliveryRepresentation.UNKNOWN,
      },
    ],
  };
}

function stepLxmfDeliveryInner(
  state: LxmfDeliveryState,
  event: LxmfDeliveryEvent,
): LxmfDeliveryStepResult {
  if (event.kind === "delivery/select") {
    return stepLxmfDeliverySelect(state, event);
  }
  return idleLxmfDeliveryResult(state);
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

export type LxMessagePackPlanEvent =
  | Event
  | {
      readonly kind: "lxmessage-pack/plan-gate";
      readonly destinationDirectionOut: boolean;
      readonly sourceDirectionIn: boolean;
      readonly sourceIdentityPresent: boolean;
    };
