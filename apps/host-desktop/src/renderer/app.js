import { renderWidgetTree } from "./widgets.js";
import { decodeQrVideoFrame, normalizeScannedT256, supportsQrDetection } from "./qr-scanner.js";
import { handleDeviceBridgeRequest } from "./device-bridge.js";
import { handleMediaCodecRequest, playInboundMediaFrame } from "./media-codec-bridge.js";

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
const settingAiEmbeddingModel = document.querySelector("#setting-ai-embedding-model");
const settingPropagation = document.querySelector("#setting-propagation");
const settingTcp = document.querySelector("#setting-tcp");
const settingAuto = document.querySelector("#setting-auto");
const settingRnodePort = document.querySelector("#setting-rnode-port");
const settingFreenet = document.querySelector("#setting-freenet");
const settingFreenetUrl = document.querySelector("#setting-freenet-url");
const settingFreenetToken = document.querySelector("#setting-freenet-token");
const settingFreenetInterface = document.querySelector("#setting-freenet-interface");
const settingFreenetRendezvous = document.querySelector("#setting-freenet-rendezvous");
const settingFreenetDirection = document.querySelector("#setting-freenet-direction");
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
const deviceInventory = document.querySelector("#device-inventory");
const deviceSessions = document.querySelector("#device-sessions");
const deviceRemoteEnabled = document.querySelector("#device-remote-enabled");

function renderModerationState(message) {
  const renderEntries = (root, entries) => {
    root?.replaceChildren(...entries.map((entry) => {
      const item = document.createElement("li");
      item.textContent = `${entry.label ? `${entry.label} — ` : ""}${entry.sourceHash}`;
      return item;
    }));
  };
  renderEntries(moderationBlocked, message.blocked);
  renderEntries(moderationMuted, message.muted);
  if (moderationSummary) moderationSummary.textContent = `${message.blocked.length} blocked · ${message.muted.length} muted · ${message.reports.length} local reports`;
}

function renderDeviceState(message) {
  lastDeviceState = message;
  const disabled = new Set(message.disabledClasses ?? []);
  if (deviceRemoteEnabled) {
    deviceRemoteEnabled.checked = message.remoteAcquisitionEnabled === true;
  }

  if (deviceActiveBanner) {
    const indicators = message.indicators ?? [];
    const shareOffers = message.shareOffers ?? [];
    if (indicators.length === 0 && shareOffers.length === 0) {
      deviceActiveBanner.hidden = true;
      deviceActiveBanner.replaceChildren();
    } else {
      deviceActiveBanner.hidden = false;
      const title = document.createElement("strong");
      title.textContent = "Active device use";
      const list = document.createElement("div");
      list.className = "settings-grid";
      for (const indicator of indicators) {
        const row = document.createElement("div");
        row.className = "item-row";
        const text = document.createElement("span");
        text.textContent = `${indicator.appId} · ${indicator.class}:${indicator.tier} · ${indicator.destination} — ${indicator.purpose}`;
        const kill = document.createElement("button");
        kill.type = "button";
        kill.className = "danger";
        kill.textContent = "Stop";
        kill.addEventListener("click", () => {
          host.send({ type: "device-kill-session", handle: indicator.handle });
        });
        row.append(text, kill);
        list.append(row);
      }
      for (const offer of shareOffers) {
        const row = document.createElement("div"); row.className = "item-row";
        const text = document.createElement("span"); text.textContent = `${offer.appId} · sharing ${offer.classId}:${offer.tierId} with ${offer.displayLabel} until ${new Date(offer.expiresAt).toLocaleTimeString()}`;
        const kill = document.createElement("button"); kill.type = "button"; kill.className = "danger"; kill.textContent = "Stop sharing";
        kill.addEventListener("click", () => host.send({ type: "device-revoke-share", appId: offer.appId, id: offer.id }));
        row.append(text, kill); list.append(row);
      }
      deviceActiveBanner.replaceChildren(title, list);
    }
  }

  if (deviceSessions) {
    const sessions = message.sessions ?? [];
    if (sessions.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No live device sessions.";
      deviceSessions.replaceChildren(empty);
    } else {
      deviceSessions.replaceChildren(
        ...sessions.map((session) => {
          const row = document.createElement("div");
          row.className = "device-row";
          const name = document.createElement("div");
          name.textContent = `${session.classId}:${session.tierId}`;
          const meta = document.createElement("div");
          meta.className = "device-meta";
          meta.textContent = `${session.appId} · ${session.destination}`;
          const kill = document.createElement("button");
          kill.type = "button";
          kill.className = "danger";
          kill.textContent = "Kill";
          kill.addEventListener("click", () => {
            host.send({ type: "device-kill-session", handle: session.handle });
          });
          row.append(name, meta, kill);
          return row;
        })
      );
    }
  }

  if (deviceInventory) {
    const inventory = message.inventory ?? [];
    deviceInventory.replaceChildren(
      ...inventory.map((entry) => {
        const row = document.createElement("div");
        row.className = "device-row";
        const name = document.createElement("div");
        name.textContent = entry.class;
        const availability = document.createElement("div");
        availability.className = `device-meta device-availability-${entry.availability}`;
        availability.textContent = entry.availability;
        const toggle = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = !disabled.has(entry.class);
        checkbox.addEventListener("change", () => {
          host.send({
            type: "device-set-class-disabled",
            classId: entry.class,
            disabled: !checkbox.checked
          });
        });
        toggle.append(checkbox, document.createTextNode(" Allowed"));
        row.append(name, availability, toggle);
        return row;
      })
    );
  }
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

function resetRequestedAppLaunch() {
  if (requestedAppLaunchTimer !== null) {
    clearTimeout(requestedAppLaunchTimer);
    requestedAppLaunchTimer = null;
  }
  requestedAppLaunchStarted = false;
}

function scheduleRequestedAppLaunch(pkg) {
  requestedAppLaunchStarted = true;
  requestedAppLaunchTimer = setTimeout(() => {
    requestedAppLaunchTimer = null;
    selectedAppId = pkg.appId;
    host.send({ type: "launch-miniapp", appId: pkg.appId });
    if (pkg.publisherPublicKey && pkg.capabilities) {
      host.send({
        type: "get-grants",
        appId: pkg.appId,
        publisherPublicKey: pkg.publisherPublicKey,
        declaredCapabilities: pkg.capabilities
      });
    }
  }, 250);
}

function readWorkspaceDocument(documentId) {
  return new Promise((resolve, reject) => {
    const token = `ws-${workspaceReadCounter++}`;
    const timer = setTimeout(() => {
      pendingWorkspaceReads.delete(token);
      reject(new Error("Workspace read timed out"));
    }, 10_000);
    pendingWorkspaceReads.set(token, {
      resolve: (content) => {
        clearTimeout(timer);
        resolve(content);
      },
      reject: (error) => {
        clearTimeout(timer);
        reject(error);
      }
    });
    host?.send({ type: "workspace-read", token, documentId });
  });
}

function closeHostModal() {
  if (activePeerQrTimer !== null) {
    clearInterval(activePeerQrTimer);
    activePeerQrTimer = null;
  }
  activePeerCameraStream?.getTracks().forEach((track) => track.stop());
  activePeerCameraStream = null;
  activePeerChromeToken = null;
  if (modalOverlay) {
    modalOverlay.hidden = true;
  }
  modalEl?.replaceChildren();
}

function renderPeerQr(root, value) {
  root.replaceChildren();
  const qrFactory = globalThis.qrcode;
  if (typeof qrFactory === "function") {
    try {
      const qr = qrFactory(0, "M");
      qr.addData(value);
      qr.make();
      const holder = document.createElement("div");
      holder.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 8, scalable: true });
      const svg = holder.firstElementChild;
      if (svg !== null) {
        svg.setAttribute("width", "240");
        svg.setAttribute("height", "240");
        svg.classList.add("widget-qr-svg");
        root.appendChild(svg);
      }
    } catch {
      // The copyable text remains available below.
    }
  }
  const text = document.createElement("p");
  text.className = "widget-qr-value";
  text.textContent = value;
  root.appendChild(text);
}

function sendPeerChromeResponse(token, response) {
  host?.send({ type: "peer-chrome-response", token, ...response });
}

function audioUnhex(text) { return Uint8Array.from(text.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16)); }
function audioHex(bytes) { return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
async function playPeerAudio(framesHex) {
  const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  const modem = globalThis.TwistedPearPeerAudio;
  if (AudioContextClass === undefined || modem?.encodePeerAudioFsk === undefined) throw new Error("Web Audio playback is unavailable");
  const context = new AudioContextClass(); await context.resume(); let at = context.currentTime + 0.1;
  for (const frameHex of framesHex) { const pcm = modem.encodePeerAudioFsk(audioUnhex(frameHex), { sampleRate: context.sampleRate }); const buffer = context.createBuffer(1, pcm.length, context.sampleRate); buffer.copyToChannel(pcm, 0); const source = context.createBufferSource(); source.buffer = buffer; source.connect(context.destination); source.start(at); at += pcm.length / context.sampleRate + 0.2; }
  await new Promise((resolve) => setTimeout(resolve, Math.ceil(Math.max(0, at - context.currentTime) * 1_000))); await context.close();
}
async function recordPeerAudio(durationMs = 15_000) {
  const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  const modem = globalThis.TwistedPearPeerAudio;
  if (AudioContextClass === undefined || modem?.decodePeerAudioFskStream === undefined || navigator.mediaDevices?.getUserMedia === undefined) throw new Error("Microphone recording is unavailable");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
  const context = new AudioContextClass(); await context.resume(); const chunks = []; const source = context.createMediaStreamSource(stream); const processor = context.createScriptProcessor(4_096, 1, 1); const mute = context.createGain(); mute.gain.value = 0;
  processor.onaudioprocess = (event) => chunks.push(new Float32Array(event.inputBuffer.getChannelData(0))); source.connect(processor); processor.connect(mute); mute.connect(context.destination);
  await new Promise((resolve) => setTimeout(resolve, durationMs)); stream.getTracks().forEach((track) => track.stop()); source.disconnect(); processor.disconnect(); mute.disconnect();
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0); const pcm = new Float32Array(total); let offset = 0; for (const chunk of chunks) { pcm.set(chunk, offset); offset += chunk.length; }
  const frames = modem.decodePeerAudioFskStream(pcm, { sampleRate: context.sampleRate }); await context.close(); if (frames.length === 0) throw new Error("No valid peer audio frames were detected"); return frames.map(audioHex);
}
async function performPeerAudio(message) {
  try {
    if (message.type === "peer-audio-transmit") { await playPeerAudio(message.framesHex); const framesHex = message.expectsResponse ? await recordPeerAudio() : []; sendPeerChromeResponse(message.token, { accepted: true, framesHex }); }
    else sendPeerChromeResponse(message.token, { accepted: true, framesHex: await recordPeerAudio(), sessionId: message.sessionId });
  } catch (error) { sendPeerChromeResponse(message.token, { accepted: false, error: error instanceof Error ? error.message : String(error) }); }
}

function showPeerConfirmation(message) {
  const words = Array.isArray(message.peer?.matchingWords) ? message.peer.matchingWords.join(" · ") : "—";
  activePeerChromeToken = message.token;
  showHostModal({
    title: "Confirm peer connection",
    fingerprint: null,
    rows: [
      ["Requested by", message.appId], ["Purpose", message.purpose], ["Service", message.service],
      ["Peer label (untrusted claim)", message.peer?.displayLabel ?? "Unknown"],
      ["Identity fingerprint", message.peer?.fingerprint ?? "Unknown"], ["Matching words", words],
      ["Data path", message.peer?.dataPlane ?? "Unknown"]
    ],
    confirmLabel: "Connect",
    onDone: (approved) => sendPeerChromeResponse(message.token, { approved })
  });
}

function showPeerCodeExchange(message) {
  if (!modalOverlay || !modalEl) {
    sendPeerChromeResponse(message.token, { accepted: false });
    return;
  }
  activePeerChromeToken = message.token;
  modalEl.replaceChildren();
  const heading = document.createElement("h3");
  heading.textContent = message.type === "peer-manual-enter"
    ? "Enter a peer invitation"
    : message.type === "peer-qr-scan"
      ? "Scan a peer invitation"
      : message.type === "peer-qr-present"
        ? "Show peer QR"
        : message.type === "peer-audio-transmit"
          ? "Play an audible peer invitation"
          : message.type === "peer-audio-receive"
            ? "Listen for an audible peer invitation"
        : message.type === "peer-ntfy-enter"
          ? "Enter a private ntfy lookup code"
          : message.type === "peer-ntfy-present"
            ? "Share a private ntfy lookup code"
            : "Share peer invitation";
  const disclosure = document.createElement("p");
  disclosure.className = "muted";
  const isNtfy = message.type === "peer-ntfy-enter" || message.type === "peer-ntfy-present";
  const isAudio = message.type === "peer-audio-transmit" || message.type === "peer-audio-receive";
  disclosure.textContent = isAudio
    ? "This trusted host action emits audible FSK tones or requests microphone access after you continue. PCM never crosses into the mini-app."
    : isNtfy
    ? `This trusted host action uses ${message.server ?? "the configured ntfy server"}. The server can observe a random topic, timing, and IP metadata, but invitation contents are end-to-end encrypted. Verify matching words before connecting.`
    : "This is trusted host chrome. Verify matching words before connecting. Full manual and QR codes do not use a rendezvous server.";
  modalEl.append(heading, disclosure);

  const codes = Array.isArray(message.codes) ? message.codes : typeof message.code === "string" ? [message.code] : [];
  if (codes.length > 0) {
    const display = document.createElement("div");
    if (message.type === "peer-qr-present") {
      let frame = 0;
      renderPeerQr(display, codes[0]);
      if (codes.length > 1) activePeerQrTimer = setInterval(() => { frame = (frame + 1) % codes.length; renderPeerQr(display, codes[frame]); }, 750);
    } else {
      const code = document.createElement("textarea"); code.className = "setting-input"; code.rows = 6; code.readOnly = true; code.value = codes[0]; display.appendChild(code);
    }
    modalEl.appendChild(display);
  }

  const needsInput = message.expectsResponse === true || message.type === "peer-manual-enter" || message.type === "peer-qr-scan" || message.type === "peer-ntfy-enter";
  const input = document.createElement("textarea");
  if (needsInput) {
    input.className = "setting-input";
    input.rows = 5;
    input.placeholder = message.type === "peer-qr-scan"
      ? "Scan or paste the peer QR payload"
      : message.type === "peer-ntfy-enter"
        ? "Paste the TPN1 lookup code"
        : "Paste the peer's full response code";
    modalEl.appendChild(input);
  }

  const cameraStatus = document.createElement("p"); cameraStatus.className = "muted";
  if (message.type === "peer-qr-scan" || (message.type === "peer-qr-present" && message.expectsResponse === true)) {
    const startCamera = document.createElement("button"); startCamera.textContent = "Start camera";
    startCamera.addEventListener("click", async () => {
      if (!(await supportsQrDetection())) { cameraStatus.textContent = "Camera QR decoding is unsupported in this build; paste the payload instead."; return; }
      try {
        activePeerCameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        const video = document.createElement("video"); video.className = "qr-scanner-video"; video.autoplay = true; video.muted = true; video.playsInline = true; video.srcObject = activePeerCameraStream; modalEl.insertBefore(video, cameraStatus); await video.play();
        const detect = async () => { if (activePeerChromeToken !== message.token || activePeerCameraStream === null) return; const raw = await decodeQrVideoFrame(video); if (raw !== null) { input.value = raw; activePeerCameraStream.getTracks().forEach((track) => track.stop()); activePeerCameraStream = null; cameraStatus.textContent = "QR payload captured."; return; } requestAnimationFrame(() => { void detect(); }); };
        cameraStatus.textContent = "Camera active. Hold the peer QR inside the frame."; void detect();
      } catch (error) { cameraStatus.textContent = `Camera unavailable: ${error instanceof Error ? error.message : String(error)}`; }
    });
    modalEl.append(startCamera, cameraStatus);
  }

  const actions = document.createElement("div"); actions.className = "modal-actions";
  const cancel = document.createElement("button"); cancel.textContent = "Cancel"; cancel.addEventListener("click", () => { closeHostModal(); sendPeerChromeResponse(message.token, { accepted: false }); });
  const approve = document.createElement("button"); approve.className = "primary"; approve.textContent = needsInput ? "Continue" : "Done";
  approve.addEventListener("click", () => { const code = needsInput ? input.value.trim() : undefined; if (needsInput && !code) return; closeHostModal(); if (isAudio) void performPeerAudio(message); else sendPeerChromeResponse(message.token, { accepted: true, ...(code ? { code } : {}) }); });
  actions.append(cancel, approve); modalEl.appendChild(actions); modalOverlay.hidden = false;
}

async function showQrScanner(target, purpose) {
  if (!modalOverlay || !modalEl || !target) return;
  if (!(await supportsQrDetection())) {
    appendLog("QR scanning is unavailable in this Electron/Chromium build; paste the 256t string instead.");
    return;
  }

  modalEl.replaceChildren();
  const title = document.createElement("h3");
  title.textContent = `Scan ${purpose} QR`;
  const video = document.createElement("video");
  video.className = "qr-scanner-video";
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  const status = document.createElement("p");
  status.className = "muted";
  status.textContent = "Requesting camera access…";
  const cancel = document.createElement("button");
  cancel.textContent = "Cancel";
  modalEl.append(title, video, status, cancel);
  modalOverlay.hidden = false;

  let active = true;
  let stream = null;
  const stop = () => {
    active = false;
    stream?.getTracks().forEach((track) => track.stop());
    closeHostModal();
  };
  cancel.addEventListener("click", stop, { once: true });
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
    if (!active) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    video.srcObject = stream;
    await video.play();
    status.textContent = "Hold a TwistedPear 256t QR code inside the camera view.";
    const detect = async () => {
      if (!active) return;
      try {
        const rawValue = await decodeQrVideoFrame(video);
        if (rawValue !== null) {
          target.value = normalizeScannedT256(rawValue);
          stop();
          target.dispatchEvent(new Event("input", { bubbles: true }));
          return;
        }
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : String(error);
      }
      requestAnimationFrame(() => { void detect(); });
    };
    void detect();
  } catch (error) {
    status.textContent = `Camera unavailable: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * Host-chrome modal. Lives outside #widget-root so a mini-app widget tree can
 * never draw or dismiss it; identity fields come from the worklet message.
 */
function showHostModal({ title, fingerprint, rows = [], capabilities = null, confirmLabel, onDone }) {
  if (!modalOverlay || !modalEl) {
    onDone(false, null);
    return;
  }

  modalEl.replaceChildren();
  const heading = document.createElement("h3");
  heading.textContent = title;
  modalEl.appendChild(heading);

  if (fingerprint) {
    const fp = document.createElement("p");
    fp.className = "fingerprint";
    fp.textContent = `Publisher key: ${fingerprint}`;
    modalEl.appendChild(fp);
  }

  for (const [label, value] of rows) {
    const row = document.createElement("p");
    row.innerHTML = `<span class="muted">${label}:</span> `;
    row.appendChild(document.createTextNode(String(value)));
    modalEl.appendChild(row);
  }

  /** @type {HTMLInputElement[]} */
  const capabilityInputs = [];
  if (capabilities !== null) {
    for (const capability of capabilities) {
      const label = document.createElement("label");
      label.className = "grant-row";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = capability.granted;
      input.dataset.capabilityId = capability.id;
      capabilityInputs.push(input);
      const text = document.createElement("span");
      text.textContent = `${capability.id} — ${capability.description || ""}`;
      label.append(input, text);
      modalEl.appendChild(label);
    }
  }

  const actions = document.createElement("div");
  actions.className = "modal-actions";
  const cancel = document.createElement("button");
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => {
    closeHostModal();
    onDone(false, null);
  });
  const approve = document.createElement("button");
  approve.className = "primary";
  approve.textContent = confirmLabel;
  const refreshApproveState = () => {
    approve.disabled =
      capabilities !== null &&
      capabilityInputs.length > 0 &&
      capabilityInputs.every((input) => !input.checked);
  };
  for (const input of capabilityInputs) {
    input.addEventListener("change", refreshApproveState);
  }
  approve.addEventListener("click", () => {
    const grants = capabilityInputs
      .filter((input) => input.checked)
      .map((input) => input.dataset.capabilityId)
      .filter((id) => typeof id === "string");
    closeHostModal();
    onDone(true, capabilities === null ? null : grants);
  });
  actions.append(cancel, approve);
  modalEl.appendChild(actions);
  refreshApproveState();
  modalOverlay.hidden = false;
}

function renderTrustList(entries) {
  if (!trustList) {
    return;
  }

  trustList.replaceChildren(
    ...entries.map((entry) => {
      const item = document.createElement("li");
      item.className = "item-row";
      const label = document.createElement("strong");
      label.textContent = entry.label;
      const key = document.createElement("span");
      key.className = "muted";
      key.textContent = `${entry.publisherPublicKey.slice(0, 16)}…`;
      const remove = document.createElement("button");
      remove.textContent = "Remove";
      remove.addEventListener("click", () => {
        host?.send({ type: "trust-remove", publisherPublicKey: entry.publisherPublicKey });
      });
      item.append(label, key, remove);
      return item;
    })
  );

  if (entries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "muted";
    empty.textContent = "No trusted publishers yet";
    trustList.replaceChildren(empty);
  }
}

function renderOwnIdentity(identity256t) {
  if (!trustIdentityView) {
    return;
  }

  trustIdentityView.replaceChildren();
  if (!identity256t) {
    trustIdentityView.textContent = "No host identity yet — start the node first.";
    return;
  }

  const qrFactory = globalThis.qrcode;
  if (typeof qrFactory === "function") {
    try {
      const qr = qrFactory(0, "M");
      qr.addData(identity256t);
      qr.make();
      const svgHost = document.createElement("div");
      svgHost.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 8, scalable: true });
      const svg = svgHost.firstElementChild;
      if (svg !== null) {
        svg.setAttribute("width", "192");
        svg.setAttribute("height", "192");
        svg.classList.add("widget-qr-svg");
        trustIdentityView.appendChild(svg);
      }
    } catch {
      // string fallback below
    }
  }

  const text = document.createElement("p");
  text.className = "widget-qr-value";
  text.textContent = identity256t;
  trustIdentityView.appendChild(text);
}

function renderLimits(limits) {
  if (limitsApp) {
    limitsApp.textContent = `Limits for ${limits.appId}`;
  }
  if (limitRate) {
    limitRate.value = String(limits.maxMessagesPerSecond);
  }
  if (limitKv) {
    limitKv.value = limits.kvQuotaBytes === null ? "" : String(limits.kvQuotaBytes);
  }
  if (limitMemory) {
    limitMemory.value = limits.memoryBytes === null ? "" : String(limits.memoryBytes);
  }
  if (limitsNote) {
    limitsNote.textContent = limits.memoryPendingRestart
      ? "Memory limit change takes effect at next launch."
      : "";
  }
}

function appendLog(line) {
  logEl.textContent = `${logEl.textContent}${line}\n`.slice(-8000);
  logEl.scrollTop = logEl.scrollHeight;
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function renderStatus(status) {
  if (!statusGrid || !status) {
    return;
  }

  const rows = [
    ["Running", String(status.running)],
    ["Identity", status.identityHash ?? "—"],
    ["Transport", String(status.transportEnabled ?? false)],
    ["TCP", String(status.tcpEnabled)],
    ["Auto", String(status.autoEnabled)],
    ["RNode", String(status.rnodeEnabled)],
    ["Freenet", String(status.freenetEnabled ?? false)],
    ["Freenet configured", String(status.freenetConfigured ?? false)],
    ["Freenet URL", status.freenetUrl ?? "—"],
    ["Freenet HDLC", String(status.freenetInterfaceEnabled ?? false)],
    ["Freenet HDLC online", String(status.freenetInterfaceOnline ?? false)],
    ["Propagation", String(status.propagationEnabled ?? false)],
    ["Link online", String(status.linkOnline)],
    ["Auto peers", String(status.autoPeers)],
    ["Online interfaces", String(status.onlineInterfaces)],
    ["Path table", String(status.pathTableCount ?? 0)],
    ["Active links", String(status.activeLinkCount ?? 0)],
    ["Bandwidth in", formatBytes(status.bandwidthBytesIn ?? 0)],
    ["Bandwidth out", formatBytes(status.bandwidthBytesOut ?? 0)],
    ["Preferred", status.preferredInterface ?? "—"],
    ["Announces", String(status.announcesSeen)],
    ["Propagation store", formatBytes(status.propagationStoreBytes ?? 0)],
    ["Propagation msgs", String(status.propagationMessageCount ?? 0)],
    ["Catalog", String(status.catalogEntries)],
    ["Installed", String(status.installedPackages)],
    ["Storage used", formatBytes(status.storageUsedBytes ?? 0)],
    ["Developer mode", String(status.developerMode ?? false)],
    ["Mini-app running", String(status.miniappRunning ?? false)]
  ];

  statusGrid.replaceChildren(
    ...rows.flatMap(([label, value]) => {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      return [dt, dd];
    })
  );
}

function renderCatalog() {
  if (!catalogList) {
    return;
  }

  catalogList.replaceChildren(
    ...catalogEntries.map((entry) => {
      const item = document.createElement("li");
      item.className = "item-row";
      item.innerHTML = `<strong>${entry.name}</strong> v${entry.version} <span class="muted">${formatBytes(entry.packageSize)}</span>`;

      const install = document.createElement("button");
      install.textContent = "Install";
      install.addEventListener("click", () => {
        host?.send({ type: "install-app", appId: entry.appId });
        appendLog(`Installing ${entry.name}…`);
      });
      item.appendChild(install);
      return item;
    })
  );

  if (catalogEntries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "muted";
    empty.textContent = "No catalog entries yet";
    catalogList.replaceChildren(empty);
  }
}

function renderInstalled() {
  if (!installedList) {
    return;
  }

  installedList.replaceChildren(
    ...installedPackages.map((pkg) => {
      const item = document.createElement("li");
      item.className = "item-row";
      item.innerHTML = `<strong>${pkg.appId}</strong> v${pkg.version}`;

      const launch = document.createElement("button");
      launch.textContent = "Launch";
      launch.addEventListener("click", () => {
        selectedAppId = pkg.appId;
        host?.send({ type: "launch-miniapp", appId: pkg.appId });
        if (pkg.publisherPublicKey && pkg.capabilities) {
          host?.send({
            type: "get-grants",
            appId: pkg.appId,
            publisherPublicKey: pkg.publisherPublicKey,
            declaredCapabilities: pkg.capabilities
          });
        }
      });

      const grants = document.createElement("button");
      grants.textContent = "Grants";
      grants.addEventListener("click", () => {
        selectedAppId = pkg.appId;
        if (pkg.publisherPublicKey && pkg.capabilities) {
          host?.send({
            type: "get-grants",
            appId: pkg.appId,
            publisherPublicKey: pkg.publisherPublicKey,
            declaredCapabilities: pkg.capabilities
          });
        }
      });

      item.append(launch, grants);

      if (pkg.rollbackAvailable) {
        const rollback = document.createElement("button");
        rollback.textContent = "Rollback";
        rollback.addEventListener("click", () => {
          host?.send({ type: "rollback-package", appId: pkg.appId });
        });
        item.appendChild(rollback);
      }

      return item;
    })
  );

  if (installedPackages.length === 0) {
    const empty = document.createElement("li");
    empty.className = "muted";
    empty.textContent = "No installed packages";
    installedList.replaceChildren(empty);
  }
}

function renderGrants(appId, capabilities) {
  if (!grantsPanel) {
    return;
  }

  grantsPanel.replaceChildren();
  const heading = document.createElement("p");
  heading.textContent = appId ? `Capabilities for ${appId}` : "Select an installed app";
  grantsPanel.appendChild(heading);

  for (const capability of capabilities) {
    const label = document.createElement("label");
    label.className = "grant-row";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = capability.granted;
    input.disabled = !capability.declared;
    input.addEventListener("change", () => {
      const grantedCapabilities = [...grantsPanel.querySelectorAll(".grant-row input")]
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.dataset.capabilityId)
        .filter((id) => typeof id === "string");
      const pkg = installedPackages.find((entry) => entry.appId === appId);
      if (pkg?.publisherPublicKey && pkg.capabilities) {
        host?.send({
          type: "set-grants",
          appId,
          publisherPublicKey: pkg.publisherPublicKey,
          declaredCapabilities: pkg.capabilities,
          grantedCapabilities
        });
      }
    });
    input.dataset.capabilityId = capability.id;

    const text = document.createElement("span");
    text.textContent = capability.description || capability.id;
    label.append(input, text);
    grantsPanel.appendChild(label);
  }
}

function applyInterfaceSettings() {
  const rnodePort = settingRnodePort?.value.trim() ?? "";
  host?.send({
    type: "set-interfaces",
    tcp: settingTcp?.checked ?? false,
    auto: settingAuto?.checked ?? false,
    ble: false,
    rnode: rnodePort.length > 0,
    rnodePortPath: rnodePort.length > 0 ? rnodePort : null
  });
}

const host = window.twistedPearHost;
if (!host) {
  appendLog("Preload bridge unavailable");
} else {
  settingDeveloper?.addEventListener("change", () => {
    host.send({ type: "set-developer-mode", enabled: settingDeveloper.checked });
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

  const applyAiSettings = () => {
    const config = {
      baseUrl: settingAiUrl?.value.trim() ?? "",
      apiKey: settingAiKey?.value.trim() ?? "",
      model: settingAiModel?.value.trim() ?? "",
      embeddingModel: settingAiEmbeddingModel?.value.trim() ?? ""
    };
    localStorage.setItem("tp-ai-config", JSON.stringify({ baseUrl: config.baseUrl, model: config.model, embeddingModel: config.embeddingModel }));
    host.send({ type: "set-ai-config", config: config.baseUrl && config.apiKey ? config : null });
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

  for (const element of [settingAiUrl, settingAiKey, settingAiModel, settingAiEmbeddingModel]) {
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
        localDirection
      })
    );
    host.send({
      type: "set-freenet-config",
      enabled,
      interfaceEnabled,
      url: url.length > 0 ? url : null,
      ...(authToken.length > 0 ? { authToken } : {}),
      ...(rendezvousHex.length > 0 ? { rendezvousHex } : {}),
      localDirection
    });
  };

  try {
    const savedFreenet = JSON.parse(localStorage.getItem("tp-freenet-config") ?? "{}");
    if (settingFreenet && typeof savedFreenet.enabled === "boolean") {
      settingFreenet.checked = savedFreenet.enabled;
    }
    if (settingFreenetInterface && typeof savedFreenet.interfaceEnabled === "boolean") {
      settingFreenetInterface.checked = savedFreenet.interfaceEnabled;
    }
    if (settingFreenetUrl && typeof savedFreenet.url === "string") {
      settingFreenetUrl.value = savedFreenet.url;
    }
    if (settingFreenetRendezvous && typeof savedFreenet.rendezvousHex === "string") {
      settingFreenetRendezvous.value = savedFreenet.rendezvousHex;
    }
    if (settingFreenetDirection) {
      settingFreenetDirection.value = savedFreenet.localDirection === 1 ? "1" : "0";
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
    settingFreenetDirection
  ]) {
    element?.addEventListener("change", applyFreenetSettings);
  }

  // Restore Freenet backend after worklet restart if Settings were previously on.
  if (settingFreenet?.checked === true || settingFreenetInterface?.checked === true) {
    applyFreenetSettings();
  }

  host.onWorkletMessage((message) => {
    if (message.type === "peer-audio-availability") {
      const supported = (globalThis.AudioContext !== undefined || globalThis.webkitAudioContext !== undefined) && typeof navigator.mediaDevices?.getUserMedia === "function" && globalThis.TwistedPearPeerAudio !== undefined;
      sendPeerChromeResponse(message.token, { availability: supported ? { state: "permission-required", reason: "Microphone permission is requested only after starting the audible exchange" } : { state: "unsupported", reason: "Desktop audio recording/playback is unavailable" } });
      return;
    }

    if (message.type === "peer-ntfy-availability") {
      void host.getNtfyStatus().then((status) => {
        const availability = status?.configured === true
          ? { state: "available", reason: `Encrypted rendezvous is configured through ${status.server}` }
          : { state: "offline", reason: "No ntfy rendezvous server is configured" };
        sendPeerChromeResponse(message.token, { availability });
      }).catch((error) => {
        sendPeerChromeResponse(message.token, { availability: { state: "offline", reason: error instanceof Error ? error.message : String(error) } });
      });
      return;
    }

    if (message.type === "peer-ntfy-http") {
      void host.ntfyRequest(message.request).then((http) => {
        sendPeerChromeResponse(message.token, { http });
      }).catch((error) => {
        sendPeerChromeResponse(message.token, { error: error instanceof Error ? error.message : String(error) });
      });
      return;
    }

    if (message.type === "peer-qr-availability") {
      const hasDisplay = typeof globalThis.qrcode === "function";
      const hasCamera = typeof navigator.mediaDevices?.getUserMedia === "function";
      const hasDecoder = typeof globalThis.BarcodeDetector === "function" || typeof globalThis.jsQR === "function";
      const availability = !hasDisplay
        ? { state: "unsupported", reason: "QR generation is unavailable in this build" }
        : !hasCamera
          ? { state: "unsupported", reason: "Camera capture is unavailable; use full manual copy/paste" }
          : !hasDecoder
            ? { state: "unsupported", reason: "QR decoding is unavailable; use full manual copy/paste" }
            : { state: "permission-required", reason: "Camera permission is requested only after Start camera" };
      sendPeerChromeResponse(message.token, { availability });
      return;
    }

    if (message.type === "peer-confirm-request") {
      showPeerConfirmation(message);
      return;
    }

    if (["peer-manual-present", "peer-manual-enter", "peer-qr-present", "peer-qr-scan", "peer-ntfy-present", "peer-ntfy-enter", "peer-audio-transmit", "peer-audio-receive"].includes(message.type)) {
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
        const requestedPackage = installedPackages.find((pkg) => pkg.appId === requestedAppId);
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
          renderWidgetTree(message.runtime?.widgetTree ?? null, previewRoot, (nodeId, event, value) => {
            host.send({ type: "miniapp-ui-event", slot: "preview", nodeId, event, value });
          }, { deviceSessions: lastDeviceState?.sessions ?? [] });
        }
      } else {
        runningAppId = message.runtime.appId;
        if (runningAppId === requestedAppId) {
          requestedAppLaunchTimer = null;
        }
        document.body.classList.toggle("miniapp-running", runningAppId !== null);
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
          { readDocument: readWorkspaceDocument, deviceSessions: lastDeviceState?.sessions ?? [] }
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
          host.send({ type: "install-confirm", token: message.token, accept, grants });
        }
      });
    }

    if (message.type === "install-256t-result") {
      appendLog(
        message.ok
          ? `Installed ${message.appId} v${message.version} (trusted: ${message.trusted})`
          : `256t install failed: ${message.error}`
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
        "link-probe": "Measure this peer link?"
      };
      showHostModal({
        title: kindTitles[message.kind] ?? `Confirm ${message.kind}?`,
        fingerprint: message.publisherPublicKey,
        rows: [["Requested by", message.appId], ...Object.entries(message.summary ?? {})],
        confirmLabel: "Approve",
        onDone: (approved) => {
          host.send({ type: "confirm-response", token: message.token, approved });
        }
      });
    }

    if (message.type === "launch-review") {
      if (requestedAppId !== null && message.appId === requestedAppId) {
        host.send({
          type: "launch-confirm",
          token: message.token,
          accept: true,
          grants: message.capabilities.map((capability) => capability.id)
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
          host.send({ type: "launch-confirm", token: message.token, accept, grants });
        }
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
      if (identityResult) identityResult.textContent = message.creating
        ? "Create a passphrase of at least 12 characters to start."
        : message.legacy ? "Set a passphrase to encrypt and migrate this legacy identity." : "Identity locked.";
    }

    if (message.type === "identity-operation") {
      if (identityResult) identityResult.textContent = message.ok
        ? `${message.operation} complete${message.identityHash ? ` (${message.identityHash.slice(0, 12)})` : ""}`
        : message.error ?? `${message.operation} failed`;
      if (message.ok && message.backupHex) void host.saveIdentityBackup(message.backupHex);
      if (message.ok && message.first && message.second) {
        void host.setIdentityContentProtection(true);
        identityWordsFirst.value = message.first;
        identityWordsSecond.value = message.second;
      }
      if (message.ok && message.operation === "recovery-import") {
        void host.setIdentityContentProtection(false);
      }
      if (message.ok && message.operation === "import-inspect" && pendingIdentityImport !== null) {
        const candidate = message.candidateIdentityHash;
        if (window.confirm(`Replace this host identity with ${candidate.slice(0, 12)}? The host will restart.`)) {
          host.send({ type: "identity-import", ...pendingIdentityImport, confirmedCandidateHash: candidate });
        }
        pendingIdentityImport = null;
      }
      if (message.ok && message.operation === "recovery-import-inspect" && pendingIdentityRecovery !== null) {
        const candidate = message.candidateIdentityHash;
        if (window.confirm(`Replace this host identity with ${candidate.slice(0, 12)}? The host will restart.`)) {
          host.send({ type: "identity-recovery-import", ...pendingIdentityRecovery, confirmedCandidateHash: candidate });
        }
        pendingIdentityRecovery = null;
      }
    }
    if (message.type === "moderation-state") renderModerationState(message);
    if (message.type === "moderation-report-export") void host.saveModerationReport(message.json);
    if (message.type === "device-state") renderDeviceState(message);
    if (message.type === "device-bridge-request") {
      void handleDeviceBridgeRequest(message, (reply) => host.send(reply));
    }
    if (message.type === "media-codec-request") {
      void handleMediaCodecRequest(message, (reply) => host.send(reply));
    }
    if (message.type === "inbound-media-frame") {
      void playInboundMediaFrame(message).then((played) => appendLog(`Inbound ${message.encoding} media → ${played ? "speaker" : message.sink.kind} (${message.dataHex.length / 2} bytes)`)).catch((error) => appendLog(`Inbound media failed: ${error instanceof Error ? error.message : String(error)}`));
    }
  });

  host.send({ type: "trust-list" });

  trustAdd?.addEventListener("click", () => {
    const identityString = trustIdentityInput?.value.trim() ?? "";
    if (identityString.length === 0) {
      appendLog("Paste a 94-character identity string first");
      return;
    }

    host.send({
      type: "trust-add",
      identityString,
      label: trustLabelInput?.value.trim() || "Unnamed publisher"
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
    host.send({ type: "identity-unlock", passphrase: identityCurrent.value, confirmation: identityConfirm.value });
  });
  document.querySelector("#identity-export")?.addEventListener("click", () => {
    if (identityNext.value !== identityConfirm.value) return appendLog("Backup passphrases do not match");
    host.send({ type: "identity-export", currentPassphrase: identityCurrent.value, backupPassphrase: identityNext.value, backupPassphraseConfirmation: identityConfirm.value });
  });
  document.querySelector("#identity-import")?.addEventListener("click", async () => {
    if (identityNext.value !== identityConfirm.value) return appendLog("Vault passphrases do not match");
    const backupHex = await host.openIdentityBackup();
    if (backupHex) {
      pendingIdentityImport = { backupHex, backupPassphrase: identityCurrent.value, vaultPassphrase: identityNext.value, vaultPassphraseConfirmation: identityConfirm.value };
      host.send({ type: "identity-import-inspect", backupHex, backupPassphrase: identityCurrent.value });
    }
  });
  document.querySelector("#identity-recovery-show")?.addEventListener("click", () => {
    host.send({ type: "identity-recovery-show", currentPassphrase: identityCurrent.value });
  });
  document.querySelector("#identity-recovery-import")?.addEventListener("click", () => {
    if (identityNext.value !== identityConfirm.value) return appendLog("Vault passphrases do not match");
    pendingIdentityRecovery = { first: identityWordsFirst.value.trim(), second: identityWordsSecond.value.trim(), vaultPassphrase: identityNext.value, vaultPassphraseConfirmation: identityConfirm.value };
    host.send({ type: "identity-recovery-import-inspect", first: pendingIdentityRecovery.first, second: pendingIdentityRecovery.second });
  });
  document.querySelector("#identity-change")?.addEventListener("click", () => {
    if (identityNext.value !== identityConfirm.value) return appendLog("New passphrases do not match");
    host.send({ type: "identity-change-passphrase", currentPassphrase: identityCurrent.value, nextPassphrase: identityNext.value, nextPassphraseConfirmation: identityConfirm.value });
  });

  const sendModeration = (type) => {
    host.send({ type, sourceHash: moderationSource.value.trim(), label: moderationLabel.value.trim() });
  };
  document.querySelector("#moderation-block")?.addEventListener("click", () => sendModeration("moderation-block"));
  document.querySelector("#moderation-unblock")?.addEventListener("click", () => sendModeration("moderation-unblock"));
  document.querySelector("#moderation-mute")?.addEventListener("click", () => sendModeration("moderation-mute"));
  document.querySelector("#moderation-unmute")?.addEventListener("click", () => sendModeration("moderation-unmute"));
  document.querySelector("#moderation-report")?.addEventListener("click", () => {
    host.send({ type: "moderation-report", sourceHash: moderationSource.value.trim(), reason: moderationReason.value, note: moderationNote.value });
  });
  document.querySelector("#moderation-export")?.addEventListener("click", () => host.send({ type: "moderation-export-reports" }));
  host.send({ type: "moderation-list" });
  deviceRemoteEnabled?.addEventListener("change", () => {
    host.send({ type: "device-set-remote", enabled: deviceRemoteEnabled.checked });
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
    appendLog(`Worklet exited (code=${detail.code}, signal=${detail.signal ?? "none"})`);
  });

  void host.getStatus().then(renderStatus);
  host.send({ type: "list-catalog" });
  host.send({ type: "list-installed" });
}

renderCatalog();
renderInstalled();
renderGrants(null, []);
