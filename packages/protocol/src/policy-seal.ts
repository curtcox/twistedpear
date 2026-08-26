/** Sans-IO policy seal: commit chain, HKDF wrap key, and policy:seal gate. */

import { canonicalJson } from "@twistedpear/effects";
import { sha256 } from "@noble/hashes/sha2.js";
import { evaluatePolicy, type PolicyEvidence } from "./policy-evaluate.js";
import type { PolicyDocument } from "./policy-load.js";
import { rnsHkdfSha256 } from "./rns-hkdf.js";
import { utf8Encode } from "./utf8.js";
import {
  POLICY_LANGUAGE_VERSION,
  POLICY_SUBJECTS,
} from "./policy-vocabulary.js";

export const POLICY_SEAL_SALT = utf8Encode("TwistedPear policy seal v1");

export type SealOutcome =
  | {
      readonly ok: true;
      readonly policy: PolicyDocument;
      readonly parent: Uint8Array;
      readonly commit: Uint8Array;
    }
  | {
      readonly ok: false;
      readonly reason: "invalid" | "unauthorized" | "unknown-rule";
      readonly result?: ReturnType<typeof evaluatePolicy>;
    };

function concatBytes(left: Uint8Array, right: Uint8Array): Uint8Array {
  const out = new Uint8Array(left.length + right.length);
  out.set(left);
  out.set(right, left.length);
  return out;
}

function hashPolicy(policy: PolicyDocument): Uint8Array {
  const rules = [...policy.rules].sort((left, right) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
  );
  return sha256(
    utf8Encode(
      canonicalJson({
        version: policy.version,
        base: policy.base,
        rules,
      }),
    ),
  );
}

/** Genesis commit: language version and closed subject set, no rules. */
export function genesisCommit(): Uint8Array {
  return sha256(
    utf8Encode(
      canonicalJson({
        genesis: "twistedpear-policy-seal-v1",
        version: POLICY_LANGUAGE_VERSION,
        subjects: [...POLICY_SUBJECTS],
      }),
    ),
  );
}

/** `commit_n = H(commit_{n-1} || H(policy_n))`. */
export function nextCommit(
  parent: Uint8Array,
  policy: PolicyDocument,
): Uint8Array {
  if (parent.length !== 32) {
    throw new Error("policy seal parent commit must be 32 bytes");
  }
  return sha256(concatBytes(parent, hashPolicy(policy)));
}

/** `K_n = HKDF(rootSecret, commit_n)` using the RNS HKDF discipline. */
export function deriveSealKey(
  rootSecret: Uint8Array,
  commit: Uint8Array,
): Uint8Array {
  if (rootSecret.length === 0 || commit.length !== 32) {
    throw new Error("policy seal HKDF inputs are the wrong length");
  }
  return rnsHkdfSha256({
    length: 32,
    deriveFrom: rootSecret,
    salt: POLICY_SEAL_SALT,
    context: commit,
  });
}

function markSealed(
  current: PolicyDocument,
  ruleIds: ReadonlySet<string>,
): PolicyDocument {
  return {
    version: current.version,
    base: current.base,
    rules: current.rules.map((rule) =>
      ruleIds.has(rule.id) ? { ...rule, sealed: true } : rule,
    ),
  };
}

/**
 * Mark named rules sealed after `policy:seal` allows. Newly sealing is not
 * an amendment; `applyAmendment` still refuses it. The host rewraps under
 * `commit`.
 */
export function applySeal(
  current: PolicyDocument,
  ruleIds: readonly string[],
  evidence: PolicyEvidence,
  parentCommit: Uint8Array,
): SealOutcome {
  if (parentCommit.length !== 32 || ruleIds.length === 0) {
    return { ok: false, reason: "invalid" };
  }
  const ids = new Set(ruleIds);
  for (const id of ids) {
    if (!current.rules.some((rule) => rule.id === id)) {
      return { ok: false, reason: "unknown-rule" };
    }
  }
  const result = evaluatePolicy(
    current,
    { subject: "policy:seal" },
    evidence,
  );
  if (result.kind !== "allow") {
    return { ok: false, reason: "unauthorized", result };
  }
  const policy = markSealed(current, ids);
  return {
    ok: true,
    policy,
    parent: parentCommit.slice(),
    commit: nextCommit(parentCommit, policy),
  };
}
