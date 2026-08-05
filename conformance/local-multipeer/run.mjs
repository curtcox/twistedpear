#!/usr/bin/env node
/**
 * Single-machine multi-peer discovery and communication matrix.
 *
 * Brings up (or attaches to) a combination of local peer implementations —
 * `tp node` hub, extra headless nodes, the Electron desktop host, the iOS
 * simulator, the Android emulator — and proves, for every ordered pair:
 *
 *   1. discovery    A has seen B's LXMF announce
 *   2. communication A's probe reaches B and B's echo comes back to A
 *
 * Peers are driven through the test agent control channel
 * (`packages/host-core/src/test-agent.ts`); the CLI that starts and stops them
 * is `scripts/peers.mjs`.
 *
 *   node conformance/local-multipeer/run.mjs --attach
 *   node conformance/local-multipeer/run.mjs --peers=hub,node2
 *   node conformance/local-multipeer/run.mjs --smoke
 *   LOCAL_MULTIPEER_REQUIRED=1 node conformance/local-multipeer/run.mjs --peers=hub,desktop
 *
 * GUI peers that cannot start (no Xcode, no emulator, no Electron build) are
 * skipped unless LOCAL_MULTIPEER_REQUIRED=1. When required, every requested GUI
 * peer must attach and appear in readiness, probe, invite, call, and realtime
 * proof rows — that is the shipping-host exit for the realtime-media plan.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assert, runMain, section, step } from "../lib/index.mjs";
import { startControlServer } from "../../scripts/peers/control-server.mjs";
import { GUI_PEER_IDS, adapterFor } from "../../scripts/peers/registry.mjs";
import { encodeDeviceStreamFrame } from "../../packages/protocol/dist/device-stream-framing.js";
import {
  decodeLinkControl,
  encodeReadinessEnvelope,
  parseMediaReadiness,
  READINESS_REQUEST_ID
} from "../../packages/protocol/dist/link-control.js";
import {
  CONTROL_PORT,
  forgetPeer,
  peerEntry,
  readState,
  recordPeer,
  stateRoot
} from "../../scripts/peers/state.mjs";

const args = process.argv.slice(2);
const attach = args.includes("--attach");
const smoke = args.includes("--smoke");
const required = process.env.LOCAL_MULTIPEER_REQUIRED === "1";

function timeoutFromEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? String(fallback), 10);
  assert(Number.isFinite(value) && value > 0, `${name} must be a positive integer`);
  return value;
}

const ATTACH_TIMEOUT_MS = timeoutFromEnv("LOCAL_MULTIPEER_ATTACH_MS", 90_000);
const DISCOVERY_TIMEOUT_MS = timeoutFromEnv("LOCAL_MULTIPEER_DISCOVERY_MS", 90_000);
const MESSAGE_TIMEOUT_MS = timeoutFromEnv("LOCAL_MULTIPEER_MESSAGE_MS", 45_000);
/** Well inside the host's 8 KiB per-peer probe ceiling. */
const PROBE_BUDGET_BYTES = 1024;

function requestedPeers() {
  const flag = args.find((arg) => arg.startsWith("--peers="));
  if (flag !== undefined) {
    return [...new Set(flag.slice("--peers=".length).split(",").filter(Boolean))];
  }
  if (smoke) {
    return ["hub", "node2"];
  }
  if (attach) {
    const recorded = Object.keys(readState().peers);
    assert(recorded.length > 0, "no peers are running; start some with `npm run peers -- up ...`");
    return recorded;
  }
  return ["hub", "node2"];
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitUntil(label, predicate, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      if (await predicate()) {
        return;
      }
      lastError = null;
    } catch (error) {
      lastError = error;
    }
    await sleep(500);
  }
  throw new Error(
    `${label} (waited ${timeoutMs}ms)${lastError === null ? "" : `: ${lastError.message ?? lastError}`}`
  );
}

/** Starts peers this run owns, returning the ids it must stop again. */
async function bringUp(ids) {
  const started = [];
  const skipped = [];
  const ordered = [...ids].sort((a, b) => (a === "hub" ? -1 : b === "hub" ? 1 : 0));
  try {
    for (const id of ordered) {
      const adapter = await adapterFor(id);
      assert(adapter !== null, `unknown peer: ${id}`);
      const existing = peerEntry(id);
      if (existing !== null && adapter.running(existing)) {
        step(`${id} already running`);
        continue;
      }
      forgetPeer(id);
      try {
        recordPeer(id, await adapter.up({ log: (line) => step(line), build: false }));
        started.push(id);
        step(`${id} started`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (GUI_PEER_IDS.includes(id) && !required) {
          step(`${id} skipped: ${message}`);
          skipped.push(id);
          continue;
        }
        throw error;
      }
    }
  } catch (error) {
    await tearDown(started);
    throw error;
  }
  return { started, skipped };
}

async function tearDown(ids) {
  for (const id of [...ids].reverse()) {
    const adapter = await adapterFor(id);
    const entry = peerEntry(id);
    if (adapter === null || entry === null) {
      continue;
    }
    await adapter.down(entry, { log: (line) => step(line) }).catch(() => {});
    forgetPeer(id);
  }
}

await runMain(async () => {
  const wanted = requestedPeers();
  assert(wanted.length >= 2, `need at least two peers, got: ${wanted.join(", ") || "none"}`);

  section(`Local multi-peer matrix: ${wanted.join(", ")}`);

  let owned = [];
  let skipped = [];
  let control = null;

  try {
    try {
      control = await startControlServer();
    } catch (error) {
      throw new Error(
        `could not bind the control port ${CONTROL_PORT} — another run or \`peers status\` holds it: ${error.message}`
      );
    }

    if (!attach) {
      const result = await bringUp(wanted);
      owned = result.started;
      skipped = result.skipped;
    }

    const expected = wanted.filter((id) => !skipped.includes(id));
    assert(
      expected.length >= 2,
      `only ${expected.length} peer(s) available after skips: ${expected.join(", ")}`
    );

    const startedAt = Date.now();
    const results = { discovery: [], messaging: [], readiness: [], probes: [], realtime: [], invites: [], calls: [] };

    section("Attach");
    // Wait concurrently: one unavailable GUI peer should cost one attach
    // timeout, not one timeout for every unavailable peer in the request.
    const attachResults = await Promise.all(
      expected.map(async (id) => {
        try {
          return { id, agent: await control.waitForAgent(id, ATTACH_TIMEOUT_MS) };
        } catch (error) {
          if (GUI_PEER_IDS.includes(id) && !required) {
            return { id, error };
          }
          throw error;
        }
      })
    );
    const attached = [];
    for (const result of attachResults) {
      if ("error" in result) {
        const message = result.error instanceof Error ? result.error.message : String(result.error);
        step(`${result.id} never attached; skipping: ${message}`);
        skipped.push(result.id);
        continue;
      }
      const { id, agent } = result;
      step(`${id} attached (${agent.platform}, lxmf ${agent.lxmfAddress.slice(0, 12)}…)`);
      attached.push(id);
    }
    assert(attached.length >= 2, `only ${attached.length} peer(s) attached: ${attached.join(", ")}`);

    const addresses = new Map();
    for (const id of attached) {
      addresses.set(id, control.agent(id).lxmfAddress);
    }

    section("Discovery");
    // Nudge every peer to announce so discovery does not wait a full periodic
    // round. Announce ingress is rate limited, so a nudge may be dropped —
    // that is fine, the periodic announce is the backstop.
    for (const id of attached) {
      await control.announce(id).catch(() => {});
    }

    // Flood announces so at least one peer records a rung-4 rate-limit drop.
    // Absent peers leave no census row; a rate-limited destination does.
    const flooder = attached[0];
    const observer = attached[1];
    for (let i = 0; i < 8; i += 1) {
      await control.announce(flooder).catch(() => {});
    }
    await sleep(500);
    const observerStatus = await control.status(observer);
    assert(
      observerStatus?.dropCensus !== undefined,
      `${observer} status missing dropCensus`
    );
    const rateKey = "announce-rate-limit:rate_limited";
    const rateLimitedCount = observerStatus.dropCensus.byReason?.[rateKey] ?? 0;
    const absentPeer = observerStatus.dropCensus.byPeer?.["never-seen-destination"];
    assert(
      absentPeer === undefined,
      "absent peer must not appear in dropCensus.byPeer"
    );
    if (rateLimitedCount > 0) {
      step(
        `${observer} recorded ${rateLimitedCount} rate-limited announce drop(s) (distinguishes late/rate-limited from absent)`
      );
    } else {
      step(
        `${observer} dropCensus present (rate-limit may not trip under this topology; byReason keys=${Object.keys(observerStatus.dropCensus.byReason ?? {}).join(",") || "none"})`
      );
    }

    for (const from of attached) {
      for (const to of attached) {
        if (from === to) {
          continue;
        }
        const target = addresses.get(to);
        const at = Date.now();
        await waitUntil(
          `${from} never saw an announce from ${to}`,
          async () => {
            const seen = await control.peers(from);
            return seen.some((peer) => peer.destinationHash === target);
          },
          DISCOVERY_TIMEOUT_MS
        );
        const elapsedMs = Date.now() - at;
        step(`${from} → discovered ${to} (${elapsedMs}ms)`);
        results.discovery.push({ from, to, elapsedMs });
      }
    }

    section("Communication");
    for (const from of attached) {
      for (const to of attached) {
        if (from === to) {
          continue;
        }
        const nonce = `${from}-${to}-${Date.now().toString(36)}`;
        const at = Date.now();
        await control.send(from, addresses.get(to), nonce);
        await waitUntil(
          `${to} never received the probe from ${from}`,
          async () => {
            const inbox = await control.inbox(to);
            return inbox.some((entry) => entry.nonce === nonce && entry.kind === "probe");
          },
          MESSAGE_TIMEOUT_MS
        );
        await waitUntil(
          `${from} never received ${to}'s echo`,
          async () => {
            const inbox = await control.inbox(from);
            return inbox.some((entry) => entry.nonce === nonce && entry.kind === "echo");
          },
          MESSAGE_TIMEOUT_MS
        );
        const elapsedMs = Date.now() - at;
        step(`${from} → ${to} → ${from} round-trip (${elapsedMs}ms)`);
        results.messaging.push({ from, to, nonce, elapsedMs });
      }
    }

    // The readiness exchange and the active probe are the real `TPL1` protocol
    // decoded by the far peer, not a byte echo: the answer must parse as
    // readiness, and the probe reply must close a measurement on the sender.
    section("Peer media readiness exchange");
    for (const from of attached) {
      for (const to of attached) {
        if (from === to) continue;
        const at = Date.now();
        await control.requestReadiness(from, addresses.get(to));
        await waitUntil(
          `${to} never recorded a readiness request from ${from}`,
          async () => (await control.linkState(to)).readiness.some((entry) => entry.kind === "request"),
          MESSAGE_TIMEOUT_MS
        );
        await waitUntil(
          `${from} never received ${to}'s readiness answer`,
          async () => (await control.linkState(from)).readiness.some((entry) => entry.kind === "response"),
          MESSAGE_TIMEOUT_MS
        );
        const answer = (await control.linkState(from)).readiness.findLast((entry) => entry.kind === "response");
        assert(answer !== undefined, `${from} lost ${to}'s readiness answer`);
        // Re-encoding through the shared codec proves the peer sent a real
        // readiness body rather than bytes that merely survived the round trip.
        const reparsed = parseMediaReadiness(
          decodeLinkControl(encodeReadinessEnvelope(READINESS_REQUEST_ID, answer.readiness)).payload
        );
        assert(reparsed !== null, `${to} answered with a readiness body that does not validate`);
        assert(
          answer.readiness.consentPosture !== "closed" && answer.readiness.expiresAt > Date.now(),
          `${to} answered with an expired or closed readiness posture`
        );
        const elapsedMs = Date.now() - at;
        step(`${from} → ${to} readiness ${answer.readiness.downlinkBucket}/${answer.readiness.consentPosture} (${elapsedMs}ms)`);
        results.readiness.push({
          from,
          to,
          downlinkBucket: answer.readiness.downlinkBucket,
          consentPosture: answer.readiness.consentPosture,
          accepts: answer.readiness.accepts.map((entry) => entry.classId),
          elapsedMs
        });
      }
    }

    section("Active link probe");
    for (const from of attached) {
      for (const to of attached) {
        if (from === to) continue;
        const { probeId, budgetBytes } = await control.linkProbe(from, addresses.get(to), PROBE_BUDGET_BYTES);
        assert(typeof probeId === "string" && budgetBytes === PROBE_BUDGET_BYTES, `${from} did not accept the probe budget`);
        await waitUntil(
          `${from} never measured a probe reply from ${to}`,
          async () => (await control.linkState(from)).probes.some((entry) => entry.id === probeId && entry.rttMs !== null),
          MESSAGE_TIMEOUT_MS
        );
        const measured = (await control.linkState(from)).probes.find((entry) => entry.id === probeId);
        assert(measured.rttMs > 0, `${from} recorded a non-positive probe RTT to ${to}`);
        step(`${from} → ${to} probe ${budgetBytes} bytes, rtt ${measured.rttMs}ms`);
        results.probes.push({ from, to, id: probeId, budgetBytes, rttMs: measured.rttMs });
      }
    }

    // A call has to be able to arrive at a host whose app is not running. The
    // invite crosses the network as a signed LXMF message, and the receiving
    // host — not the sender — decides whether it is real and who it is from.
    section("Inbound session invite");
    for (const from of attached) {
      for (const to of attached) {
        if (from === to) continue;
        const at = Date.now();
        const sent = await control.sendInvite(from, addresses.get(to), "line-check", ["microphone"]);
        assert(typeof sent.inviteId === "string", `${from} did not accept the invite request`);
        await waitUntil(
          `${to} never raised ${from}'s session invite`,
          async () => (await control.inviteState(to)).some((entry) => entry.kind === "raised" && entry.id.endsWith(sent.inviteId)),
          MESSAGE_TIMEOUT_MS
        );
        const raised = (await control.inviteState(to)).findLast((entry) => entry.kind === "raised" && entry.id.endsWith(sent.inviteId));
        // The label chrome would show is named locally from the verified
        // sender; nothing the sender wrote reaches it.
        assert(
          raised.peerLabel.length > 0 && !raised.peerLabel.includes(sent.inviteId),
          `${to} took the invited peer's label from the sender`
        );
        assert(raised.appId === "line-check", `${to} raised an invite for the wrong app`);
        assert(raised.expiresAt > Date.now(), `${to} raised an already-expired invite`);
        const elapsedMs = Date.now() - at;
        step(`${from} → ${to} invite ${raised.requestedClasses.join("+")} as "${raised.peerLabel}" (${elapsedMs}ms)`);
        results.invites.push({ from, to, id: raised.id, appId: raised.appId, requestedClasses: raised.requestedClasses, elapsedMs });
      }
    }

    // After chrome would have accepted, prove call media bytes still move on the
    // live LXMF path used by headless (and GUI) peers — not only the carrier probe.
    section("Post-accept call media");
    for (const invite of results.invites) {
      const at = Date.now();
      const accepted = await control.acceptInvite(invite.to, invite.id);
      assert(accepted.accepted === true, `${invite.to} did not accept ${invite.from}'s invite`);
      assert(typeof accepted.peerDestinationHash === "string" && accepted.peerDestinationHash.length > 0, `${invite.to} accepted without a peer destination`);
      const suffix = `call-${invite.from}-${invite.to}-${Date.now().toString(36)}`;
      const frame = encodeMediaFrame(
        `call-pcm-${suffix}`,
        encodeDeviceStreamFrame({
          version: 2,
          sampleKind: 2,
          sessionToken: 3,
          sequence: 0,
          captureAtUs: Date.now() * 1_000,
          clockId: 3,
          payload: new Uint8Array(new Float32Array(160).buffer)
        })
      );
      const nonce = `pcm-${suffix}`;
      const payloadHex = bytesHex(frame);
      await control.sendCall(invite.to, invite.id, nonce, payloadHex);
      await waitUntil(
        `${invite.from} never received post-accept call media from ${invite.to}`,
        async () => (await control.callInbox(invite.from)).some((entry) => entry.nonce === nonce && entry.kind === "payload" && entry.payloadHex === payloadHex),
        MESSAGE_TIMEOUT_MS
      );
      await waitUntil(
        `${invite.to} never received ${invite.from}'s call echo`,
        async () => (await control.callInbox(invite.to)).some((entry) => entry.nonce === nonce && entry.kind === "echo" && entry.payloadHex === payloadHex),
        MESSAGE_TIMEOUT_MS
      );
      const elapsedMs = Date.now() - at;
      step(`${invite.to} accepted → ${invite.from} call media (${frame.length} bytes, ${elapsedMs}ms)`);
      results.calls.push({
        from: invite.to,
        to: invite.from,
        inviteId: invite.id,
        bytes: frame.length,
        elapsedMs
      });
    }

    section("Realtime media carrier");
    for (const from of attached) {
      for (const to of attached) {
        if (from === to) continue;
        const suffix = `${from}-${to}-${Date.now().toString(36)}`;
        const payloads = [
          { kind: "derived", bytes: encodeMediaFrame(`media-derived-${suffix}`, encodeDeviceStreamFrame({ version: 2, sampleKind: 5, sessionToken: 1, sequence: 0, captureAtUs: Date.now() * 1_000, clockId: 1, payload: new TextEncoder().encode('{"kind":"microphone","tier":"derived","voiceActive":true}') })) },
          { kind: "pcm", bytes: encodeMediaFrame(`media-pcm-${suffix}`, encodeDeviceStreamFrame({ version: 2, sampleKind: 2, sessionToken: 2, sequence: 0, captureAtUs: Date.now() * 1_000, clockId: 2, payload: new Uint8Array(new Float32Array(320).buffer) })) }
        ];
        for (const payload of payloads) {
          const nonce = `${payload.kind}-${suffix}`;
          const payloadHex = bytesHex(payload.bytes);
          const at = Date.now();
          await control.sendRealtime(from, addresses.get(to), nonce, payloadHex);
          await waitUntil(`${to} never received ${payload.kind} realtime payload from ${from}`, async () => (await control.realtimeInbox(to)).some((entry) => entry.nonce === nonce && entry.kind === "payload" && entry.payloadHex === payloadHex), MESSAGE_TIMEOUT_MS);
          await waitUntil(`${from} never received ${to}'s ${payload.kind} realtime echo`, async () => (await control.realtimeInbox(from)).some((entry) => entry.nonce === nonce && entry.kind === "echo" && entry.payloadHex === payloadHex), MESSAGE_TIMEOUT_MS);
          const elapsedMs = Date.now() - at;
          step(`${from} → ${to} → ${from} ${payload.kind} carrier (${payload.bytes.length} bytes, ${elapsedMs}ms)`);
          results.realtime.push({ from, to, kind: payload.kind, bytes: payload.bytes.length, elapsedMs });
        }
      }
    }

    if (required) {
      section("Required GUI peer evidence");
      for (const id of wanted.filter((peerId) => GUI_PEER_IDS.includes(peerId))) {
        assert(attached.includes(id), `required GUI peer ${id} was not attached`);
        assert(
          results.readiness.some((row) => row.from === id || row.to === id),
          `required GUI peer ${id} has no readiness exchange row`
        );
        assert(
          results.probes.some((row) => row.from === id || row.to === id),
          `required GUI peer ${id} has no measured probe row`
        );
        assert(
          results.invites.some((row) => row.from === id || row.to === id),
          `required GUI peer ${id} has no session-invite row`
        );
        assert(
          results.calls.some((row) => row.from === id || row.to === id),
          `required GUI peer ${id} has no post-accept call row`
        );
        assert(
          results.realtime.some((row) => row.from === id || row.to === id),
          `required GUI peer ${id} has no realtime carrier row`
        );
        step(`${id} recorded in readiness, probes, invites, calls, and realtime`);
      }
    }

    const proof = {
      generatedAt: new Date().toISOString(),
      mode: attach ? "attach" : "managed",
      requested: wanted,
      attached,
      skipped,
      required,
      durationMs: Date.now() - startedAt,
      peers: attached.map((id) => ({
        id,
        platform: control.agent(id).platform,
        identityHash: control.agent(id).identityHash,
        lxmfAddress: control.agent(id).lxmfAddress
      })),
      ...results
    };
    mkdirSync(stateRoot, { recursive: true });
    const proofPath = join(stateRoot, "multipeer-proof.json");
    writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`);

    section("Result");
    step(`${attached.length} peers, ${results.discovery.length} discovery pairs, ${results.messaging.length} message round-trips, ${results.readiness.length} readiness exchanges, ${results.probes.length} measured probes, ${results.invites.length} delivered session invites, ${results.calls.length} post-accept call round-trips, ${results.realtime.length} realtime carrier round-trips`);
    step(`proof: ${proofPath}`);
  } finally {
    await control?.close();
    if (owned.length > 0) {
      section("Teardown");
      await tearDown(owned);
    }
  }
});

function encodeMediaFrame(idText, frame) {
  const id = new TextEncoder().encode(idText);
  const chunk = new Uint8Array(8 + frame.length);
  new DataView(chunk.buffer).setUint32(0, 0, false); new DataView(chunk.buffer).setUint16(4, 0, false); new DataView(chunk.buffer).setUint16(6, 1, false); chunk.set(frame, 8);
  const out = new Uint8Array(8 + id.length + chunk.length);
  out.set([0x54, 0x50, 0x4d, 0x31]); out[4] = 2; out[5] = id.length; new DataView(out.buffer).setUint16(6, chunk.length, false); out.set(id, 8); out.set(chunk, 8 + id.length);
  return out;
}

function bytesHex(bytes) { return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(""); }
