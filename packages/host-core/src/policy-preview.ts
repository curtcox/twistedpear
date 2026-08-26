/**
 * Generated consequence preview for a policy about to be sealed (P-R15–P-R17).
 * Reachability is decided by enumerating the evaluator's finite predicate domain.
 */
import { canonicalJson } from "@twistedpear/effects";
import {
  POLICY_SUBJECTS,
  applySeal,
  evaluatePolicy,
  parameterizedPredicateKey,
  type PolicyDocument,
  type PolicyEvidence,
  type PolicyExpression,
  type PolicySubject,
  type Trit,
} from "@twistedpear/protocol";
import { SEALED_STORE_NAMES } from "./policy-seal.js";

export const POLICY_SEAL_CONFIRMATION = "I understand these consequences";
const MAX_FREE_PREDICATES = 7;
const TRITS: readonly Trit[] = ["false", "unknown", "true"];

export type PreviewHost = {
  readonly unavailablePredicates?: ReadonlySet<string>;
};

export type SubjectReachability = {
  readonly reachable: boolean | "undecided";
  readonly witness?: PolicyEvidence;
};

export type PolicyPreview = {
  readonly subjects: Readonly<Record<PolicySubject, SubjectReachability>>;
  readonly terminal: boolean;
  readonly loadBearingPeople: readonly string[];
  readonly loadBearingSources: readonly string[];
  readonly unknownWeakenings: readonly string[];
  readonly reinstallCost: readonly string[];
  readonly text: string;
};

export type SealConsent = {
  readonly preview: PolicyPreview;
  readonly typedPhrase: string;
};

export type PreviewedSeal =
  | {
      readonly ok: true;
      readonly policy: PolicyDocument;
      readonly commit: Uint8Array;
      readonly consent: SealConsent;
    }
  | { readonly ok: false; readonly reason: "confirmation" | "preview" | "seal" };

type Collector = {
  predicates: Set<string>;
  people: Set<string>;
  sources: Set<string>;
  assumesTrue: string[];
};

function collectExpr(expr: PolicyExpression, into: Collector): void {
  if (typeof expr === "boolean") return;
  if (typeof expr === "string") {
    into.predicates.add(expr);
    noteSource(expr, into);
    return;
  }
  if ("all" in expr) {
    for (const item of expr.all) collectExpr(item, into);
    return;
  }
  if ("any" in expr) {
    for (const item of expr.any) collectExpr(item, into);
    return;
  }
  if ("not" in expr) {
    collectExpr(expr.not, into);
    return;
  }
  if ("known" in expr) {
    collectExpr(expr.known, into);
    return;
  }
  if ("assume" in expr) {
    if (expr.assume[1] === true) {
      into.assumesTrue.push("assume(..., true)");
    }
    collectExpr(expr.assume[0], into);
    return;
  }
  if ("place.is" in expr) {
    const key = parameterizedPredicateKey("place.is", expr["place.is"]);
    into.predicates.add(key);
    into.sources.add("place");
    return;
  }
  if ("time.localHourIn" in expr) {
    into.predicates.add(
      parameterizedPredicateKey("time.localHourIn", expr["time.localHourIn"]),
    );
    into.sources.add("clock");
    return;
  }
  if ("approval.by" in expr) {
    const role = expr["approval.by"];
    into.predicates.add(parameterizedPredicateKey("approval.by", role));
    into.people.add(role);
    return;
  }
  if ("approval.byOrg" in expr) {
    const org = expr["approval.byOrg"];
    into.predicates.add(parameterizedPredicateKey("approval.byOrg", org));
    into.people.add(org);
    return;
  }
  if ("user.typedPhrase" in expr) {
    into.predicates.add(
      parameterizedPredicateKey("user.typedPhrase", expr["user.typedPhrase"]),
    );
    into.sources.add("typed-phrase");
  }
}

function noteSource(predicate: string, into: Collector): void {
  if (predicate === "clock.attested") into.sources.add("clock");
  if (predicate === "user.awake") into.sources.add("wakefulness");
  if (predicate === "user.voiceAuthorized") into.sources.add("voice");
  if (predicate === "user.passphrase") into.sources.add("passphrase");
  if (predicate === "power.charging") into.sources.add("power");
  if (predicate === "network.offline") into.sources.add("network");
}

function pinnedUnknown(
  key: string,
  unavailable: ReadonlySet<string> | undefined,
): boolean {
  if (unavailable === undefined) return false;
  if (unavailable.has(key)) return true;
  const prefix = key.split(":")[0];
  return prefix !== undefined && unavailable.has(prefix);
}

function collectPolicy(policy: PolicyDocument, subject?: PolicySubject): Collector {
  const into: Collector = {
    predicates: new Set(),
    people: new Set(),
    sources: new Set(),
    assumesTrue: [],
  };
  for (const rule of policy.rules) {
    if (subject !== undefined && rule.subject !== subject) continue;
    collectExpr(rule.when, into);
  }
  return into;
}

function assignments(
  keys: readonly string[],
): ReadonlyArray<Readonly<Record<string, Trit>>> {
  if (keys.length === 0) return [{}];
  const out: Record<string, Trit>[] = [];
  const walk = (index: number, current: Record<string, Trit>): void => {
    if (index === keys.length) {
      out.push({ ...current });
      return;
    }
    const key = keys[index];
    if (key === undefined) return;
    for (const trit of TRITS) {
      current[key] = trit;
      walk(index + 1, current);
    }
  };
  walk(0, {});
  return out;
}

function reachability(
  policy: PolicyDocument,
  subject: PolicySubject,
  host: PreviewHost,
): SubjectReachability {
  const collected = collectPolicy(policy, subject);
  const pinned: Record<string, Trit> = {};
  const free: string[] = [];
  for (const key of [...collected.predicates].sort()) {
    if (pinnedUnknown(key, host.unavailablePredicates)) pinned[key] = "unknown";
    else free.push(key);
  }
  if (free.length > MAX_FREE_PREDICATES) return { reachable: "undecided" };
  let sawNeeds = false;
  for (const predicates of assignments(free)) {
    const evidence: PolicyEvidence = {
      predicates: { ...pinned, ...predicates },
    };
    const result = evaluatePolicy(policy, { subject }, evidence);
    if (result.kind === "allow") return { reachable: true, witness: evidence };
    if (result.kind === "needs") sawNeeds = true;
  }
  if (sawNeeds) return { reachable: "undecided" };
  return { reachable: false };
}

function unknownWeakenings(policy: PolicyDocument): string[] {
  const collected = collectPolicy(policy);
  const weakenings = [...collected.assumesTrue];
  for (const rule of policy.rules) {
    if (rule.onUnknown === "allow") {
      weakenings.push(`onUnknown allow (${rule.id})`);
    }
  }
  return weakenings.sort();
}

function renderPreview(preview: Omit<PolicyPreview, "text">): string {
  const lines = ["Consequence preview"];
  if (preview.terminal) {
    lines.push("This policy is terminal: policy:amend is not satisfiable.");
  }
  for (const subject of POLICY_SUBJECTS) {
    const row = preview.subjects[subject];
    if (row.reachable === true) {
      lines.push(`${subject}: reachable`);
    } else if (row.reachable === false) {
      lines.push(`${subject}: permanently prevented on this installation`);
    } else {
      lines.push(`${subject}: could not decide`);
    }
  }
  if (preview.loadBearingPeople.length > 0) {
    lines.push(`Load-bearing people: ${preview.loadBearingPeople.join(", ")}`);
  }
  if (preview.loadBearingSources.length > 0) {
    lines.push(`Load-bearing sources: ${preview.loadBearingSources.join(", ")}`);
  }
  if (preview.unknownWeakenings.length > 0) {
    lines.push(`Unknown weakenings: ${preview.unknownWeakenings.join("; ")}`);
  }
  lines.push(`Reinstall destroys: ${preview.reinstallCost.join(", ")}`);
  return lines.join("\n");
}

/** Generate the consequence preview for a policy on this host (P-R16). */
export function previewPolicy(
  policy: PolicyDocument,
  host: PreviewHost = {},
): PolicyPreview {
  const collected = collectPolicy(policy);
  const subjects = Object.fromEntries(
    POLICY_SUBJECTS.map((subject) => [
      subject,
      reachability(policy, subject, host),
    ]),
  ) as Record<PolicySubject, SubjectReachability>;
  const draft: Omit<PolicyPreview, "text"> = {
    subjects,
    terminal: subjects["policy:amend"].reachable === false,
    loadBearingPeople: [...collected.people].sort(),
    loadBearingSources: [...collected.sources].sort(),
    unknownWeakenings: unknownWeakenings(policy),
    reinstallCost: [...SEALED_STORE_NAMES],
  };
  return { ...draft, text: renderPreview(draft) };
}

export function previewsMatch(left: PolicyPreview, right: PolicyPreview): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

/**
 * Seal only after the generated preview is accepted with the typed phrase.
 * A terminal policy is still sealeable (P-R17).
 */
export function sealWithPreview(input: {
  readonly policy: PolicyDocument;
  readonly ruleIds: readonly string[];
  readonly evidence: PolicyEvidence;
  readonly parentCommit: Uint8Array;
  readonly host?: PreviewHost;
  readonly preview: PolicyPreview;
  readonly typedPhrase: string;
}): PreviewedSeal {
  const expected = previewPolicy(input.policy, input.host);
  if (!previewsMatch(input.preview, expected)) {
    return { ok: false, reason: "preview" };
  }
  if (input.typedPhrase !== POLICY_SEAL_CONFIRMATION) {
    return { ok: false, reason: "confirmation" };
  }
  const sealed = applySeal(
    input.policy,
    input.ruleIds,
    input.evidence,
    input.parentCommit,
  );
  if (!sealed.ok) return { ok: false, reason: "seal" };
  return {
    ok: true,
    policy: sealed.policy,
    commit: sealed.commit,
    consent: { preview: input.preview, typedPhrase: input.typedPhrase },
  };
}
