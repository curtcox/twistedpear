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
import {
  showPeerConfirmationImpl,
  showPeerCodeExchangeImpl,
  showQrScannerImpl,
  showHostModalImpl,
} from "./app-extracted-3.mjs";
import { bindSettingsPanel } from "./app-settings.mjs";
import { handleWorkletMessage } from "./app-worklet-messages.mjs";
import { bindHostChromeControls } from "./app-ui-bindings.mjs";

const statusGrid = document.querySelector("#status-grid");
const catalogList = document.querySelector("#catalog-list");
const installedList = document.querySelector("#installed-list");
const grantsPanel = document.querySelector("#grants-panel");
const logEl = document.querySelector("#log");
const widgetRoot = document.querySelector("#widget-root");
const miniappTitle = document.querySelector("#miniapp-title");
const miniappTrust = document.querySelector("#miniapp-trust");
const returnMiniapp = document.querySelector("#return-miniapp");
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
const lifecycleChip = document.querySelector("#lifecycle-chip");
const appError = document.querySelector("#app-error");
const appDiagnostics = document.querySelector("#app-diagnostics");
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
  get audioHex() {
    return audioHex;
  },
  get audioUnhex() {
    return audioUnhex;
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
  get playPeerAudio() {
    return playPeerAudio;
  },
  get recordPeerAudio() {
    return recordPeerAudio;
  },
  get renderPeerQr() {
    return renderPeerQr;
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

function renderModerationState(...args) {
  return renderModerationStateImpl(extractedContext, ...args);
}
function renderSessionInvites(...args) {
  return renderSessionInvitesImpl(extractedContext, ...args);
}
function renderDeviceState(...args) {
  return renderDeviceStateImpl(extractedContext, ...args);
}
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
const shellScope = {
  ...extractedContext,
  host,
  appendLog,
  renderStatus,
  applyInterfaceSettings,
  settingDeveloper,
  settingPropagation,
  settingTcp,
  settingAuto,
  settingRnodePort,
  settingRelayMode,
  settingTcpDirection,
  settingAutoDirection,
  settingRnodeDirection,
  settingAiUrl,
  settingAiKey,
  settingAiModel,
  settingAiEmbeddingModel,
  settingFreenet,
  settingFreenetUrl,
  settingFreenetToken,
  settingFreenetInterface,
  settingFreenetRendezvous,
  settingFreenetDirection,
  joinCommunityNetwork,
  relayAttributionBanner,
  previewRoot,
  widgetRoot,
  miniappTitle,
  readWorkspaceDocument,
  showHostModal,
  showPeerConfirmation,
  showPeerCodeExchange,
  sendPeerChromeResponse,
  closeHostModal,
  activePeerChromeToken,
  renderCatalog,
  renderInstalled,
  renderGrants,
  renderLimits,
  lifecycleChip,
  appError,
  appDiagnostics,
  renderTrustList,
  renderOwnIdentity,
  renderModerationState,
  renderDeviceState,
  renderSessionInvites,
  scheduleRequestedAppLaunch,
  resetRequestedAppLaunch,
  showQrScanner,
  requestedAppId,
  requestedAppLaunchStarted,
  requestedAppLaunchTimer,
  runningAppId,
  selectedAppId,
  pendingWorkspaceReads,
  pendingIdentityImport,
  pendingIdentityRecovery,
  identityResult,
  identityWordsFirst,
  identityWordsSecond,
  identityCurrent,
  identityNext,
  identityConfirm,
  trustIdentityInput,
  trustLabelInput,
  trustAdd,
  trustShow,
  trustScan,
  moderationSource,
  moderationLabel,
  moderationReason,
  moderationNote,
  deviceRemoteEnabled,
  limitsApply,
  limitRate,
  limitKv,
  limitMemory,
  forceQuit,
  miniappTrust,
  returnMiniapp,
  miniappHostView: false,
  closeMiniapp,
  stopPreview,
  install256tInput,
  install256t,
  install256tScan,
  catalogEntries,
  installedPackages,
};

// Object spread snapshots accessors as plain values. Restore the live state
// descriptors so inbound worklet messages update the renderer state that the
// extracted render helpers read, rather than a disconnected copy.
for (const [name, descriptor] of Object.entries(
  Object.getOwnPropertyDescriptors(extractedContext),
)) {
  if (descriptor.get || descriptor.set)
    Object.defineProperty(shellScope, name, descriptor);
}

if (!host) {
  appendLog("Preload bridge unavailable");
} else {
  bindSettingsPanel(shellScope);
  host.onWorkletMessage((message) => handleWorkletMessage(shellScope, message));
  bindHostChromeControls(shellScope);
}

renderCatalog();
renderInstalled();
renderGrants(null, []);
