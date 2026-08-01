#!/usr/bin/env node
/**
 * WebRTC media-track bytes after authenticated pairing (desktop or web GUI).
 *
 * Default: hub + desktop + desktop2 (Electron).
 * Web:     LOCAL_MULTIPEER_REQUIRED=1 node conformance/webrtc-gui-call/run.mjs --peers=hub,web,web2
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
  const proofName =
    leftId.startsWith("web") || rightId.startsWith("web")
      ? "webrtc-gui-call-web-proof.json"
      : "webrtc-gui-call-proof.json";

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

    section("Invite accept (LXMF chrome path)");
    await control.announce(leftId).catch(() => {});
    await control.announce(rightId).catch(() => {});
    // Web leaves discover each other through the hub gateway path; give announces a beat.
    await sleep(2_000);
    const rightLxmf = control.agent(rightId).lxmfAddress;
    const sent = await control.sendInvite(leftId, rightLxmf, "line-check", ["microphone"]);
    assert(typeof sent.inviteId === "string", `${leftId} did not send a session invite`);
    const deadline = Date.now() + 45_000;
    let raised = null;
    while (Date.now() < deadline) {
      const invites = await control.inviteState(rightId);
      raised = invites.findLast((entry) => entry.kind === "raised" && entry.id.endsWith(sent.inviteId)) ?? null;
      if (raised !== null) break;
      await sleep(250);
    }
    assert(raised !== null, `${rightId} never raised the session invite`);
    const accepted = await control.acceptInvite(rightId, raised.id);
    assert(accepted.accepted === true, `${rightId} did not accept the invite`);
    step(`${rightId} accepted invite ${raised.id}`);

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

    const left = await control.command(leftId, "peer-pair-wait", {}, PAIR_TIMEOUT_MS);
    const right = await control.command(rightId, "peer-pair-wait", {}, PAIR_TIMEOUT_MS);
    assert(left.dataPlane === "webrtc", `${leftId} dataPlane is ${left.dataPlane}, expected webrtc`);
    assert(right.dataPlane === "webrtc", `${rightId} dataPlane is ${right.dataPlane}, expected webrtc`);
    step(`paired ${leftId}↔${rightId} over webrtc (${left.displayLabel} / ${right.displayLabel})`);

    section("WebRTC track attach");
    const at = Date.now();
    const media = await control.command(
      leftId,
      "webrtc-open-media",
      { appId: "line-check", handleId: left.handleId, classId: "microphone" },
      60_000
    );
    assert(media.attached === true, "WebRTC media attach failed");
    assert(media.plane === "webrtc-track", `unexpected plane ${media.plane}`);
    assert(typeof media.bytesSent === "number" && media.bytesSent > 0, `expected outbound RTP bytes, got ${media.bytesSent}`);
    const elapsedMs = Date.now() - at;
    step(`${leftId} attached microphone track (${media.bytesSent} bytesSent, ${elapsedMs}ms)`);

    const proof = {
      generatedAt: new Date().toISOString(),
      peers: wanted,
      paired: { [leftId]: left, [rightId]: right },
      inviteId: raised.id,
      callsWebRtc: [
        {
          from: leftId,
          to: rightId,
          inviteId: raised.id,
          bytes: media.bytesSent,
          plane: "webrtc-track",
          elapsedMs,
          handleId: left.handleId,
          sessionId: media.sessionId,
          peerDestinationHash: rightLxmf
        }
      ]
    };
    mkdirSync(stateRoot, { recursive: true });
    const proofPath = join(stateRoot, proofName);
    writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`);

    section("Result");
    step(`callsWebRtc bytes=${media.bytesSent} plane=webrtc-track`);
    step(`proof: ${proofPath}`);
  } finally {
    await control?.close();
    if (owned.length > 0) {
      section("Teardown");
      await tearDown(owned);
    }
  }
});
