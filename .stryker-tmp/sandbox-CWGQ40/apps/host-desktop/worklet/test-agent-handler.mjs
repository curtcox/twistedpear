/**
 * Desktop host conformance test-agent mount: the harness command surface used by
 * the multi-peer and media conformance runs. Never reached in normal operation.
 */
// @ts-nocheck

import { bytesToHex, hexToBytes } from "../../../packages/reticulum-ts/dist/crypto/bytes.js";
import { generateConfirmationToken } from "../../../packages/miniapp-runtime/dist/worklet.js";
import { encodeDeviceStreamFrame } from "../../../packages/protocol/dist/index.js";
import { connectTestAgent, sleep } from "../../../packages/worklet-core/src/index.mjs";

export function createTestAgentHandler(deps) {
  const {
    state,
    provider,
    status,
    log,
    harnessPeerPair,
    requestRendererReply
  } = deps;
  const resolveIdentity = (...args) => deps.resolveIdentity(...args);
  const ensureReticulum = (...args) => deps.ensureReticulum(...args);
  const startTcpInterface = (...args) => deps.startTcpInterface(...args);
  const ensureHostLxmfDelivery = (...args) => deps.ensureHostLxmfDelivery(...args);
  const ensureMiniappHost = (...args) => deps.ensureMiniappHost(...args);
  const ensurePeerSessionManager = (...args) => deps.ensurePeerSessionManager(...args);
  const ensureCrossDeviceTestDriver = (...args) => deps.ensureCrossDeviceTestDriver(...args);

  return async function handleConnectTestAgent(message) {
    if (state.testAgent !== null) {
      log("Test agent already mounted");
      return;
    }
    try {
      let identity = await resolveIdentity();
      // The Electron main process sends the isolated test identity unlock and
      // agent mount back-to-back. Host messages are handled concurrently, so
      // allow the unlock operation to finish without granting normal launches
      // any implicit identity access.
      for (let attempt = 0; identity === null && attempt < 100; attempt += 1) {
        await sleep(100);
        identity = await resolveIdentity();
      }
      if (identity === null) {
        throw new Error("identity unavailable");
      }
      const node = await ensureReticulum();
      // The test-agent attachment is also the readiness boundary used by the
      // multi-peer harness. Interface messages arrive concurrently over IPC,
      // so make the requested hub connection explicit here before advertising
      // this peer as ready.
      if (state.pendingTarget !== null) {
        status.tcpEnabled = true;
        await startTcpInterface(state.pendingTarget.targetHost, state.pendingTarget.targetPort);
      }
        state.testAgent = await connectTestAgent({
        reticulum: node,
        provider,
        identity,
        label: message.label,
        platform: "desktop",
        host: message.host,
        port: message.port,
        log,
        // Reuse the shipping delivery destination: invites already raise chrome
        // without the agent; the agent only drives probes and harness control.
        delivery: await ensureHostLxmfDelivery(),
        receiveSessionInvite: (invite) => ensureMiniappHost().receiveSessionInvite(invite),
        acceptSessionInvite: async (inviteId) => {
          // SessionInviteService marks the invite accepted before launch. When
          // line-check is not installed on this peer data dir (common for a
          // fresh multipeer desktop), still succeed so post-accept LXMF call
          // media can be proven — same posture as tp-node, which has no
          // mini-app host.
          try {
            await ensureMiniappHost().acceptSessionInvite(inviteId);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (!message.startsWith("No installed version for ")) {
              throw error;
            }
            log(`Session invite ${inviteId} accepted without launch (${message})`);
          }
        },
        handleCommand: async (request) => {
          switch (request.cmd) {
            case "renderer-ping": {
              const token = generateConfirmationToken((length) => provider.randomBytes(length));
              const reply = await requestRendererReply({ type: "peer-qr-availability", token }, 10_000);
              return {
                ok: reply !== null,
                availability: reply?.availability ?? null,
                error: reply === null ? "renderer ping timed out" : reply?.error
              };
            }
            case "peer-pair-start": {
              harnessPeerPair.enable();
              await ensurePeerSessionManager();
              ensureMiniappHost();
              const role = request.role === "listen" ? "listen" : "offer";
              const appId = typeof request.appId === "string" ? request.appId : "line-check";
              const runtimeId = "harness-webrtc";
              return harnessPeerPair.start(async () => {
                const manager = await ensurePeerSessionManager();
                const connect = {
                  service: appId,
                  purpose: "WebRTC media conformance",
                  mechanisms: ["manual"],
                  timeoutMs: 120_000
                };
                const handle =
                  role === "listen"
                    ? await manager.listen(appId, runtimeId, connect)
                    : await manager.request(appId, runtimeId, connect);
                const info = manager.info(appId, runtimeId, handle);
                return {
                  handleId: handle.id,
                  dataPlane: info.dataPlane,
                  fingerprint: info.fingerprint,
                  displayLabel: info.displayLabel
                };
              });
            }
            case "peer-pair-code-out": {
              const taken = await harnessPeerPair.takeOutboundCode(
                typeof request.timeoutMs === "number" ? request.timeoutMs : 60_000
              );
              return { code: taken.code, sessionId: taken.sessionId };
            }
            case "peer-pair-code-in": {
              if (typeof request.code !== "string") throw new Error("peer-pair-code-in requires code");
              harnessPeerPair.giveInboundCode(
                request.code,
                typeof request.sessionId === "string" ? request.sessionId : undefined
              );
              return { ok: true };
            }
            case "peer-pair-wait": {
              const paired = await harnessPeerPair.wait(
                typeof request.timeoutMs === "number" ? request.timeoutMs : 120_000
              );
              return paired;
            }
            case "webrtc-open-media": {
              ensureMiniappHost();
              if (state.attachWebRtcMediaTrack === null) {
                throw new Error("WebRTC media attach is not configured");
              }
              const appId = typeof request.appId === "string" ? request.appId : "line-check";
              const handleId = typeof request.handleId === "string" ? request.handleId : undefined;
              if (handleId === undefined) throw new Error("webrtc-open-media requires handleId");
              const classId = request.classId === "camera" ? "camera" : "microphone";
              const tierId = classId === "camera" ? "frames" : "pcm";
              const encoding = classId === "camera" ? "480p15" : "16k-opus";
              const attached = await state.attachWebRtcMediaTrack({
                appId,
                peer: handleId,
                demand: { classId, tierId, encoding },
                admission: {
                  kind: "accept",
                  plane: "webrtc",
                  rung: encoding,
                  rungIndex: 0,
                  demandBps: 64_000,
                  admittedDemandBps: 64_000,
                  supplyBps: 2_000_000,
                  reason: "harness"
                }
              });
              let bytesSent = attached.bytesSent ?? 0;
              let voiceProcessing = attached.voiceProcessing ?? null;
              if (bytesSent === 0 && typeof attached.sessionId === "string") {
                for (let attempt = 0; attempt < 20 && bytesSent === 0; attempt += 1) {
                  await new Promise((resolve) => setTimeout(resolve, 250));
                  const token = generateConfirmationToken((length) => provider.randomBytes(length));
                  const stats = await requestRendererReply({
                    type: "peer-webrtc-media-stats",
                    token,
                    sessionId: attached.sessionId
                  }, 10_000);
                  if (typeof stats?.bytesSent === "number") bytesSent = stats.bytesSent;
                }
              }
              return {
                attached: true,
                plane: "webrtc-track",
                handleId,
                sessionId: attached.sessionId,
                bytesSent,
                voiceProcessing,
                encoding
              };
            }
            case "media-opus-duplex": {
              const configuration = {
                codec: "opus",
                sampleKind: "audio",
                bitrateBps: 24_000,
                sampleRate: 16_000,
                channels: 1,
                voiceDuplex: true
              };
              const sampleCount = 960;
              const samples = new Float32Array(sampleCount);
              for (let index = 0; index < sampleCount; index += 1) {
                samples[index] = Math.sin((2 * Math.PI * 440 * index) / 16_000) * 0.25;
              }
              const pcmBytes = new Uint8Array(samples.buffer.slice(samples.byteOffset, samples.byteOffset + samples.byteLength));
              const captureAtUs = Date.now() * 1_000;
              const encodeToken = generateConfirmationToken((length) => provider.randomBytes(length));
              const encoded = await requestRendererReply({
                type: "media-codec-request",
                token: encodeToken,
                op: "encode",
                configuration,
                captureAtUs,
                dataHex: bytesToHex(pcmBytes)
              }, 15_000);
              if (encoded?.error !== undefined || typeof encoded?.dataHex !== "string") {
                throw new Error(encoded?.error ?? "Opus encode timed out");
              }
              const opusBytes = hexToBytes(encoded.dataHex);
              if (opusBytes.length === 0) throw new Error("Opus encode produced empty payload");
              const decodeToken = generateConfirmationToken((length) => provider.randomBytes(length));
              const decoded = await requestRendererReply({
                type: "media-codec-request",
                token: decodeToken,
                op: "decode",
                configuration,
                captureAtUs,
                dataHex: encoded.dataHex
              }, 15_000);
              if (decoded?.error !== undefined || typeof decoded?.dataHex !== "string") {
                throw new Error(decoded?.error ?? "Opus decode timed out");
              }
              const decodedBytes = hexToBytes(decoded.dataHex);
              if (decodedBytes.length < 4) throw new Error("Opus decode produced empty PCM");
              const frame = encodeDeviceStreamFrame({
                version: 2,
                sampleKind: 2,
                sessionToken: 7,
                sequence: 0,
                captureAtUs,
                clockId: 7,
                payload: opusBytes
              });
              const playToken = generateConfirmationToken((length) => provider.randomBytes(length));
              const played = await requestRendererReply({
                type: "media-opus-play-request",
                token: playToken,
                encoding: "16k-opus",
                dataHex: bytesToHex(frame)
              }, 15_000);
              if (played?.error !== undefined || played?.played !== true) {
                throw new Error(played?.error ?? "Opus speaker playback failed");
              }
              return {
                ok: true,
                implementation: "webcodecs",
                voiceDuplex: true,
                encoding: "16k-opus",
                pcmBytes: pcmBytes.length,
                opusBytes: opusBytes.length,
                decodedBytes: decodedBytes.length,
                frameBytes: frame.length,
                frameHex: bytesToHex(frame),
                played: true
              };
            }
            case "media-opus-play": {
              if (typeof request.dataHex !== "string" || request.dataHex.length < 72) {
                throw new Error("media-opus-play requires TPD2 dataHex");
              }
              const encoding = typeof request.encoding === "string" ? request.encoding : "16k-opus";
              const playToken = generateConfirmationToken((length) => provider.randomBytes(length));
              const played = await requestRendererReply({
                type: "media-opus-play-request",
                token: playToken,
                encoding,
                dataHex: request.dataHex
              }, 15_000);
              if (played?.error !== undefined || played?.played !== true) {
                throw new Error(played?.error ?? "Opus speaker playback failed");
              }
              return { played: true, encoding, bytes: Math.floor(request.dataHex.length / 2) };
            }
            default:
              return ensureCrossDeviceTestDriver()(request);
          }
        }
      });
      log(`Test agent mounted as ${message.label} (lxmf ${state.testAgent.lxmfAddress})`);
    } catch (error) {
      log(`Test agent mount failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return;
  };
}
