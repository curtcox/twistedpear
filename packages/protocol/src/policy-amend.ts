/** Sans-IO amendment machine: A-1 pre-amendment eval, A-3/A-4 classification. */

import { evaluatePolicy, type PolicyEvidence } from "./policy-evaluate.js";
import {
  couldStarvePlaceIs,
  diffRules,
  isSyntacticTightening,
  sealedConflict,
} from "./policy-amend-inspect.js";
import {
  loadPolicy,
  PolicyLoadError,
  type PolicyBase,
  type PolicyDocument,
} from "./policy-load.js";
import {
  POLICY_LANGUAGE_VERSION,
  POLICY_SUBJECTS,
} from "./policy-vocabulary.js";

export type AmendmentClass = "certified-tightening" | "relaxation";

export type AmendmentOutcome =
  | {
      readonly ok: true;
      readonly classification: AmendmentClass;
      readonly policy: PolicyDocument;
    }
  | {
      readonly ok: false;
      readonly reason: "invalid" | "sealed" | "unauthorized";
      readonly result?: ReturnType<typeof evaluatePolicy>;
    };

export function classifyAmendment(
  current: PolicyDocument,
  proposed: PolicyDocument,
): AmendmentClass | "sealed" {
  if (sealedConflict(current, proposed)) return "sealed";
  const diff = diffRules(current, proposed);
  if (
    isSyntacticTightening(current, proposed, diff) &&
    !couldStarvePlaceIs(current, proposed, diff)
  ) {
    return "certified-tightening";
  }
  return "relaxation";
}

export function applyAmendment(
  current: PolicyDocument,
  proposedInput: unknown,
  evidence: PolicyEvidence,
): AmendmentOutcome {
  let proposed: PolicyDocument;
  try {
    proposed = loadPolicy(proposedInput);
  } catch (error) {
    if (error instanceof PolicyLoadError) {
      return { ok: false, reason: "invalid" };
    }
    throw error;
  }
  const classification = classifyAmendment(current, proposed);
  if (classification === "sealed") {
    return { ok: false, reason: "sealed" };
  }
  if (classification === "certified-tightening") {
    return { ok: true, classification, policy: proposed };
  }
  const result = evaluatePolicy(
    current,
    { subject: "policy:amend" },
    evidence,
  );
  if (result.kind === "allow") {
    return { ok: true, classification: "relaxation", policy: proposed };
  }
  return { ok: false, reason: "unauthorized", result };
}

function denyBase(): PolicyBase {
  return Object.fromEntries(
    POLICY_SUBJECTS.map((subject) => [subject, "deny"]),
  ) as unknown as PolicyBase;
}

/** Seeded installation policy: deny by default; policy:amend allows iff passphrase. */
export function seededUserPolicy(): PolicyDocument {
  return loadPolicy({
    version: POLICY_LANGUAGE_VERSION,
    base: denyBase(),
    rules: [
      {
        id: "amend-passphrase",
        subject: "policy:amend",
        effect: "allow",
        onUnknown: "deny",
        when: "user.passphrase",
      },
    ],
  });
}
