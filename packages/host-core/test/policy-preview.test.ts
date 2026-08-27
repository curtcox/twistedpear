import { describe, expect, it } from "vitest";
import {
  POLICY_SUBJECTS,
  evaluatePolicy,
  genesisCommit,
  loadPolicy,
  type PolicyBase,
  type PolicyDocument,
} from "@twistedpear/protocol";
import {
  POLICY_SEAL_CONFIRMATION,
  previewPolicy,
  sealWithPreview,
} from "../src/index.js";

const DENY_BASE = Object.fromEntries(
  POLICY_SUBJECTS.map((subject) => [subject, "deny"]),
) as unknown as PolicyBase;

function document(
  rules: unknown[],
  base: PolicyBase = DENY_BASE,
): PolicyDocument {
  return loadPolicy({ version: 1, base, rules });
}

function allowWhen(
  when: unknown,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: extra.id ?? "allow-install",
    subject: extra.subject ?? "app:install",
    effect: extra.effect ?? "allow",
    onUnknown: extra.onUnknown ?? "deny",
    when,
    ...extra,
  };
}

describe("policy consequence preview", () => {
  it("finds a witness when a subject is reachable (P-R16)", () => {
    const policy = document([allowWhen("user.awake")]);
    const preview = previewPolicy(policy);
    const install = preview.subjects["app:install"];
    expect(install.reachable).toBe(true);
    expect(install.witness).toBeDefined();
    expect(
      evaluatePolicy(policy, { subject: "app:install" }, install.witness ?? {}),
    ).toMatchObject({ kind: "allow" });
  });

  it("reports a subject permanently prevented when no world allows it", () => {
    const policy = document([]);
    const preview = previewPolicy(policy);
    expect(preview.subjects["app:install"].reachable).toBe(false);
    expect(preview.text).toContain("app:install: permanently prevented");
  });

  it("detects a terminal policy when policy:amend is unreachable", () => {
    const policy = document([
      allowWhen(true, {
        id: "no-amend",
        subject: "policy:amend",
        effect: "deny",
      }),
    ]);
    const preview = previewPolicy(policy);
    expect(preview.terminal).toBe(true);
    expect(preview.text).toContain("terminal");
  });

  it("names load-bearing people and sources, and lists unknown weakenings", () => {
    const policy = document([
      allowWhen(
        {
          all: [
            { "approval.by": "mother" },
            { "place.is": "home" },
            { assume: ["clock.attested", true] },
          ],
        },
        { onUnknown: "allow" },
      ),
    ]);
    const preview = previewPolicy(policy);
    expect(preview.loadBearingPeople).toEqual(["mother"]);
    expect(preview.loadBearingSources).toEqual(["clock", "place"]);
    expect(
      preview.unknownWeakenings.some((line) => line.includes("assume")),
    ).toBe(true);
    expect(
      preview.unknownWeakenings.some((line) =>
        line.includes("onUnknown allow"),
      ),
    ).toBe(true);
  });

  it("pins host-unavailable predicates to unknown", () => {
    const policy = document([allowWhen({ "place.is": "home" })]);
    const available = previewPolicy(policy);
    expect(available.subjects["app:install"].reachable).toBe(true);
    const missing = previewPolicy(policy, {
      unavailablePredicates: new Set(["place.is"]),
    });
    expect(missing.subjects["app:install"].reachable).toBe(false);
  });

  it("lists sealed-store reinstall cost", () => {
    const preview = previewPolicy(document([]));
    expect(preview.reinstallCost).toEqual([
      "catalog",
      "grants",
      "app-data",
      "roles",
    ]);
  });

  it("refuses to seal without the typed confirmation and a matching preview (P-R15)", () => {
    const policy = document([
      allowWhen(true, { id: "seal-ok", subject: "policy:seal" }),
      allowWhen("user.awake", { id: "install-awake" }),
    ]);
    const preview = previewPolicy(policy);
    const parent = genesisCommit();
    expect(
      sealWithPreview({
        policy,
        ruleIds: ["install-awake"],
        evidence: {},
        parentCommit: parent,
        preview,
        typedPhrase: "sure",
      }).ok,
    ).toBe(false);
    const stale = previewPolicy(document([]));
    expect(
      sealWithPreview({
        policy,
        ruleIds: ["install-awake"],
        evidence: {},
        parentCommit: parent,
        preview: stale,
        typedPhrase: POLICY_SEAL_CONFIRMATION,
      }).ok,
    ).toBe(false);
  });

  it("seals a terminal policy after the generated preview is typed back (P-R17)", () => {
    const policy = document([
      allowWhen(true, {
        id: "no-amend",
        subject: "policy:amend",
        effect: "deny",
      }),
      allowWhen(true, { id: "seal-ok", subject: "policy:seal" }),
    ]);
    const preview = previewPolicy(policy);
    expect(preview.terminal).toBe(true);
    const sealed = sealWithPreview({
      policy,
      ruleIds: ["no-amend"],
      evidence: {},
      parentCommit: genesisCommit(),
      preview,
      typedPhrase: POLICY_SEAL_CONFIRMATION,
    });
    expect(sealed.ok).toBe(true);
    if (!sealed.ok) return;
    expect(sealed.consent.preview.text).toBe(preview.text);
    expect(sealed.consent.typedPhrase).toBe(POLICY_SEAL_CONFIRMATION);
  });
});
