import { renderWidgetTree } from "./widgets.js";
import {
  decodeQrVideoFrame,
  normalizeScannedT256,
  supportsQrDetection,
} from "./qr-scanner.js";
import { handleDeviceBridgeRequest } from "./device-bridge.js";
import {
  handleMediaCodecRequest,
  handleMediaOpusPlayRequest,
  playInboundMediaFrame,
} from "./media-codec-bridge.js";
import { handlePeerWebRtcMessage } from "./peer-webrtc-bridge.js";
import {
  renderModerationStateImpl,
  renderSessionInvitesImpl,
  renderDeviceStateImpl,
  resetRequestedAppLaunchImpl,
  scheduleRequestedAppLaunchImpl,
  readWorkspaceDocumentImpl,
  closeHostModalImpl,
  renderPeerQrImpl,
  sendPeerChromeResponseImpl,
  audioUnhexImpl,
  audioHexImpl,
  playPeerAudioImpl,
  recordPeerAudioImpl,
  performPeerAudioImpl,
  showPeerConfirmationImpl,
  showPeerCodeExchangeImpl,
  showQrScannerImpl,
  showHostModalImpl,
} from "./app-extracted-1.mjs";
import {
  renderTrustListImpl,
  renderOwnIdentityImpl,
  renderLimitsImpl,
  appendLogImpl,
  formatBytesImpl,
  renderStatusImpl,
  renderCatalogImpl,
  renderInstalledImpl,
  renderGrantsImpl,
  applyInterfaceSettingsImpl,
} from "./app-extracted-2.mjs";

const extractedContext = {
  get activePeerCameraStream() {
    return activePeerCameraStream;
  },
  set activePeerCameraStream(value) {
    activePeerCameraStream = value;
  },
  get activePeerChromeToken() {
    return activePeerChromeToken;
  },
  set activePeerChromeToken(value) {
    activePeerChromeToken = value;
  },
  get activePeerQrTimer() {
    return activePeerQrTimer;
  },
  set activePeerQrTimer(value) {
    activePeerQrTimer = value;
  },
  get appendLog() {
    return appendLog;
  },
  set appendLog(value) {
    appendLog = value;
  },
  get audioHex() {
    return audioHex;
  },
  set audioHex(value) {
    audioHex = value;
  },
  get audioUnhex() {
    return audioUnhex;
  },
  set audioUnhex(value) {
    audioUnhex = value;
  },
  get catalogEntries() {
    return catalogEntries;
  },
  set catalogEntries(value) {
    catalogEntries = value;
  },
  get catalogList() {
    return catalogList;
  },
  get closeHostModal() {
    return closeHostModal;
  },
  set closeHostModal(value) {
    closeHostModal = value;
  },
  get deviceActiveBanner() {
    return deviceActiveBanner;
  },
  get deviceInventory() {
    return deviceInventory;
  },
  get deviceRemoteEnabled() {
    return deviceRemoteEnabled;
  },
  get deviceSessions() {
    return deviceSessions;
  },
  get formatBytes() {
    return formatBytes;
  },
  set formatBytes(value) {
    formatBytes = value;
  },
  get grantsPanel() {
    return grantsPanel;
  },
  get host() {
    return host;
  },
  get installedList() {
    return installedList;
  },
  get installedPackages() {
    return installedPackages;
  },
  set installedPackages(value) {
    installedPackages = value;
  },
  get lastDeviceState() {
    return lastDeviceState;
  },
  set lastDeviceState(value) {
    lastDeviceState = value;
  },
  get limitKv() {
    return limitKv;
  },
  get limitMemory() {
    return limitMemory;
  },
  get limitRate() {
    return limitRate;
  },
  get limitsApp() {
    return limitsApp;
  },
  get limitsNote() {
    return limitsNote;
  },
  get logEl() {
    return logEl;
  },
  get modalEl() {
    return modalEl;
  },
  get modalOverlay() {
    return modalOverlay;
  },
  get moderationBlocked() {
    return moderationBlocked;
  },
  get moderationMuted() {
    return moderationMuted;
  },
  get moderationSummary() {
    return moderationSummary;
  },
  get pendingWorkspaceReads() {
    return pendingWorkspaceReads;
  },
  get performPeerAudio() {
    return performPeerAudio;
  },
  set performPeerAudio(value) {
    performPeerAudio = value;
  },
  get playPeerAudio() {
    return playPeerAudio;
  },
  set playPeerAudio(value) {
    playPeerAudio = value;
  },
  get recordPeerAudio() {
    return recordPeerAudio;
  },
  set recordPeerAudio(value) {
    recordPeerAudio = value;
  },
  get renderPeerQr() {
    return renderPeerQr;
  },
  set renderPeerQr(value) {
    renderPeerQr = value;
  },
  get requestedAppLaunchStarted() {
    return requestedAppLaunchStarted;
  },
  set requestedAppLaunchStarted(value) {
    requestedAppLaunchStarted = value;
  },
  get requestedAppLaunchTimer() {
    return requestedAppLaunchTimer;
  },
  set requestedAppLaunchTimer(value) {
    requestedAppLaunchTimer = value;
  },
  get selectedAppId() {
    return selectedAppId;
  },
  set selectedAppId(value) {
    selectedAppId = value;
  },
  get sendPeerChromeResponse() {
    return sendPeerChromeResponse;
  },
  set sendPeerChromeResponse(value) {
    sendPeerChromeResponse = value;
  },
  get sessionInviteBanner() {
    return sessionInviteBanner;
  },
  get settingAuto() {
    return settingAuto;
  },
  get settingRelayMode() {
    return settingRelayMode;
  },
  get settingTcpDirection() {
    return settingTcpDirection;
  },
  get settingAutoDirection() {
    return settingAutoDirection;
  },
  get settingRnodeDirection() {
    return settingRnodeDirection;
  },
  get relayInterfaceTable() {
    return relayInterfaceTable;
  },
  get settingRnodePort() {
    return settingRnodePort;
  },
  get settingTcp() {
    return settingTcp;
  },
  get showHostModal() {
    return showHostModal;
  },
  set showHostModal(value) {
    showHostModal = value;
  },
  get statusGrid() {
    return statusGrid;
  },
  get trustIdentityView() {
    return trustIdentityView;
  },
  get trustList() {
    return trustList;
  },
  get workspaceReadCounter() {
    return workspaceReadCounter;
  },
  set workspaceReadCounter(value) {
    workspaceReadCounter = value;
  },
};

const statusGrid = document.querySelector("#status-grid");
const catalogList = document.querySelector("#catalog-list");
const installedList = document.querySelector("#installed-list");
const grantsPanel = document.querySelector("#grants-panel");
const logEl = document.querySelector("#log");
const widgetRoot = document.querySelector("#widget-root");
const miniappTitle = document.querySelector("#miniapp-title");
const closeMiniapp = document.querySelector("#close-miniapp");
const previewRoot = document.querySelector("#preview-root");
const stopPreview = document.querySelector("#stop-preview");
const install256tInput = document.querySelector("#install-256t-input");
const install256t = document.querySelector("#install-256t");
const install256tScan = document.querySelector("#install-256t-scan");

const modalOverlay = document.querySelector("#host-modal-overlay");
const modalEl = document.querySelector("#host-modal");
const limitsApp = document.querySelector("#limits-app");
const limitRate = document.querySelector("#limit-rate");
const limitKv = document.querySelector("#limit-kv");
const limitMemory = document.querySelector("#limit-memory");
const limitsNote = document.querySelector("#limits-note");
const limitsApply = document.querySelector("#limits-apply");
const forceQuit = document.querySelector("#force-quit");

const trustList = document.querySelector("#trust-list");
const trustIdentityInput = document.querySelector("#trust-identity-input");
const trustLabelInput = document.querySelector("#trust-label-input");
const trustAdd = document.querySelector("#trust-add");
const trustShow = document.querySelector("#trust-show");
const trustScan = document.querySelector("#trust-scan");
const trustIdentityView = document.querySelector("#trust-identity-view");

const settingDeveloper = document.querySelector("#setting-developer");
const settingAiUrl = document.querySelector("#setting-ai-url");
const settingAiKey = document.querySelector("#setting-ai-key");
const settingAiModel = document.querySelector("#setting-ai-model");
const settingAiEmbeddingModel = document.querySelector(
  "#setting-ai-embedding-model",
);
const settingPropagation = document.querySelector("#setting-propagation");
const settingTcp = document.querySelector("#setting-tcp");
const settingAuto = document.querySelector("#setting-auto");
const settingRnodePort = document.querySelector("#setting-rnode-port");
const settingRelayMode = document.querySelector("#setting-relay-mode");
const settingTcpDirection = document.querySelector("#setting-tcp-direction");
const settingAutoDirection = document.querySelector("#setting-auto-direction");
const settingRnodeDirection = document.querySelector(
  "#setting-rnode-direction",
);
const settingFreenet = document.querySelector("#setting-freenet");
const settingFreenetUrl = document.querySelector("#setting-freenet-url");
const settingFreenetToken = document.querySelector("#setting-freenet-token");
const settingFreenetInterface = document.querySelector(
  "#setting-freenet-interface",
);
const settingFreenetRendezvous = document.querySelector(
  "#setting-freenet-rendezvous",
);
const settingFreenetDirection = document.querySelector(
  "#setting-freenet-direction",
);
const joinCommunityNetwork = document.querySelector("#join-community-network");
const identityCurrent = document.querySelector("#identity-current");
const identityNext = document.querySelector("#identity-next");
const identityConfirm = document.querySelector("#identity-confirm");
const identityWordsFirst = document.querySelector("#identity-words-first");
const identityWordsSecond = document.querySelector("#identity-words-second");
const identityResult = document.querySelector("#identity-result");
const moderationSource = document.querySelector("#moderation-source");
const moderationLabel = document.querySelector("#moderation-label");
const moderationReason = document.querySelector("#moderation-reason");
const moderationNote = document.querySelector("#moderation-note");
const moderationBlocked = document.querySelector("#moderation-blocked");
const moderationMuted = document.querySelector("#moderation-muted");
const moderationSummary = document.querySelector("#moderation-summary");
const deviceActiveBanner = document.querySelector("#device-active-banner");
const relayAttributionBanner = document.querySelector(
  "#relay-attribution-banner",
);
const relayInterfaceTable = document.querySelector("#relay-interface-table");
const sessionInviteBanner = document.querySelector("#session-invite-banner");
const deviceInventory = document.querySelector("#device-inventory");
const deviceSessions = document.querySelector("#device-sessions");
const deviceRemoteEnabled = document.querySelector("#device-remote-enabled");
function renderModerationState(...args) {
  return renderModerationStateImpl(extractedContext, ...args);
}
function renderSessionInvites(...args) {
  return renderSessionInvitesImpl(extractedContext, ...args);
}
function renderDeviceState(...args) {
  return renderDeviceStateImpl(extractedContext, ...args);
}

/** @type {import("@twistedpear/host-core/protocol").CatalogEntryView[]} */
let catalogEntries = [];
/** @type {import("@twistedpear/host-core/protocol").InstalledPackageView[]} */
let installedPackages = [];
/** @type {string | null} */
let selectedAppId = null;
/** @type {string | null} */
let runningAppId = null;
/** @type {{ sessions?: ReadonlyArray<{ handle: string; classId: string; tierId: string; appId: string }> } | null} */
let lastDeviceState = null;
let pendingIdentityImport = null;
let pendingIdentityRecovery = null;
/** @type {Map<string, {resolve: (content: string) => void, reject: (error: Error) => void}>} */
const pendingWorkspaceReads = new Map();
let workspaceReadCounter = 0;
const requestedAppId = new URLSearchParams(window.location.search).get("app");
let requestedAppLaunchStarted = false;
let requestedAppLaunchTimer = null;
let activePeerChromeToken = null;
let activePeerQrTimer = null;
let activePeerCameraStream = null;
function resetRequestedAppLaunch(...args) {
  return resetRequestedAppLaunchImpl(extractedContext, ...args);
}
function scheduleRequestedAppLaunch(...args) {
  return scheduleRequestedAppLaunchImpl(extractedContext, ...args);
}
function readWorkspaceDocument(...args) {
  return readWorkspaceDocumentImpl(extractedContext, ...args);
}
function closeHostModal(...args) {
  return closeHostModalImpl(extractedContext, ...args);
}
function renderPeerQr(...args) {
  return renderPeerQrImpl(extractedContext, ...args);
}
function sendPeerChromeResponse(...args) {
  return sendPeerChromeResponseImpl(extractedContext, ...args);
}
function audioUnhex(...args) {
  return audioUnhexImpl(extractedContext, ...args);
}
function audioHex(...args) {
  return audioHexImpl(extractedContext, ...args);
}
async function playPeerAudio(...args) {
  return playPeerAudioImpl(extractedContext, ...args);
}
async function recordPeerAudio(...args) {
  return recordPeerAudioImpl(extractedContext, ...args);
}
async function performPeerAudio(...args) {
  return performPeerAudioImpl(extractedContext, ...args);
}
function showPeerConfirmation(...args) {
  return showPeerConfirmationImpl(extractedContext, ...args);
}
function showPeerCodeExchange(...args) {
  return showPeerCodeExchangeImpl(extractedContext, ...args);
}
async function showQrScanner(...args) {
  return showQrScannerImpl(extractedContext, ...args);
}
function showHostModal(...args) {
  return showHostModalImpl(extractedContext, ...args);
}
function renderTrustList(...args) {
  return renderTrustListImpl(extractedContext, ...args);
}
function renderOwnIdentity(...args) {
  return renderOwnIdentityImpl(extractedContext, ...args);
}
function renderLimits(...args) {
  return renderLimitsImpl(extractedContext, ...args);
}
function appendLog(...args) {
  return appendLogImpl(extractedContext, ...args);
}
function formatBytes(...args) {
  return formatBytesImpl(extractedContext, ...args);
}
function renderStatus(...args) {
  return renderStatusImpl(extractedContext, ...args);
}
function renderCatalog(...args) {
  return renderCatalogImpl(extractedContext, ...args);
}
function renderInstalled(...args) {
  return renderInstalledImpl(extractedContext, ...args);
}
function renderGrants(...args) {
  return renderGrantsImpl(extractedContext, ...args);
}
function applyInterfaceSettings(...args) {
  return applyInterfaceSettingsImpl(extractedContext, ...args);
}

const host = window.twistedPearHost;
if (!host) {
  appendLog("Preload bridge unavailable");
} else {
  settingDeveloper?.addEventListener("change", () => {
    host.send({
      type: "set-developer-mode",
      enabled: settingDeveloper.checked,
    });
  });

  settingPropagation?.addEventListener("change", () => {
    host.send({ type: "set-propagation", enabled: settingPropagation.checked });
  });

  joinCommunityNetwork?.addEventListener("click", () => {
    if (settingTcp) settingTcp.checked = true;
    host.send({ type: "join-community-network" });
  });

  for (const element of [settingTcp, settingAuto, settingRnodePort]) {
    element?.addEventListener("change", applyInterfaceSettings);
  }

  const applyRelaySettings = () => {
    const relay = {
      mode: settingRelayMode?.value ?? "off",
      directions: {
        tcp: settingTcpDirection?.value ?? "both",
        auto: settingAutoDirection?.value ?? "both",
        rnode: settingRnodeDirection?.value ?? "both",
      },
    };
    localStorage.setItem("tp-relay-config", JSON.stringify(relay));
    host.send({ type: "set-relay-config", ...relay });
  };
  try {
    const savedRelay = JSON.parse(
      localStorage.getItem("tp-relay-config") ?? "{}",
    );
    if (
      settingRelayMode &&
      ["off", "bridge", "transport-node"].includes(savedRelay.mode)
    )
      settingRelayMode.value = savedRelay.mode;
    for (const [element, kind] of [
      [settingTcpDirection, "tcp"],
      [settingAutoDirection, "auto"],
      [settingRnodeDirection, "rnode"],
    ]) {
      const value = savedRelay.directions?.[kind];
      if (element && ["tx", "rx", "both"].includes(value))
        element.value = value;
    }
  } catch {
    // Ignore malformed local relay settings.
  }
  for (const element of [
    settingRelayMode,
    settingTcpDirection,
    settingAutoDirection,
    settingRnodeDirection,
  ]) {
    element?.addEventListener("change", applyRelaySettings);
  }
  applyRelaySettings();

  const applyAiSettings = () => {
    const config = {
      baseUrl: settingAiUrl?.value.trim() ?? "",
      apiKey: settingAiKey?.value.trim() ?? "",
      model: settingAiModel?.value.trim() ?? "",
      embeddingModel: settingAiEmbeddingModel?.value.trim() ?? "",
    };
    localStorage.setItem(
      "tp-ai-config",
      JSON.stringify({
        baseUrl: config.baseUrl,
        model: config.model,
        embeddingModel: config.embeddingModel,
      }),
    );
    host.send({
      type: "set-ai-config",
      config: config.baseUrl && config.apiKey ? config : null,
    });
  };

  try {
    const savedAi = JSON.parse(localStorage.getItem("tp-ai-config") ?? "{}");
    if (settingAiUrl && savedAi.baseUrl) {
      settingAiUrl.value = savedAi.baseUrl;
    }
    if (settingAiModel && savedAi.model) {
      settingAiModel.value = savedAi.model;
    }
    if (settingAiEmbeddingModel && savedAi.embeddingModel) {
      settingAiEmbeddingModel.value = savedAi.embeddingModel;
    }
  } catch {
    // ignore malformed saved settings
  }

  for (const element of [
    settingAiUrl,
    settingAiKey,
    settingAiModel,
    settingAiEmbeddingModel,
  ]) {
    element?.addEventListener("change", applyAiSettings);
  }

  const applyFreenetSettings = () => {
    const enabled = settingFreenet?.checked === true;
    const interfaceEnabled = settingFreenetInterface?.checked === true;
    const url = settingFreenetUrl?.value.trim() ?? "";
    const authToken = settingFreenetToken?.value.trim() ?? "";
    const rendezvousHex = settingFreenetRendezvous?.value.trim() ?? "";
    const localDirection = settingFreenetDirection?.value === "1" ? 1 : 0;
    localStorage.setItem(
      "tp-freenet-config",
      JSON.stringify({
        enabled,
        interfaceEnabled,
        url: url.length > 0 ? url : undefined,
        rendezvousHex: rendezvousHex.length > 0 ? rendezvousHex : undefined,
        localDirection,
      }),
    );
    host.send({
      type: "set-freenet-config",
      enabled,
      interfaceEnabled,
      url: url.length > 0 ? url : null,
      ...(authToken.length > 0 ? { authToken } : {}),
      ...(rendezvousHex.length > 0 ? { rendezvousHex } : {}),
      localDirection,
    });
  };

  try {
    const savedFreenet = JSON.parse(
      localStorage.getItem("tp-freenet-config") ?? "{}",
    );
    if (settingFreenet && typeof savedFreenet.enabled === "boolean") {
      settingFreenet.checked = savedFreenet.enabled;
    }
    if (
      settingFreenetInterface &&
      typeof savedFreenet.interfaceEnabled === "boolean"
    ) {
      settingFreenetInterface.checked = savedFreenet.interfaceEnabled;
    }
    if (settingFreenetUrl && typeof savedFreenet.url === "string") {
      settingFreenetUrl.value = savedFreenet.url;
    }
    if (
      settingFreenetRendezvous &&
      typeof savedFreenet.rendezvousHex === "string"
    ) {
      settingFreenetRendezvous.value = savedFreenet.rendezvousHex;
    }
    if (settingFreenetDirection) {
      settingFreenetDirection.value =
        savedFreenet.localDirection === 1 ? "1" : "0";
    }
  } catch {
    // ignore malformed saved settings
  }

  for (const element of [
    settingFreenet,
    settingFreenetUrl,
    settingFreenetToken,
    settingFreenetInterface,
    settingFreenetRendezvous,
    settingFreenetDirection,
  ]) {
    element?.addEventListener("change", applyFreenetSettings);
  }

  // Restore Freenet backend after worklet restart if Settings were previously on.
  if (
    settingFreenet?.checked === true ||
    settingFreenetInterface?.checked === true
  ) {
    applyFreenetSettings();
  }

  host.onWorkletMessage((message) => {
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
      const hasDisplay = typeof globalThis.qrcode === "function";
      const hasCamera =
        typeof navigator.mediaDevices?.getUserMedia === "function";
      const hasDecoder =
        typeof globalThis.BarcodeDetector === "function" ||
        typeof globalThis.jsQR === "function";
      const availability = !hasDisplay
        ? {
            state: "unsupported",
            reason: "QR generation is unavailable in this build",
          }
        : !hasCamera
          ? {
              state: "unsupported",
              reason:
                "Camera capture is unavailable; use full manual copy/paste",
            }
          : !hasDecoder
            ? {
                state: "unsupported",
                reason:
                  "QR decoding is unavailable; use full manual copy/paste",
              }
            : {
                state: "permission-required",
                reason:
                  "Camera permission is requested only after Start camera",
              };
      sendPeerChromeResponse(message.token, { availability });
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
      if (settingDeveloper) {
        settingDeveloper.checked = Boolean(message.status.developerMode);
      }
      if (settingPropagation) {
        settingPropagation.checked = Boolean(message.status.propagationEnabled);
      }
    }

    if (message.type === "relay-attribution" && relayAttributionBanner) {
      const target = message.kind ? ` for ${message.kind}` : "";
      relayAttributionBanner.textContent = `Mini-app ${message.appId} changed relay settings${target}. Click to dismiss.`;
      relayAttributionBanner.hidden = false;
      relayAttributionBanner.onclick = () => {
        relayAttributionBanner.hidden = true;
      };
    }

    if (message.type === "log") {
      appendLog(message.line);
    }

    if (message.type === "catalog") {
      catalogEntries = message.entries;
      renderCatalog();
    }

    if (message.type === "installed") {
      installedPackages = message.packages;
      renderInstalled();
      if (!requestedAppLaunchStarted && requestedAppId !== null) {
        const requestedPackage = installedPackages.find(
          (pkg) => pkg.appId === requestedAppId,
        );
        if (requestedPackage !== undefined) {
          scheduleRequestedAppLaunch(requestedPackage);
        }
      }
    }

    if (message.type === "install-progress") {
      appendLog(`Install ${message.progress.appId}: ${message.progress.phase}`);
      if (message.progress.phase === "complete") {
        host.send({ type: "list-installed" });
      }
    }

    if (message.type === "grants") {
      selectedAppId = message.appId;
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
        runningAppId = message.runtime.appId;
        if (runningAppId === requestedAppId) {
          requestedAppLaunchTimer = null;
        }
        document.body.classList.toggle(
          "miniapp-running",
          runningAppId !== null,
        );
        if (miniappTitle) {
          miniappTitle.textContent = runningAppId ?? "Mini-app";
        }
        if (runningAppId !== null) {
          host.send({ type: "get-limits", appId: runningAppId });
        }
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
        rows: [["Capabilities requested", message.capabilities.length]],
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
      if (message.ok) {
        host.send({ type: "list-installed" });
      }
    }

    if (message.type === "workspace-file") {
      const waiter = pendingWorkspaceReads.get(message.token);
      pendingWorkspaceReads.delete(message.token);
      if (waiter) {
        if (message.error) {
          waiter.reject(new Error(message.error));
        } else {
          waiter.resolve(message.content);
        }
      }
    }

    if (message.type === "confirm-request") {
      const kindTitles = {
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
      };
      showHostModal({
        title: kindTitles[message.kind] ?? `Confirm ${message.kind}?`,
        fingerprint: message.publisherPublicKey,
        rows: [
          ["Requested by", message.appId],
          ...Object.entries(message.summary ?? {}),
        ],
        confirmLabel: "Approve",
        onDone: (approved) => {
          host.send({
            type: "confirm-response",
            token: message.token,
            approved,
          });
        },
      });
    }

    if (message.type === "launch-review") {
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
        rows: [["Capabilities requested", message.capabilities.length]],
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

    if (message.type === "limits") {
      renderLimits(message.limits);
    }

    if (message.type === "trust") {
      renderTrustList(message.entries);
    }

    if (message.type === "trust-identity") {
      renderOwnIdentity(message.identity256t);
    }

    if (message.type === "identity-locked") {
      if (identityResult)
        identityResult.textContent = message.creating
          ? "Create a passphrase of at least 12 characters to start."
          : message.legacy
            ? "Set a passphrase to encrypt and migrate this legacy identity."
            : "Identity locked.";
    }

    if (message.type === "identity-operation") {
      if (identityResult)
        identityResult.textContent = message.ok
          ? `${message.operation} complete${message.identityHash ? ` (${message.identityHash.slice(0, 12)})` : ""}`
          : (message.error ?? `${message.operation} failed`);
      if (message.ok && message.backupHex)
        void host.saveIdentityBackup(message.backupHex);
      if (message.ok && message.first && message.second) {
        void host.setIdentityContentProtection(true);
        identityWordsFirst.value = message.first;
        identityWordsSecond.value = message.second;
      }
      if (message.ok && message.operation === "recovery-import") {
        void host.setIdentityContentProtection(false);
      }
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
        pendingIdentityImport = null;
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
        pendingIdentityRecovery = null;
      }
    }
    if (message.type === "moderation-state") renderModerationState(message);
    if (message.type === "moderation-report-export")
      void host.saveModerationReport(message.json);
    if (message.type === "device-state") renderDeviceState(message);
    if (message.type === "session-invites")
      renderSessionInvites(message.invites);
    if (message.type === "device-bridge-request") {
      void handleDeviceBridgeRequest(message, (reply) => host.send(reply));
    }
    if (message.type === "media-codec-request") {
      void handleMediaCodecRequest(message, (reply) => host.send(reply));
    }
    if (message.type === "media-opus-play-request") {
      void handleMediaOpusPlayRequest(message, (reply) => host.send(reply));
    }
    if (
      message.type === "peer-webrtc-signal" ||
      message.type === "peer-webrtc-establish" ||
      message.type === "peer-webrtc-data-send" ||
      message.type === "peer-webrtc-media-attach" ||
      message.type === "peer-webrtc-media-stats" ||
      message.type === "peer-webrtc-media-detach" ||
      message.type === "peer-webrtc-close"
    ) {
      appendLog(`WebRTC host message ${message.type}`);
      void handlePeerWebRtcMessage(message, (reply) => {
        appendLog(`WebRTC host reply ${message.type}`);
        host.send(reply);
      });
    }
    if (message.type === "inbound-media-frame") {
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
    if (trustIdentityInput) {
      trustIdentityInput.value = "";
    }
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
        pendingIdentityImport = {
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
      pendingIdentityRecovery = {
        first: identityWordsFirst.value.trim(),
        second: identityWordsSecond.value.trim(),
        vaultPassphrase: identityNext.value,
        vaultPassphraseConfirmation: identityConfirm.value,
      };
      host.send({
        type: "identity-recovery-import-inspect",
        first: pendingIdentityRecovery.first,
        second: pendingIdentityRecovery.second,
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
    if (limitRate?.value) {
      limits.maxMessagesPerSecond = Number(limitRate.value);
    }
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
    if (requestedAppId !== null && runningAppId !== requestedAppId) {
      resetRequestedAppLaunch();
    }
    appendLog(
      `Worklet exited (code=${detail.code}, signal=${detail.signal ?? "none"})`,
    );
  });

  void host.getStatus().then(renderStatus);
  host.send({ type: "list-catalog" });
  host.send({ type: "list-installed" });
}

renderCatalog();
renderInstalled();
renderGrants(null, []);
