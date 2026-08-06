/**
 * Desktop host message handlers for the identity vault, local moderation
 * state, device policy, and session invitations.
 */
import {
  bytesToHex,
  hexToBytes,
} from "../../../packages/reticulum-ts/dist/crypto/bytes.js";
import {
  decryptIdentityBackup,
  encryptIdentityBackup,
  identityFromRecoveryWords,
  identityToRecoveryWords,
  validateNewIdentityPassphrase,
} from "../../../packages/host-core/dist/identity-backup.js";

export function createIdentityMessageHandlers(deps) {
  const {
    state,
    provider,
    runtime,
    status,
    send,
    log,
    identityStoreKey: IDENTITY_STORE_KEY,
  } = deps;
  const applyInterfaceConfig = (...args) => deps.applyInterfaceConfig(...args);
  const createIdentity = (...args) => deps.createIdentity(...args);
  const persistIdentity = (...args) => deps.persistIdentity(...args);
  const resetIdentity = (...args) => deps.resetIdentity(...args);
  const updateIdentityStatus = (...args) => deps.updateIdentityStatus(...args);
  const ensureMiniappHost = (...args) => deps.ensureMiniappHost(...args);
  const pushModerationState = (...args) => deps.pushModerationState(...args);
  const persistModerationState = (...args) =>
    deps.persistModerationState(...args);
  const normalizedSourceHash = (...args) => deps.normalizedSourceHash(...args);

  const handleCreateIdentity = async (message) => {
    send({ type: "identity-locked", legacy: false, creating: true });
    return;
  };

  const handleIdentityUnlock = async (message) => {
    try {
      const stored = await runtime.store.get(IDENTITY_STORE_KEY);
      if (stored === undefined) {
        validateNewIdentityPassphrase(
          message.passphrase,
          message.confirmation ?? "",
        );
        await createIdentity(message.passphrase);
      } else if (state.legacyIdentity !== null) {
        validateNewIdentityPassphrase(
          message.passphrase,
          message.confirmation ?? "",
        );
        await persistIdentity(state.legacyIdentity, message.passphrase);
        state.activeIdentity = state.legacyIdentity;
        state.legacyIdentity = null;
      } else {
        updateIdentityStatus(
          decryptIdentityBackup(provider, stored, message.passphrase),
        );
      }
      send({
        type: "identity-operation",
        operation: "unlock",
        ok: true,
        identityHash: status.identityHash,
      });
      if (state.pendingTarget !== null) await applyInterfaceConfig();
    } catch (error) {
      send({
        type: "identity-operation",
        operation: "unlock",
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  };

  const handleIdentityExport = async (message) => {
    try {
      const stored = await runtime.store.get(IDENTITY_STORE_KEY);
      if (stored === undefined) throw new Error("No identity exists");
      if (message.type === "identity-export") {
        const identity = decryptIdentityBackup(
          provider,
          stored,
          message.currentPassphrase,
        );
        validateNewIdentityPassphrase(
          message.backupPassphrase,
          message.backupPassphraseConfirmation,
        );
        const backup = encryptIdentityBackup(
          provider,
          identity,
          message.backupPassphrase,
        );
        send({
          type: "identity-operation",
          operation: "export",
          ok: true,
          identityHash: bytesToHex(identity.hash),
          backupHex: bytesToHex(backup),
        });
        backup.fill(0);
      } else if (message.type === "identity-recovery-show") {
        const identity = decryptIdentityBackup(
          provider,
          stored,
          message.currentPassphrase,
        );
        const recovery = identityToRecoveryWords(identity);
        send({
          type: "identity-operation",
          operation: "recovery-show",
          ok: true,
          identityHash: bytesToHex(identity.hash),
          ...recovery,
        });
      } else if (message.type === "identity-import-inspect") {
        const identity = decryptIdentityBackup(
          provider,
          hexToBytes(message.backupHex),
          message.backupPassphrase,
        );
        send({
          type: "identity-operation",
          operation: "import-inspect",
          ok: true,
          candidateIdentityHash: bytesToHex(identity.hash),
        });
      } else if (message.type === "identity-import") {
        const identity = decryptIdentityBackup(
          provider,
          hexToBytes(message.backupHex),
          message.backupPassphrase,
        );
        const candidateIdentityHash = bytesToHex(identity.hash);
        if (message.confirmedCandidateHash !== candidateIdentityHash)
          throw new Error("Identity replacement was not confirmed");
        validateNewIdentityPassphrase(
          message.vaultPassphrase,
          message.vaultPassphraseConfirmation,
        );
        await persistIdentity(identity, message.vaultPassphrase);
        send({
          type: "identity-operation",
          operation: "import",
          ok: true,
          identityHash: bytesToHex(identity.hash),
        });
      } else if (message.type === "identity-recovery-import-inspect") {
        const identity = identityFromRecoveryWords(provider, {
          first: message.first,
          second: message.second,
        });
        send({
          type: "identity-operation",
          operation: "recovery-import-inspect",
          ok: true,
          candidateIdentityHash: bytesToHex(identity.hash),
        });
      } else if (message.type === "identity-recovery-import") {
        const identity = identityFromRecoveryWords(provider, {
          first: message.first,
          second: message.second,
        });
        const candidateIdentityHash = bytesToHex(identity.hash);
        if (message.confirmedCandidateHash !== candidateIdentityHash)
          throw new Error("Identity replacement was not confirmed");
        validateNewIdentityPassphrase(
          message.vaultPassphrase,
          message.vaultPassphraseConfirmation,
        );
        await persistIdentity(identity, message.vaultPassphrase);
        send({
          type: "identity-operation",
          operation: "recovery-import",
          ok: true,
          identityHash: bytesToHex(identity.hash),
        });
      } else {
        const identity = decryptIdentityBackup(
          provider,
          stored,
          message.currentPassphrase,
        );
        validateNewIdentityPassphrase(
          message.nextPassphrase,
          message.nextPassphraseConfirmation,
        );
        await persistIdentity(identity, message.nextPassphrase);
        send({
          type: "identity-operation",
          operation: "change-passphrase",
          ok: true,
          identityHash: bytesToHex(identity.hash),
        });
      }
    } catch (error) {
      send({
        type: "identity-operation",
        operation: message.type,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  };

  const handleModerationList = async (message) => {
    pushModerationState();
    return;
  };

  const handleDeviceList = async (message) => {
    try {
      await ensureMiniappHost().pushDeviceState();
    } catch (error) {
      log(
        `Device list failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  };

  const handleDeviceSetClassDisabled = async (message) => {
    try {
      await ensureMiniappHost().setDeviceClassDisabled(
        message.classId,
        message.disabled === true,
      );
    } catch (error) {
      log(
        `Device policy update failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  };

  const handleDeviceSetRemote = async (message) => {
    try {
      await ensureMiniappHost().setRemoteAcquisitionEnabled(
        message.enabled === true,
      );
    } catch (error) {
      log(
        `Remote acquisition update failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  };

  const handleDeviceKillSession = async (message) => {
    try {
      await ensureMiniappHost().forceCloseDeviceSession(message.handle);
    } catch (error) {
      log(
        `Device session kill failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  };

  const handleDeviceRevokeShare = async (message) => {
    await ensureMiniappHost().revokeShareOffer(message.appId, message.id);
    return;
  };

  const handleSessionInviteAccept = async (message) => {
    try {
      await ensureMiniappHost().acceptSessionInvite(message.id);
      log(`Accepted session invite ${message.id}`);
    } catch (error) {
      log(
        `Session invite accept failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  };

  const handleSessionInviteDecline = async (message) => {
    try {
      ensureMiniappHost().declineSessionInvite(message.id);
      log(`Declined session invite ${message.id}`);
    } catch (error) {
      log(
        `Session invite decline failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  };

  const handleModerationUpdate = async (message) => {
    try {
      if (message.type === "moderation-export-reports") {
        send({
          type: "moderation-report-export",
          json: `${JSON.stringify({ format: "twistedpear-local-reports-v1", exportedAt: Date.now(), reports: state.moderationState.reports }, null, 2)}\n`,
        });
        return;
      }
      const sourceHash = normalizedSourceHash(message.sourceHash);
      if (message.type === "moderation-block") {
        const existing = state.moderationState.blocked.find(
          (entry) => entry.sourceHash === sourceHash,
        );
        state.moderationState.blocked = [
          ...state.moderationState.blocked.filter(
            (entry) => entry.sourceHash !== sourceHash,
          ),
          {
            sourceHash,
            label: message.label?.trim() || null,
            createdAt: existing?.createdAt ?? Date.now(),
          },
        ];
        state.moderationState.muted = state.moderationState.muted.filter(
          (entry) => entry.sourceHash !== sourceHash,
        );
      } else if (message.type === "moderation-unblock") {
        state.moderationState.blocked = state.moderationState.blocked.filter(
          (entry) => entry.sourceHash !== sourceHash,
        );
      } else if (message.type === "moderation-mute") {
        if (
          !state.moderationState.blocked.some(
            (entry) => entry.sourceHash === sourceHash,
          )
        ) {
          const existing = state.moderationState.muted.find(
            (entry) => entry.sourceHash === sourceHash,
          );
          state.moderationState.muted = [
            ...state.moderationState.muted.filter(
              (entry) => entry.sourceHash !== sourceHash,
            ),
            {
              sourceHash,
              label: message.label?.trim() || null,
              createdAt: existing?.createdAt ?? Date.now(),
            },
          ];
        }
      } else if (message.type === "moderation-unmute") {
        state.moderationState.muted = state.moderationState.muted.filter(
          (entry) => entry.sourceHash !== sourceHash,
        );
      } else if (message.type === "moderation-report") {
        state.moderationState.reports = [
          ...state.moderationState.reports,
          {
            id: `${Date.now().toString(36)}-${state.moderationState.reports.length.toString(36)}`,
            sourceHash,
            reason: message.reason,
            note: String(message.note ?? "").slice(0, 4096),
            messageHash: message.messageHash?.trim().toLowerCase() || null,
            createdAt: Date.now(),
          },
        ];
      }
      await persistModerationState();
      pushModerationState();
    } catch (error) {
      log(
        `Moderation update failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  };

  const handleResetIdentity = async (message) => {
    await resetIdentity();
    return;
  };

  return {
    handlers: {
      "create-identity": handleCreateIdentity,
      "identity-unlock": handleIdentityUnlock,
      "identity-export": handleIdentityExport,
      "identity-recovery-show": handleIdentityExport,
      "identity-import-inspect": handleIdentityExport,
      "identity-import": handleIdentityExport,
      "identity-recovery-import-inspect": handleIdentityExport,
      "identity-recovery-import": handleIdentityExport,
      "identity-change-passphrase": handleIdentityExport,
      "moderation-list": handleModerationList,
      "device-list": handleDeviceList,
      "device-set-class-disabled": handleDeviceSetClassDisabled,
      "device-set-remote": handleDeviceSetRemote,
      "device-kill-session": handleDeviceKillSession,
      "device-revoke-share": handleDeviceRevokeShare,
      "session-invite-accept": handleSessionInviteAccept,
      "session-invite-decline": handleSessionInviteDecline,
      "reset-identity": handleResetIdentity,
    },
    handleModerationUpdate,
  };
}
