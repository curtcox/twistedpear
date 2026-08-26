/** Host adapters for SPEC-POLICY predicates. The evaluator stays Sans-IO. */
import { canonicalJson } from "@twistedpear/effects";
import {
  evaluatePolicy,
  type PolicyDocument,
  type PolicyEvidence,
  type PolicyQuery,
  type PolicySubject,
  type Trit,
} from "@twistedpear/protocol";
import {
  Identity,
  bytesToHex,
  hexToBytes,
  type CryptoProvider,
} from "@twistedpear/reticulum-ts";

export const POLICY_CLOCK_ATTESTATION_KIND = "tp-policy-clock" as const;
export const POLICY_APPROVAL_ATTESTATION_KIND = "tp-policy-approval" as const;

export type ApprovalScope = "by" | "byOrg";

export type ClockAttestation = {
  readonly unixMs: number;
  readonly monotonicMs: number;
  readonly signerPublicKey: string;
  readonly signature: string;
};

export type ApprovalAttestation = {
  readonly subject: PolicySubject;
  readonly packageHash: string;
  readonly installationId: string;
  readonly nonce: string;
  readonly expiresAt: number;
  readonly role: string;
  readonly scope: ApprovalScope;
  readonly approverPublicKey: string;
  readonly signature: string;
};

export type ApprovalNonceStore = {
  isSpent(nonce: string): boolean;
  spend(nonce: string): void;
};

export type GeoFence = {
  readonly latitude: number;
  readonly longitude: number;
  readonly radiusMeters: number;
};

export type ClockSample = {
  readonly monotonicMs: number;
  readonly timezoneOffsetMinutes: number;
  readonly attestation: ClockAttestation;
  readonly trustedSigners: readonly string[];
};

export type PlaceSample = {
  readonly latitude: number;
  readonly longitude: number;
};

export type SiblingPolicyCarry =
  | { readonly kind: "approval"; readonly attestation: ApprovalAttestation }
  | { readonly kind: "decision"; readonly allow: boolean };

export type PolicyEvidenceInput = {
  readonly policy: PolicyDocument;
  readonly query: PolicyQuery;
  readonly packageHash: string;
  readonly installationId: string;
  readonly provider: CryptoProvider;
  readonly clock?: ClockSample;
  readonly place?: PlaceSample;
  readonly namedPlaces?: Readonly<Record<string, GeoFence>>;
  readonly awake?: Trit;
  readonly roles?: Readonly<Record<string, string>>;
  readonly orgs?: Readonly<Record<string, string>>;
  readonly approvals?: readonly ApprovalAttestation[];
  readonly nonces: ApprovalNonceStore;
};

const EARTH_RADIUS_M = 6_371_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;
const TEXT = new TextEncoder();

function payloadBytes(body: unknown): Uint8Array {
  return TEXT.encode(canonicalJson(body));
}

function publicKeyHex(identity: Identity): string {
  return bytesToHex(identity.getPublicKey());
}

function verifySigned(
  provider: CryptoProvider,
  publicKey: string,
  body: unknown,
  signatureHex: string,
): boolean {
  try {
    const identity = Identity.fromPublicKey(provider, hexToBytes(publicKey));
    if (identity === null) return false;
    return identity.validate(hexToBytes(signatureHex), payloadBytes(body));
  } catch {
    return false;
  }
}

function clockBody(attestation: Omit<ClockAttestation, "signature">): unknown {
  return {
    kind: POLICY_CLOCK_ATTESTATION_KIND,
    monotonicMs: attestation.monotonicMs,
    unixMs: attestation.unixMs,
  };
}

function approvalBody(
  attestation: Omit<ApprovalAttestation, "signature">,
): unknown {
  return {
    expiresAt: attestation.expiresAt,
    installationId: attestation.installationId,
    kind: POLICY_APPROVAL_ATTESTATION_KIND,
    nonce: attestation.nonce,
    packageHash: attestation.packageHash,
    role: attestation.role,
    scope: attestation.scope,
    subject: attestation.subject,
  };
}

export function signClockAttestation(
  identity: Identity,
  fields: { readonly unixMs: number; readonly monotonicMs: number },
): ClockAttestation {
  const unsigned = {
    monotonicMs: fields.monotonicMs,
    signerPublicKey: publicKeyHex(identity),
    unixMs: fields.unixMs,
  };
  return {
    ...unsigned,
    signature: bytesToHex(identity.sign(payloadBytes(clockBody(unsigned)))),
  };
}

export function verifyClockAttestation(
  provider: CryptoProvider,
  attestation: ClockAttestation,
): boolean {
  const { signature, ...unsigned } = attestation;
  return verifySigned(
    provider,
    unsigned.signerPublicKey,
    clockBody(unsigned),
    signature,
  );
}

export function signApprovalAttestation(
  identity: Identity,
  fields: Omit<ApprovalAttestation, "approverPublicKey" | "signature">,
): ApprovalAttestation {
  const unsigned = {
    ...fields,
    approverPublicKey: publicKeyHex(identity),
  };
  return {
    ...unsigned,
    signature: bytesToHex(identity.sign(payloadBytes(approvalBody(unsigned)))),
  };
}

export function verifyApprovalAttestation(
  provider: CryptoProvider,
  attestation: ApprovalAttestation,
): boolean {
  const { signature, ...unsigned } = attestation;
  return verifySigned(
    provider,
    unsigned.approverPublicKey,
    approvalBody(unsigned),
    signature,
  );
}

export function createMemoryNonceStore(
  spent: Iterable<string> = [],
): ApprovalNonceStore {
  const held = new Set(spent);
  return {
    isSpent(nonce) {
      return held.has(nonce);
    },
    spend(nonce) {
      held.add(nonce);
    },
  };
}

/** Sibling may carry an approval; a sibling decision is discarded (P-R11). */
export function approvalsCarriedBySibling(
  payloads: readonly SiblingPolicyCarry[],
): ApprovalAttestation[] {
  return payloads.flatMap((payload) =>
    payload.kind === "approval" ? [payload.attestation] : [],
  );
}

function distanceMeters(left: PlaceSample, right: GeoFence): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(right.latitude - left.latitude);
  const dLon = toRad(right.longitude - left.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const chord =
    sinLat * sinLat +
    Math.cos(toRad(left.latitude)) *
      Math.cos(toRad(right.latitude)) *
      sinLon *
      sinLon;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(chord)));
}

function hourInWindow(hour: number, from: number, to: number): boolean {
  if (from === to) return false;
  if (from < to) return hour >= from && hour < to;
  return hour >= from || hour < to;
}

function attestedUnixMs(
  clock: ClockSample,
  provider: CryptoProvider,
): number | null {
  if (!clock.trustedSigners.includes(clock.attestation.signerPublicKey)) {
    return null;
  }
  if (!verifyClockAttestation(provider, clock.attestation)) return null;
  if (clock.monotonicMs < clock.attestation.monotonicMs) return null;
  return (
    clock.attestation.unixMs +
    (clock.monotonicMs - clock.attestation.monotonicMs)
  );
}

function clockIsAttested(
  clock: ClockSample | undefined,
  provider: CryptoProvider,
): boolean {
  return clock !== undefined && attestedUnixMs(clock, provider) !== null;
}

function localHour(unixMs: number, timezoneOffsetMinutes: number): number {
  const shifted = unixMs + timezoneOffsetMinutes * 60_000;
  const dayMs = ((shifted % MS_PER_DAY) + MS_PER_DAY) % MS_PER_DAY;
  return Math.floor(dayMs / MS_PER_HOUR);
}

function parseHourWindow(key: string): [number, number] | null {
  if (!key.startsWith("time.localHourIn:")) return null;
  const parts = key.slice("time.localHourIn:".length).split(",");
  if (parts.length !== 2) return null;
  const from = Number(parts[0]);
  const to = Number(parts[1]);
  if (!Number.isInteger(from) || !Number.isInteger(to)) return null;
  return [from, to];
}

function resolveTime(key: string, input: PolicyEvidenceInput): Trit {
  const window = parseHourWindow(key);
  if (window === null || input.clock === undefined) return "unknown";
  const unixMs = attestedUnixMs(input.clock, input.provider);
  if (unixMs === null) return "unknown";
  const hour = localHour(unixMs, input.clock.timezoneOffsetMinutes);
  return hourInWindow(hour, window[0], window[1]) ? "true" : "false";
}

function resolvePlace(name: string, input: PolicyEvidenceInput): Trit {
  if (input.place === undefined) return "unknown";
  const fence = input.namedPlaces?.[name];
  if (fence === undefined) return "unknown";
  return distanceMeters(input.place, fence) <= fence.radiusMeters
    ? "true"
    : "false";
}

function boundKey(
  scope: ApprovalScope,
  role: string,
  input: PolicyEvidenceInput,
): string | undefined {
  return scope === "by" ? input.roles?.[role] : input.orgs?.[role];
}

function approvalMatches(
  attestation: ApprovalAttestation,
  role: string,
  scope: ApprovalScope,
  input: PolicyEvidenceInput,
): boolean {
  return (
    attestation.role === role &&
    attestation.scope === scope &&
    attestation.subject === input.query.subject &&
    attestation.packageHash === input.packageHash &&
    attestation.installationId === input.installationId &&
    attestation.approverPublicKey === boundKey(scope, role, input) &&
    verifyApprovalAttestation(input.provider, attestation)
  );
}

function resolveApproval(
  role: string,
  scope: ApprovalScope,
  input: PolicyEvidenceInput,
): Trit {
  const now = input.clock ? attestedUnixMs(input.clock, input.provider) : null;
  let pendingUnknown = false;
  for (const attestation of input.approvals ?? []) {
    if (!approvalMatches(attestation, role, scope, input)) continue;
    if (input.nonces.isSpent(attestation.nonce)) continue;
    if (now === null) {
      pendingUnknown = true;
      continue;
    }
    if (attestation.expiresAt <= now) continue;
    input.nonces.spend(attestation.nonce);
    return "true";
  }
  return pendingUnknown ? "unknown" : "false";
}

function resolvePredicate(
  key: string,
  input: PolicyEvidenceInput,
): Trit | undefined {
  if (key === "clock.attested") {
    return clockIsAttested(input.clock, input.provider) ? "true" : "false";
  }
  if (key === "user.awake") return input.awake ?? "unknown";
  if (key.startsWith("place.is:")) {
    return resolvePlace(key.slice("place.is:".length), input);
  }
  if (key.startsWith("time.localHourIn:")) return resolveTime(key, input);
  if (key.startsWith("approval.by:")) {
    return resolveApproval(key.slice("approval.by:".length), "by", input);
  }
  if (key.startsWith("approval.byOrg:")) {
    return resolveApproval(key.slice("approval.byOrg:".length), "byOrg", input);
  }
  return undefined;
}

/**
 * Fill host-owned predicates the evaluator asked for. Absent sensors resolve
 * `unknown`. Time stays unknown unless the clock is attested (P-R13).
 */
export function gatherPolicyEvidence(
  input: PolicyEvidenceInput,
): PolicyEvidence {
  const predicates: Record<string, Trit> = {
    "clock.attested": clockIsAttested(input.clock, input.provider)
      ? "true"
      : "false",
  };
  for (let round = 0; round < 8; round += 1) {
    const result = evaluatePolicy(input.policy, input.query, { predicates });
    if (result.kind !== "needs") return { predicates };
    let progressed = false;
    for (const key of result.predicates) {
      if (predicates[key] !== undefined) continue;
      const value = resolvePredicate(key, input);
      if (value === undefined) continue;
      predicates[key] = value;
      progressed = true;
    }
    if (!progressed) break;
  }
  return { predicates };
}

export function decidePolicy(input: PolicyEvidenceInput) {
  return evaluatePolicy(input.policy, input.query, gatherPolicyEvidence(input));
}
