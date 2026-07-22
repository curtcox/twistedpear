/** Trusted desktop chrome effects for peer discovery adapters and confirmation. */
export function createDesktopPeerChrome({ requestReply, send, createToken, ntfyServer = null }) {
  const pending = new Map();
  const request = async (type, fields, timeoutMs) => {
    const token = createToken();
    pending.set(fields.sessionId ?? token, token);
    try {
      return await requestReply({ type, token, ...fields }, timeoutMs);
    } finally {
      pending.delete(fields.sessionId ?? token);
    }
  };
  const cancel = async (sessionId) => {
    const token = pending.get(sessionId);
    if (token !== undefined) send({ type: "peer-chrome-cancel", token, sessionId });
  };
  return {
    manual: {
      async *offer(session, code, options) {
        const reply = await request("peer-manual-present", { sessionId: session.id, code, expectsResponse: true }, options.timeoutMs);
        if (reply?.accepted === true && typeof reply.code === "string") yield reply.code;
      },
      async *accept(options) {
        const sessionId = createToken();
        const reply = await request("peer-manual-enter", { sessionId, service: options.service }, options.timeoutMs);
        if (reply?.accepted === true && typeof reply.code === "string") yield { session: { id: sessionId, kind: "manual" }, code: reply.code };
      },
      async answer(session, code) { await request("peer-manual-present", { sessionId: session.id, code, expectsResponse: false }, 120_000); },
      cancel
    },
    qr: {
      async availability() {
        const reply = await request("peer-qr-availability", {}, 5_000);
        return reply?.availability ?? { state: "unsupported", reason: "QR camera/display support could not be detected" };
      },
      async *present(session, codes, options) {
        const reply = await request("peer-qr-present", { sessionId: session.id, codes, expectsResponse: true }, options.timeoutMs);
        if (reply?.accepted === true && typeof reply.code === "string") yield reply.code;
      },
      async *scan(options) {
        const sessionId = createToken();
        const reply = await request("peer-qr-scan", { sessionId, service: options.service }, options.timeoutMs);
        if (reply?.accepted === true && typeof reply.code === "string") yield { session: { id: sessionId, kind: "qr" }, code: reply.code };
      },
      async answer(session, codes) { await request("peer-qr-present", { sessionId: session.id, codes, expectsResponse: false }, 120_000); },
      cancel
    },
    audio: {
      async availability() {
        const reply = await request("peer-audio-availability", {}, 5_000);
        return reply?.availability ?? { state: "unsupported", reason: "Desktop audio support could not be detected" };
      },
      async *transmit(session, frames, options) {
        const reply = await request("peer-audio-transmit", { sessionId: session.id, framesHex: frames.map((frame) => [...frame].map((byte) => byte.toString(16).padStart(2, "0")).join("")), expectsResponse: true }, options.timeoutMs);
        if (reply?.error !== undefined) throw new Error(reply.error);
        for (const frame of reply?.framesHex ?? []) yield Uint8Array.from(frame.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));
      },
      async *receive(options) {
        const session = { id: createToken(), kind: "audio" };
        const reply = await request("peer-audio-receive", { sessionId: session.id, service: options.service }, options.timeoutMs);
        if (reply?.error !== undefined) throw new Error(reply.error);
        for (const frame of reply?.framesHex ?? []) yield { session, frame: Uint8Array.from(frame.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16)) };
      },
      async answer(session, frames) {
        const reply = await request("peer-audio-transmit", { sessionId: session.id, framesHex: frames.map((frame) => [...frame].map((byte) => byte.toString(16).padStart(2, "0")).join("")), expectsResponse: false }, 120_000);
        if (reply?.accepted !== true) throw new Error(reply?.error ?? "Audio answer playback was cancelled");
      },
      cancel
    },
    ntfy: {
      async availability() {
        const reply = await request("peer-ntfy-availability", {}, 5_000);
        return reply?.availability ?? { state: "offline", reason: "ntfy configuration could not be detected" };
      },
      async presentCode(session, code, options) {
        const reply = await request("peer-ntfy-present", { sessionId: session.id, code, server: ntfyServer }, options.timeoutMs);
        if (reply?.accepted !== true) throw new Error("ntfy rendezvous was cancelled");
      },
      async requestCode(options) {
        const sessionId = createToken();
        const reply = await request("peer-ntfy-enter", { sessionId, service: options.service, server: ntfyServer }, options.timeoutMs);
        if (reply?.accepted !== true || typeof reply.code !== "string") throw new Error("ntfy rendezvous was cancelled");
        return { session: { id: sessionId, kind: "ntfy" }, code: reply.code };
      },
      cancel
    },
    async confirm(peer, pairingRequest) {
      const reply = await request("peer-confirm-request", {
        appId: pairingRequest.service,
        service: pairingRequest.service,
        purpose: pairingRequest.purpose,
        peer: {
          displayLabel: peer.displayLabel,
          fingerprint: peer.fingerprint,
          matchingWords: peer.matchingWords,
          dataPlane: peer.dataPlane
        }
      }, pairingRequest.timeoutMs);
      return reply?.approved === true;
    }
  };
}
