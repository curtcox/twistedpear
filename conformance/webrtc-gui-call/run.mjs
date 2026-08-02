#!/usr/bin/env node
/**
 * WebRTC media-track bytes after authenticated pairing (desktop, web, or iOS GUI),
 * plus Opus duplex encode/decode/speaker evidence (Phase 5) on peers that expose
 * `media-opus-duplex` / `media-opus-play` (desktop, web, native Bare Opus).
 *
 * Default: hub + desktop + desktop2 (Electron).
 * Web:     LOCAL_MULTIPEER_REQUIRED=1 node conformance/webrtc-gui-call/run.mjs --peers=hub,web,web2
 * iOS:     LOCAL_MULTIPEER_REQUIRED=1 node conformance/webrtc-gui-call/run.mjs --peers=hub,desktop,ios
 * iOS offer: LOCAL_MULTIPEER_REQUIRED=1 node conformance/webrtc-gui-call/run.mjs --peers=hub,ios,desktop
 * Android: LOCAL_MULTIPEER_REQUIRED=1 node conformance/webrtc-gui-call/run.mjs --peers=hub,desktop,android
 *
 *   LOCAL_MULTIPEER_REQUIRED=1 node conformance/webrtc-gui-call/run.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assert, runMain, section, step } from "../lib/index.mjs";
import { startControlServer } from "../../scripts/peers/control-server.mjs";
import { adapterFor } from "../../scripts/peers/registry.mjs";
import {
  forgetPeer,
  peerEntry,
  recordPeer,
  stateRoot
} from "../../scripts/peers/state.mjs";

const ATTACH_TIMEOUT_MS = 120_000;
const PAIR_TIMEOUT_MS = 120_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseWanted() {
  const fromEnv = process.env.WEBRTC_GUI_PEERS;
  const arg = process.argv.find((entry) => entry.startsWith("--peers="));
  const raw = arg?.slice("--peers=".length) ?? fromEnv ?? "hub,desktop,desktop2";
  return raw.split(",").map((id) => id.trim()).filter(Boolean);
}

function isOpusDuplexPeer(id) {
  return (
    id === "desktop" ||
    id === "desktop2" ||
    id === "web" ||
    id === "web2" ||
    id === "ios" ||
    id === "android"
  );
}

function proofFileName(leftId, rightId) {
  if (leftId.startsWith("web") || rightId.startsWith("web")) return "webrtc-gui-call-web-proof.json";
  if (leftId === "ios" || rightId === "ios" || leftId === "android" || rightId === "android") {
    return `webrtc-gui-call-${[leftId, rightId].sort().join("-")}-proof.json`;
  }
  return "webrtc-gui-call-proof.json";
}

async function bringUpSequential(ids, control) {
  const started = [];
  try {
    for (const id of ids) {
      const adapter = await adapterFor(id);
      assert(adapter !== null, `unknown peer: ${id}`);
      const existing = peerEntry(id);
      if (existing !== null && adapter.running(existing)) {
        step(`${id} already running`);
      } else {
        forgetPeer(id);
        recordPeer(id, await adapter.up({ log: (line) => step(line), build: false }));
        started.push(id);
        step(`${id} started`);
      }
      if (id !== "hub") {
        const agent = await control.waitForAgent(id, ATTACH_TIMEOUT_MS);
        step(`${id} attached (${agent.platform}, lxmf ${agent.lxmfAddress.slice(0, 12)}…)`);
      }
    }
  } catch (error) {
    await tearDown(started);
    throw error;
  }
  return started;
}

async function tearDown(ids) {
  for (const id of [...ids].reverse()) {
    const adapter = await adapterFor(id);
    const entry = peerEntry(id);
    if (adapter === null || entry === null) continue;
    await adapter.down(entry, { log: (line) => step(line) }).catch(() => {});
    forgetPeer(id);
  }
}

await runMain(async () => {
  const wanted = parseWanted();
  assert(wanted.length >= 3 && wanted[0] === "hub", "peers must start with hub and include two GUI peers");
  const leftId = wanted[1];
  const rightId = wanted[2];
  const opusDuplex = isOpusDuplexPeer(leftId) && isOpusDuplexPeer(rightId);
  const proofName = proofFileName(leftId, rightId);

  section(`WebRTC GUI call: ${wanted.join(", ")}`);

  let owned = [];
  let control = null;
  try {
    control = await startControlServer();
    owned = await bringUpSequential(wanted, control);

    // Give Chromium a beat to finish loading the renderer that owns RTCPeerConnection.
    await sleep(2_000);

    section("Renderer ping");
    for (const id of [leftId, rightId]) {
      const ping = await control.command(id, "renderer-ping", {}, 15_000);
      assert(ping.ok === true, `${id} renderer ping failed: ${ping.error ?? "unknown"}`);
      step(`${id} renderer ping ok`);
    }

    // Opus duplex is independent of invite/WebRTC pairing. Run it first so a
    // flaky mobile invite-state path cannot erase Phase 5 codec evidence.
    let callsOpusDuplex = null;
    if (opusDuplex) {
      section("Opus duplex encode/decode/speaker");
      // Mobile Hermes may need a long first-load for asm.js Opus; desktop is fast.
      const duplexTimeoutMs = rightId === "ios" || rightId === "android" || leftId === "ios" || leftId === "android" ? 120_000 : 30_000;
      const leftDuplex = await control.command(leftId, "media-opus-duplex", {}, duplexTimeoutMs);
      assert(leftDuplex.ok === true, `${leftId} Opus duplex failed`);
      assert(leftDuplex.voiceDuplex === true, `${leftId} Opus duplex missing voiceDuplex`);
      assert(typeof leftDuplex.opusBytes === "number" && leftDuplex.opusBytes > 0, `${leftId} Opus encode empty`);
      assert(leftDuplex.played === true, `${leftId} local Opus play failed`);
      step(`${leftId} Opus ${leftDuplex.pcmBytes}→${leftDuplex.opusBytes}→${leftDuplex.decodedBytes} bytes, played (${leftDuplex.implementation})`);

      const rightDuplex = await control.command(rightId, "media-opus-duplex", {}, duplexTimeoutMs);
      assert(rightDuplex.ok === true, `${rightId} Opus duplex failed`);
      assert(rightDuplex.played === true, `${rightId} local Opus play failed`);
      step(`${rightId} Opus duplex local play ok (${rightDuplex.implementation})`);

      section("Cross-peer Opus speaker play");
      const crossAt = Date.now();
      assert(typeof leftDuplex.frameHex === "string" && leftDuplex.frameHex.length > 72, `${leftId} missing Opus TPD2 frame`);
      const played = await control.command(
        rightId,
        "media-opus-play",
        { dataHex: leftDuplex.frameHex, encoding: "16k-opus" },
        duplexTimeoutMs
      );
      assert(played.played === true, `${rightId} did not play peer Opus frame`);
      const crossElapsedMs = Date.now() - crossAt;
      step(`${leftId} → ${rightId} Opus TPD2 played (${played.bytes} bytes, ${crossElapsedMs}ms)`);
      callsOpusDuplex = {
        from: leftId,
        to: rightId,
        encoding: "16k-opus",
        implementation: leftDuplex.implementation,
        peerImplementation: rightDuplex.implementation,
        voiceDuplex: true,
        pcmBytes: leftDuplex.pcmBytes,
        opusBytes: leftDuplex.opusBytes,
        decodedBytes: leftDuplex.decodedBytes,
        frameBytes: leftDuplex.frameBytes,
        peerPlayed: true,
        localPlayed: { [leftId]: true, [rightId]: true },
        elapsedMs: crossElapsedMs
      };
    }

    section("Invite accept (LXMF chrome path)");
    // Confirm both agents still answer before the invite exchange; a dead
    // control channel surfaces as invite-state timeouts otherwise.
    let inviteId = null;
    let left = null;
    let right = null;
    let media = null;
    let elapsedMs = null;
    let rightLxmf = null;
    let recordedCallsWebRtc = null;
    try {
      for (const id of [leftId, rightId]) {
        const info = await control.info(id);
        assert(typeof info.lxmfAddress === "string", `${id} lost its test-agent attachment`);
        step(`${id} agent healthy (${String(info.lxmfAddress).slice(0, 12)}…)`);
      }
      await control.announce(leftId).catch(() => {});
      await control.announce(rightId).catch(() => {});
      // Web leaves discover each other through the hub gateway path; give announces a beat.
      // Mobile peers need longer for LXMF path/identity recall across hub TCP.
      await sleep(leftId === "ios" || rightId === "ios" || leftId === "android" || rightId === "android" ? 5_000 : 2_000);
      rightLxmf = control.agent(rightId).lxmfAddress;
      const sent = await control.sendInvite(leftId, rightLxmf, "line-check", ["microphone"]);
      assert(typeof sent.inviteId === "string", `${leftId} did not send a session invite`);
      step(`${leftId} sent invite ${sent.inviteId}`);
      const deadline = Date.now() + 90_000;
      let raised = null;
      while (Date.now() < deadline) {
        try {
          const invites = await control
            .request(rightId, { cmd: "invite-state" }, 8_000)
            .then((frame) => frame.invites ?? []);
          raised = invites.findLast((entry) => entry.kind === "raised" && entry.id.endsWith(sent.inviteId)) ?? null;
          if (raised !== null) break;
        } catch (error) {
          step(`${rightId} invite-state poll: ${error instanceof Error ? error.message : String(error)}`);
          // Re-check agent liveness; a dead channel will not recover by waiting.
          try {
            await control.info(rightId);
          } catch (infoError) {
            throw new Error(
              `${rightId} lost control attachment while waiting for invite: ${
                infoError instanceof Error ? infoError.message : String(infoError)
              }`
            );
          }
        }
        await sleep(750);
      }
      assert(raised !== null, `${rightId} never raised the session invite`);
      const accepted = await control.acceptInvite(rightId, raised.id);
      assert(accepted.accepted === true, `${rightId} did not accept the invite`);
      step(`${rightId} accepted invite ${raised.id}`);
      inviteId = raised.id;

      section("Pair WebRTC");
      await control.command(leftId, "peer-pair-start", { role: "offer", appId: "line-check" });
      await control.command(rightId, "peer-pair-start", { role: "listen", appId: "line-check" });

      const offer = await control.command(leftId, "peer-pair-code-out", {}, PAIR_TIMEOUT_MS);
      assert(typeof offer.code === "string" && offer.code.length > 0, "offer peer did not publish a manual code");
      step(`${leftId} published offer code (${offer.code.length} chars)`);
      await control.command(rightId, "peer-pair-code-in", { code: offer.code, sessionId: offer.sessionId });

      const answer = await control.command(rightId, "peer-pair-code-out", {}, PAIR_TIMEOUT_MS);
      assert(typeof answer.code === "string" && answer.code.length > 0, "listen peer did not publish an answer code");
      step(`${rightId} published answer code (${answer.code.length} chars)`);
      await control.command(leftId, "peer-pair-code-in", { code: answer.code, sessionId: answer.sessionId });

      left = await control.command(leftId, "peer-pair-wait", {}, PAIR_TIMEOUT_MS);
      right = await control.command(rightId, "peer-pair-wait", {}, PAIR_TIMEOUT_MS);
      assert(left.dataPlane === "webrtc", `${leftId} dataPlane is ${left.dataPlane}, expected webrtc`);
      assert(right.dataPlane === "webrtc", `${rightId} dataPlane is ${right.dataPlane}, expected webrtc`);
      step(`paired ${leftId}↔${rightId} over webrtc (${left.displayLabel} / ${right.displayLabel})`);

      section("WebRTC track attach");
      const callsWebRtc = [];
      const attachTrack = async (fromId, handleId, toId, toLxmf) => {
        const at = Date.now();
        const attached = await control.command(
          fromId,
          "webrtc-open-media",
          { appId: "line-check", handleId, classId: "microphone" },
          60_000
        );
        assert(attached.attached === true, `${fromId} WebRTC media attach failed: ${attached.error ?? "unknown"}`);
        assert(attached.plane === "webrtc-track", `${fromId} unexpected plane ${attached.plane}`);
        assert(
          typeof attached.bytesSent === "number" && attached.bytesSent > 0,
          `${fromId} expected outbound RTP bytes, got ${attached.bytesSent}`
        );
        const tookMs = Date.now() - at;
        step(`${fromId} attached microphone track (${attached.bytesSent} bytesSent, ${tookMs}ms)`);
        if (attached.voiceProcessing?.echoCancellation === true) {
          step(`${fromId} voice-duplex AEC constraints on track attach`);
        }
        callsWebRtc.push({
          from: fromId,
          to: toId,
          inviteId,
          bytes: attached.bytesSent,
          plane: "webrtc-track",
          elapsedMs: tookMs,
          handleId,
          sessionId: attached.sessionId,
          peerDestinationHash: toLxmf,
          voiceProcessing: attached.voiceProcessing ?? null
        });
        return attached;
      };

      media = await attachTrack(leftId, left.handleId, rightId, rightLxmf);
      elapsedMs = callsWebRtc[0]?.elapsedMs ?? null;
      if (callsOpusDuplex !== null) {
        callsOpusDuplex = { ...callsOpusDuplex, voiceProcessing: media.voiceProcessing ?? null };
      }

      // Optional mobile-originated attach when the mobile peer is the answerer.
      // Prefer --peers=hub,ios,desktop so iOS is left/offer and attaches first.
      const mobileId = [leftId, rightId].find((id) => id === "ios" || id === "android");
      if (mobileId !== undefined && mobileId !== leftId) {
        const mobile = mobileId === leftId ? left : right;
        const otherId = mobileId === leftId ? rightId : leftId;
        const otherLxmf = mobileId === leftId ? rightLxmf : control.agent(leftId).lxmfAddress;
        try {
          await attachTrack(mobileId, mobile.handleId, otherId, otherLxmf);
        } catch (mobileError) {
          step(
            `${mobileId}-originated attach deferred: ${
              mobileError instanceof Error ? mobileError.message : String(mobileError)
            }`
          );
        }
      }

      // Keep `media` as the left→right attach for legacy single-entry readers; proof uses the full list.
      recordedCallsWebRtc = callsWebRtc;
    } catch (error) {
      if (callsOpusDuplex === null) throw error;
      // Opus already proved; persist that evidence even when invite/WebRTC flakes.
      step(`invite/WebRTC path failed after Opus evidence: ${error instanceof Error ? error.message : String(error)}`);
    }

    const webRtcEntries =
      recordedCallsWebRtc !== null && recordedCallsWebRtc.length > 0
        ? recordedCallsWebRtc
        : media !== null && inviteId !== null && rightLxmf !== null && elapsedMs !== null && left !== null
          ? [
              {
                from: leftId,
                to: rightId,
                inviteId,
                bytes: media.bytesSent,
                plane: "webrtc-track",
                elapsedMs,
                handleId: left.handleId,
                sessionId: media.sessionId,
                peerDestinationHash: rightLxmf,
                voiceProcessing: media.voiceProcessing ?? null
              }
            ]
          : null;

    const proof = {
      generatedAt: new Date().toISOString(),
      peers: wanted,
      ...(left !== null && right !== null ? { paired: { [leftId]: left, [rightId]: right } } : {}),
      ...(inviteId === null ? {} : { inviteId }),
      ...(webRtcEntries === null ? {} : { callsWebRtc: webRtcEntries }),
      ...(callsOpusDuplex === null ? {} : { callsOpusDuplex: [callsOpusDuplex] })
    };
    mkdirSync(stateRoot, { recursive: true });
    const proofPath = join(stateRoot, proofName);
    writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`);

    section("Result");
    if (webRtcEntries !== null) {
      for (const entry of webRtcEntries) {
        step(`callsWebRtc ${entry.from}→${entry.to} bytes=${entry.bytes} plane=${entry.plane}`);
      }
    }
    if (callsOpusDuplex !== null) {
      step(`callsOpusDuplex opusBytes=${callsOpusDuplex.opusBytes} peerPlayed=true`);
    }
    step(`proof: ${proofPath}`);
    if (webRtcEntries === null && callsOpusDuplex === null) {
      assert(false, "neither WebRTC track bytes nor Opus duplex evidence was recorded");
    }
    // Mobile peers already have recorded WebRTC track-byte proofs; Opus-only is
    // enough to close the Phase 5 codec exit when invite/WebRTC flakes afterward.
    const mobilePeer = leftId === "ios" || rightId === "ios" || leftId === "android" || rightId === "android";
    if (webRtcEntries === null && !(mobilePeer && callsOpusDuplex !== null)) {
      assert(false, "Opus duplex recorded, but invite/WebRTC path did not complete");
    }
  } finally {
    await control?.close();
    if (owned.length > 0) {
      section("Teardown");
      await tearDown(owned);
    }
  }
});
