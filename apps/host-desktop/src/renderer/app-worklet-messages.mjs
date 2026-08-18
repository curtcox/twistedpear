import { renderWidgetTree } from "./widgets.js";
import { handleDeviceBridgeRequest } from "./device-bridge.js";
import {
  handleMediaCodecRequest,
  handleMediaOpusPlayRequest,
  playInboundMediaFrame,
} from "./media-codec-bridge.js";
import { handlePeerWebRtcMessage } from "./peer-webrtc-bridge.js";

/** Handle one inbound worklet message for the desktop renderer shell. */
export function handleWorkletMessage(scope, message) {
  const {
    host,
    appendLog,
    sendPeerChromeResponse,
    showPeerConfirmation,
    showPeerCodeExchange,
    closeHostModal,
    activePeerChromeToken,
    renderStatus,
    settingDeveloper,
    settingPropagation,
    relayAttributionBanner,
    renderCatalog,
    installedPackages,
    renderInstalled,
    requestedAppLaunchStarted,
    requestedAppId,
    scheduleRequestedAppLaunch,
    renderGrants,
    previewRoot,
    lastDeviceState,
    runningAppId,
    miniappTitle,
    widgetRoot,
    readWorkspaceDocument,
    showHostModal,
    pendingWorkspaceReads,
    renderLimits,
    renderTrustList,
    renderOwnIdentity,
    identityResult,
    identityWordsFirst,
    identityWordsSecond,
    pendingIdentityImport,
    pendingIdentityRecovery,
    renderModerationState,
    renderDeviceState,
    renderSessionInvites,
  } = scope;

  if (message.type === "peer-audio-availability") {
    const supported =
      (globalThis.AudioContext !== undefined ||
        globalThis.webkitAudioContext !== undefined) &&
      typeof navigator.mediaDevices?.getUserMedia === "function" &&
      globalThis.TwistedPearPeerAudio !== undefined;
    sendPeerChromeResponse(message.token, {
      availability: supported
        ? {
            state: "permission-required",
            reason:
              "Microphone permission is requested only after starting the audible exchange",
          }
        : {
            state: "unsupported",
            reason: "Desktop audio recording/playback is unavailable",
          },
    });
    return;
  }

  if (message.type === "peer-ntfy-availability") {
    void host
      .getNtfyStatus()
      .then((status) => {
        const availability =
          status?.configured === true
            ? {
                state: "available",
                reason: `Encrypted rendezvous is configured through ${status.server}`,
              }
            : {
                state: "offline",
                reason: "No ntfy rendezvous server is configured",
              };
        sendPeerChromeResponse(message.token, { availability });
      })
      .catch((error) => {
        sendPeerChromeResponse(message.token, {
          availability: {
            state: "offline",
            reason: error instanceof Error ? error.message : String(error),
          },
        });
      });
    return;
  }

  if (message.type === "peer-ntfy-http") {
    void host
      .ntfyRequest(message.request)
      .then((http) => {
        sendPeerChromeResponse(message.token, { http });
      })
      .catch((error) => {
        sendPeerChromeResponse(message.token, {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    return;
  }

  if (message.type === "peer-qr-availability") {
    sendPeerChromeResponse(message.token, {
      availability: peerQrAvailability(),
    });
    return;
  }

  if (message.type === "peer-confirm-request") {
    showPeerConfirmation(message);
    return;
  }

  if (
    [
      "peer-manual-present",
      "peer-manual-enter",
      "peer-qr-present",
      "peer-qr-scan",
      "peer-ntfy-present",
      "peer-ntfy-enter",
      "peer-audio-transmit",
      "peer-audio-receive",
    ].includes(message.type)
  ) {
    showPeerCodeExchange(message);
    return;
  }

  if (message.type === "peer-chrome-cancel") {
    if (message.token === activePeerChromeToken) closeHostModal();
    return;
  }

  if (message.type === "status") {
    renderStatus(message.status);
    if (settingDeveloper)
      settingDeveloper.checked = Boolean(message.status.developerMode);
    if (settingPropagation)
      settingPropagation.checked = Boolean(message.status.propagationEnabled);
  }

  if (message.type === "relay-attribution" && relayAttributionBanner) {
    const target = message.kind ? ` for ${message.kind}` : "";
    relayAttributionBanner.textContent = `Mini-app ${message.appId} changed relay settings${target}. Click to dismiss.`;
    relayAttributionBanner.hidden = false;
    relayAttributionBanner.onclick = () => {
      relayAttributionBanner.hidden = true;
    };
  }

  if (message.type === "log") appendLog(message.line);

  if (message.type === "catalog") {
    scope.catalogEntries = message.entries;
    renderCatalog();
  }

  if (message.type === "installed") {
    scope.installedPackages = message.packages;
    renderInstalled();
    if (!requestedAppLaunchStarted && requestedAppId !== null) {
      const requestedPackage = installedPackages.find(
        (pkg) => pkg.appId === requestedAppId,
      );
      if (requestedPackage !== undefined)
        scheduleRequestedAppLaunch(requestedPackage);
    }
  }

  if (message.type === "install-progress") {
    appendLog(`Install ${message.progress.appId}: ${message.progress.phase}`);
    if (message.progress.phase === "complete")
      host.send({ type: "list-installed" });
  }

  if (message.type === "grants") {
    scope.selectedAppId = message.appId;
    renderGrants(message.appId, message.capabilities);
  }

  if (message.type === "miniapp-runtime") {
    if (message.slot === "preview") {
      if (previewRoot) {
        renderWidgetTree(
          message.runtime?.widgetTree ?? null,
          previewRoot,
          (nodeId, event, value) => {
            host.send({
              type: "miniapp-ui-event",
              slot: "preview",
              nodeId,
              event,
              value,
            });
          },
          { deviceSessions: lastDeviceState?.sessions ?? [] },
        );
      }
    } else {
      scope.runningAppId = message.runtime.appId;
      scope.runningApps = message.runtime.running ?? [];
      if (scope.runningAppId === null) scope.miniappHostView = false;
      if (runningAppId === requestedAppId) scope.requestedAppLaunchTimer = null;
      document.body.classList.toggle(
        "miniapp-running",
        scope.runningAppId !== null && !scope.miniappHostView,
      );
      if (scope.returnMiniapp)
        scope.returnMiniapp.hidden =
          scope.runningAppId === null || !scope.miniappHostView;
      if (miniappTitle)
        miniappTitle.textContent = scope.runningAppId ?? "Mini-app";
      renderRunningApps(scope);
      renderInstalled();
      if (scope.runningAppId !== null)
        host.send({ type: "get-limits", appId: scope.runningAppId });
      renderWidgetTree(
        message.runtime.widgetTree,
        widgetRoot,
        (nodeId, event, value) => {
          host.send({ type: "miniapp-ui-event", nodeId, event, value });
        },
        {
          readDocument: readWorkspaceDocument,
          deviceSessions: lastDeviceState?.sessions ?? [],
        },
      );
    }
  }

  if (message.type === "install-review") {
    showHostModal({
      title: message.trusted
        ? `Install ${message.appId} v${message.version} from trusted publisher "${message.trustedLabel ?? "?"}"?`
        : `Install ${message.appId} v${message.version} from UNTRUSTED publisher?`,
      fingerprint: message.publisherPublicKey,
      rows: reviewRiskRows(message),
      capabilities: message.capabilities,
      confirmLabel: "Install",
      onDone: (accept, grants) => {
        host.send({
          type: "install-confirm",
          token: message.token,
          accept,
          grants,
        });
      },
    });
  }

  if (message.type === "install-256t-result") {
    appendLog(
      message.ok
        ? `Installed ${message.appId} v${message.version} (trusted: ${message.trusted})`
        : `256t install failed: ${message.error}`,
    );
    if (message.ok) host.send({ type: "list-installed" });
  }

  if (message.type === "workspace-file") {
    const waiter = pendingWorkspaceReads.get(message.token);
    pendingWorkspaceReads.delete(message.token);
    if (waiter) {
      if (message.error) waiter.reject(new Error(message.error));
      else waiter.resolve(message.content);
    }
  }

  if (message.type === "confirm-request") {
    handleConfirmRequest(scope, message);
  }

  if (message.type === "launch-review") {
    handleLaunchReview(scope, message);
  }

  if (message.type === "limits") renderLimits(message.limits);
  if (message.type === "trust") renderTrustList(message.entries);
  if (message.type === "trust-identity")
    renderOwnIdentity(message.identity256t);

  if (message.type === "identity-locked") {
    if (identityResult) {
      identityResult.textContent = message.creating
        ? "Create a passphrase of at least 12 characters to start."
        : message.legacy
          ? "Set a passphrase to encrypt and migrate this legacy identity."
          : "Identity locked.";
    }
  }

  if (message.type === "identity-operation") {
    if (identityResult) {
      identityResult.textContent = message.ok
        ? `${message.operation} complete${message.identityHash ? ` (${message.identityHash.slice(0, 12)})` : ""}`
        : (message.error ?? `${message.operation} failed`);
    }
    if (message.ok && message.backupHex)
      void host.saveIdentityBackup(message.backupHex);
    if (message.ok && message.first && message.second) {
      void host.setIdentityContentProtection(true);
      identityWordsFirst.value = message.first;
      identityWordsSecond.value = message.second;
    }
    if (message.ok && message.operation === "recovery-import")
      void host.setIdentityContentProtection(false);
    if (
      message.ok &&
      message.operation === "import-inspect" &&
      pendingIdentityImport !== null
    ) {
      const candidate = message.candidateIdentityHash;
      if (
        window.confirm(
          `Replace this host identity with ${candidate.slice(0, 12)}? The host will restart.`,
        )
      ) {
        host.send({
          type: "identity-import",
          ...pendingIdentityImport,
          confirmedCandidateHash: candidate,
        });
      }
      scope.pendingIdentityImport = null;
    }
    if (
      message.ok &&
      message.operation === "recovery-import-inspect" &&
      pendingIdentityRecovery !== null
    ) {
      const candidate = message.candidateIdentityHash;
      if (
        window.confirm(
          `Replace this host identity with ${candidate.slice(0, 12)}? The host will restart.`,
        )
      ) {
        host.send({
          type: "identity-recovery-import",
          ...pendingIdentityRecovery,
          confirmedCandidateHash: candidate,
        });
      }
      scope.pendingIdentityRecovery = null;
    }
  }

  if (message.type === "moderation-state") renderModerationState(message);
  if (message.type === "moderation-report-export")
    void host.saveModerationReport(message.json);
  if (message.type === "device-state") renderDeviceState(message);
  if (message.type === "session-invites") renderSessionInvites(message.invites);

  if (message.type === "device-bridge-request") {
    void handleDeviceBridgeRequest(message, (reply) => host.send(reply));
  }
  if (message.type === "media-codec-request") {
    void handleMediaCodecRequest(message, (reply) => host.send(reply));
  }
  if (message.type === "media-opus-play-request") {
    void handleMediaOpusPlayRequest(message, (reply) => host.send(reply));
  }
  if (isPeerWebRtcHostMessage(message.type)) {
    appendLog(`WebRTC host message ${message.type}`);
    void handlePeerWebRtcMessage(message, (reply) => {
      appendLog(`WebRTC host reply ${message.type}`);
      host.send(reply);
    });
  }
  if (message.type === "inbound-media-frame") {
    logInboundMediaFrame(appendLog, message);
  }
}

const CONFIRM_KIND_TITLES = {
  package: "Package and sign an app?",
  publish: "Publish an app to other users?",
  install: "Install an app?",
  "trust-import": "Trust a new publisher?",
  "device-session": "Allow a device session?",
  "device-stream": "Stream a device to a peer?",
  "device-remote-grant": "Let a remote peer use a device on this host?",
  "device-share-offer": "Share a device with this peer?",
  "device-share-revoke": "Stop sharing this device?",
  "link-probe": "Measure this peer link?",
  "app-channel": "Allow messages to another mini-app?",
};

function handleConfirmRequest(scope, message) {
  const { host, showHostModal } = scope;
  showHostModal({
    title: CONFIRM_KIND_TITLES[message.kind] ?? `Confirm ${message.kind}?`,
    fingerprint: message.publisherPublicKey,
    rows: [
      ["Requested by", message.appId],
      ...Object.entries(message.summary ?? {}),
    ],
    confirmLabel: "Approve",
    onDone: (approved) => {
      host.send({ type: "confirm-response", token: message.token, approved });
    },
  });
}

function reviewRiskRows(message) {
  const rows = [];
  if (message.riskTier != null) {
    rows.push(["Risk tier", message.riskTier]);
  }
  rows.push(["Capabilities requested", message.capabilities.length]);
  return rows;
}

function handleLaunchReview(scope, message) {
  const { host, requestedAppId, showHostModal } = scope;
  if (requestedAppId !== null && message.appId === requestedAppId) {
    host.send({
      type: "launch-confirm",
      token: message.token,
      accept: true,
      grants: message.capabilities.map((capability) => capability.id),
    });
    return;
  }

  showHostModal({
    title: `Run ${message.appId} v${message.version}?`,
    fingerprint: message.publisherPublicKey,
    rows: reviewRiskRows(message),
    capabilities: message.capabilities,
    confirmLabel: "Run",
    onDone: (accept, grants) => {
      host.send({
        type: "launch-confirm",
        token: message.token,
        accept,
        grants,
      });
    },
  });
}

function isPeerWebRtcHostMessage(type) {
  return (
    type === "peer-webrtc-signal" ||
    type === "peer-webrtc-establish" ||
    type === "peer-webrtc-data-send" ||
    type === "peer-webrtc-media-attach" ||
    type === "peer-webrtc-media-stats" ||
    type === "peer-webrtc-media-detach" ||
    type === "peer-webrtc-close"
  );
}

function logInboundMediaFrame(appendLog, message) {
  void playInboundMediaFrame(message)
    .then((played) =>
      appendLog(
        `Inbound ${message.encoding} media → ${played ? "speaker" : message.sink.kind} (${message.dataHex.length / 2} bytes)`,
      ),
    )
    .catch((error) =>
      appendLog(
        `Inbound media failed: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
}

function peerQrAvailability() {
  const hasDisplay = typeof globalThis.qrcode === "function";
  const hasCamera = typeof navigator.mediaDevices?.getUserMedia === "function";
  const hasDecoder =
    typeof globalThis.BarcodeDetector === "function" ||
    typeof globalThis.jsQR === "function";
  if (!hasDisplay) {
    return {
      state: "unsupported",
      reason: "QR generation is unavailable in this build",
    };
  }
  if (!hasCamera) {
    return {
      state: "unsupported",
      reason: "Camera capture is unavailable; use full manual copy/paste",
    };
  }
  if (!hasDecoder) {
    return {
      state: "unsupported",
      reason: "QR decoding is unavailable; use full manual copy/paste",
    };
  }
  return {
    state: "permission-required",
    reason: "Camera permission is requested only after Start camera",
  };
}

function renderRunningApps(scope) {
  const root = document.querySelector("#running-apps");
  if (root === null) return;
  const running = Array.isArray(scope.runningApps) ? scope.runningApps : [];
  const visible = running.filter((item) => typeof item.appId === "string");
  root.hidden = visible.length < 2;
  root.replaceChildren(
    ...visible.map((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = item.appId;
      button.className = "secondary";
      if (item.appId === scope.runningAppId) {
        button.setAttribute("aria-current", "true");
      }
      button.addEventListener("click", () => {
        scope.host?.send({
          type: "switch-miniapp",
          appId: item.appId,
          ...(typeof item.publisherPublicKey === "string"
            ? { publisherPublicKey: item.publisherPublicKey }
            : {}),
        });
      });
      return button;
    }),
  );
}
