/**
 * B8, B9, B11 — attacks with the disk in hand.
 *
 * The seal's whole claim is that it holds against someone who owns the bytes,
 * so these edit the policy file, roll the chain back, restore an older wrap,
 * and present the store to a host that cannot read the language.
 */
import { describe, expect, it } from "vitest";
import {
  applySeal,
  genesisCommit,
  nextCommit,
  type PolicyDocument,
} from "@twistedpear/protocol";
import {
  POLICY_SEAL_UNSUPPORTED,
  PolicySealError,
  decryptSealedStore,
  encryptSealedStore,
  rewrapSealedMaster,
  unwrapSealedMaster,
  wrapSealedMaster,
} from "@twistedpear/host-core";
import { hexToBytes } from "@twistedpear/reticulum-ts";
import { bytes, policy } from "./fixtures.js";

const ROOT_SECRET = bytes(0x31);
const MASTER = bytes(0x32);

const curfew = {
  id: "no-install",
  subject: "app:install",
  effect: "deny",
  onUnknown: "deny",
  when: true,
};
const sealGate = {
  id: "seal-gate",
  subject: "policy:seal",
  effect: "allow",
  onUnknown: "deny",
  when: true,
};

/** An installation whose policy has been sealed and whose stores are wrapped. */
function installation() {
  const unsealed = policy([curfew, sealGate]);
  const parent = genesisCommit();
  const preSeal = wrapSealedMaster({
    rootSecret: ROOT_SECRET,
    parent,
    commit: nextCommit(parent, unsealed),
    masterKey: MASTER,
    nonce: bytes(0x01, 12),
  });
  const sealed = applySeal(unsealed, ["no-install"], {}, parent);
  if (!sealed.ok) throw new Error("seal refused");
  const envelope = rewrapSealedMaster({
    rootSecret: ROOT_SECRET,
    previous: preSeal,
    nextPolicy: sealed.policy,
    masterKey: MASTER,
    nonce: bytes(0x02, 12),
  });
  const commit = hexToBytes(envelope.commit);
  const catalog = encryptSealedStore({
    masterKey: MASTER,
    commit,
    store: "catalog",
    plaintext: new TextEncoder().encode("installed apps"),
    nonce: bytes(0x03, 12),
  });
  return {
    unsealed,
    preSeal,
    sealed: sealed.policy,
    envelope,
    commit,
    catalog,
  };
}

function open(document: PolicyDocument, envelope = installation().envelope) {
  return unwrapSealedMaster({
    rootSecret: ROOT_SECRET,
    policy: document,
    envelope,
  });
}

describe("B9 — disk tamper and rollback", () => {
  it("B9 — unsealing a rule on disk makes the store unreadable (P-R8)", () => {
    const { sealed, envelope } = installation();
    const unsealedOnDisk: PolicyDocument = {
      ...sealed,
      rules: sealed.rules.map((rule) => ({ ...rule, sealed: false })),
    };
    expect(() => open(unsealedOnDisk, envelope)).toThrow(PolicySealError);
  });

  it("B9 — so does deleting the rule, or flipping its effect", () => {
    const { sealed, envelope } = installation();
    expect(() =>
      open({ ...sealed, rules: sealed.rules.slice(1) }, envelope),
    ).toThrow(PolicySealError);
    expect(() =>
      open(
        {
          ...sealed,
          rules: sealed.rules.map((rule) =>
            rule.id === "no-install" ? { ...rule, effect: "allow" } : rule,
          ),
        },
        envelope,
      ),
    ).toThrow(PolicySealError);
  });

  it("B9 — rolling back to the pre-seal head yields a key that opens nothing", () => {
    const { unsealed, preSeal, commit, catalog } = installation();
    // The old pair is self-consistent, so the unwrap itself succeeds …
    const master = open(unsealed, preSeal);
    expect(master).toEqual(MASTER);
    // … and the rolled-back head is not the commit the stores are bound to.
    expect(() =>
      decryptSealedStore({
        masterKey: master,
        commit: nextCommit(genesisCommit(), unsealed),
        blob: catalog,
      }),
    ).toThrow(PolicySealError);
    expect(
      decryptSealedStore({ masterKey: master, commit, blob: catalog }),
    ).toEqual(new TextEncoder().encode("installed apps"));
  });
});

describe("B8 — backup laundering", () => {
  it("B8 — a pre-seal wrap does not open a post-seal store", () => {
    const { unsealed, preSeal, catalog, sealed } = installation();
    const master = open(unsealed, preSeal);
    // Whatever the restored envelope says, the commit it names is not the one
    // today's blobs were sealed under.
    expect(() =>
      decryptSealedStore({
        masterKey: master,
        commit: hexToBytes(preSeal.commit),
        blob: catalog,
      }),
    ).toThrow(PolicySealError);
    // Restoring the old policy file next to today's envelope fails closed too.
    expect(() => open(unsealed)).toThrow(PolicySealError);
    expect(open(sealed)).toEqual(MASTER);
  });

  // The remaining half of B8 — a restored pre-seal *backup*, envelope and
  // stores together, refused because the backup names the policy commit it was
  // taken under — is POL-8-RECOVERY's mechanism. docs/user-policy-plan.md §5.
  it.todo(
    "B8 — a restored pre-seal backup is refused by its bound policy commit (POL-8-RECOVERY)",
  );
});

describe("B11 — host downgrade", () => {
  it("B11 — a host that cannot evaluate the language refuses to open (P-R9)", () => {
    const { sealed, envelope } = installation();
    for (const older of [
      { ...envelope, version: 2 },
      { ...envelope, subjects: envelope.subjects.slice(1) },
    ]) {
      const refusal = (): unknown =>
        unwrapSealedMaster({
          rootSecret: ROOT_SECRET,
          policy: sealed,
          envelope: older,
        });
      expect(refusal).toThrow(POLICY_SEAL_UNSUPPORTED);
      try {
        refusal();
      } catch (error) {
        expect((error as PolicySealError).code).toBe("UNSUPPORTED");
      }
    }
  });
});
