/**
 * Test-only peer control agent for the single-machine multi-peer environment.
 *
 * Every host implementation (tp node, Electron desktop, iOS/Android harness)
 * can mount this agent to become observable and drivable by
 * `conformance/local-multipeer`. It never activates on a default code path: a
 * host must be handed an explicit control endpoint.
 *
 * The agent dials *out* to the harness control server rather than listening.
 * Outbound works identically from a Node process, a Bare worklet, the iOS
 * simulator, and the Android emulator (via 10.0.2.2), and needs no listening
 * socket or entitlement inside a sandboxed app. The socket comes from
 * `reticulum.runtime.tcp`, so the same code runs on every runtime.
 */

import {
  Identity,
  bytesToHex,
  hexToBytes,
  type CryptoProvider,
  type DuplexConnection,
  type Reticulum
} from "@twistedpear/reticulum-ts";
import { LXMFRouter, LXMessageMethod } from "@twistedpear/lxmf-ts";
import {
  decodeLinkControl,
  encodeLinkControl,
  encodeReadinessEnvelope,
  parseMediaReadiness,
  READINESS_REQUEST_ID,
  READINESS_RESPONSE_ID,
  type PeerMediaReadiness
} from "@twistedpear/protocol";

/** Probe messages carry this title so agents never echo unrelated LXMF traffic. */
export const TEST_AGENT_PROBE_TITLE = "tp-probe";
export const TEST_AGENT_REALTIME_TITLE = "tp-realtime";
/** Readiness exchange and active link probes ride this title as `TPL1` bytes. */
export const TEST_AGENT_LINK_TITLE = "tp-link";
const PROBE_PREFIX = "tp-probe:";
const ECHO_PREFIX = "tp-probe-echo:";
const REALTIME_PREFIX = "tp-realtime:";
const REALTIME_ECHO_PREFIX = "tp-realtime-echo:";
const LINK_PREFIX = "tp-link:";
const LXMF_DELIVERY_ASPECT = "lxmf.delivery";
/** Matches the host default: one probe per peer per minute, 8 KiB ceiling. */
const LINK_PROBE_MAX_BUDGET_BYTES = 8 * 1024;
const LINK_READINESS_TTL_MS = 60_000;
/** `LXMF_ENCRYPTED_PACKET_MAX_CONTENT`: the opportunistic single-packet budget. */
const LXMF_OPPORTUNISTIC_MAX_CONTENT = 295;
/** `:<index>:<count>:` with four-digit fields. */
const CHUNK_HEADER_SLACK = 12;
/** LXMF measures the packed title plus content, so leave msgpack room. */
const CHUNK_MSGPACK_SLACK = 16;
const MAX_CHUNKS = 512;
const MAX_CHUNKED_PAYLOAD_HEX = 262_144;

export interface TestAgentPeerRecord {
  /** Delivery destination hash of the announcing peer, hex. */
  readonly destinationHash: string;
  /** Truncated identity hash of the announcing peer, hex. */
  readonly identityHash: string;
  readonly firstSeenAt: number;
  readonly lastSeenAt: number;
  readonly count: number;
}

export interface TestAgentInboxEntry {
  readonly nonce: string;
  /** `probe` for an inbound probe, `echo` for the reply to one we sent. */
  readonly kind: "probe" | "echo";
  readonly fromDestinationHash: string;
  readonly receivedAt: number;
}

export interface TestAgentRealtimeEntry {
  readonly nonce: string;
  readonly kind: "payload" | "echo";
  readonly fromDestinationHash: string;
  readonly payloadHex: string;
  readonly receivedAt: number;
}

export interface TestAgentReadinessEntry {
  readonly fromDestinationHash: string;
  /** `request` opened the exchange; `response` answered ours. */
  readonly kind: "request" | "response";
  readonly readiness: PeerMediaReadiness;
  readonly receivedAt: number;
}

export interface TestAgentProbeEntry {
  readonly id: string;
  readonly toDestinationHash: string;
  readonly budgetBytes: number;
  readonly sentAt: number;
  readonly rttMs: number | null;
}

export interface TestAgentInfo {
  readonly label: string;
  readonly platform: string;
  readonly identityHash: string;
  readonly lxmfAddress: string;
}

export interface TestAgentStatus extends TestAgentInfo {
  readonly linkOnline: boolean;
  readonly interfaceCount: number;
  readonly announcesSeen: number;
  readonly peerCount: number;
  readonly inboxCount: number;
  readonly realtimeInboxCount: number;
  readonly readinessCount: number;
  readonly probeCount: number;
  readonly pathTableCount: number;
}

export interface TestAgentOptions {
  readonly reticulum: Reticulum;
  readonly provider: CryptoProvider;
  readonly identity: Identity;
  /** Stable peer id used by the harness, e.g. `hub`, `ios`, `desktop`. */
  readonly label: string;
  /** Free-form implementation tag, e.g. `tp-node`, `desktop-worklet`, `ios`. */
  readonly platform: string;
  readonly controlHost: string;
  readonly controlPort: number;
  /** Re-announce cadence. 0 disables the periodic announce. */
  readonly announceIntervalMs?: number;
  readonly reconnectWaitMs?: number;
  /** Readiness this peer advertises. Defaults to a narrow, TTL-bounded posture. */
  readonly mediaReadiness?: () => PeerMediaReadiness;
  readonly log?: (line: string) => void;
  /** Optional host-specific commands used by deeper conformance harnesses. */
  readonly handleCommand?: (
    request: Readonly<Record<string, unknown>>
  ) => Promise<Readonly<Record<string, unknown>>>;
}

export interface TestAgentSession extends TestAgentInfo {
  peers(): ReadonlyArray<TestAgentPeerRecord>;
  inbox(): ReadonlyArray<TestAgentInboxEntry>;
  status(): TestAgentStatus;
  /** Sends a probe to a peer's delivery destination hash (hex). */
  send(toLxmfAddress: string, nonce: string): Promise<void>;
  announce(): Promise<void>;
  stop(): Promise<void>;
}

interface ControlRequest {
  readonly id?: number;
  readonly cmd: string;
  readonly toLxmfAddress?: string;
  readonly nonce?: string;
  readonly payloadHex?: string;
  readonly [key: string]: unknown;
}

function nonceFrom(content: string, prefix: string): string | null {
  return content.startsWith(prefix) ? content.slice(prefix.length) : null;
}

/**
 * Mounts the agent and starts dialing the control server in the background.
 * Resolves once the LXMF delivery destination exists, so callers can read
 * `lxmfAddress` immediately without waiting for the harness to be up.
 */
export async function mountTestAgent(options: TestAgentOptions): Promise<TestAgentSession> {
  const { reticulum, provider, identity, label, platform, controlHost, controlPort } = options;
  const log = options.log ?? (() => {});
  const reconnectWaitMs = options.reconnectWaitMs ?? 1_000;
  const announceIntervalMs = options.announceIntervalMs ?? 10_000;

  const router = new LXMFRouter({ reticulum, provider });
  const delivery = router.registerDeliveryIdentity(identity);
  const lxmfAddress = bytesToHex(delivery.hash);
  const identityHash = bytesToHex(provider.sha256(identity.getPublicKey()).slice(0, 16));

  const peers = new Map<string, TestAgentPeerRecord>();
  const inboxEntries: TestAgentInboxEntry[] = [];
  const realtimeEntries: TestAgentRealtimeEntry[] = [];
  const readinessEntries: TestAgentReadinessEntry[] = [];
  const probeEntries = new Map<string, TestAgentProbeEntry>();
  /** In-flight chunk series, keyed by sender + prefix + nonce. */
  const partials = new Map<string, { parts: Array<string | null> }>();
  let nextProbe = 0;
  let announcesSeen = 0;
  let stopped = false;
  let connection: DuplexConnection | null = null;

  reticulum.registerAnnounceHandler({
    aspectFilter: LXMF_DELIVERY_ASPECT,
    receivedAnnounce(info) {
      announcesSeen += 1;
      const destinationHash = bytesToHex(info.destinationHash);
      if (destinationHash === lxmfAddress) {
        return;
      }
      const now = Date.now();
      const existing = peers.get(destinationHash);
      peers.set(destinationHash, {
        destinationHash,
        identityHash: bytesToHex(provider.sha256(info.announcedIdentity.getPublicKey()).slice(0, 16)),
        firstSeenAt: existing?.firstSeenAt ?? now,
        lastSeenAt: now,
        count: (existing?.count ?? 0) + 1
      });
    }
  });

  const recordInbox = (entry: TestAgentInboxEntry): void => {
    inboxEntries.push(entry);
  };

  const outboundFor = (toLxmfAddress: string) => {
    const hash = hexToBytes(toLxmfAddress);
    const recipient = Identity.recall(provider, hash);
    if (recipient === null) {
      throw new Error(`No announced identity for ${toLxmfAddress}; peer not discovered yet`);
    }
    return router.createOutboundDestination(recipient);
  };

  const sendMessage = async (toLxmfAddress: string, title: string, content: string): Promise<void> => {
    await router.packAndSend({
      destination: outboundFor(toLxmfAddress),
      source: delivery,
      title,
      content,
      desiredMethod: LXMessageMethod.OPPORTUNISTIC,
      deferStamp: true
    });
  };
  const sendProbe = (toLxmfAddress: string, content: string) => sendMessage(toLxmfAddress, TEST_AGENT_PROBE_TITLE, content);

  /**
   * A readiness body or a media frame does not fit one opportunistic LXMF
   * packet, so hex payloads ride a `<prefix><nonce>:<index>:<count>:<hex>`
   * chunk series sized to `LXMF_OPPORTUNISTIC_MAX_CONTENT`. Both ends run this
   * file, and the reassembled payload is what the harness observes.
   */
  const sendChunkedHex = async (
    toLxmfAddress: string,
    title: string,
    prefix: string,
    nonce: string,
    payloadHex: string
  ): Promise<number> => {
    if (!/^[0-9a-f]*$/i.test(payloadHex) || payloadHex.length > MAX_CHUNKED_PAYLOAD_HEX) {
      throw new Error("chunked test payload is malformed");
    }
    if (nonce.length < 1 || nonce.length > 160 || nonce.includes(":")) {
      throw new Error("chunked test payload is malformed");
    }
    const room =
      LXMF_OPPORTUNISTIC_MAX_CONTENT -
      title.length -
      CHUNK_MSGPACK_SLACK -
      prefix.length -
      nonce.length -
      CHUNK_HEADER_SLACK;
    const perChunk = room - (room % 2);
    if (perChunk < 32) {
      throw new Error("chunked test payload nonce leaves no room for content");
    }
    const count = Math.max(1, Math.ceil(payloadHex.length / perChunk));
    if (count > MAX_CHUNKS) {
      throw new Error("chunked test payload exceeds the chunk ceiling");
    }
    for (let index = 0; index < count; index += 1) {
      const chunk = payloadHex.slice(index * perChunk, (index + 1) * perChunk);
      await sendMessage(toLxmfAddress, title, `${prefix}${nonce}:${index}:${count}:${chunk}`);
    }
    return count;
  };

  /** Returns the reassembled hex once the final chunk of a series lands. */
  const receiveChunkedHex = (
    from: string,
    prefix: string,
    nonce: string,
    index: number,
    count: number,
    chunk: string
  ): string | null => {
    if (count < 1 || count > MAX_CHUNKS || index < 0 || index >= count) return null;
    const key = `${from} ${prefix} ${nonce}`;
    const pending = partials.get(key);
    const parts = pending?.parts.length === count ? pending.parts : new Array<string | null>(count).fill(null);
    parts[index] = chunk;
    if (parts.some((part) => part === null)) {
      partials.set(key, { parts });
      return null;
    }
    partials.delete(key);
    const payloadHex = parts.join("");
    return payloadHex.length > MAX_CHUNKED_PAYLOAD_HEX ? null : payloadHex;
  };

  /** Splits `<nonce>:<index>:<count>:<hex>` without letting a nonce hide colons. */
  const parseChunkedBody = (
    body: string
  ): { nonce: string; index: number; count: number; chunk: string } | null => {
    const parts = body.split(":");
    if (parts.length !== 4) return null;
    const [nonce = "", rawIndex = "", rawCount = "", chunk = ""] = parts;
    if (nonce.length < 1 || nonce.length > 160) return null;
    if (!/^\d{1,4}$/.test(rawIndex) || !/^\d{1,4}$/.test(rawCount)) return null;
    if (!/^[0-9a-f]*$/i.test(chunk) || chunk.length % 2 !== 0) return null;
    return { nonce, index: Number(rawIndex), count: Number(rawCount), chunk };
  };

  const localReadiness = options.mediaReadiness ?? ((): PeerMediaReadiness => ({
    hostApi: "0.12.0",
    accepts: [{ classId: "microphone", maxRung: "16k-opus", encodings: ["16k-opus"] }],
    offers: [{ classId: "microphone", maxRung: "16k-opus", encodings: ["16k-opus"] }],
    downlinkBucket: "audio",
    constrained: ["foreground-only"],
    consentPosture: "ask",
    expiresAt: Date.now() + LINK_READINESS_TTL_MS
  }));

  const sendLinkControl = async (toLxmfAddress: string, id: string, envelope: Uint8Array): Promise<void> => {
    await sendChunkedHex(toLxmfAddress, TEST_AGENT_LINK_TITLE, LINK_PREFIX, id, bytesToHex(envelope));
  };

  const sendRealtime = async (toLxmfAddress: string, prefix: string, nonce: string, payloadHex: string): Promise<void> => {
    await sendChunkedHex(toLxmfAddress, TEST_AGENT_REALTIME_TITLE, prefix, nonce, payloadHex);
  };

  router.onDelivery((message) => {
    let content: string;
    try {
      content = message.contentAsString();
    } catch {
      return;
    }
    const from = bytesToHex(message.sourceHash);
    if (message.titleAsString() === TEST_AGENT_LINK_TITLE) {
      // Undecodable bytes are dropped in silence: this path answers the
      // readiness and probe protocols, it is never a generic echo service.
      if (!content.startsWith(LINK_PREFIX)) return;
      const framed = parseChunkedBody(content.slice(LINK_PREFIX.length));
      if (framed === null) return;
      const payloadHex = receiveChunkedHex(from, LINK_PREFIX, framed.nonce, framed.index, framed.count, framed.chunk);
      if (payloadHex === null || payloadHex.length > 2 * (8 + 64 + 8192)) return;
      const envelope = decodeLinkControl(hexToBytes(payloadHex));
      if (envelope === null) return;
      if (envelope.type === 1) {
        const readiness = parseMediaReadiness(envelope.payload);
        if (readiness === null || readiness.consentPosture === "closed" || readiness.expiresAt <= Date.now()) return;
        readinessEntries.push({
          fromDestinationHash: from,
          kind: envelope.id === READINESS_REQUEST_ID ? "request" : "response",
          readiness,
          receivedAt: Date.now()
        });
        if (envelope.id === READINESS_REQUEST_ID) {
          void sendLinkControl(
            from,
            READINESS_RESPONSE_ID,
            encodeReadinessEnvelope(READINESS_RESPONSE_ID, localReadiness())
          ).catch((error: unknown) =>
            log(`test-agent readiness reply failed: ${error instanceof Error ? error.message : String(error)}`)
          );
        }
        return;
      }
      if (envelope.type === 2) {
        void sendLinkControl(from, envelope.id, encodeLinkControl({ type: 3, id: envelope.id, payload: envelope.payload })).catch(
          (error: unknown) => log(`test-agent probe reply failed: ${error instanceof Error ? error.message : String(error)}`)
        );
        return;
      }
      const pending = probeEntries.get(envelope.id);
      // Only a reply that matches the bytes we sent closes the measurement.
      if (pending === undefined || pending.rttMs !== null) return;
      if (envelope.payload.length + 8 + envelope.id.length !== pending.budgetBytes) return;
      probeEntries.set(envelope.id, { ...pending, rttMs: Math.max(1, Date.now() - pending.sentAt) });
      return;
    }
    if (message.titleAsString() === TEST_AGENT_REALTIME_TITLE) {
      const echo = content.startsWith(REALTIME_ECHO_PREFIX);
      const prefix = echo ? REALTIME_ECHO_PREFIX : REALTIME_PREFIX;
      if (!content.startsWith(prefix)) return;
      const framed = parseChunkedBody(content.slice(prefix.length));
      if (framed === null) return;
      const payloadHex = receiveChunkedHex(from, prefix, framed.nonce, framed.index, framed.count, framed.chunk);
      if (payloadHex === null) return;
      realtimeEntries.push({ nonce: framed.nonce, kind: echo ? "echo" : "payload", fromDestinationHash: from, payloadHex, receivedAt: Date.now() });
      if (!echo) void sendRealtime(from, REALTIME_ECHO_PREFIX, framed.nonce, payloadHex).catch((error: unknown) => log(`test-agent realtime echo failed: ${error instanceof Error ? error.message : String(error)}`));
      return;
    }
    const echoNonce = nonceFrom(content, ECHO_PREFIX);
    if (echoNonce !== null) {
      recordInbox({ nonce: echoNonce, kind: "echo", fromDestinationHash: from, receivedAt: Date.now() });
      return;
    }
    const probeNonce = nonceFrom(content, PROBE_PREFIX);
    if (probeNonce === null) {
      return;
    }
    recordInbox({ nonce: probeNonce, kind: "probe", fromDestinationHash: from, receivedAt: Date.now() });
    void sendProbe(from, `${ECHO_PREFIX}${probeNonce}`).catch((error: unknown) => {
      log(`test-agent echo failed: ${error instanceof Error ? error.message : String(error)}`);
    });
  });

  const buildStatus = (): TestAgentStatus => {
    const interfaces = reticulum.listInterfaces();
    return {
      label,
      platform,
      identityHash,
      lxmfAddress,
      linkOnline: interfaces.some((iface) => iface.online),
      interfaceCount: interfaces.length,
      announcesSeen,
      peerCount: peers.size,
      inboxCount: inboxEntries.length,
      realtimeInboxCount: realtimeEntries.length,
      readinessCount: readinessEntries.length,
      probeCount: probeEntries.size,
      pathTableCount: reticulum.pathTableCount
    };
  };

  const handle = async (request: ControlRequest): Promise<Record<string, unknown>> => {
    switch (request.cmd) {
      case "info":
        return { label, platform, identityHash, lxmfAddress };
      case "peers":
        return { peers: [...peers.values()] };
      case "inbox":
        return { inbox: [...inboxEntries] };
      case "realtime-inbox":
        return { inbox: [...realtimeEntries] };
      case "status":
        return { status: buildStatus() };
      case "announce":
        await delivery.announce();
        return {};
      case "send": {
        if (request.toLxmfAddress === undefined || request.nonce === undefined) {
          throw new Error("send requires toLxmfAddress and nonce");
        }
        await sendProbe(request.toLxmfAddress, `${PROBE_PREFIX}${request.nonce}`);
        return {};
      }
      case "send-realtime": {
        if (request.toLxmfAddress === undefined || request.nonce === undefined || request.payloadHex === undefined) throw new Error("send-realtime requires toLxmfAddress, nonce, and payloadHex");
        await sendRealtime(request.toLxmfAddress, REALTIME_PREFIX, request.nonce, request.payloadHex);
        return {};
      }
      case "link-state":
        return { readiness: [...readinessEntries], probes: [...probeEntries.values()] };
      case "request-readiness": {
        if (request.toLxmfAddress === undefined) throw new Error("request-readiness requires toLxmfAddress");
        await sendLinkControl(
          request.toLxmfAddress,
          READINESS_REQUEST_ID,
          encodeReadinessEnvelope(READINESS_REQUEST_ID, localReadiness())
        );
        return {};
      }
      case "link-probe": {
        if (request.toLxmfAddress === undefined) throw new Error("link-probe requires toLxmfAddress");
        const budgetBytes = typeof request.budgetBytes === "number" ? request.budgetBytes : LINK_PROBE_MAX_BUDGET_BYTES;
        if (!Number.isInteger(budgetBytes) || budgetBytes < 256 || budgetBytes > LINK_PROBE_MAX_BUDGET_BYTES) {
          throw new Error(`link-probe budget must be 256-${LINK_PROBE_MAX_BUDGET_BYTES} bytes`);
        }
        const id = `probe-${label}-${nextProbe++}`;
        const envelope = encodeLinkControl({ type: 2, id, payload: new Uint8Array(Math.max(0, budgetBytes - 8 - id.length)) });
        probeEntries.set(id, {
          id,
          toDestinationHash: request.toLxmfAddress,
          budgetBytes: envelope.length,
          sentAt: Date.now(),
          rttMs: null
        });
        await sendLinkControl(request.toLxmfAddress, id, envelope);
        // `id` is the control frame's correlation key; never shadow it here.
        return { probeId: id, budgetBytes: envelope.length };
      }
      default:
        if (options.handleCommand !== undefined) {
          return { ...(await options.handleCommand(request)) };
        }
        throw new Error(`Unknown test-agent command: ${request.cmd}`);
    }
  };

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const write = async (payload: Record<string, unknown>): Promise<void> => {
    await connection?.write(encoder.encode(`${JSON.stringify(payload)}\n`));
  };

  const serve = async (socket: DuplexConnection): Promise<void> => {
    connection = socket;
    await write({ event: "hello", label, platform, identityHash, lxmfAddress });
    let buffer = "";
    for await (const chunk of socket.readable) {
      buffer += decoder.decode(chunk, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
        if (line === "") {
          continue;
        }
        let request: ControlRequest;
        try {
          request = JSON.parse(line) as ControlRequest;
        } catch {
          continue;
        }
        try {
          const result = await handle(request);
          await write({ id: request.id, ok: true, ...result });
        } catch (error: unknown) {
          await write({
            id: request.id,
            ok: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }
  };

  const dialLoop = async (): Promise<void> => {
    while (!stopped) {
      try {
        const socket = await reticulum.runtime.tcp.connect({ host: controlHost, port: controlPort });
        log(`test-agent connected to ${controlHost}:${controlPort}`);
        await serve(socket);
      } catch (error: unknown) {
        log(`test-agent control channel: ${error instanceof Error ? error.message : String(error)}`);
      }
      connection = null;
      if (stopped) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, reconnectWaitMs));
    }
  };

  /**
   * A peer may come up before the hub is reachable, and an announce over a
   * not-yet-connected interface throws. Mounting the agent must never take the
   * host down over that — the periodic re-announce covers the gap.
   */
  const announceQuietly = async (): Promise<void> => {
    try {
      await delivery.announce();
    } catch (error: unknown) {
      log(`test-agent announce deferred: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  await announceQuietly();
  void dialLoop();

  const announceTimer =
    announceIntervalMs > 0 ? setInterval(() => void announceQuietly(), announceIntervalMs) : null;
  announceTimer?.unref?.();

  return {
    label,
    platform,
    identityHash,
    lxmfAddress,
    peers: () => [...peers.values()],
    inbox: () => [...inboxEntries],
    status: buildStatus,
    send: (toLxmfAddress, nonce) => sendProbe(toLxmfAddress, `${PROBE_PREFIX}${nonce}`),
    announce: () => delivery.announce(),
    async stop() {
      stopped = true;
      if (announceTimer !== null) {
        clearInterval(announceTimer);
      }
      await connection?.close().catch(() => {});
      connection = null;
    }
  };
}
