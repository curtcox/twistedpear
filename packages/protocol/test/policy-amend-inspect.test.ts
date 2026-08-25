import { describe, expect, it } from "vitest";
import {
  POLICY_SUBJECTS,
  loadPolicy,
  type PolicyBase,
  type PolicyDocument,
} from "../src/index.js";
import {
  couldStarvePlaceIs,
  diffRules,
  isSyntacticTightening,
  sealedConflict,
} from "../src/policy-amend-inspect.js";

const DENY_BASE = Object.fromEntries(
  POLICY_SUBJECTS.map((subject) => [subject, "deny"]),
) as unknown as PolicyBase;

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

describe("policy amendment inspection", () => {
  it("diffs added, removed, and modified rules", () => {
    const before = policy([denyInstall("keep"), denyInstall("drop")]);
    const after = policy([
      denyInstall("keep", { when: "user.awake" }),
      denyInstall("add"),
    ]);
    const diff = diffRules(before, after);
    expect(diff.added.map((rule) => rule.id)).toEqual(["add"]);
    expect(diff.removed.map((rule) => rule.id)).toEqual(["drop"]);
    expect(diff.modified.map((rule) => rule.id)).toEqual(["keep"]);
  });

  it("treats introducing a sealed rule as a sealed conflict", () => {
    expect(sealedConflict(policy([]), policy([denyInstall("s")]))).toBe(false);
    expect(
      sealedConflict(policy([]), policy([denyInstall("s", { sealed: true })])),
    ).toBe(true);
  });

  it("walks combinators when detecting place.is and assume(true)", () => {
    const home = policy([
      {
        id: "home",
        subject: "app:install",
        effect: "allow",
        onUnknown: "allow",
        when: {
          all: [
            { any: [{ not: { known: { "place.is": "home" } } }] },
            { assume: ["user.awake", false] },
          ],
        },
      },
    ]);
    const assumed = policy([
      denyInstall("assumed", {
        when: { all: [{ assume: ["user.awake", true] }] },
      }),
    ]);
    expect(
      isSyntacticTightening(
        policy([]),
        assumed,
        diffRules(policy([]), assumed),
      ),
    ).toBe(false);
    const deniedLocation = policy([
      ...home.rules,
      {
        id: "no-gps",
        subject: "grant:request",
        capability: "device:location:precise",
        effect: "deny",
        onUnknown: "deny",
        when: true,
      },
    ]);
    expect(
      couldStarvePlaceIs(home, deniedLocation, diffRules(home, deniedLocation)),
    ).toBe(true);
  });

  it("starves place.is when an allow location grant is removed", () => {
    const current = policy([
      {
        id: "home",
        subject: "app:install",
        effect: "allow",
        onUnknown: "allow",
        when: { "place.is": "home" },
      },
      {
        id: "gps",
        subject: "grant:request",
        capability: "device:location",
        effect: "allow",
        onUnknown: "deny",
        when: true,
      },
    ]);
    const proposed = policy([current.rules[0]]);
    expect(
      couldStarvePlaceIs(current, proposed, diffRules(current, proposed)),
    ).toBe(true);
  });

  it("starves place.is when grant:request base flips from allow to deny", () => {
    const current = policy(
      [
        {
          id: "home",
          subject: "app:install",
          effect: "allow",
          onUnknown: "allow",
          when: { "place.is": "home" },
        },
      ],
      { ...DENY_BASE, "grant:request": "allow" },
    );
    const proposed = policy(current.rules, DENY_BASE);
    expect(
      couldStarvePlaceIs(current, proposed, diffRules(current, proposed)),
    ).toBe(true);
  });

  it("does not starve when no remaining rule depends on place.is", () => {
    const proposed = policy([
      {
        id: "no-gps",
        subject: "grant:request",
        effect: "deny",
        onUnknown: "deny",
        when: true,
      },
    ]);
    expect(
      couldStarvePlaceIs(policy([]), proposed, diffRules(policy([]), proposed)),
    ).toBe(false);
  });
});

describe("policy amendment tightening", () => {
  it("rejects syntactic tightening when the base widens or a deny is removed", () => {
    const current = policy([], DENY_BASE);
    const widened = policy([], { ...DENY_BASE, "app:install": "allow" });
    expect(
      isSyntacticTightening(current, widened, diffRules(current, widened)),
    ).toBe(false);

    const withDeny = policy([denyInstall("no-install")]);
    expect(
      isSyntacticTightening(
        withDeny,
        policy([]),
        diffRules(withDeny, policy([])),
      ),
    ).toBe(false);
  });

  it("rejects syntactic tightening when a deny is sealed or modified", () => {
    const sealed = policy([denyInstall("lock", { sealed: true })]);
    expect(
      isSyntacticTightening(policy([]), sealed, diffRules(policy([]), sealed)),
    ).toBe(false);

    const before = policy([denyInstall("keep")]);
    const modified = policy([denyInstall("keep", { when: "user.awake" })]);
    expect(
      isSyntacticTightening(before, modified, diffRules(before, modified)),
    ).toBe(false);
  });

  it("conflicts when a sealed rule is removed or rewritten", () => {
    const sealed = policy([denyInstall("lock", { sealed: true })]);
    expect(sealedConflict(sealed, policy([]))).toBe(true);
    expect(
      sealedConflict(
        sealed,
        policy([denyInstall("lock", { sealed: true, when: "user.awake" })]),
      ),
    ).toBe(true);

    const mixed = policy([
      denyInstall("open"),
      denyInstall("lock", { sealed: true }),
    ]);
    expect(
      sealedConflict(
        mixed,
        policy([
          denyInstall("open"),
          denyInstall("lock", { sealed: true, when: "user.awake" }),
        ]),
      ),
    ).toBe(true);
    expect(
      sealedConflict(
        policy([denyInstall("lock")]),
        policy([denyInstall("lock", { sealed: true })]),
      ),
    ).toBe(true);
  });

  it("accepts a syntactic tightening that adds a deny or drops an allow", () => {
    const allowInstall = {
      id: "allow-install",
      subject: "app:install",
      effect: "allow",
      onUnknown: "deny",
      when: true,
    };
    const current = policy([allowInstall]);
    expect(
      isSyntacticTightening(
        current,
        policy([allowInstall, denyInstall("no-install")]),
        diffRules(current, policy([allowInstall, denyInstall("no-install")])),
      ),
    ).toBe(true);
    expect(
      isSyntacticTightening(
        current,
        policy([]),
        diffRules(current, policy([])),
      ),
    ).toBe(true);
  });

  it("walks known and nested assume(false) when judging a tightening", () => {
    const known = policy([
      denyInstall("home-only", { when: { known: { "place.is": "home" } } }),
    ]);
    expect(
      isSyntacticTightening(policy([]), known, diffRules(policy([]), known)),
    ).toBe(true);

    const nested = policy([
      denyInstall("asleep", {
        when: { all: [{ assume: ["user.awake", false] }] },
      }),
    ]);
    expect(
      isSyntacticTightening(policy([]), nested, diffRules(policy([]), nested)),
    ).toBe(true);
  });

  it("starves place.is when a location grant is denied without a capability", () => {
    const home = policy([
      {
        id: "home",
        subject: "app:install",
        effect: "allow",
        onUnknown: "allow",
        when: { "place.is": "home" },
      },
    ]);
    const denied = policy([
      ...home.rules,
      {
        id: "no-gps",
        subject: "grant:request",
        effect: "deny",
        onUnknown: "deny",
        when: true,
      },
    ]);
    expect(couldStarvePlaceIs(home, denied, diffRules(home, denied))).toBe(
      true,
    );
  });
});
