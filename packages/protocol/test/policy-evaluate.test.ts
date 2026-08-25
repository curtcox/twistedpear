import { describe, expect, it } from "vitest";
import {
  POLICY_SUBJECTS,
  evaluatePolicy,
  kleeneAll,
  kleeneAny,
  kleeneAssume,
  kleeneKnown,
  kleeneNot,
  loadPolicy,
  parameterizedPredicateKey,
  PolicyLoadError,
  TRITS,
  type PolicyBase,
  type PolicyDocument,
  type PolicyEvidence,
  type PolicyQuery,
  type Trit,
} from "../src/index.js";
import vectors from "../../../conformance/vectors/policy.json";

const DENY_BASE = Object.fromEntries(
  POLICY_SUBJECTS.map((subject) => [subject, "deny"]),
) as unknown as PolicyBase;

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

describe("loadPolicy P-R1 / P-R2", () => {
  it("rejects an unknown language version", () => {
    expect(() => loadPolicy({ version: 2, base: DENY_BASE, rules: [] })).toThrow(
      PolicyLoadError,
    );
    try {
      loadPolicy({ version: 2, base: DENY_BASE, rules: [] });
    } catch (error) {
      expect(error).toMatchObject({ code: "unknown-version" });
    }
  });

  it("rejects an unknown subject", () => {
    expect(() =>
      loadPolicy({
        version: 1,
        base: DENY_BASE,
        rules: [allowWhen(true, { subject: "app:delete" })],
      }),
    ).toThrow(/unknown/);
    try {
      loadPolicy({
        version: 1,
        base: DENY_BASE,
        rules: [allowWhen(true, { subject: "app:delete" })],
      });
    } catch (error) {
      expect(error).toMatchObject({ code: "unknown-subject" });
    }
  });

  it("rejects an unknown predicate and combinator", () => {
    try {
      loadPolicy({
        version: 1,
        base: DENY_BASE,
        rules: [allowWhen("user.invisible")],
      });
    } catch (error) {
      expect(error).toMatchObject({ code: "unknown-predicate" });
    }
    try {
      loadPolicy({
        version: 1,
        base: DENY_BASE,
        rules: [allowWhen({ xor: [true, false] })],
      });
    } catch (error) {
      expect(error).toMatchObject({ code: "unknown-combinator" });
    }
  });

  it("rejects a rule that omits onUnknown", () => {
    try {
      loadPolicy({
        version: 1,
        base: DENY_BASE,
        rules: [
          {
            id: "no-collapse",
            subject: "app:install",
            effect: "allow",
            when: true,
          },
        ],
      });
    } catch (error) {
      expect(error).toMatchObject({ code: "missing-collapse" });
    }
  });
});

describe("Kleene combinators", () => {
  it("matches the strong-Kleene all / any / not tables", () => {
    const table: Record<Trit, Record<Trit, Trit>> = {
      false: { false: "false", unknown: "false", true: "false" },
      unknown: { false: "false", unknown: "unknown", true: "unknown" },
      true: { false: "false", unknown: "unknown", true: "true" },
    };
    const or: Record<Trit, Record<Trit, Trit>> = {
      false: { false: "false", unknown: "unknown", true: "true" },
      unknown: { false: "unknown", unknown: "unknown", true: "true" },
      true: { false: "true", unknown: "true", true: "true" },
    };
    for (const left of TRITS) {
      for (const right of TRITS) {
        expect(kleeneAll([left, right]), `all ${left} ${right}`).toBe(
          table[left][right],
        );
        expect(kleeneAny([left, right]), `any ${left} ${right}`).toBe(
          or[left][right],
        );
      }
    }
    expect(kleeneNot("true")).toBe("false");
    expect(kleeneNot("false")).toBe("true");
    expect(kleeneNot("unknown")).toBe("unknown");
  });

  it("treats known as must-be-true and assume as an explicit collapse", () => {
    expect(kleeneKnown("true")).toBe("true");
    expect(kleeneKnown("false")).toBe("false");
    expect(kleeneKnown("unknown")).toBe("false");
    expect(kleeneAssume("unknown", true)).toBe("true");
    expect(kleeneAssume("unknown", false)).toBe("false");
    expect(kleeneAssume("false", true)).toBe("false");
  });
});

describe("evaluatePolicy", () => {
  const install: PolicyQuery = { subject: "app:install" };

  it("returns the base posture when no rule matches", () => {
    const policy = document([]);
    expect(evaluatePolicy(policy, install, {})).toEqual({
      kind: "deny",
      source: "base",
    });
  });

  it("asks for missing predicates instead of silently collapsing", () => {
    const policy = document([allowWhen("user.awake")]);
    expect(evaluatePolicy(policy, install, {})).toEqual({
      kind: "needs",
      predicates: ["user.awake"],
    });
  });

  it("allows when the condition is true and denies when it is false", () => {
    const policy = document([allowWhen("user.awake")]);
    expect(
      evaluatePolicy(policy, install, { predicates: { "user.awake": "true" } }),
    ).toMatchObject({ kind: "allow", source: "rule" });
    expect(
      evaluatePolicy(policy, install, {
        predicates: { "user.awake": "false" },
      }),
    ).toEqual({ kind: "deny", source: "base" });
  });

  it("collapses unknown per the rule, not a default", () => {
    const denyUnknown = document([allowWhen("user.awake")]);
    expect(
      evaluatePolicy(denyUnknown, install, {
        predicates: { "user.awake": "unknown" },
      }),
    ).toMatchObject({ kind: "deny", source: "rule" });

    const ask = document([allowWhen("user.awake", { onUnknown: "ask" })]);
    expect(
      evaluatePolicy(ask, install, {
        predicates: { "user.awake": "unknown" },
      }),
    ).toEqual({ kind: "ask", ruleIds: ["allow-install"] });
  });

  it("lets deny override allow, regardless of rule order", () => {
    const allow = allowWhen(true, { id: "allow" });
    const deny = {
      id: "deny",
      subject: "app:install",
      effect: "deny",
      onUnknown: "deny",
      when: true,
    };
    const forward = document([allow, deny]);
    const reverse = document([deny, allow]);
    const evidence: PolicyEvidence = {};
    expect(evaluatePolicy(forward, install, evidence)).toMatchObject({
      kind: "deny",
      ruleIds: ["deny"],
    });
    expect(evaluatePolicy(reverse, install, evidence)).toMatchObject({
      kind: "deny",
      ruleIds: ["deny"],
    });
  });

  it("narrows grant:request by capability", () => {
    const policy = document([
      allowWhen(true, {
        id: "camera-only",
        subject: "grant:request",
        capability: "device:camera",
      }),
    ]);
    expect(
      evaluatePolicy(
        policy,
        { subject: "grant:request", capability: "device:camera" },
        {},
      ),
    ).toMatchObject({ kind: "allow" });
    expect(
      evaluatePolicy(
        policy,
        { subject: "grant:request", capability: "device:microphone" },
        {},
      ),
    ).toEqual({ kind: "deny", source: "base" });
  });

  it("evaluates parameterized predicates and comparisons", () => {
    const policy = document([
      allowWhen({
        all: [
          { known: { "place.is": "home" } },
          { lt: ["app.sourceBytes", 5000] },
          { subsetOf: ["app.capabilities", ["storage:kv"]] },
        ],
      }),
    ]);
    const home = parameterizedPredicateKey("place.is", "home");
    expect(
      evaluatePolicy(policy, install, {
        predicates: { [home]: "true" },
        terms: {
          "app.sourceBytes": 128,
          "app.capabilities": ["storage:kv"],
        },
      }),
    ).toMatchObject({ kind: "allow" });
    expect(
      evaluatePolicy(policy, install, {
        predicates: { [home]: "true" },
        terms: {
          "app.sourceBytes": 9000,
          "app.capabilities": ["storage:kv"],
        },
      }),
    ).toEqual({ kind: "deny", source: "base" });
  });
});

describe("policy Layer-3 vector", () => {
  it("matches every Kleene cell", () => {
    const ops = {
      all: kleeneAll,
      any: kleeneAny,
      not: kleeneNot,
      known: kleeneKnown,
      assume: kleeneAssume,
    };
    expect(vectors.kleene.length).toBeGreaterThan(0);
    for (const cell of vectors.kleene) {
      if (cell.op === "assume") {
        expect(ops.assume(cell.args[0], cell.args[1]), cell.id).toBe(
          cell.expected,
        );
      } else if (cell.op === "all" || cell.op === "any") {
        expect(ops[cell.op](cell.args), cell.id).toBe(cell.expected);
      } else {
        expect(ops[cell.op](cell.args[0]), cell.id).toBe(cell.expected);
      }
    }
  });

  it("matches every decision cell", () => {
    const policy = loadPolicy({
      version: 1,
      base: DENY_BASE,
      rules: [
        {
          id: "home-install",
          subject: "app:install",
          effect: "allow",
          onUnknown: "deny",
          when: { known: { "place.is": "home" } },
        },
        {
          id: "deny-network",
          subject: "app:install",
          effect: "deny",
          onUnknown: "deny",
          when: "app.usesNetwork",
        },
      ],
    });
    expect(vectors.decisions.length).toBeGreaterThan(0);
    for (const cell of vectors.decisions) {
      expect(
        evaluatePolicy(policy, cell.query, cell.evidence),
        cell.id,
      ).toEqual(cell.expected);
    }
  });
});
