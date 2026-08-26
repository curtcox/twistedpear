import { describe, expect, it } from "vitest";
import { NodeCryptoProvider } from "@twistedpear/reticulum-ts";
import {
  POLICY_SUBJECTS,
  applyAmendment,
  applySeal,
  genesisCommit,
  loadPolicy,
  type PolicyBase,
  type PolicyDocument,
} from "@twistedpear/protocol";
import {
  POLICY_SEAL_UNREADABLE,
  POLICY_SEAL_UNSUPPORTED,
  PolicySealError,
  SEALED_STORE_NAMES,
  decryptSealedStore,
  encryptSealedStore,
  rewrapSealedMaster,
  unwrapSealedMaster,
  wrapSealedMaster,
} from "../src/index.js";

const provider = new NodeCryptoProvider();

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

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return (
    left.length === right.length &&
    left.every((byte, index) => byte === right[index])
  );
}

describe("policy-sealed stores", () => {
  it("wraps catalog, grants, and app-data so a matching policy opens them", () => {
    const root = provider.randomBytes(32);
    const master = provider.randomBytes(32);
    const current = policy([denyInstall("no-install")]);
    const sealed = applySeal(current, ["no-install"], {}, genesisCommit());
    expect(sealed.ok).toBe(true);
    if (!sealed.ok) return;
    const envelope = wrapSealedMaster({
      rootSecret: root,
      parent: sealed.parent,
      commit: sealed.commit,
      masterKey: master,
      nonce: provider.randomBytes(12),
    });
    const blobs = Object.fromEntries(
      SEALED_STORE_NAMES.map((store) => [
        store,
        encryptSealedStore({
          masterKey: master,
          commit: sealed.commit,
          store,
          plaintext: utf8(`${store} body`),
          nonce: provider.randomBytes(12),
        }),
      ]),
    );
    const opened = unwrapSealedMaster({
      rootSecret: root,
      policy: sealed.policy,
      envelope,
    });
    expect(equalBytes(opened, master)).toBe(true);
    for (const store of SEALED_STORE_NAMES) {
      expect(
        new TextDecoder().decode(
          decryptSealedStore({
            masterKey: opened,
            commit: sealed.commit,
            blob: blobs[store]!,
          }),
        ),
      ).toBe(`${store} body`);
    }
  });

  it("makes tamper and rollback indistinguishable from a destroyed store", () => {
    const root = provider.randomBytes(32);
    const master = provider.randomBytes(32);
    const first = applySeal(
      policy([denyInstall("no-install")]),
      ["no-install"],
      {},
      genesisCommit(),
    );
    if (!first.ok) throw new Error("seal failed");
    const firstWrap = wrapSealedMaster({
      rootSecret: root,
      parent: first.parent,
      commit: first.commit,
      masterKey: master,
      nonce: provider.randomBytes(12),
    });
    const tightened = applyAmendment(
      first.policy,
      policy([
        denyInstall("no-install", { sealed: true }),
        denyInstall("no-launch", { subject: "app:launch" }),
      ]),
      {},
    );
    expect(tightened.ok).toBe(true);
    if (!tightened.ok) return;
    const live = rewrapSealedMaster({
      rootSecret: root,
      previous: firstWrap,
      nextPolicy: tightened.policy,
      masterKey: master,
      nonce: provider.randomBytes(12),
    });

    expect(() =>
      unwrapSealedMaster({
        rootSecret: root,
        policy: tightened.policy,
        envelope: {
          ...live,
          commit: `${live.commit.slice(0, -2)}00`,
        },
      }),
    ).toThrow(POLICY_SEAL_UNREADABLE);

    expect(() =>
      unwrapSealedMaster({
        rootSecret: root,
        policy: first.policy,
        envelope: live,
      }),
    ).toThrow(POLICY_SEAL_UNREADABLE);

    expect(() =>
      unwrapSealedMaster({
        rootSecret: root,
        policy: tightened.policy,
        envelope: firstWrap,
      }),
    ).toThrow(POLICY_SEAL_UNREADABLE);

    expect(
      equalBytes(
        unwrapSealedMaster({
          rootSecret: root,
          policy: tightened.policy,
          envelope: live,
        }),
        master,
      ),
    ).toBe(true);
  });

  it("refuses an older host rather than opening a store it cannot evaluate", () => {
    const root = provider.randomBytes(32);
    const master = provider.randomBytes(32);
    const sealed = applySeal(
      policy([denyInstall("no-install")]),
      ["no-install"],
      {},
      genesisCommit(),
    );
    if (!sealed.ok) throw new Error("seal failed");
    const envelope = wrapSealedMaster({
      rootSecret: root,
      parent: sealed.parent,
      commit: sealed.commit,
      masterKey: master,
      nonce: provider.randomBytes(12),
    });
    expect(() =>
      unwrapSealedMaster({
        rootSecret: root,
        policy: sealed.policy,
        envelope: { ...envelope, version: 2 },
      }),
    ).toThrow(POLICY_SEAL_UNSUPPORTED);
    expect(() =>
      unwrapSealedMaster({
        rootSecret: root,
        policy: sealed.policy,
        envelope: { ...envelope, subjects: POLICY_SUBJECTS.slice(0, -1) },
      }),
    ).toThrow(POLICY_SEAL_UNSUPPORTED);
    try {
      unwrapSealedMaster({
        rootSecret: root,
        policy: sealed.policy,
        envelope: { ...envelope, version: 2 },
      });
    } catch (error) {
      expect(error).toBeInstanceOf(PolicySealError);
      if (error instanceof PolicySealError) {
        expect(error.code).toBe("UNSUPPORTED");
      }
    }
  });
});
