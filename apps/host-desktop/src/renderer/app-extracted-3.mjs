import {
  decodeQrVideoFrame,
  normalizeScannedT256,
  supportsQrDetection,
} from "./qr-scanner.js";

export function showPeerConfirmationImpl(__scope, message) {
  const words = Array.isArray(message.peer?.matchingWords)
    ? message.peer.matchingWords.join(" · ")
    : "—";
  __scope.activePeerChromeToken = message.token;
  __scope.showHostModal({
    title: "Confirm peer connection",
    fingerprint: null,
    rows: [
      ["Requested by", message.appId],
      ["Purpose", message.purpose],
      ["Service", message.service],
      ["Peer label (untrusted claim)", message.peer?.displayLabel ?? "Unknown"],
      ["Identity fingerprint", message.peer?.fingerprint ?? "Unknown"],
      ["Matching words", words],
      ["Data path", message.peer?.dataPlane ?? "Unknown"],
    ],
    confirmLabel: "Connect",
    onDone: (approved) =>
      __scope.sendPeerChromeResponse(message.token, { approved }),
  });
}

export function showPeerCodeExchangeImpl(__scope, message) {
  if (!__scope.modalOverlay || !__scope.modalEl) {
    __scope.sendPeerChromeResponse(message.token, { accepted: false });
    return;
  }
  __scope.activePeerChromeToken = message.token;
  __scope.modalEl.replaceChildren();
  const heading = document.createElement("h3");
  heading.textContent =
    message.type === "peer-manual-enter"
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
  __scope.modalEl.setAttribute("aria-label", heading.textContent);
  const disclosure = document.createElement("p");
  disclosure.className = "muted";
  const isNtfy =
    message.type === "peer-ntfy-enter" || message.type === "peer-ntfy-present";
  const isAudio =
    message.type === "peer-audio-transmit" ||
    message.type === "peer-audio-receive";
  disclosure.textContent = isAudio
    ? "This trusted host action emits audible FSK tones or requests microphone access after you continue. PCM never crosses into the mini-app."
    : isNtfy
      ? `This trusted host action uses ${message.server ?? "the configured ntfy server"}. The server can observe a random topic, timing, and IP metadata, but invitation contents are end-to-end encrypted. Verify matching words before connecting.`
      : "This is trusted host chrome. Verify matching words before connecting. Full manual and QR codes do not use a rendezvous server.";
  __scope.modalEl.append(heading, disclosure);
  const codes = Array.isArray(message.codes)
    ? message.codes
    : typeof message.code === "string"
      ? [message.code]
      : [];
  if (codes.length > 0) {
    const display = document.createElement("div");
    if (message.type === "peer-qr-present") {
      let frame = 0;
      __scope.renderPeerQr(display, codes[0]);
      if (codes.length > 1) {
        __scope.activePeerQrTimer = setInterval(() => {
          frame = (frame + 1) % codes.length;
          __scope.renderPeerQr(display, codes[frame]);
        }, 750);
      }
    } else {
      const code = document.createElement("textarea");
      code.className = "setting-input";
      code.rows = 6;
      code.readOnly = true;
      code.value = codes[0];
      display.appendChild(code);
    }
    __scope.modalEl.appendChild(display);
  }
  const needsInput =
    message.expectsResponse === true ||
    message.type === "peer-manual-enter" ||
    message.type === "peer-qr-scan" ||
    message.type === "peer-ntfy-enter";
  const input = document.createElement("textarea");
  if (needsInput) {
    input.className = "setting-input";
    input.rows = 5;
    input.placeholder =
      message.type === "peer-qr-scan"
        ? "Scan or paste the peer QR payload"
        : message.type === "peer-ntfy-enter"
          ? "Enter the TPN2 lookup code (TPN1 also works)"
          : "Paste the peer's full response code";
    __scope.modalEl.appendChild(input);
  }
  const cameraStatus = document.createElement("p");
  cameraStatus.className = "muted";
  if (
    message.type === "peer-qr-scan" ||
    (message.type === "peer-qr-present" && message.expectsResponse === true)
  ) {
    const startCamera = document.createElement("button");
    startCamera.textContent = "Start camera";
    startCamera.addEventListener("click", async () => {
      if (!(await supportsQrDetection())) {
        cameraStatus.textContent =
          "Camera QR decoding is unsupported in this build; paste the payload instead.";
        return;
      }
      try {
        __scope.activePeerCameraStream =
          await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          });
        const video = document.createElement("video");
        video.className = "qr-scanner-video";
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.srcObject = __scope.activePeerCameraStream;
        __scope.modalEl.insertBefore(video, cameraStatus);
        await video.play();
        const detect = async () => {
          if (
            __scope.activePeerChromeToken !== message.token ||
            __scope.activePeerCameraStream === null
          )
            return;
          const raw = await decodeQrVideoFrame(video);
          if (raw !== null) {
            input.value = raw;
            __scope.activePeerCameraStream
              .getTracks()
              .forEach((track) => track.stop());
            __scope.activePeerCameraStream = null;
            cameraStatus.textContent = "QR payload captured.";
            return;
          }
          requestAnimationFrame(() => {
            void detect();
          });
        };
        cameraStatus.textContent =
          "Camera active. Hold the peer QR inside the frame.";
        void detect();
      } catch (error) {
        cameraStatus.textContent = `Camera unavailable: ${error instanceof Error ? error.message : String(error)}`;
      }
    });
    __scope.modalEl.append(startCamera, cameraStatus);
  }
  const actions = document.createElement("div");
  actions.className = "modal-actions";
  const cancel = document.createElement("button");
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => {
    __scope.closeHostModal();
    __scope.sendPeerChromeResponse(message.token, { accepted: false });
  });
  const approve = document.createElement("button");
  approve.className = "primary";
  approve.textContent = needsInput ? "Continue" : "Done";
  approve.addEventListener("click", () => {
    const code = needsInput ? input.value.trim() : undefined;
    if (needsInput && !code) return;
    __scope.closeHostModal();
    if (isAudio) void __scope.performPeerAudio(message);
    else
      __scope.sendPeerChromeResponse(message.token, {
        accepted: true,
        ...(code ? { code } : {}),
      });
  });
  actions.append(cancel, approve);
  __scope.modalEl.appendChild(actions);
  __scope.modalOverlay.hidden = false;
}

export async function showQrScannerImpl(__scope, target, purpose) {
  if (!__scope.modalOverlay || !__scope.modalEl || !target) return;
  if (!(await supportsQrDetection())) {
    __scope.appendLog(
      "QR scanning is unavailable in this Electron/Chromium build; paste the 256t string instead.",
    );
    return;
  }
  __scope.modalEl.replaceChildren();
  const title = document.createElement("h3");
  title.textContent = `Scan ${purpose} QR`;
  __scope.modalEl.setAttribute("aria-label", title.textContent);
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
  __scope.modalEl.append(title, video, status, cancel);
  __scope.modalOverlay.hidden = false;
  let active = true;
  let stream = null;
  const stop = () => {
    active = false;
    stream?.getTracks().forEach((track) => track.stop());
    __scope.closeHostModal();
  };
  cancel.addEventListener("click", stop, { once: true });
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    if (!active) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    video.srcObject = stream;
    await video.play();
    status.textContent =
      "Hold a TwistedPear 256t QR code inside the camera view.";
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
        status.textContent =
          error instanceof Error ? error.message : String(error);
      }
      requestAnimationFrame(() => {
        void detect();
      });
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
export function showHostModalImpl(
  __scope,
  { title, fingerprint, rows = [], capabilities = null, confirmLabel, onDone },
) {
  if (!__scope.modalOverlay || !__scope.modalEl) {
    onDone(false, null);
    return;
  }
  __scope.modalEl.replaceChildren();
  const heading = document.createElement("h3");
  heading.textContent = title;
  __scope.modalEl.setAttribute("aria-label", title);
  __scope.modalEl.appendChild(heading);
  if (fingerprint) {
    const fp = document.createElement("p");
    fp.className = "fingerprint";
    fp.textContent = `Publisher key: ${fingerprint}`;
    __scope.modalEl.appendChild(fp);
  }
  for (const [label, value] of rows) {
    const row = document.createElement("p");
    row.innerHTML = `<span class="muted">${label}:</span> `;
    row.appendChild(document.createTextNode(String(value)));
    __scope.modalEl.appendChild(row);
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
      const expiry =
        capability.expiresAt != null
          ? ` · expires ${new Date(capability.expiresAt).toLocaleString()}`
          : "";
      text.textContent = `${capability.id}${capability.optional === true ? " (optional)" : ""} — ${capability.description || ""}${capability.scopeLabel ? ` · ${capability.scopeLabel}` : ""}${expiry}`;
      label.append(input, text);
      __scope.modalEl.appendChild(label);
    }
  }
  const actions = document.createElement("div");
  actions.className = "modal-actions";
  const cancel = document.createElement("button");
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => {
    __scope.closeHostModal();
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
    __scope.closeHostModal();
    onDone(true, capabilities === null ? null : grants);
  });
  actions.append(cancel, approve);
  __scope.modalEl.appendChild(actions);
  refreshApproveState();
  __scope.modalOverlay.hidden = false;
}
