/** Shared fixtures for the bypass catalogue. */
import {
  POLICY_SUBJECTS,
  evaluatePolicy,
  loadPolicy,
  type PolicyBase,
  type PolicyDocument,
  type PolicyEvidence,
  type PolicySubject,
} from "@twistedpear/protocol";
import { Identity, NodeCryptoProvider } from "@twistedpear/reticulum-ts";

export const provider = new NodeCryptoProvider();

export const DENY_BASE = Object.fromEntries(
  POLICY_SUBJECTS.map((subject) => [subject, "deny"]),
) as unknown as PolicyBase;

export const PACKAGE_HASH = "ab".repeat(32);
export const INSTALLATION_ID = "cd".repeat(16);

export function policy(
  rules: readonly unknown[],
  base: PolicyBase = DENY_BASE,
): PolicyDocument {
  return loadPolicy({ version: 1, base, rules });
}

export function withBase(
  subject: PolicySubject,
  effect: "allow" | "deny",
): PolicyBase {
  return { ...DENY_BASE, [subject]: effect };
}

export function identityFromSeed(seed: number): Identity {
  const bytes = Uint8Array.from(
    { length: 64 },
    (_, index) => (seed + index) & 0xff,
  );
  const identity = Identity.fromBytes(provider, bytes);
  if (identity === null) throw new Error("test identity rejected");
  return identity;
}

export function bytes(fill: number, length = 32): Uint8Array {
  return new Uint8Array(length).fill(fill);
}

/**
 * Every world over the predicates named, so a claim about what a policy permits
 * is quantified rather than sampled.
 */
export function worlds(keys: readonly string[]): readonly PolicyEvidence[] {
  let out: Record<string, "true" | "false" | "unknown">[] = [{}];
  for (const key of keys) {
    out = out.flatMap((partial) =>
      (["true", "false", "unknown"] as const).map((trit) => ({
        ...partial,
        [key]: trit,
      })),
    );
  }
  return out.map((predicates) => ({ predicates }));
}

/** Subjects this policy can be talked into allowing, over the given worlds. */
export function permitted(
  document: PolicyDocument,
  over: readonly PolicyEvidence[],
): ReadonlySet<PolicySubject> {
  const allowed = new Set<PolicySubject>();
  for (const subject of POLICY_SUBJECTS) {
    for (const evidence of over) {
      if (evaluatePolicy(document, { subject }, evidence).kind === "allow") {
        allowed.add(subject);
      }
    }
  }
  return allowed;
}
