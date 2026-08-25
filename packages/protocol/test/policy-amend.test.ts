import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  POLICY_SUBJECTS,
  applyAmendment,
  classifyAmendment,
  evaluatePolicy,
  loadPolicy,
  seededUserPolicy,
  type PolicyBase,
  type PolicyDocument,
  type PolicyEvidence,
  type PolicyQuery,
  type PolicyResult,
} from "../src/index.js";

const DENY_BASE = Object.fromEntries(
  POLICY_SUBJECTS.map((subject) => [subject, "deny"]),
) as unknown as PolicyBase;

const AMEND: PolicyQuery = { subject: "policy:amend" };
const INSTALL: PolicyQuery = { subject: "app:install" };
const RUNS = Number.parseInt(process.env.PROPERTY_RUNS ?? "50", 10);

function policy(
  rules: unknown[],
  base: PolicyBase = DENY_BASE,
): PolicyDocument {
  return loadPolicy({ version: 1, base, rules });
}

function denyInstall(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    subject: "app:install",
    effect: "deny",
    onUnknown: "deny",
    when: true,
    ...extra,
  };
}

function rank(result: PolicyResult): number {
  if (result.kind === "deny") return 0;
  if (result.kind === "ask") return 1;
  if (result.kind === "allow") return 2;
  return -1;
}

describe("classifyAmendment A-3 / A-4", () => {
  it("classifies adding a deny rule as certified tightening", () => {
    const current = policy([]);
    const proposed = policy([denyInstall("no-install")]);
    expect(classifyAmendment(current, proposed)).toBe("certified-tightening");
  });

  it("classifies removing an allow rule as certified tightening", () => {
    const allow = {
      id: "allow-install",
      subject: "app:install",
      effect: "allow",
      onUnknown: "deny",
      when: true,
    };
    expect(classifyAmendment(policy([allow]), policy([]))).toBe(
      "certified-tightening",
    );
  });

  it("classifies adding an allow rule as a relaxation", () => {
    const proposed = policy([
      {
        id: "allow-install",
        subject: "app:install",
        effect: "allow",
        onUnknown: "deny",
        when: true,
      },
    ]);
    expect(classifyAmendment(policy([]), proposed)).toBe("relaxation");
  });

  it("classifies assume(true) as a relaxation even on a deny rule", () => {
    const proposed = policy([
      denyInstall("assumed", { when: { assume: ["user.awake", true] } }),
    ]);
    expect(classifyAmendment(policy([]), proposed)).toBe("relaxation");
  });

  it("classifies starving place.is as a relaxation (A-4)", () => {
    const current = policy([
      {
        id: "home-install",
        subject: "app:install",
        effect: "allow",
        onUnknown: "allow",
        when: { "place.is": "home" },
      },
    ]);
    const proposed = policy([
      ...current.rules,
      {
        id: "deny-location",
        subject: "grant:request",
        capability: "device:location",
        effect: "deny",
        onUnknown: "deny",
        when: true,
      },
    ]);
    expect(classifyAmendment(current, proposed)).toBe("relaxation");
  });

  it("does not treat a non-location deny as starving place.is", () => {
    const current = policy([
      {
        id: "home-install",
        subject: "app:install",
        effect: "allow",
        onUnknown: "allow",
        when: { "place.is": "home" },
      },
    ]);
    const proposed = policy([...current.rules, denyInstall("no-install")]);
    expect(classifyAmendment(current, proposed)).toBe("certified-tightening");
  });

  it("rejects touching a sealed rule", () => {
    const current = policy([denyInstall("sealed-deny", { sealed: true })]);
    expect(classifyAmendment(current, policy([]))).toBe("sealed");
    expect(
      classifyAmendment(current, policy([denyInstall("sealed-deny")])),
    ).toBe("sealed");
  });
});

describe("applyAmendment A-1 / A-2", () => {
  it("applies certified tightening without evaluating policy:amend", () => {
    const outcome = applyAmendment(
      policy([]),
      policy([denyInstall("no-install")]),
      {},
    );
    expect(outcome).toMatchObject({
      ok: true,
      classification: "certified-tightening",
    });
  });

  it("authorizes a relaxation against the pre-amendment document only", () => {
    const current = policy([]);
    const proposed = policy([], {
      ...DENY_BASE,
      "policy:amend": "allow",
      "app:install": "allow",
    });
    expect(classifyAmendment(current, proposed)).toBe("relaxation");
    expect(evaluatePolicy(proposed, AMEND, {}).kind).toBe("allow");
    const denied = applyAmendment(current, proposed, {});
    expect(denied).toMatchObject({ ok: false, reason: "unauthorized" });
    if (denied.ok) return;
    expect(denied.result).toMatchObject({ kind: "deny", source: "base" });

    const opened = applyAmendment(seededUserPolicy(), proposed, {
      predicates: { "user.passphrase": "true" },
    });
    expect(opened).toMatchObject({
      ok: true,
      classification: "relaxation",
    });
  });

  it("returns needs when the gate predicate is missing rather than collapsing", () => {
    const outcome = applyAmendment(
      seededUserPolicy(),
      policy([], { ...DENY_BASE, "app:install": "allow" }),
      {},
    );
    expect(outcome).toMatchObject({ ok: false, reason: "unauthorized" });
    if (outcome.ok) return;
    expect(outcome.result).toEqual({
      kind: "needs",
      predicates: ["user.passphrase"],
    });
  });

  it("rejects an invalid proposed document without applying a prefix", () => {
    const outcome = applyAmendment(
      policy([]),
      { version: 2, base: DENY_BASE, rules: [] },
      {},
    );
    expect(outcome).toEqual({ ok: false, reason: "invalid" });
  });

  it("never applies a sealed-rule mutation even when the gate would allow", () => {
    const current = policy([denyInstall("sealed-deny", { sealed: true })], {
      ...DENY_BASE,
      "policy:amend": "allow",
    });
    expect(applyAmendment(current, policy([]), {})).toEqual({
      ok: false,
      reason: "sealed",
    });
  });

  it("allows certified self-lockout (B14)", () => {
    const current = seededUserPolicy();
    const locked = policy([
      {
        id: "lock-amend",
        subject: "policy:amend",
        effect: "deny",
        onUnknown: "deny",
        when: true,
      },
    ]);
    const outcome = applyAmendment(current, locked, {});
    expect(outcome).toMatchObject({
      ok: true,
      classification: "certified-tightening",
    });
    if (!outcome.ok) return;
    expect(evaluatePolicy(outcome.policy, AMEND, {}).kind).toBe("deny");
  });
});

describe("amendment properties P1 P2 P4 P5", () => {
  const evidence: PolicyEvidence = {};

  it("P1 adding a deny never turns deny into allow", () => {
    fc.assert(
      fc.property(fc.constantFrom(...POLICY_SUBJECTS), (subject) => {
        const current = policy([]);
        const proposed = policy([
          {
            id: "extra-deny",
            subject,
            effect: "deny",
            onUnknown: "deny",
            when: true,
          },
        ]);
        const before = evaluatePolicy(current, { subject }, evidence);
        const after = evaluatePolicy(proposed, { subject }, evidence);
        if (before.kind === "deny") expect(after.kind).toBe("deny");
      }),
      { numRuns: RUNS },
    );
  });

  it("P2 certified tightening never raises a decision", () => {
    fc.assert(
      fc.property(fc.constantFrom(...POLICY_SUBJECTS), (subject) => {
        const current = seededUserPolicy();
        const proposed = policy([
          ...current.rules,
          denyInstall("extra-deny", { subject }),
        ]);
        expect(classifyAmendment(current, proposed)).toBe(
          "certified-tightening",
        );
        const before = rank(evaluatePolicy(current, { subject }, evidence));
        const after = rank(evaluatePolicy(proposed, { subject }, evidence));
        if (before >= 0 && after >= 0)
          expect(after).toBeLessThanOrEqual(before);
      }),
      { numRuns: RUNS },
    );
  });

  it("P4 relaxation authorization is a function of the pre-amendment document", () => {
    const current = policy([]);
    const proposed = policy([], { ...DENY_BASE, "policy:amend": "allow" });
    expect(evaluatePolicy(current, AMEND, evidence).kind).toBe("deny");
    expect(evaluatePolicy(proposed, AMEND, evidence).kind).toBe("allow");
    expect(applyAmendment(current, proposed, evidence).ok).toBe(false);
  });

  it("P5 permuting proposed rules does not change classification or decision", () => {
    const current = policy([]);
    const rules = [
      denyInstall("a"),
      denyInstall("b", { subject: "app:launch" }),
      denyInstall("c", { subject: "apps:publish" }),
    ];
    const forward = policy(rules);
    const reverse = policy([...rules].reverse());
    expect(classifyAmendment(current, forward)).toBe(
      classifyAmendment(current, reverse),
    );
    expect(evaluatePolicy(forward, INSTALL, evidence)).toEqual(
      evaluatePolicy(reverse, INSTALL, evidence),
    );
  });
});
