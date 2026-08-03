/**
 * Desktop host identity vault operations: load, persist, create, and reset the
 * encrypted host identity backing every Reticulum destination.
 */
// @ts-nocheck

import { bytesToHex } from "../../../packages/reticulum-ts/dist/crypto/bytes.js";
import { Identity } from "../../../packages/reticulum-ts/dist/identity.js";
import {
  encryptIdentityBackup,
  isEncryptedIdentityBackup
} from "../../../packages/host-core/dist/identity-backup.js";

export function createIdentityOps(deps) {
  const { state, provider, runtime, status, send, log, pushStatus, identityStoreKey: IDENTITY_STORE_KEY } = deps;

  function updateIdentityStatus(identity) {
    state.activeIdentity = identity;
    status.identityHash = bytesToHex(identity.hash);
    status.identityPersisted = true;
    pushStatus();
  }

  async function loadPersistedIdentity() {
    const stored = await runtime.store.get(IDENTITY_STORE_KEY);
    if (stored === undefined) {
      status.identityHash = null;
      status.identityPersisted = false;
      pushStatus();
      return null;
    }

    if (isEncryptedIdentityBackup(stored)) {
      send({ type: "identity-locked", legacy: false, creating: false });
      return null;
    }

    const identity = Identity.fromBytes(provider, stored);
    if (identity === null) {
      await runtime.store.delete(IDENTITY_STORE_KEY);
      status.identityHash = null;
      status.identityPersisted = false;
      pushStatus();
      return null;
    }

    state.legacyIdentity = identity;
    send({ type: "identity-locked", legacy: true, creating: false });
    return null;
  }

  async function persistIdentity(identity, passphrase) {
    const encrypted = encryptIdentityBackup(provider, identity, passphrase);
    await runtime.store.set(IDENTITY_STORE_KEY, encrypted);
    encrypted.fill(0);
    updateIdentityStatus(identity);
  }

  async function createIdentity(passphrase) {
    const identity = new Identity(provider);
    await persistIdentity(identity, passphrase);
    log(`Created harness identity ${status.identityHash}`);
  }

  async function resetIdentity() {
    await runtime.store.delete(IDENTITY_STORE_KEY);
    state.activeIdentity = null;
    status.identityHash = null;
    status.identityPersisted = false;
    pushStatus();
    log("Harness identity cleared");
  }

  async function resolveIdentity() {
    if (state.activeIdentity !== null) {
      return state.activeIdentity;
    }

    const loaded = await loadPersistedIdentity();
    if (loaded !== null) {
      return loaded;
    }

    send({ type: "identity-locked", legacy: false, creating: true });
    return null;
  }

  return {
    updateIdentityStatus,
    loadPersistedIdentity,
    persistIdentity,
    createIdentity,
    resetIdentity,
    resolveIdentity
  };
}
