/**
 * B1, B2, B3, B13, B14 — attacks on the amendment machine.
 *
 * Each test drives `applyAmendment` the way an attacker would: with a document
 * that is *shaped* like something the machine applies for free, and a payoff
 * that is checked rather than assumed. B14 is the one entry asserted to
 * succeed.
 */
import { describe, expect, it } from "vitest";
import {
  applyAmendment,
  classifyAmendment,
  evaluatePolicy,
  seededUserPolicy,
  type PolicyDocument,
} from "@twistedpear/protocol";
import { previewPolicy } from "@twistedpear/host-core";
import { DENY_BASE, permitted, policy, withBase, worlds } from "./fixtures.js";

const AMEND = { subject: "policy:amend" } as const;
const AUDITOR = "approval.by:auditor";
const NO_AUDITOR = { predicates: { [AUDITOR]: "false" } } as const;
const AUDITOR_PRESENT = { predicates: { [AUDITOR]: "true" } } as const;

const amendGate = {
  id: "amend-gate",
  subject: "policy:amend",
  effect: "allow",
  onUnknown: "deny",
  when: { "approval.by": "auditor" },
};

const gated = (rules: readonly unknown[] = []): PolicyDocument =>
  policy([amendGate, ...rules]);

describe("B1 — gate self-removal", () => {
  it("B1 — refuses an amendment that rewrites the rule authorizing it", () => {
    const current = gated();
    const ungated = policy([{ ...amendGate, when: true }]);
    const outcome = applyAmendment(current, ungated, NO_AUDITOR);
    expect(outcome).toEqual({
      ok: false,
      reason: "unauthorized",
      result: expect.anything(),
    });
    // The proposed document would authorize itself; it never gets to (P-R4).
    expect(evaluatePolicy(ungated, AMEND, NO_AUDITOR).kind).toBe("allow");
  });

  it("B1 — refuses deleting the gate and widening the base instead", () => {
    const outcome = applyAmendment(
      gated(),
      { version: 1, base: withBase("policy:amend", "allow"), rules: [] },
      NO_AUDITOR,
    );
    expect(outcome.ok).toBe(false);
  });

  it("B1 — leaves the gate as the only way through", () => {
    const ungated = policy([{ ...amendGate, when: true }]);
    const outcome = applyAmendment(gated(), ungated, AUDITOR_PRESENT);
    expect(outcome).toMatchObject({ ok: true, classification: "relaxation" });
  });
});

describe("B2 — ladder", () => {
  const denyInstall = {
    id: "no-install",
    subject: "app:install",
    effect: "deny",
    onUnknown: "deny",
    when: true,
  };
  const allowInstall = {
    id: "yes-install",
    subject: "app:install",
    effect: "allow",
    onUnknown: "deny",
    when: true,
  };

  it("B2 — a sequence of free rungs never nets a relaxation", () => {
    const start = gated();
    const over = worlds([AUDITOR]);
    const rungs: readonly unknown[][] = [
      [amendGate, denyInstall],
      [amendGate],
      [amendGate, allowInstall],
    ];
    let current = start;
    const applied: string[] = [];
    for (const rules of rungs) {
      const outcome = applyAmendment(current, policy(rules), NO_AUDITOR);
      if (outcome.ok) {
        current = outcome.policy;
        applied.push(outcome.classification);
      }
    }
    // Only the first rung — adding a deny — applies without the gate.
    expect(applied).toEqual(["certified-tightening"]);
    expect([...permitted(current, over)]).toEqual([...permitted(start, over)]);
  });

  it("B2 — removing a deny rule is a relaxation however it is packaged", () => {
    const tightened = policy([amendGate, denyInstall]);
    expect(classifyAmendment(tightened, gated())).toBe("relaxation");
    expect(applyAmendment(tightened, gated(), NO_AUDITOR).ok).toBe(false);
  });
});

describe("B3 — evidence starvation", () => {
  const atHome = {
    id: "launch-at-home",
    subject: "app:launch",
    effect: "allow",
    // The user's own weakening: away from home, launching still works.
    onUnknown: "allow",
    when: { "place.is": "home" },
  };
  const locationGrant = {
    id: "location-grant",
    subject: "grant:request",
    capability: "device:location",
    effect: "allow",
    onUnknown: "deny",
    when: true,
  };
  const starved = gated([atHome, locationGrant]);

  it("B3 — the payoff is real: an unresolvable sensor fires the allow collapse", () => {
    const evidence = { predicates: { "place.is:home": "unknown" } } as const;
    expect(
      evaluatePolicy(starved, { subject: "app:launch" }, evidence).kind,
    ).toBe("allow");
  });

  it("B3 — denying the sensor is a relaxation, not a free tightening (P-R6)", () => {
    const denyLocation = {
      id: "no-location",
      subject: "grant:request",
      capability: "device:location",
      effect: "deny",
      onUnknown: "deny",
      when: true,
    };
    const proposed = policy([amendGate, atHome, locationGrant, denyLocation]);
    expect(classifyAmendment(starved, proposed)).toBe("relaxation");
    expect(applyAmendment(starved, proposed, NO_AUDITOR).ok).toBe(false);
  });

  it("B3 — nor by removing the grant, nor by moving the base under it", () => {
    const withoutGrant = policy([amendGate, atHome]);
    expect(applyAmendment(starved, withoutGrant, NO_AUDITOR).ok).toBe(false);
    const basedDeny = policy(
      [amendGate, atHome, locationGrant],
      withBase("grant:request", "deny"),
    );
    const allowingBase = policy(
      [amendGate, atHome, locationGrant],
      withBase("grant:request", "allow"),
    );
    expect(applyAmendment(allowingBase, basedDeny, NO_AUDITOR).ok).toBe(false);
  });
});

describe("B13 — collapse laddering", () => {
  it("B13 — a deny rule carrying assume(x, true) is not a tightening", () => {
    const proposed = policy([
      amendGate,
      {
        id: "deny-unless-charging",
        subject: "app:install",
        effect: "deny",
        onUnknown: "deny",
        when: { assume: ["power.charging", true] },
      },
    ]);
    expect(classifyAmendment(gated(), proposed)).toBe("relaxation");
    expect(applyAmendment(gated(), proposed, NO_AUDITOR).ok).toBe(false);
  });

  it("B13 — weakening an existing rule's collapse is not a tightening", () => {
    const strict = {
      id: "install-at-home",
      subject: "app:install",
      effect: "allow",
      onUnknown: "deny",
      when: { "place.is": "home" },
    };
    const current = policy([amendGate, strict]);
    const weakened = policy([amendGate, { ...strict, onUnknown: "allow" }]);
    expect(classifyAmendment(current, weakened)).toBe("relaxation");
    expect(applyAmendment(current, weakened, NO_AUDITOR).ok).toBe(false);
  });
});

describe("B14 — self-lockout, asserted to succeed", () => {
  it("B14 — the machine applies an amendment that locks the user out", () => {
    const seeded = seededUserPolicy();
    const terminal = { version: 1, base: DENY_BASE, rules: [] };
    const outcome = applyAmendment(seeded, terminal, {
      predicates: { "user.passphrase": "false" },
    });
    expect(outcome).toMatchObject({
      ok: true,
      classification: "certified-tightening",
    });
    if (!outcome.ok) return;
    // Warned, not refused: the preview says so before anyone commits.
    expect(previewPolicy(outcome.policy).terminal).toBe(true);
    expect(previewPolicy(outcome.policy).text).toContain("terminal");
    // And it is real — no world reopens amendment.
    for (const evidence of worlds(["user.passphrase", AUDITOR])) {
      expect(evaluatePolicy(outcome.policy, AMEND, evidence).kind).toBe("deny");
      expect(applyAmendment(outcome.policy, seeded, evidence).ok).toBe(false);
    }
  });
});
