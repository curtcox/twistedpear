import { describe, expect, it } from "vitest";
import {
  POLICY_SUBJECTS,
  evaluatePolicy,
  loadPolicy,
  parameterizedPredicateKey,
  termNeedKey,
  type PolicyBase,
  type PolicyDocument,
  type PolicyEvidence,
  type PolicyQuery,
} from "../src/index.js";

const DENY_BASE = Object.fromEntries(
  POLICY_SUBJECTS.map((subject) => [subject, "deny"]),
) as unknown as PolicyBase;

const install: PolicyQuery = { subject: "app:install" };

function document(
  rules: unknown[],
  base: PolicyBase = DENY_BASE,
): PolicyDocument {
  return loadPolicy({ version: 1, base, rules });
}

function allowWhen(when: unknown, extra: Record<string, unknown> = {}) {
  return {
    id: "allow-install",
    subject: "app:install",
    effect: "allow",
    onUnknown: "deny",
    when,
    ...extra,
  };
}

const whenAll = {
  all: [
    { "place.is": "home" },
    { "time.localHourIn": [9, 17] },
    { "approval.by": "alice" },
    { "approval.byOrg": "ops" },
    { "user.typedPhrase": "ok" },
    { any: [{ not: false }, { assume: [true, false] }] },
    { lte: ["app.sourceBytes", 100] },
    { gt: ["app.sourceBytes", 0] },
    { gte: ["app.sourceBytes", 1] },
    { eq: ["app.publisher", "me"] },
    { in: ["host.class", ["desktop", "laptop"]] },
    { subsetOf: ["app.capabilities", ["storage:kv", "storage:sync"]] },
  ],
};

describe("evaluatePolicy remaining operators", () => {
  it("asks for every missing parameterized predicate and comparison term", () => {
    const policy = document([allowWhen(whenAll)]);
    const result = evaluatePolicy(policy, install, {});
    expect(result.kind).toBe("needs");
    if (result.kind !== "needs") return;
    expect(result.predicates).toEqual(
      [
        parameterizedPredicateKey("place.is", "home"),
        parameterizedPredicateKey("time.localHourIn", [9, 17]),
        parameterizedPredicateKey("approval.by", "alice"),
        parameterizedPredicateKey("approval.byOrg", "ops"),
        parameterizedPredicateKey("user.typedPhrase", "ok"),
        termNeedKey("app.sourceBytes"),
        termNeedKey("app.publisher"),
        termNeedKey("host.class"),
        termNeedKey("app.capabilities"),
      ].sort(),
    );
  });

  it("allows when every remaining operator is satisfied", () => {
    const policy = document([allowWhen(whenAll)]);
    const evidence: PolicyEvidence = {
      predicates: {
        [parameterizedPredicateKey("place.is", "home")]: "true",
        [parameterizedPredicateKey("time.localHourIn", [9, 17])]: "true",
        [parameterizedPredicateKey("approval.by", "alice")]: "true",
        [parameterizedPredicateKey("approval.byOrg", "ops")]: "true",
        [parameterizedPredicateKey("user.typedPhrase", "ok")]: "true",
      },
      terms: {
        "app.sourceBytes": 50,
        "app.publisher": "me",
        "host.class": "desktop",
        "app.capabilities": ["storage:kv"],
      },
    };
    expect(evaluatePolicy(policy, install, evidence)).toMatchObject({
      kind: "allow",
      source: "rule",
    });
  });

  it("treats mistyped comparison operands as false, not unknown", () => {
    const policy = document([
      allowWhen({
        all: [
          { lte: ["app.sourceBytes", 10] },
          { in: ["host.class", ["desktop"]] },
          { subsetOf: ["app.capabilities", ["storage:kv"]] },
        ],
      }),
    ]);
    expect(
      evaluatePolicy(policy, install, {
        terms: {
          "app.sourceBytes": "huge",
          "host.class": true,
          "app.capabilities": "storage:kv",
        },
      }),
    ).toEqual({ kind: "deny", source: "base" });
  });
});
