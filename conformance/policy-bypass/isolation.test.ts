/**
 * B7 and B10 — attacks that come from somewhere other than this host's user.
 *
 * A sibling installation and a mini-app are both inside the user's world and
 * outside this installation's authority. The property both need is the same:
 * there is no vocabulary in which they could express a policy decision.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { POLICY_SUBJECTS } from "@twistedpear/protocol";
import {
  SIBLING_DECISION_CLASSES,
  SiblingDecisionGate,
  approvalsCarriedBySibling,
  createInMemorySiblingProposalStore,
  createMemoryNonceStore,
  decidePolicy,
  isSiblingDecisionClass,
  signApprovalAttestation,
  signClockAttestation,
  type SiblingGrantStore,
  type SiblingPolicyCarry,
} from "@twistedpear/host-core";
import { CAPABILITY_DEFINITIONS } from "@twistedpear/miniapp-runtime";
import { bytesToHex } from "@twistedpear/reticulum-ts";
import {
  INSTALLATION_ID,
  PACKAGE_HASH,
  identityFromSeed,
  policy,
  provider,
} from "./fixtures.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SIBLING_ID = "ef".repeat(16);
const NOW = Date.UTC(2026, 0, 15, 20, 0, 0);
const mother = identityFromSeed(21);

/** A sibling this machine trusts with every class it has. */
const grantsEverything: SiblingGrantStore = {
  isGranted: () => Promise.resolve(true),
  grant: () => Promise.resolve(),
  revoke: () => Promise.resolve(),
  list: () => Promise.resolve([]),
};

function gate(): SiblingDecisionGate {
  return new SiblingDecisionGate({
    grants: grantsEverything,
    proposals: createInMemorySiblingProposalStore(),
    isKnownInstallation: () => Promise.resolve(true),
    selfInstallationId: INSTALLATION_ID,
  });
}

describe("B7 — sibling laundering", () => {
  it("B7 — no sibling decision class can carry a policy decision (P-R11)", () => {
    for (const subject of POLICY_SUBJECTS) {
      expect(isSiblingDecisionClass(subject)).toBe(false);
    }
    expect(
      SIBLING_DECISION_CLASSES.filter((name) => name.includes("policy")),
    ).toEqual([]);
  });

  it("B7 — a proposal naming a policy subject is rejected, grant or no grant", async () => {
    for (const subject of ["policy:amend", "policy:seal", "sibling:policy"]) {
      const verdict = await gate().receive({
        recordHash: `hash-${subject}`,
        installationId: SIBLING_ID,
        decisionClass: subject,
        emittedAt: NOW,
        payload: new Uint8Array([1]),
      });
      expect(verdict).toEqual({ outcome: "reject", reason: "unknown-class" });
    }
  });

  it("B7 — a sibling may carry an approval and nothing else", () => {
    const carried = signApprovalAttestation(mother, {
      subject: "app:install",
      packageHash: PACKAGE_HASH,
      installationId: INSTALLATION_ID,
      nonce: "nonce-sibling",
      expiresAt: NOW + 60_000,
      role: "mother",
      scope: "by",
    });
    const payloads: readonly SiblingPolicyCarry[] = [
      { kind: "decision", allow: true },
      { kind: "approval", attestation: carried },
    ];
    expect(approvalsCarriedBySibling(payloads)).toEqual([carried]);
  });

  it("B7 — and an approval decided on the sibling does not bind this host", () => {
    const authority = identityFromSeed(22);
    const clock = {
      monotonicMs: 10_000,
      attestation: signClockAttestation(authority, {
        unixMs: NOW,
        monotonicMs: 10_000,
        timezoneOffsetMinutes: 0,
      }),
      trustedSigners: [bytesToHex(authority.getPublicKey())],
    };
    const elsewhere = signApprovalAttestation(mother, {
      subject: "app:install",
      packageHash: PACKAGE_HASH,
      // Approved for the sibling installation, laundered to this one.
      installationId: SIBLING_ID,
      nonce: "nonce-laundered",
      expiresAt: NOW + 60_000,
      role: "mother",
      scope: "by",
    });
    expect(
      decidePolicy({
        policy: policy([
          {
            id: "allow-install",
            subject: "app:install",
            effect: "allow",
            onUnknown: "deny",
            when: { "approval.by": "mother" },
          },
        ]),
        query: { subject: "app:install" },
        packageHash: PACKAGE_HASH,
        installationId: INSTALLATION_ID,
        provider,
        clock,
        roles: { mother: bytesToHex(mother.getPublicKey()) },
        approvals: approvalsCarriedBySibling([
          { kind: "approval", attestation: elsewhere },
        ]),
        nonces: createMemoryNonceStore(),
      }).kind,
    ).toBe("deny");
  });
});

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe("B10 — app-initiated amendment", () => {
  it("B10 — no capability names a policy-governing subject (P-R10)", () => {
    const ids = CAPABILITY_DEFINITIONS.map((definition) => definition.id);
    // `apps:publish` is both a capability and a subject on purpose: the policy
    // gates the action, and the capability is one way an app asks for it. What
    // must not exist is a capability over the policy itself.
    for (const subject of POLICY_SUBJECTS.filter((name) =>
      name.startsWith("policy:"),
    )) {
      expect(ids).not.toContain(subject);
    }
    expect(ids.filter((id) => id.startsWith("policy"))).toEqual([]);
  });

  it("B10 — no runtime or SDK source reaches the policy machinery", () => {
    const reach =
      /\bapplyAmendment\b|\bapplySeal\b|\bloadPolicy\b|\bevaluatePolicy\b|policy-(amend|seal|evidence|preview|load)/;
    const offenders = [
      "packages/miniapp-runtime/src",
      "packages/miniapp-sdk/src",
    ]
      .flatMap((directory) => sourceFiles(join(ROOT, directory)))
      .filter((file) => reach.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});
