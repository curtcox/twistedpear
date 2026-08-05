import { renderWidgetTree } from "./widgets.js";
import { decodeQrVideoFrame, normalizeScannedT256, supportsQrDetection } from "./qr-scanner.js";
import { handleDeviceBridgeRequest } from "./device-bridge.js";
import { handleMediaCodecRequest, handleMediaOpusPlayRequest, playInboundMediaFrame } from "./media-codec-bridge.js";
import { handlePeerWebRtcMessage } from "./peer-webrtc-bridge.js";

export function renderModerationStateImpl(__scope, message) {
    const renderEntries = (root, entries) => {
        root?.replaceChildren(...entries.map((entry) => {
            const item = document.createElement("li");
            item.textContent = `${entry.label ? `${entry.label} — ` : ""}${entry.sourceHash}`;
            return item;
        }));
    };
    renderEntries(__scope.moderationBlocked, message.blocked);
    renderEntries(__scope.moderationMuted, message.muted);
    if (__scope.moderationSummary)
        __scope.moderationSummary.textContent = `${message.blocked.length} blocked · ${message.muted.length} muted · ${message.reports.length} local reports`;
}

/**
 * Host-delivered call invitations. The app is not running while one is
 * pending; accepting is what brings it to the foreground.
 */
export function renderSessionInvitesImpl(__scope, invites) {
    if (!__scope.sessionInviteBanner)
        return;
    const pending = (invites ?? []).filter((invite) => invite.phase === "pending");
    if (pending.length === 0) {
        __scope.sessionInviteBanner.hidden = true;
        __scope.sessionInviteBanner.replaceChildren();
        return;
    }
    __scope.sessionInviteBanner.hidden = false;
    const title = document.createElement("strong");
    title.textContent = "Incoming call invitation";
    const list = document.createElement("div");
    list.className = "settings-grid";
    for (const invite of pending) {
        const row = document.createElement("div");
        row.className = "item-row";
        const text = document.createElement("span");
        text.textContent = `${invite.verifiedPeerLabel} wants to start ${invite.requestedClasses.join(" + ")} in ${invite.appId}`;
        const accept = document.createElement("button");
        accept.type = "button";
        accept.id = `session-invite-accept-${invite.id}`;
        accept.textContent = "Accept";
        accept.addEventListener("click", () => __scope.host.send({ type: "session-invite-accept", id: invite.id }));
        const decline = document.createElement("button");
        decline.type = "button";
        decline.className = "danger";
        decline.id = `session-invite-decline-${invite.id}`;
        decline.textContent = "Decline";
        decline.addEventListener("click", () => __scope.host.send({ type: "session-invite-decline", id: invite.id }));
        row.append(text, accept, decline);
        list.append(row);
    }
    __scope.sessionInviteBanner.replaceChildren(title, list);
}

export function renderDeviceStateImpl(__scope, message) {
    __scope.lastDeviceState = message;
    const disabled = new Set(message.disabledClasses ?? []);
    if (__scope.deviceRemoteEnabled) {
        __scope.deviceRemoteEnabled.checked = message.remoteAcquisitionEnabled === true;
    }
    if (__scope.deviceActiveBanner) {
        const indicators = message.indicators ?? [];
        const shareOffers = message.shareOffers ?? [];
        if (indicators.length === 0 && shareOffers.length === 0) {
            __scope.deviceActiveBanner.hidden = true;
            __scope.deviceActiveBanner.replaceChildren();
        }
        else {
            __scope.deviceActiveBanner.hidden = false;
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
                    __scope.host.send({ type: "device-kill-session", handle: indicator.handle });
                });
                row.append(text, kill);
                list.append(row);
            }
            for (const offer of shareOffers) {
                const row = document.createElement("div");
                row.className = "item-row";
                const text = document.createElement("span");
                text.textContent = `${offer.appId} · sharing ${offer.classId}:${offer.tierId} with ${offer.displayLabel} until ${new Date(offer.expiresAt).toLocaleTimeString()}`;
                const kill = document.createElement("button");
                kill.type = "button";
                kill.className = "danger";
                kill.textContent = "Stop sharing";
                kill.addEventListener("click", () => __scope.host.send({ type: "device-revoke-share", appId: offer.appId, id: offer.id }));
                row.append(text, kill);
                list.append(row);
            }
            __scope.deviceActiveBanner.replaceChildren(title, list);
        }
    }
    if (__scope.deviceSessions) {
        const sessions = message.sessions ?? [];
        if (sessions.length === 0) {
            const empty = document.createElement("p");
            empty.className = "muted";
            empty.textContent = "No live device sessions.";
            __scope.deviceSessions.replaceChildren(empty);
        }
        else {
            __scope.deviceSessions.replaceChildren(...sessions.map((session) => {
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
                    __scope.host.send({ type: "device-kill-session", handle: session.handle });
                });
                row.append(name, meta, kill);
                return row;
            }));
        }
    }
    if (__scope.deviceInventory) {
        const inventory = message.inventory ?? [];
        __scope.deviceInventory.replaceChildren(...inventory.map((entry) => {
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
                __scope.host.send({
                    type: "device-set-class-disabled",
                    classId: entry.class,
                    disabled: !checkbox.checked
                });
            });
            toggle.append(checkbox, document.createTextNode(" Allowed"));
            row.append(name, availability, toggle);
            return row;
        }));
    }
}

export function resetRequestedAppLaunchImpl(__scope) {
    if (__scope.requestedAppLaunchTimer !== null) {
        clearTimeout(__scope.requestedAppLaunchTimer);
        __scope.requestedAppLaunchTimer = null;
    }
    __scope.requestedAppLaunchStarted = false;
}

export function scheduleRequestedAppLaunchImpl(__scope, pkg) {
    __scope.requestedAppLaunchStarted = true;
    __scope.requestedAppLaunchTimer = setTimeout(() => {
        __scope.requestedAppLaunchTimer = null;
        __scope.selectedAppId = pkg.appId;
        __scope.host.send({ type: "launch-miniapp", appId: pkg.appId });
        if (pkg.publisherPublicKey && pkg.capabilities) {
            __scope.host.send({
                type: "get-grants",
                appId: pkg.appId,
                publisherPublicKey: pkg.publisherPublicKey,
                declaredCapabilities: pkg.capabilities
            });
        }
    }, 250);
}

export function readWorkspaceDocumentImpl(__scope, documentId) {
    return new Promise((resolve, reject) => {
        const token = `ws-${__scope.workspaceReadCounter++}`;
        const timer = setTimeout(() => {
            __scope.pendingWorkspaceReads.delete(token);
            reject(new Error("Workspace read timed out"));
        }, 10000);
        __scope.pendingWorkspaceReads.set(token, {
            resolve: (content) => {
                clearTimeout(timer);
                resolve(content);
            },
            reject: (error) => {
                clearTimeout(timer);
                reject(error);
            }
        });
        __scope.host?.send({ type: "workspace-read", token, documentId });
    });
}

export function closeHostModalImpl(__scope) {
    if (__scope.activePeerQrTimer !== null) {
        clearInterval(__scope.activePeerQrTimer);
        __scope.activePeerQrTimer = null;
    }
    __scope.activePeerCameraStream?.getTracks().forEach((track) => track.stop());
    __scope.activePeerCameraStream = null;
    __scope.activePeerChromeToken = null;
    if (__scope.modalOverlay) {
        __scope.modalOverlay.hidden = true;
    }
    __scope.modalEl?.replaceChildren();
}

export function renderPeerQrImpl(__scope, root, value) {
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
        }
        catch {
            // The copyable text remains available below.
        }
    }
    const text = document.createElement("p");
    text.className = "widget-qr-value";
    text.textContent = value;
    root.appendChild(text);
}

export function sendPeerChromeResponseImpl(__scope, token, response) {
    __scope.host?.send({ type: "peer-chrome-response", token, ...response });
}

export function audioUnhexImpl(__scope, text) { return Uint8Array.from(text.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16)); }

export function audioHexImpl(__scope, bytes) { return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }

export async function playPeerAudioImpl(__scope, framesHex) {
    const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    const modem = globalThis.TwistedPearPeerAudio;
    if (AudioContextClass === undefined || modem?.encodePeerAudioFsk === undefined)
        throw new Error("Web Audio playback is unavailable");
    const context = new AudioContextClass();
    await context.resume();
    let at = context.currentTime + 0.1;
    for (const frameHex of framesHex) {
        const pcm = modem.encodePeerAudioFsk(__scope.audioUnhex(frameHex), { sampleRate: context.sampleRate });
        const buffer = context.createBuffer(1, pcm.length, context.sampleRate);
        buffer.copyToChannel(pcm, 0);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(at);
        at += pcm.length / context.sampleRate + 0.2;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.ceil(Math.max(0, at - context.currentTime) * 1000)));
    await context.close();
}

export async function recordPeerAudioImpl(__scope, durationMs = 15000) {
    const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    const modem = globalThis.TwistedPearPeerAudio;
    if (AudioContextClass === undefined || modem?.decodePeerAudioFskStream === undefined || navigator.mediaDevices?.getUserMedia === undefined)
        throw new Error("Microphone recording is unavailable");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
    const context = new AudioContextClass();
    await context.resume();
    const chunks = [];
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    const mute = context.createGain();
    mute.gain.value = 0;
    processor.onaudioprocess = (event) => chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    source.connect(processor);
    processor.connect(mute);
    mute.connect(context.destination);
    await new Promise((resolve) => setTimeout(resolve, durationMs));
    stream.getTracks().forEach((track) => track.stop());
    source.disconnect();
    processor.disconnect();
    mute.disconnect();
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const pcm = new Float32Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        pcm.set(chunk, offset);
        offset += chunk.length;
    }
    const frames = modem.decodePeerAudioFskStream(pcm, { sampleRate: context.sampleRate });
    await context.close();
    if (frames.length === 0)
        throw new Error("No valid peer audio frames were detected");
    return frames.map(__scope.audioHex);
}

export async function performPeerAudioImpl(__scope, message) {
    try {
        if (message.type === "peer-audio-transmit") {
            await __scope.playPeerAudio(message.framesHex);
            const framesHex = message.expectsResponse ? await __scope.recordPeerAudio() : [];
            __scope.sendPeerChromeResponse(message.token, { accepted: true, framesHex });
        }
        else
            __scope.sendPeerChromeResponse(message.token, { accepted: true, framesHex: await __scope.recordPeerAudio(), sessionId: message.sessionId });
    }
    catch (error) {
        __scope.sendPeerChromeResponse(message.token, { accepted: false, error: error instanceof Error ? error.message : String(error) });
    }
}

export function showPeerConfirmationImpl(__scope, message) {
    const words = Array.isArray(message.peer?.matchingWords) ? message.peer.matchingWords.join(" · ") : "—";
    __scope.activePeerChromeToken = message.token;
    __scope.showHostModal({
        title: "Confirm peer connection",
        fingerprint: null,
        rows: [
            ["Requested by", message.appId], ["Purpose", message.purpose], ["Service", message.service],
            ["Peer label (untrusted claim)", message.peer?.displayLabel ?? "Unknown"],
            ["Identity fingerprint", message.peer?.fingerprint ?? "Unknown"], ["Matching words", words],
            ["Data path", message.peer?.dataPlane ?? "Unknown"]
        ],
        confirmLabel: "Connect",
        onDone: (approved) => __scope.sendPeerChromeResponse(message.token, { approved })
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
    __scope.modalEl.append(heading, disclosure);
    const codes = Array.isArray(message.codes) ? message.codes : typeof message.code === "string" ? [message.code] : [];
    if (codes.length > 0) {
        const display = document.createElement("div");
        if (message.type === "peer-qr-present") {
            let frame = 0;
            __scope.renderPeerQr(display, codes[0]);
            if (codes.length > 1)
                __scope.activePeerQrTimer = setInterval(() => { frame = (frame + 1) % codes.length; __scope.renderPeerQr(display, codes[frame]); }, 750);
        }
        else {
            const code = document.createElement("textarea");
            code.className = "setting-input";
            code.rows = 6;
            code.readOnly = true;
            code.value = codes[0];
            display.appendChild(code);
        }
        __scope.modalEl.appendChild(display);
    }
    const needsInput = message.expectsResponse === true || message.type === "peer-manual-enter" || message.type === "peer-qr-scan" || message.type === "peer-ntfy-enter";
    const input = document.createElement("textarea");
    if (needsInput) {
        input.className = "setting-input";
        input.rows = 5;
        input.placeholder = message.type === "peer-qr-scan"
            ? "Scan or paste the peer QR payload"
            : message.type === "peer-ntfy-enter"
                ? "Enter the TPN2 lookup code (TPN1 also works)"
                : "Paste the peer's full response code";
        __scope.modalEl.appendChild(input);
    }
    const cameraStatus = document.createElement("p");
    cameraStatus.className = "muted";
    if (message.type === "peer-qr-scan" || (message.type === "peer-qr-present" && message.expectsResponse === true)) {
        const startCamera = document.createElement("button");
        startCamera.textContent = "Start camera";
        startCamera.addEventListener("click", async () => {
            if (!(await supportsQrDetection())) {
                cameraStatus.textContent = "Camera QR decoding is unsupported in this build; paste the payload instead.";
                return;
            }
            try {
                __scope.activePeerCameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
                const video = document.createElement("video");
                video.className = "qr-scanner-video";
                video.autoplay = true;
                video.muted = true;
                video.playsInline = true;
                video.srcObject = __scope.activePeerCameraStream;
                __scope.modalEl.insertBefore(video, cameraStatus);
                await video.play();
                const detect = async () => { if (__scope.activePeerChromeToken !== message.token || __scope.activePeerCameraStream === null)
                    return; const raw = await decodeQrVideoFrame(video); if (raw !== null) {
                    input.value = raw;
                    __scope.activePeerCameraStream.getTracks().forEach((track) => track.stop());
                    __scope.activePeerCameraStream = null;
                    cameraStatus.textContent = "QR payload captured.";
                    return;
                } requestAnimationFrame(() => { void detect(); }); };
                cameraStatus.textContent = "Camera active. Hold the peer QR inside the frame.";
                void detect();
            }
            catch (error) {
                cameraStatus.textContent = `Camera unavailable: ${error instanceof Error ? error.message : String(error)}`;
            }
        });
        __scope.modalEl.append(startCamera, cameraStatus);
    }
    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const cancel = document.createElement("button");
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", () => { __scope.closeHostModal(); __scope.sendPeerChromeResponse(message.token, { accepted: false }); });
    const approve = document.createElement("button");
    approve.className = "primary";
    approve.textContent = needsInput ? "Continue" : "Done";
    approve.addEventListener("click", () => { const code = needsInput ? input.value.trim() : undefined; if (needsInput && !code)
        return; __scope.closeHostModal(); if (isAudio)
        void __scope.performPeerAudio(message);
    else
        __scope.sendPeerChromeResponse(message.token, { accepted: true, ...(code ? { code } : {}) }); });
    actions.append(cancel, approve);
    __scope.modalEl.appendChild(actions);
    __scope.modalOverlay.hidden = false;
}

export async function showQrScannerImpl(__scope, target, purpose) {
    if (!__scope.modalOverlay || !__scope.modalEl || !target)
        return;
    if (!(await supportsQrDetection())) {
        __scope.appendLog("QR scanning is unavailable in this Electron/Chromium build; paste the 256t string instead.");
        return;
    }
    __scope.modalEl.replaceChildren();
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
            if (!active)
                return;
            try {
                const rawValue = await decodeQrVideoFrame(video);
                if (rawValue !== null) {
                    target.value = normalizeScannedT256(rawValue);
                    stop();
                    target.dispatchEvent(new Event("input", { bubbles: true }));
                    return;
                }
            }
            catch (error) {
                status.textContent = error instanceof Error ? error.message : String(error);
            }
            requestAnimationFrame(() => { void detect(); });
        };
        void detect();
    }
    catch (error) {
        status.textContent = `Camera unavailable: ${error instanceof Error ? error.message : String(error)}`;
    }
}

/**
 * Host-chrome modal. Lives outside #widget-root so a mini-app widget tree can
 * never draw or dismiss it; identity fields come from the worklet message.
 */
export function showHostModalImpl(__scope, { title, fingerprint, rows = [], capabilities = null, confirmLabel, onDone }) {
    if (!__scope.modalOverlay || !__scope.modalEl) {
        onDone(false, null);
        return;
    }
    __scope.modalEl.replaceChildren();
    const heading = document.createElement("h3");
    heading.textContent = title;
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
            text.textContent = `${capability.id} — ${capability.description || ""}`;
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
