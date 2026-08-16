/** Bind host chrome controls outside the mini-app widget tree. */
export function bindHostChromeControls(scope) {
  const {
    host,
    appendLog,
    trustIdentityInput,
    trustLabelInput,
    trustAdd,
    trustShow,
    trustScan,
    showQrScanner,
    identityCurrent,
    identityNext,
    identityConfirm,
    identityWordsFirst,
    identityWordsSecond,
    moderationSource,
    moderationLabel,
    moderationReason,
    moderationNote,
    deviceRemoteEnabled,
    limitsApply,
    runningAppId,
    selectedAppId,
    limitRate,
    limitKv,
    limitMemory,
    forceQuit,
    miniappTrust,
    closeMiniapp,
    stopPreview,
    install256tInput,
    install256t,
    install256tScan,
    requestedAppId,
    resetRequestedAppLaunch,
  } = scope;

  miniappTrust?.addEventListener("click", () => {
    const appId = scope.runningAppId;
    if (!appId) return;
    document.body.classList.remove("miniapp-running");
    const pkg = scope.installedPackages.find((entry) => entry.appId === appId);
    if (pkg?.publisherPublicKey && pkg.capabilities) {
      host.send({
        type: "get-grants",
        appId,
        publisherPublicKey: pkg.publisherPublicKey,
        declaredCapabilities: pkg.capabilities,
      });
    }
    scope.grantsPanel?.closest(".panel")?.scrollIntoView({ block: "start" });
  });

  host.send({ type: "trust-list" });
  globalThis.__TP_RENDERER_LISTENING__ = true;

  trustAdd?.addEventListener("click", () => {
    const identityString = trustIdentityInput?.value.trim() ?? "";
    if (identityString.length === 0) {
      appendLog("Paste a 94-character identity string first");
      return;
    }
    host.send({
      type: "trust-add",
      identityString,
      label: trustLabelInput?.value.trim() || "Unnamed publisher",
    });
    if (trustIdentityInput) trustIdentityInput.value = "";
  });

  trustShow?.addEventListener("click", () => {
    host.send({ type: "trust-show" });
  });
  trustScan?.addEventListener("click", () => {
    void showQrScanner(trustIdentityInput, "publisher identity");
  });

  document.querySelector("#identity-unlock")?.addEventListener("click", () => {
    host.send({
      type: "identity-unlock",
      passphrase: identityCurrent.value,
      confirmation: identityConfirm.value,
    });
  });
  document.querySelector("#identity-export")?.addEventListener("click", () => {
    if (identityNext.value !== identityConfirm.value)
      return appendLog("Backup passphrases do not match");
    host.send({
      type: "identity-export",
      currentPassphrase: identityCurrent.value,
      backupPassphrase: identityNext.value,
      backupPassphraseConfirmation: identityConfirm.value,
    });
  });
  document
    .querySelector("#identity-import")
    ?.addEventListener("click", async () => {
      if (identityNext.value !== identityConfirm.value)
        return appendLog("Vault passphrases do not match");
      const backupHex = await host.openIdentityBackup();
      if (backupHex) {
        scope.pendingIdentityImport = {
          backupHex,
          backupPassphrase: identityCurrent.value,
          vaultPassphrase: identityNext.value,
          vaultPassphraseConfirmation: identityConfirm.value,
        };
        host.send({
          type: "identity-import-inspect",
          backupHex,
          backupPassphrase: identityCurrent.value,
        });
      }
    });
  document
    .querySelector("#identity-recovery-show")
    ?.addEventListener("click", () => {
      host.send({
        type: "identity-recovery-show",
        currentPassphrase: identityCurrent.value,
      });
    });
  document
    .querySelector("#identity-recovery-import")
    ?.addEventListener("click", () => {
      if (identityNext.value !== identityConfirm.value)
        return appendLog("Vault passphrases do not match");
      scope.pendingIdentityRecovery = {
        first: identityWordsFirst.value.trim(),
        second: identityWordsSecond.value.trim(),
        vaultPassphrase: identityNext.value,
        vaultPassphraseConfirmation: identityConfirm.value,
      };
      host.send({
        type: "identity-recovery-import-inspect",
        first: scope.pendingIdentityRecovery.first,
        second: scope.pendingIdentityRecovery.second,
      });
    });
  document.querySelector("#identity-change")?.addEventListener("click", () => {
    if (identityNext.value !== identityConfirm.value)
      return appendLog("New passphrases do not match");
    host.send({
      type: "identity-change-passphrase",
      currentPassphrase: identityCurrent.value,
      nextPassphrase: identityNext.value,
      nextPassphraseConfirmation: identityConfirm.value,
    });
  });

  const sendModeration = (type) => {
    host.send({
      type,
      sourceHash: moderationSource.value.trim(),
      label: moderationLabel.value.trim(),
    });
  };
  document
    .querySelector("#moderation-block")
    ?.addEventListener("click", () => sendModeration("moderation-block"));
  document
    .querySelector("#moderation-unblock")
    ?.addEventListener("click", () => sendModeration("moderation-unblock"));
  document
    .querySelector("#moderation-mute")
    ?.addEventListener("click", () => sendModeration("moderation-mute"));
  document
    .querySelector("#moderation-unmute")
    ?.addEventListener("click", () => sendModeration("moderation-unmute"));
  document
    .querySelector("#moderation-report")
    ?.addEventListener("click", () => {
      host.send({
        type: "moderation-report",
        sourceHash: moderationSource.value.trim(),
        reason: moderationReason.value,
        note: moderationNote.value,
      });
    });
  document
    .querySelector("#moderation-export")
    ?.addEventListener("click", () =>
      host.send({ type: "moderation-export-reports" }),
    );
  host.send({ type: "moderation-list" });

  deviceRemoteEnabled?.addEventListener("change", () => {
    host.send({
      type: "device-set-remote",
      enabled: deviceRemoteEnabled.checked,
    });
  });
  host.send({ type: "device-list" });

  limitsApply?.addEventListener("click", () => {
    const appId = runningAppId ?? selectedAppId;
    if (appId === null) {
      appendLog("No mini-app selected for limits");
      return;
    }
    const limits = {};
    if (limitRate?.value) limits.maxMessagesPerSecond = Number(limitRate.value);
    limits.kvQuotaBytes = limitKv?.value ? Number(limitKv.value) : null;
    limits.memoryBytes = limitMemory?.value ? Number(limitMemory.value) : null;
    host.send({ type: "set-limits", appId, limits });
  });

  forceQuit?.addEventListener("click", () => {
    host.send({ type: "stop-miniapp", reason: "user-forced" });
    appendLog("Force quit requested");
  });
  closeMiniapp?.addEventListener("click", () => {
    host.send({ type: "stop-miniapp", reason: "user-returned-to-host" });
  });
  stopPreview?.addEventListener("click", () => {
    host.send({ type: "stop-preview-miniapp" });
  });

  install256t?.addEventListener("click", () => {
    const t256 = install256tInput?.value.trim() ?? "";
    if (t256.length !== 94) {
      appendLog("Paste a 94-character 256t string first");
      return;
    }
    host.send({ type: "install-from-256t", t256 });
    appendLog("Resolving 256t id…");
  });
  install256tScan?.addEventListener("click", () => {
    void showQrScanner(install256tInput, "app");
  });

  host.onWorkletExit((detail) => {
    if (requestedAppId !== null && runningAppId !== requestedAppId)
      resetRequestedAppLaunch();
    appendLog(
      `Worklet exited (code=${detail.code}, signal=${detail.signal ?? "none"})`,
    );
  });

  void host.getStatus().then(scope.renderStatus);
  host.send({ type: "list-catalog" });
  host.send({ type: "list-installed" });
}
