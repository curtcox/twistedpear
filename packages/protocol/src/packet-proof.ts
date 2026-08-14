/**
 * Pure RNS packet proof framing (explicit hash+sig vs signature-only).
 * Signing / verification stay at the crypto adapter edge.
 * Pack / split / hash-match / packet-type / packet-receipt proof-accept
 * conclusions leave via machine actions (no ad-hoc `packPacketProof` /
 * `splitPacketProof` / `packetProofHashMatches` / `isPacketTypeProof` /
 * `planPacketReceiptProofAccept` reads beside the step). Plan nested via
 * {@link stepPacketReceiptProofAcceptPlanWithActions}.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { PACKET_TYPE_PROOF } from "./packet-header.js";
import { equalByteArrays } from "./path-table.js";
import { firstActionOfKind, hasActionOfKind } from "./action-kind.js";

export const PACKET_FULL_HASH_SIZE = 32;
export const PACKET_SIGNATURE_SIZE = 64;
export const PACKET_EXPLICIT_PROOF_SIZE =
  PACKET_FULL_HASH_SIZE + PACKET_SIGNATURE_SIZE;

export type PacketProofFields =
  | {
      readonly kind: "explicit";
      readonly packetHash: Uint8Array;
      readonly signature: Uint8Array;
    }
  | {
      readonly kind: "implicit";
      readonly signature: Uint8Array;
    };

/** Whether a packet is a PROOF type eligible for receipt validation. */
export function isPacketTypeProof(packetType: number): boolean {
  return packetType === PACKET_TYPE_PROOF;
}

/**
 * Packet-type proof gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isPacketTypeProof` reads
 * beside the step).
 */
export type PacketTypeProofState = Record<string, never>;

export type PacketTypeProofEvent =
  | Event
  | {
      readonly kind: "packet-proof/packet-type-gate";
      readonly packetType: number;
    };

export type PacketTypeProofAction =
  { readonly kind: "proof" } | { readonly kind: "other" };

export interface PacketTypeProofStepResult {
  readonly state: PacketTypeProofState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketTypeProofAction[];
}

export function initialPacketTypeProofState(): PacketTypeProofState {
  return {};
}

export function stepPacketTypeProofWithActions(
  state: PacketTypeProofState,
  event: PacketTypeProofEvent,
): PacketTypeProofStepResult {
  if (event.kind === "packet-proof/packet-type-gate") {
    return {
      state,
      intents: [],
      actions: [
        { kind: isPacketTypeProof(event.packetType) ? "proof" : "other" },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldTreatPacketTypeProof(
  actions: ReadonlyArray<PacketTypeProofAction>,
): boolean {
  return hasActionOfKind(actions, "proof");
}

export function shouldTreatPacketTypeOther(
  actions: ReadonlyArray<PacketTypeProofAction>,
): boolean {
  return hasActionOfKind(actions, "other");
}

function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export function packPacketProof(
  packetHash: Uint8Array,
  signature: Uint8Array,
  explicit: boolean = true,
): Uint8Array {
  if (packetHash.length !== PACKET_FULL_HASH_SIZE) {
    throw new Error(`packet hash must be ${PACKET_FULL_HASH_SIZE} bytes`);
  }
  if (signature.length !== PACKET_SIGNATURE_SIZE) {
    throw new Error(`signature must be ${PACKET_SIGNATURE_SIZE} bytes`);
  }
  return explicit ? concatBytes(packetHash, signature) : signature;
}

export function splitPacketProof(proof: Uint8Array): PacketProofFields | null {
  if (proof.length === PACKET_EXPLICIT_PROOF_SIZE) {
    return {
      kind: "explicit",
      packetHash: proof.subarray(0, PACKET_FULL_HASH_SIZE),
      signature: proof.subarray(PACKET_FULL_HASH_SIZE),
    };
  }
  if (proof.length === PACKET_SIGNATURE_SIZE) {
    return { kind: "implicit", signature: proof };
  }
  return null;
}

/**
 * Packet-proof pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packPacketProof`
 * reads beside the step).
 */
export type PackPacketProofState = Record<string, never>;

export type PackPacketProofEvent =
  | Event
  | {
      readonly kind: "packet-proof/pack-gate";
      readonly packetHash: Uint8Array;
      readonly signature: Uint8Array;
      readonly explicit: boolean;
    };

export type PackPacketProofAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface PackPacketProofStepResult {
  readonly state: PackPacketProofState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackPacketProofAction[];
}

export function initialPackPacketProofState(): PackPacketProofState {
  return {};
}

export function stepPackPacketProofWithActions(
  state: PackPacketProofState,
  event: PackPacketProofEvent,
): PackPacketProofStepResult {
  if (event.kind === "packet-proof/pack-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: packPacketProof(
            event.packetHash,
            event.signature,
            event.explicit,
          ),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackPacketProof(
  actions: ReadonlyArray<PackPacketProofAction>,
): boolean {
  return hasActionOfKind(actions, "use-raw");
}

/** Extract packet-proof pack bytes from step actions; null when no `use-raw`. */
export function packPacketProofRawFromActions(
  actions: ReadonlyArray<PackPacketProofAction>,
): Uint8Array | null {
  return firstActionOfKind(actions, "use-raw")?.raw ?? null;
}

/**
 * Packet-proof split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitPacketProof`
 * reads beside the step).
 */
export type SplitPacketProofState = Record<string, never>;

export type SplitPacketProofEvent =
  | Event
  | {
      readonly kind: "packet-proof/split-gate";
      readonly proof: Uint8Array;
    };

export type SplitPacketProofAction =
  | { readonly kind: "use-fields"; readonly fields: PacketProofFields }
  | { readonly kind: "reject" };

export interface SplitPacketProofStepResult {
  readonly state: SplitPacketProofState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitPacketProofAction[];
}

export function initialSplitPacketProofState(): SplitPacketProofState {
  return {};
}

export function stepSplitPacketProofWithActions(
  state: SplitPacketProofState,
  event: SplitPacketProofEvent,
): SplitPacketProofStepResult {
  if (event.kind === "packet-proof/split-gate") {
    const fields = splitPacketProof(event.proof);
    if (fields === null) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "use-fields", fields }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseSplitPacketProof(
  actions: ReadonlyArray<SplitPacketProofAction>,
): boolean {
  return hasActionOfKind(actions, "use-fields");
}

export function shouldRejectSplitPacketProof(
  actions: ReadonlyArray<SplitPacketProofAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Extract split packet-proof fields from step actions; null when no `use-fields`. */
export function packetProofFieldsFromActions(
  actions: ReadonlyArray<SplitPacketProofAction>,
): PacketProofFields | null {
  return firstActionOfKind(actions, "use-fields")?.fields ?? null;
}

/** Whether an explicit proof's embedded hash matches the packet hash. */
export function packetProofHashMatches(
  proof: PacketProofFields,
  packetHash: Uint8Array,
): boolean {
  if (proof.kind !== "explicit") {
    return true;
  }
  return equalByteArrays(proof.packetHash, packetHash);
}

/**
 * Packet-proof hash match is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packetProofHashMatches`
 * reads beside the step).
 */
export type PacketProofHashMatchState = Record<string, never>;

export type PacketProofHashMatchEvent =
  | Event
  | {
      readonly kind: "packet-proof/hash-match-gate";
      readonly proof: PacketProofFields;
      readonly packetHash: Uint8Array;
    };

export type PacketProofHashMatchAction =
  { readonly kind: "match" } | { readonly kind: "mismatch" };

export interface PacketProofHashMatchStepResult {
  readonly state: PacketProofHashMatchState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketProofHashMatchAction[];
}

export function initialPacketProofHashMatchState(): PacketProofHashMatchState {
  return {};
}

export function stepPacketProofHashMatchWithActions(
  state: PacketProofHashMatchState,
  event: PacketProofHashMatchEvent,
): PacketProofHashMatchStepResult {
  if (event.kind === "packet-proof/hash-match-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: packetProofHashMatches(event.proof, event.packetHash)
            ? "match"
            : "mismatch",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldMatchPacketProofHash(
  actions: ReadonlyArray<PacketProofHashMatchAction>,
): boolean {
  return hasActionOfKind(actions, "match");
}

export function shouldMismatchPacketProofHash(
  actions: ReadonlyArray<PacketProofHashMatchAction>,
): boolean {
  return hasActionOfKind(actions, "mismatch");
}

export type PacketReceiptProofAcceptPlan = "reject" | "accept";

/**
 * PacketReceipt.validateProof outcome from split / hash / signature gates.
 * Signature verify stays at the adapter edge as `signatureValid`.
 */
export function planPacketReceiptProofAccept(input: {
  readonly splitOk: boolean;
  readonly hashMatches: boolean;
  readonly signatureValid: boolean;
}): PacketReceiptProofAcceptPlan {
  if (!input.splitOk || !input.hashMatches || !input.signatureValid) {
    return "reject";
  }
  return "accept";
}

/**
 * Whether PacketReceipt may mark delivered after {@link planPacketReceiptProofAccept}
 * and the split proof remains present for narrowing.
 */
export function shouldAcceptPacketReceiptProof(input: {
  readonly planAccept: boolean;
  readonly splitPresent: boolean;
}): boolean {
  return input.planAccept && input.splitPresent;
}

/**
 * Packet-receipt proof accept-after-plan gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldAcceptPacketReceiptProof` reads beside the step).
 */
export type AcceptPacketReceiptProofState = Record<string, never>;

export type AcceptPacketReceiptProofEvent =
  | Event
  | {
      readonly kind: "receipt/accept-proof-gate";
      readonly planAccept: boolean;
      readonly splitPresent: boolean;
    };

export type AcceptPacketReceiptProofAction =
  { readonly kind: "accept" } | { readonly kind: "skip" };

export interface AcceptPacketReceiptProofStepResult {
  readonly state: AcceptPacketReceiptProofState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptPacketReceiptProofAction[];
}

export function initialAcceptPacketReceiptProofState(): AcceptPacketReceiptProofState {
  return {};
}

export function stepAcceptPacketReceiptProofWithActions(
  state: AcceptPacketReceiptProofState,
  event: AcceptPacketReceiptProofEvent,
): AcceptPacketReceiptProofStepResult {
  if (event.kind === "receipt/accept-proof-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptPacketReceiptProof({
            planAccept: event.planAccept,
            splitPresent: event.splitPresent,
          })
            ? "accept"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptPacketReceiptProofNow(
  actions: ReadonlyArray<AcceptPacketReceiptProofAction>,
): boolean {
  return hasActionOfKind(actions, "accept");
}

export function shouldSkipAcceptPacketReceiptProof(
  actions: ReadonlyArray<AcceptPacketReceiptProofAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/**
 * Packet-receipt proof-accept plan gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `planPacketReceiptProofAccept` / `plan ===` reads beside the step). Nested
 * under {@link stepPacketReceiptProofAcceptWithActions}.
 */
export type PacketReceiptProofAcceptPlanState = Record<string, never>;

export type PacketReceiptProofAcceptPlanEvent =
  | Event
  | {
      readonly kind: "receipt/proof-accept-plan-gate";
      readonly splitOk: boolean;
      readonly hashMatches: boolean;
      readonly signatureValid: boolean;
    };

export type PacketReceiptProofAcceptPlanAction = {
  readonly kind: PacketReceiptProofAcceptPlan;
};

export interface PacketReceiptProofAcceptPlanStepResult {
  readonly state: PacketReceiptProofAcceptPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketReceiptProofAcceptPlanAction[];
}

export function initialPacketReceiptProofAcceptPlanState(): PacketReceiptProofAcceptPlanState {
  return {};
}

export function stepPacketReceiptProofAcceptPlanWithActions(
  state: PacketReceiptProofAcceptPlanState,
  event: PacketReceiptProofAcceptPlanEvent,
): PacketReceiptProofAcceptPlanStepResult {
  if (event.kind === "receipt/proof-accept-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planPacketReceiptProofAccept({
            splitOk: event.splitOk,
            hashMatches: event.hashMatches,
            signatureValid: event.signatureValid,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function packetReceiptProofAcceptPlanFromActions(
  actions: ReadonlyArray<PacketReceiptProofAcceptPlanAction>,
): PacketReceiptProofAcceptPlan | null {
  const action = actions.find(
    (entry) => entry.kind === "accept" || entry.kind === "reject",
  );
  return action?.kind ?? null;
}

export function shouldAcceptPacketReceiptProofAcceptPlan(
  actions: ReadonlyArray<PacketReceiptProofAcceptPlanAction>,
): boolean {
  return hasActionOfKind(actions, "accept");
}

export function shouldRejectPacketReceiptProofAcceptPlan(
  actions: ReadonlyArray<PacketReceiptProofAcceptPlanAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/**
 * Packet-receipt proof accept is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepPacketReceiptProofAcceptPlanWithActions}
 * (`accept`|`reject`).
 */
export type PacketReceiptProofAcceptState = Record<string, never>;

export type PacketReceiptProofAcceptEvent =
  | Event
  | {
      readonly kind: "receipt/proof-accept-gate";
      readonly splitOk: boolean;
      readonly hashMatches: boolean;
      readonly signatureValid: boolean;
    };

/**
 * Plan nested via {@link stepPacketReceiptProofAcceptPlanWithActions}
 * (`accept`|`reject`).
 */
export type PacketReceiptProofAcceptAction = {
  readonly kind: PacketReceiptProofAcceptPlan;
};

export interface PacketReceiptProofAcceptStepResult {
  readonly state: PacketReceiptProofAcceptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketReceiptProofAcceptAction[];
}

export function initialPacketReceiptProofAcceptState(): PacketReceiptProofAcceptState {
  return {};
}

export const stepPacketReceiptProofAccept: StepFn<
  PacketReceiptProofAcceptState
> = (state, event) => {
  const result = stepPacketReceiptProofAcceptInner(
    state,
    event as PacketReceiptProofAcceptEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepPacketReceiptProofAcceptWithActions(
  state: PacketReceiptProofAcceptState,
  event: PacketReceiptProofAcceptEvent,
): PacketReceiptProofAcceptStepResult {
  return stepPacketReceiptProofAcceptInner(state, event);
}

export function packetReceiptProofAcceptFromActions(
  actions: ReadonlyArray<PacketReceiptProofAcceptAction>,
): PacketReceiptProofAcceptPlan | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldAcceptPacketReceiptProofActions(
  actions: ReadonlyArray<PacketReceiptProofAcceptAction>,
): boolean {
  return hasActionOfKind(actions, "accept");
}

export function shouldRejectPacketReceiptProofActions(
  actions: ReadonlyArray<PacketReceiptProofAcceptAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

function stepPacketReceiptProofAcceptInner(
  state: PacketReceiptProofAcceptState,
  event: PacketReceiptProofAcceptEvent,
): PacketReceiptProofAcceptStepResult {
  if (event.kind === "receipt/proof-accept-gate") {
    const planActions = stepPacketReceiptProofAcceptPlanWithActions(
      initialPacketReceiptProofAcceptPlanState(),
      {
        kind: "receipt/proof-accept-plan-gate",
        splitOk: event.splitOk,
        hashMatches: event.hashMatches,
        signatureValid: event.signatureValid,
      },
    ).actions;
    const plan = packetReceiptProofAcceptPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}
