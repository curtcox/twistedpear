/**
 * The role table a policy's `approval.by` / `approval.byOrg` predicates resolve
 * against, kept as a sealed store.
 *
 * A role name is a level of indirection between the policy and a key, so
 * whoever controls the binding controls the approval. Keeping the table in a
 * `roles` blob under the store master key with the seal commit as AAD is what
 * makes B6 fail: an attacker with the disk cannot read the table, cannot forge
 * one the host will open, and cannot replay the blob from an earlier commit.
 * Rebinding a name is therefore an amendment — it advances the chain and
 * rewraps — rather than a config tweak.
 */
import {
  decryptSealedStore,
  encryptSealedStore,
  PolicySealError,
  type SealedStoreBlob,
} from "./policy-seal.js";

const ROLES_STORE = "roles" as const;

export type PolicyRoleTable = {
  /** `approval.by` role name → approver public key, hex. */
  readonly roles: Readonly<Record<string, string>>;
  /** `approval.byOrg` role name → organisation public key, hex. */
  readonly orgs: Readonly<Record<string, string>>;
};

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();
const KEY_HEX = /^[0-9a-f]+$/;

function bindings(value: unknown): Readonly<Record<string, string>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new PolicySealError("UNREADABLE");
  }
  const out: Record<string, string> = {};
  for (const [name, key] of Object.entries(value)) {
    if (typeof key !== "string" || !KEY_HEX.test(key) || key.length === 0) {
      throw new PolicySealError("UNREADABLE");
    }
    out[name] = key;
  }
  return out;
}

/** Encrypt the role table for the store this commit wraps. */
export function sealRoleTable(options: {
  readonly masterKey: Uint8Array;
  readonly commit: Uint8Array;
  readonly table: PolicyRoleTable;
  readonly nonce: Uint8Array;
}): SealedStoreBlob {
  return encryptSealedStore({
    masterKey: options.masterKey,
    commit: options.commit,
    store: ROLES_STORE,
    plaintext: TEXT_ENCODER.encode(
      JSON.stringify({ orgs: options.table.orgs, roles: options.table.roles }),
    ),
    nonce: options.nonce,
  });
}

/**
 * Open the role table. A tampered blob, a blob from another store, and a blob
 * from an earlier commit all fail closed — the host then has no bindings, and
 * every `approval.by` predicate resolves against an empty table.
 */
export function openRoleTable(options: {
  readonly masterKey: Uint8Array;
  readonly commit: Uint8Array;
  readonly blob: SealedStoreBlob;
}): PolicyRoleTable {
  if (options.blob.store !== ROLES_STORE) {
    throw new PolicySealError("UNREADABLE");
  }
  const plaintext = decryptSealedStore({
    masterKey: options.masterKey,
    commit: options.commit,
    blob: options.blob,
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(TEXT_DECODER.decode(plaintext));
  } catch {
    throw new PolicySealError("UNREADABLE");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new PolicySealError("UNREADABLE");
  }
  const record = parsed as Record<string, unknown>;
  return {
    roles: bindings(record.roles ?? {}),
    orgs: bindings(record.orgs ?? {}),
  };
}
