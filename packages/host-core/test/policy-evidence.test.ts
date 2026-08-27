import { describe, expect, it } from "vitest";
import {
  Identity,
  NodeCryptoProvider,
  bytesToHex,
} from "@twistedpear/reticulum-ts";
import {
  POLICY_SUBJECTS,
  loadPolicy,
  parameterizedPredicateKey,
  type PolicyBase,
  type PolicyDocument,
} from "@twistedpear/protocol";
import {
  SIBLING_DECISION_CLASSES,
  approvalsCarriedBySibling,
  createMemoryNonceStore,
  decidePolicy,
  gatherPolicyEvidence,
  signApprovalAttestation,
  signClockAttestation,
  type ApprovalAttestation,
  type ClockSample,
  type PolicyEvidenceInput,
} from "../src/index.js";

const provider = new NodeCryptoProvider();

const DENY_BASE = Object.fromEntries(
  POLICY_SUBJECTS.map((subject) => [subject, "deny"]),
) as unknown as PolicyBase;

const PACKAGE_HASH = "ab".repeat(32);
const INSTALLATION_ID = "cd".repeat(16);
const QUERY = { subject: "app:install" as const };
const HOME = { latitude: 51.5, longitude: -0.12 };
const AFTERNOON = Date.UTC(2026, 0, 15, 15, 0, 0);

function identityFromSeed(seed: number): Identity {
  const bytes = Uint8Array.from(
    { length: 64 },
    (_, index) => (seed + index) & 0xff,
  );
  const identity = Identity.fromBytes(provider, bytes);
  if (identity === null) throw new Error("test identity rejected");
  return identity;
}

function policy(when: unknown): PolicyDocument {
  return loadPolicy({
    version: 1,
    base: DENY_BASE,
    rules: [
      {
        id: "allow-install",
        subject: "app:install",
        effect: "allow",
        onUnknown: "deny",
        when,
      },
    ],
  });
}

function clockSample(
  signer: Identity,
  extra: Partial<ClockSample> = {},
): ClockSample {
  const monotonicMs = extra.monotonicMs ?? 10_000;
  const attestation =
    extra.attestation ??
    signClockAttestation(signer, {
      unixMs: AFTERNOON,
      monotonicMs,
      timezoneOffsetMinutes: 0,
    });
  return {
    monotonicMs,
    attestation,
    trustedSigners: extra.trustedSigners ?? [attestation.signerPublicKey],
  };
}

function approval(
  signer: Identity,
  extra: Partial<ApprovalAttestation> = {},
): ApprovalAttestation {
  return signApprovalAttestation(signer, {
    subject: "app:install",
    packageHash: PACKAGE_HASH,
    installationId: INSTALLATION_ID,
    nonce: extra.nonce ?? "nonce-1",
    expiresAt: extra.expiresAt ?? AFTERNOON + 60_000,
    role: extra.role ?? "mother",
    scope: extra.scope ?? "by",
  });
}

function input(
  when: unknown,
  rest: Partial<PolicyEvidenceInput> = {},
): PolicyEvidenceInput {
  return {
    policy: policy(when),
    query: QUERY,
    packageHash: PACKAGE_HASH,
    installationId: INSTALLATION_ID,
    provider,
    nonces: rest.nonces ?? createMemoryNonceStore(),
    ...rest,
  };
}

describe("policy evidence adapters", () => {
  const timeAuthority = identityFromSeed(1);
  const mother = identityFromSeed(2);
  const stranger = identityFromSeed(3);

  it("leaves time unknown unless the clock is attested (P-R13)", () => {
    const when = { "time.localHourIn": [9, 17] };
    expect(decidePolicy(input(when)).kind).toBe("deny");
    expect(
      gatherPolicyEvidence(input(when)).predicates?.["clock.attested"],
    ).toBe("false");
    expect(
      decidePolicy(input(when, { clock: clockSample(timeAuthority) })).kind,
    ).toBe("allow");
  });

  it("computes local hour from the attested reference, not a settable wall clock", () => {
    const when = { "time.localHourIn": [9, 17] };
    const evening = clockSample(timeAuthority, {
      attestation: signClockAttestation(timeAuthority, {
        unixMs: AFTERNOON,
        monotonicMs: 10_000,
        timezoneOffsetMinutes: 6 * 60,
      }),
    });
    expect(decidePolicy(input(when, { clock: evening })).kind).toBe("deny");
  });

  it("rejects a clock attestation that is unsigned, untrusted, or rewound", () => {
    const when = { "time.localHourIn": [9, 17] };
    const good = clockSample(timeAuthority);
    const tampered = {
      ...good,
      attestation: { ...good.attestation, unixMs: AFTERNOON + 3_600_000 },
    };
    const untrusted = clockSample(stranger, {
      trustedSigners: [bytesToHex(timeAuthority.getPublicKey())],
    });
    const rewound = clockSample(timeAuthority, {
      attestation: signClockAttestation(timeAuthority, {
        unixMs: AFTERNOON,
        monotonicMs: 10_000,
        timezoneOffsetMinutes: 0,
      }),
      monotonicMs: 1,
    });
    expect(decidePolicy(input(when, { clock: tampered })).kind).toBe("deny");
    expect(decidePolicy(input(when, { clock: untrusted })).kind).toBe("deny");
    expect(decidePolicy(input(when, { clock: rewound })).kind).toBe("deny");
  });

  it("resolves place and wakefulness as unknown without sensors", () => {
    expect(decidePolicy(input({ "place.is": "home" })).kind).toBe("deny");
    expect(decidePolicy(input("user.awake")).kind).toBe("deny");
    expect(
      gatherPolicyEvidence(input({ "place.is": "home" })).predicates?.[
        parameterizedPredicateKey("place.is", "home")
      ],
    ).toBe("unknown");
    expect(
      gatherPolicyEvidence(input("user.awake")).predicates?.["user.awake"],
    ).toBe("unknown");
  });

  it("resolves place against a named fence and wakefulness from the sensor", () => {
    const namedPlaces = { home: { ...HOME, radiusMeters: 200 } };
    expect(
      decidePolicy(input({ "place.is": "home" }, { place: HOME, namedPlaces }))
        .kind,
    ).toBe("allow");
    expect(
      decidePolicy(
        input(
          { "place.is": "home" },
          { place: { latitude: 51.6, longitude: -0.12 }, namedPlaces },
        ),
      ).kind,
    ).toBe("deny");
    expect(decidePolicy(input("user.awake", { awake: "true" })).kind).toBe(
      "allow",
    );
  });

  it("binds an approval to subject, package hash, installation, nonce, and expiry (P-R12)", () => {
    const motherKey = bytesToHex(mother.getPublicKey());
    const clock = clockSample(timeAuthority);
    const grant = approval(mother);
    const base = {
      clock,
      roles: { mother: motherKey },
      approvals: [grant],
    };
    expect(decidePolicy(input({ "approval.by": "mother" }, base)).kind).toBe(
      "allow",
    );
    expect(
      decidePolicy(
        input(
          { "approval.by": "mother" },
          { ...base, packageHash: "00".repeat(32) },
        ),
      ).kind,
    ).toBe("deny");
    expect(
      decidePolicy(
        input(
          { "approval.by": "mother" },
          { ...base, installationId: "00".repeat(16) },
        ),
      ).kind,
    ).toBe("deny");
    expect(
      decidePolicy(
        input(
          { "approval.by": "mother" },
          {
            clock,
            roles: { mother: bytesToHex(stranger.getPublicKey()) },
            approvals: [grant],
          },
        ),
      ).kind,
    ).toBe("deny");
    const expired = approval(mother, {
      nonce: "nonce-expired",
      expiresAt: AFTERNOON - 1,
    });
    expect(
      decidePolicy(
        input(
          { "approval.by": "mother" },
          { clock, roles: { mother: motherKey }, approvals: [expired] },
        ),
      ).kind,
    ).toBe("deny");
  });

  it("consumes an approval nonce so replay fails", () => {
    const nonces = createMemoryNonceStore();
    const motherKey = bytesToHex(mother.getPublicKey());
    const clock = clockSample(timeAuthority);
    const grant = approval(mother);
    const once = input(
      { "approval.by": "mother" },
      { clock, roles: { mother: motherKey }, approvals: [grant], nonces },
    );
    expect(decidePolicy(once).kind).toBe("allow");
    expect(decidePolicy(once).kind).toBe("deny");
    expect(nonces.isSpent(grant.nonce)).toBe(true);
  });

  it("lets a sibling carry an approval and never a policy decision (P-R11)", () => {
    const motherKey = bytesToHex(mother.getPublicKey());
    const grant = approval(mother);
    const carried = approvalsCarriedBySibling([
      { kind: "decision", allow: true },
      { kind: "approval", attestation: grant },
    ]);
    expect(carried).toEqual([grant]);
    expect(SIBLING_DECISION_CLASSES.includes("sibling:policy" as never)).toBe(
      false,
    );
    expect(
      decidePolicy(
        input(
          { "approval.by": "mother" },
          {
            clock: clockSample(timeAuthority),
            roles: { mother: motherKey },
            approvals: carried,
          },
        ),
      ).kind,
    ).toBe("allow");
  });
});
