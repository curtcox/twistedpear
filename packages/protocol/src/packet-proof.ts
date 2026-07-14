/**
 * Pure RNS packet proof framing (explicit hash+sig vs signature-only).
 * Signing / verification stay at the crypto adapter edge.
 * Packet-receipt proof-accept conclusions leave via machine actions (no ad-hoc
 * `planPacketReceiptProofAccept` reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { PACKET_TYPE_PROOF } from "./packet-header.js";
import { equalByteArrays } from "./path-table.js";

export const PACKET_FULL_HASH_SIZE = 32;
export const PACKET_SIGNATURE_SIZE = 64;
export const PACKET_EXPLICIT_PROOF_SIZE = PACKET_FULL_HASH_SIZE + PACKET_SIGNATURE_SIZE;

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
  explicit: boolean = true
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
      signature: proof.subarray(PACKET_FULL_HASH_SIZE)
    };
  }
  if (proof.length === PACKET_SIGNATURE_SIZE) {
    return { kind: "implicit", signature: proof };
  }
  return null;
}

/** Whether an explicit proof's embedded hash matches the packet hash. */
export function packetProofHashMatches(
  proof: PacketProofFields,
  packetHash: Uint8Array
): boolean {
  if (proof.kind !== "explicit") {
    return true;
  }
  return equalByteArrays(proof.packetHash, packetHash);
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
 * Packet-receipt proof accept is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
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

export const stepPacketReceiptProofAccept: StepFn<PacketReceiptProofAcceptState> = (
  state,
  event
) => {
  const result = stepPacketReceiptProofAcceptInner(
    state,
    event as PacketReceiptProofAcceptEvent
  );
  return { state: result.state, intents: result.intents };
};

export function stepPacketReceiptProofAcceptWithActions(
  state: PacketReceiptProofAcceptState,
  event: PacketReceiptProofAcceptEvent
): PacketReceiptProofAcceptStepResult {
  return stepPacketReceiptProofAcceptInner(state, event);
}

export function packetReceiptProofAcceptFromActions(
  actions: ReadonlyArray<PacketReceiptProofAcceptAction>
): PacketReceiptProofAcceptPlan | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldAcceptPacketReceiptProofActions(
  actions: ReadonlyArray<PacketReceiptProofAcceptAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldRejectPacketReceiptProofActions(
  actions: ReadonlyArray<PacketReceiptProofAcceptAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

function stepPacketReceiptProofAcceptInner(
  state: PacketReceiptProofAcceptState,
  event: PacketReceiptProofAcceptEvent
): PacketReceiptProofAcceptStepResult {
  if (event.kind === "receipt/proof-accept-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planPacketReceiptProofAccept({
            splitOk: event.splitOk,
            hashMatches: event.hashMatches,
            signatureValid: event.signatureValid
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}
