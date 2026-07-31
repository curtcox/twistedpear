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

/** Probe messages carry this title so agents never echo unrelated LXMF traffic. */
export const TEST_AGENT_PROBE_TITLE = "tp-probe";
export const TEST_AGENT_REALTIME_TITLE = "tp-realtime";
const PROBE_PREFIX = "tp-probe:";
const ECHO_PREFIX = "tp-probe-echo:";
const REALTIME_PREFIX = "tp-realtime:";
const REALTIME_ECHO_PREFIX = "tp-realtime-echo:";
const LXMF_DELIVERY_ASPECT = "lxmf.delivery";

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
  const sendRealtime = (toLxmfAddress: string, prefix: string, nonce: string, payloadHex: string) => {
    if (!/^[0-9a-f]*$/i.test(payloadHex) || payloadHex.length > 262_144 || nonce.length < 1 || nonce.length > 160 || nonce.includes(":")) throw new Error("realtime test payload is malformed");
    return sendMessage(toLxmfAddress, TEST_AGENT_REALTIME_TITLE, `${prefix}${nonce}:${payloadHex}`);
  };

  router.onDelivery((message) => {
    let content: string;
    try {
      content = message.contentAsString();
    } catch {
      return;
    }
    const from = bytesToHex(message.sourceHash);
    if (message.titleAsString() === TEST_AGENT_REALTIME_TITLE) {
      const echo = content.startsWith(REALTIME_ECHO_PREFIX);
      const prefix = echo ? REALTIME_ECHO_PREFIX : REALTIME_PREFIX;
      if (!content.startsWith(prefix)) return;
      const separator = content.indexOf(":", prefix.length);
      if (separator < 0) return;
      const nonce = content.slice(prefix.length, separator);
      const payloadHex = content.slice(separator + 1);
      if (!/^[0-9a-f]*$/i.test(payloadHex) || payloadHex.length > 262_144 || nonce.length < 1 || nonce.length > 160) return;
      realtimeEntries.push({ nonce, kind: echo ? "echo" : "payload", fromDestinationHash: from, payloadHex, receivedAt: Date.now() });
      if (!echo) void sendRealtime(from, REALTIME_ECHO_PREFIX, nonce, payloadHex).catch((error: unknown) => log(`test-agent realtime echo failed: ${error instanceof Error ? error.message : String(error)}`));
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
