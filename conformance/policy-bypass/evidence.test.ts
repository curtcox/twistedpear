/**
 * B4, B5, B6, B12 — attacks on the evidence a policy is decided against.
 *
 * The evaluator is only as good as what the host hands it, so these attack the
 * adapter: a settable clock, a replayed approval, a rebound role name, and a
 * provider that just says yes.
 */
import { describe, expect, it } from "vitest";
import {
  loadPolicy,
  PolicyLoadError,
  type PolicyEvidence,
} from "@twistedpear/protocol";
import {
  PolicySealError,
  createMemoryNonceStore,
  decidePolicy,
  gatherPolicyEvidence,
  openRoleTable,
  sealRoleTable,
  signApprovalAttestation,
  signClockAttestation,
  type ApprovalAttestation,
  type ClockSample,
  type PolicyEvidenceInput,
} from "@twistedpear/host-core";
import { bytesToHex } from "@twistedpear/reticulum-ts";
import {
  DENY_BASE,
  INSTALLATION_ID,
  PACKAGE_HASH,
  bytes,
  identityFromSeed,
  policy,
  provider,
} from "./fixtures.js";

const EVENING = Date.UTC(2026, 0, 15, 20, 0, 0);
const WORK_HOURS = [9, 17] as const;
const authority = identityFromSeed(11);
const mother = identityFromSeed(12);
const attacker = identityFromSeed(13);

function allowWhen(when: unknown) {
  return policy([
    {
      id: "allow-install",
      subject: "app:install",
      effect: "allow",
      onUnknown: "deny",
      when,
    },
  ]);
}

function clock(
  signer = authority,
  timezoneOffsetMinutes = 0,
  trusted: readonly string[] = [bytesToHex(authority.getPublicKey())],
): ClockSample {
  return {
    monotonicMs: 10_000,
    attestation: signClockAttestation(signer, {
      unixMs: EVENING,
      monotonicMs: 10_000,
      timezoneOffsetMinutes,
    }),
    trustedSigners: trusted,
  };
}

function input(
  when: unknown,
  rest: Partial<PolicyEvidenceInput> = {},
): PolicyEvidenceInput {
  return {
    policy: allowWhen(when),
    query: { subject: "app:install" },
    packageHash: PACKAGE_HASH,
    installationId: INSTALLATION_ID,
    provider,
    nonces: createMemoryNonceStore(),
    ...rest,
  };
}

describe("B4 — clock attack", () => {
  const when = { "time.localHourIn": WORK_HOURS };

  it("B4 — a settable wall clock is not a source of hour (P-R13)", () => {
    expect(decidePolicy(input(when)).kind).toBe("deny");
    expect(
      gatherPolicyEvidence(input(when)).predicates?.["clock.attested"],
    ).toBe("false");
  });

  it("B4 — shifting the timezone does not enter the window", () => {
    // 20:00 UTC is outside [9, 17); six hours west would be 14:00.
    expect(decidePolicy(input(when, { clock: clock() })).kind).toBe("deny");
    const forged = clock();
    const shifted: ClockSample = {
      ...forged,
      attestation: { ...forged.attestation, timezoneOffsetMinutes: -6 * 60 },
    };
    expect(decidePolicy(input(when, { clock: shifted })).kind).toBe("deny");
    // Only the trusted signer can move the offset, and then it is evidence.
    expect(
      decidePolicy(input(when, { clock: clock(authority, -6 * 60) })).kind,
    ).toBe("allow");
  });

  it("B4 — an attacker's own time authority is not trusted", () => {
    expect(
      decidePolicy(input(when, { clock: clock(attacker, -6 * 60) })).kind,
    ).toBe("deny");
  });

  it("B4 — a monotonic rewind invalidates the reference", () => {
    const rewound: ClockSample = {
      ...clock(authority, -6 * 60),
      monotonicMs: 1,
    };
    expect(decidePolicy(input(when, { clock: rewound })).kind).toBe("deny");
  });
});

describe("B5 — approval replay", () => {
  const when = { "approval.by": "mother" };
  const roles = { mother: bytesToHex(mother.getPublicKey()) };

  function approval(extra: Partial<ApprovalAttestation> = {}) {
    return signApprovalAttestation(mother, {
      subject: "app:install",
      packageHash: PACKAGE_HASH,
      installationId: INSTALLATION_ID,
      nonce: "nonce-1",
      expiresAt: EVENING + 60_000,
      role: "mother",
      scope: "by",
      ...extra,
    });
  }

  it("B5 — an approval is spent on first use (P-R12)", () => {
    const nonces = createMemoryNonceStore();
    const base = { clock: clock(), roles, approvals: [approval()], nonces };
    expect(decidePolicy(input(when, base)).kind).toBe("allow");
    expect(decidePolicy(input(when, base)).kind).toBe("deny");
  });

  it("B5 — and does not travel to another package, host, or subject", () => {
    const carried = approval();
    const base = { clock: clock(), roles, approvals: [carried] };
    expect(
      decidePolicy(input(when, { ...base, packageHash: "00".repeat(32) })).kind,
    ).toBe("deny");
    expect(
      decidePolicy(input(when, { ...base, installationId: "00".repeat(16) }))
        .kind,
    ).toBe("deny");
    expect(
      decidePolicy(
        input(when, {
          ...base,
          policy: loadPolicy({
            version: 1,
            base: DENY_BASE,
            rules: [
              {
                id: "allow-launch",
                subject: "app:launch",
                effect: "allow",
                onUnknown: "deny",
                when,
              },
            ],
          }),
          query: { subject: "app:launch" },
        }),
      ).kind,
    ).toBe("deny");
  });

  it("B5 — an expired approval is not resurrected by a later request", () => {
    const stale = approval({ nonce: "nonce-2", expiresAt: EVENING - 1 });
    expect(
      decidePolicy(input(when, { clock: clock(), roles, approvals: [stale] }))
        .kind,
    ).toBe("deny");
  });
});

describe("B6 — approver substitution", () => {
  const when = { "approval.by": "mother" };
  const masterKey = bytes(0x5a);
  const commit = bytes(0x11);
  const table = {
    roles: { mother: bytesToHex(mother.getPublicKey()) },
    orgs: {},
  };
  const blob = sealRoleTable({
    masterKey,
    commit,
    table,
    nonce: bytes(0x22, 12),
  });

  function forged() {
    return signApprovalAttestation(attacker, {
      subject: "app:install",
      packageHash: PACKAGE_HASH,
      installationId: INSTALLATION_ID,
      nonce: "nonce-forged",
      expiresAt: EVENING + 60_000,
      role: "mother",
      scope: "by",
    });
  }

  it("B6 — the payoff is real, which is why the binding is sealed", () => {
    const rebound = { mother: bytesToHex(attacker.getPublicKey()) };
    expect(
      decidePolicy(
        input(when, { clock: clock(), roles: rebound, approvals: [forged()] }),
      ).kind,
    ).toBe("allow");
  });

  it("B6 — a rebound role table cannot be made readable without the master", () => {
    const attackerTable = sealRoleTable({
      masterKey: bytes(0x99),
      commit,
      table: {
        roles: { mother: bytesToHex(attacker.getPublicKey()) },
        orgs: {},
      },
      nonce: bytes(0x22, 12),
    });
    expect(() =>
      openRoleTable({ masterKey, commit, blob: attackerTable }),
    ).toThrow(PolicySealError);
    const edited = {
      ...blob,
      ciphertext: `00${blob.ciphertext.slice(2)}`,
    };
    expect(() => openRoleTable({ masterKey, commit, blob: edited })).toThrow(
      PolicySealError,
    );
  });

  it("B6 — nor replayed from another commit or another store", () => {
    expect(() =>
      openRoleTable({ masterKey, commit: bytes(0x12), blob }),
    ).toThrow(PolicySealError);
    expect(() =>
      openRoleTable({
        masterKey,
        commit,
        blob: { ...blob, store: "grants" },
      }),
    ).toThrow(PolicySealError);
    expect(openRoleTable({ masterKey, commit, blob })).toEqual(table);
  });

  it("B6 — with no readable table the forged approval decides nothing", () => {
    expect(
      decidePolicy(input(when, { clock: clock(), approvals: [forged()] })).kind,
    ).toBe("deny");
    expect(
      decidePolicy(
        input(when, {
          clock: clock(),
          roles: table.roles,
          approvals: [forged()],
        }),
      ).kind,
    ).toBe("deny");
  });
});

describe("B12 — adapter substitution", () => {
  it("B12 — there is no way to name a provider the policy does not know", () => {
    expect(() =>
      loadPolicy({
        version: 1,
        base: DENY_BASE,
        rules: [
          {
            id: "vendor-says-yes",
            subject: "app:install",
            effect: "allow",
            onUnknown: "deny",
            when: "vendor.approves",
          },
        ],
      }),
    ).toThrow(PolicyLoadError);
  });

  it("B12 — a sensor this host lacks resolves unknown, never true", () => {
    const evidence: PolicyEvidence = gatherPolicyEvidence(
      input({ all: ["user.voiceAuthorized", { "place.is": "home" }] }),
    );
    expect(evidence.predicates?.["user.voiceAuthorized"]).toBe("unknown");
    expect(evidence.predicates?.["place.is:home"]).toBe("unknown");
    expect(decidePolicy(input({ all: ["user.voiceAuthorized"] })).kind).toBe(
      "deny",
    );
  });

  it("B12 — every decision is allow or deny, never a shrug the caller may read as yes", () => {
    for (const when of [
      "user.voiceAuthorized",
      { "place.is": "home" },
      { "approval.by": "mother" },
      { "time.localHourIn": WORK_HOURS },
    ]) {
      expect(["allow", "deny"]).toContain(decidePolicy(input(when)).kind);
    }
  });
});
