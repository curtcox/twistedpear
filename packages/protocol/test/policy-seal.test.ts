import { describe, expect, it } from "vitest";
import {
  POLICY_SUBJECTS,
  applyAmendment,
  applySeal,
  deriveSealKey,
  genesisCommit,
  loadPolicy,
  nextCommit,
  seededUserPolicy,
  type PolicyBase,
  type PolicyDocument,
} from "../src/index.js";

const DENY_BASE = Object.fromEntries(
  POLICY_SUBJECTS.map((subject) => [subject, "deny"]),
) as unknown as PolicyBase;

function policy(
  rules: unknown[],
  base: PolicyBase = { ...DENY_BASE, "policy:seal": "allow" },
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

describe("applySeal", () => {
  it("marks named rules sealed after policy:seal allows", () => {
    const current = policy([denyInstall("no-install")]);
    const sealed = applySeal(current, ["no-install"], {}, genesisCommit());
    expect(sealed.ok).toBe(true);
    if (!sealed.ok) return;
    expect(sealed.policy.rules[0]?.sealed).toBe(true);
    expect(sealed.parent).toEqual(genesisCommit());
    expect(sealed.commit).toEqual(nextCommit(genesisCommit(), sealed.policy));
  });

  it("refuses when policy:seal does not allow (seeded default)", () => {
    const current = seededUserPolicy();
    const outcome = applySeal(
      current,
      [current.rules[0]!.id],
      {},
      genesisCommit(),
    );
    expect(outcome).toMatchObject({ ok: false, reason: "unauthorized" });
  });

  it("refuses an unknown rule id without mutating", () => {
    const current = policy([denyInstall("no-install")]);
    expect(applySeal(current, ["missing"], {}, genesisCommit())).toEqual({
      ok: false,
      reason: "unknown-rule",
    });
  });

  it("refuses a short parent commit", () => {
    const current = policy([denyInstall("no-install")]);
    expect(applySeal(current, ["no-install"], {}, new Uint8Array(16))).toEqual({
      ok: false,
      reason: "invalid",
    });
  });
});

describe("seal commit chain", () => {
  it("pins language version and subjects into genesis", () => {
    const first = genesisCommit();
    expect(first).toHaveLength(32);
    expect(first).toEqual(genesisCommit());
  });

  it("advances the wrap key when the policy changes", () => {
    const root = new Uint8Array(32).fill(7);
    const firstPolicy = policy([denyInstall("no-install", { sealed: true })]);
    const secondPolicy = policy([
      denyInstall("no-install", { sealed: true }),
      denyInstall("no-launch", { subject: "app:launch" }),
    ]);
    const first = nextCommit(genesisCommit(), firstPolicy);
    const second = nextCommit(first, secondPolicy);
    expect(first).not.toEqual(second);
    expect(deriveSealKey(root, first)).not.toEqual(deriveSealKey(root, second));
  });
});

describe("applyAmendment after seal", () => {
  it("still refuses unsealing or editing a sealed rule", () => {
    const current = policy([denyInstall("no-install", { sealed: true })]);
    expect(
      applyAmendment(current, policy([denyInstall("no-install")]), {}),
    ).toEqual({
      ok: false,
      reason: "sealed",
    });
    expect(applyAmendment(current, policy([]), {})).toEqual({
      ok: false,
      reason: "sealed",
    });
  });

  it("still applies certified tightening of unsealed rules", () => {
    const current = policy([denyInstall("no-install", { sealed: true })]);
    const proposed = policy([
      denyInstall("no-install", { sealed: true }),
      denyInstall("no-launch", { subject: "app:launch" }),
    ]);
    const outcome = applyAmendment(current, proposed, {});
    expect(outcome).toMatchObject({
      ok: true,
      classification: "certified-tightening",
    });
  });
});
