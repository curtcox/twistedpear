export function renderModerationStateImpl(__scope, message) {
  const renderEntries = (root, entries) => {
    root?.replaceChildren(
      ...entries.map((entry) => {
        const item = document.createElement("li");
        item.textContent = `${entry.label ? `${entry.label} — ` : ""}${entry.sourceHash}`;
        return item;
      }),
    );
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
  if (!__scope.sessionInviteBanner) return;
  const pending = (invites ?? []).filter(
    (invite) => invite.phase === "pending",
  );
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
    accept.addEventListener("click", () =>
      __scope.host.send({ type: "session-invite-accept", id: invite.id }),
    );
    const decline = document.createElement("button");
    decline.type = "button";
    decline.className = "danger";
    decline.id = `session-invite-decline-${invite.id}`;
    decline.textContent = "Decline";
    decline.addEventListener("click", () =>
      __scope.host.send({ type: "session-invite-decline", id: invite.id }),
    );
    row.append(text, accept, decline);
    list.append(row);
  }
  __scope.sessionInviteBanner.replaceChildren(title, list);
}

export function renderDeviceStateImpl(__scope, message) {
  __scope.lastDeviceState = message;
  const disabled = new Set(message.disabledClasses ?? []);
  if (__scope.deviceRemoteEnabled) {
    __scope.deviceRemoteEnabled.checked =
      message.remoteAcquisitionEnabled === true;
  }
  if (__scope.deviceActiveBanner) {
    const indicators = message.indicators ?? [];
    const shareOffers = message.shareOffers ?? [];
    if (indicators.length === 0 && shareOffers.length === 0) {
      __scope.deviceActiveBanner.hidden = true;
      __scope.deviceActiveBanner.replaceChildren();
    } else {
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
          __scope.host.send({
            type: "device-kill-session",
            handle: indicator.handle,
          });
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
        kill.addEventListener("click", () =>
          __scope.host.send({
            type: "device-revoke-share",
            appId: offer.appId,
            id: offer.id,
          }),
        );
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
    } else {
      __scope.deviceSessions.replaceChildren(
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
            __scope.host.send({
              type: "device-kill-session",
              handle: session.handle,
            });
          });
          row.append(name, meta, kill);
          return row;
        }),
      );
    }
  }
  if (__scope.deviceInventory) {
    const inventory = message.inventory ?? [];
    __scope.deviceInventory.replaceChildren(
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
          __scope.host.send({
            type: "device-set-class-disabled",
            classId: entry.class,
            disabled: !checkbox.checked,
          });
        });
        toggle.append(checkbox, document.createTextNode(" Allowed"));
        row.append(name, availability, toggle);
        return row;
      }),
    );
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
        declaredCapabilities: pkg.capabilities,
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
      },
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
      holder.innerHTML = qr.createSvgTag({
        cellSize: 4,
        margin: 8,
        scalable: true,
      });
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

export function sendPeerChromeResponseImpl(__scope, token, response) {
  __scope.host?.send({ type: "peer-chrome-response", token, ...response });
}

export function audioUnhexImpl(__scope, text) {
  return Uint8Array.from(text.match(/../g) ?? [], (pair) =>
    Number.parseInt(pair, 16),
  );
}

export function audioHexImpl(__scope, bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function playPeerAudioImpl(__scope, framesHex) {
  const AudioContextClass =
    globalThis.AudioContext ?? globalThis.webkitAudioContext;
  const modem = globalThis.TwistedPearPeerAudio;
  if (
    AudioContextClass === undefined ||
    modem?.encodePeerAudioFsk === undefined
  )
    throw new Error("Web Audio playback is unavailable");
  const context = new AudioContextClass();
  await context.resume();
  let at = context.currentTime + 0.1;
  for (const frameHex of framesHex) {
    const pcm = modem.encodePeerAudioFsk(__scope.audioUnhex(frameHex), {
      sampleRate: context.sampleRate,
    });
    const buffer = context.createBuffer(1, pcm.length, context.sampleRate);
    buffer.copyToChannel(pcm, 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(at);
    at += pcm.length / context.sampleRate + 0.2;
  }
  await new Promise((resolve) =>
    setTimeout(
      resolve,
      Math.ceil(Math.max(0, at - context.currentTime) * 1000),
    ),
  );
  await context.close();
}

export async function recordPeerAudioImpl(__scope, durationMs = 15000) {
  const AudioContextClass =
    globalThis.AudioContext ?? globalThis.webkitAudioContext;
  const modem = globalThis.TwistedPearPeerAudio;
  if (
    AudioContextClass === undefined ||
    modem?.decodePeerAudioFskStream === undefined ||
    navigator.mediaDevices?.getUserMedia === undefined
  )
    throw new Error("Microphone recording is unavailable");
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
    video: false,
  });
  const context = new AudioContextClass();
  await context.resume();
  const chunks = [];
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(4096, 1, 1);
  const mute = context.createGain();
  mute.gain.value = 0;
  processor.onaudioprocess = (event) =>
    chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
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
  const frames = modem.decodePeerAudioFskStream(pcm, {
    sampleRate: context.sampleRate,
  });
  await context.close();
  if (frames.length === 0)
    throw new Error("No valid peer audio frames were detected");
  return frames.map(__scope.audioHex);
}

export async function performPeerAudioImpl(__scope, message) {
  try {
    if (message.type === "peer-audio-transmit") {
      await __scope.playPeerAudio(message.framesHex);
      const framesHex = message.expectsResponse
        ? await __scope.recordPeerAudio()
        : [];
      __scope.sendPeerChromeResponse(message.token, {
        accepted: true,
        framesHex,
      });
    } else
      __scope.sendPeerChromeResponse(message.token, {
        accepted: true,
        framesHex: await __scope.recordPeerAudio(),
        sessionId: message.sessionId,
      });
  } catch (error) {
    __scope.sendPeerChromeResponse(message.token, {
      accepted: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
