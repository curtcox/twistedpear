import {
  Identity,
  bytesToHex,
  hexToBytes,
  type DuplexConnection,
} from "@twistedpear/reticulum-ts";
import { LXMessageMethod } from "@twistedpear/lxmf-ts";
import {
  decodeLinkControl,
  encodeLinkControl,
  encodeReadinessEnvelope,
  parseMediaReadiness,
  READINESS_REQUEST_ID,
  READINESS_RESPONSE_ID,
  type ObserveDropIntent,
  type PeerMediaReadiness,
} from "@twistedpear/protocol";
import { type DeliveredSessionInvite } from "./session-invite-carrier.js";
import {
  createHostLxmfDelivery,
  type HostLxmfDeliverySession,
} from "./host-lxmf-delivery.js";
import { createDropCensus } from "./drop-census.js";
import { createObserveRing } from "./observe-ring.js";
import {
  assembledPayloadHex,
  assembleChunkSeries,
  chunkSeriesPlan,
  parseChunkedBody,
  type ChunkFrame,
} from "./test-agent-chunk.js";
import type {
  TestAgentInboxEntry,
  TestAgentInviteEntry,
  TestAgentOptions,
  TestAgentProbeEntry,
  TestAgentReadinessEntry,
  TestAgentRealtimeEntry,
  TestAgentSession,
  TestAgentStatus,
} from "./test-agent.js";

/** Probe messages carry this title so agents never echo unrelated LXMF traffic. */
export const TEST_AGENT_PROBE_TITLE = "tp-probe";
export const TEST_AGENT_REALTIME_TITLE = "tp-realtime";
/** Post-accept call media (distinct from the realtime carrier probe). */
export const TEST_AGENT_CALL_TITLE = "tp-call";
/** Readiness exchange and active link probes ride this title as `TPL1` bytes. */
export const TEST_AGENT_LINK_TITLE = "tp-link";

export const PROBE_PREFIX = "tp-probe:";
const ECHO_PREFIX = "tp-probe-echo:";
export const REALTIME_PREFIX = "tp-realtime:";
const REALTIME_ECHO_PREFIX = "tp-realtime-echo:";
export const CALL_PREFIX = "tp-call:";
const CALL_ECHO_PREFIX = "tp-call-echo:";
const LINK_PREFIX = "tp-link:";
/** Matches the host default: one probe per peer per minute, 8 KiB ceiling. */
export const LINK_PROBE_MAX_BUDGET_BYTES = 8 * 1024;
const LINK_READINESS_TTL_MS = 60_000;
/** Invitations are short-lived: a call the user never saw must not linger. */
export const SESSION_INVITE_TTL_MS = 120_000;

export interface ControlRequest {
  readonly id?: number;
  readonly cmd: string;
  readonly toLxmfAddress?: string;
  readonly nonce?: string;
  readonly payloadHex?: string;
  readonly [key: string]: unknown;
}

type LinkControlEnvelope = NonNullable<ReturnType<typeof decodeLinkControl>>;

/** A chunked payload carrier that echoes what it receives back to the sender. */
interface EchoableCarrier {
  readonly prefix: string;
  readonly echoPrefix: string;
  readonly entries: TestAgentRealtimeEntry[];
  readonly send: (
    toLxmfAddress: string,
    prefix: string,
    nonce: string,
    payloadHex: string,
  ) => Promise<void>;
  readonly echoFailureLabel: string;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class TestAgentRuntime {
  protected readonly options: TestAgentOptions;
  protected readonly log: (line: string) => void;
  private readonly reconnectWaitMs: number;
  private readonly announceIntervalMs: number;
  private readonly invitableApps: Set<string>;
  private readonly ownsDelivery: boolean;
  protected readonly inviteEntries: TestAgentInviteEntry[] = [];
  protected readonly inboxEntries: TestAgentInboxEntry[] = [];
  protected readonly realtimeEntries: TestAgentRealtimeEntry[] = [];
  protected readonly callEntries: TestAgentRealtimeEntry[] = [];
  protected readonly readinessEntries: TestAgentReadinessEntry[] = [];
  protected readonly probeEntries = new Map<string, TestAgentProbeEntry>();
  private readonly partials = new Map<
    string,
    { parts: Array<string | null> }
  >();
  protected readonly dropCensus: ReturnType<typeof createDropCensus> =
    createDropCensus();
  private readonly observeRing = createObserveRing(256);
  protected readonly observeState;
  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder();
  protected deliverySession!: HostLxmfDeliverySession;
  protected nextProbe = 0;
  protected nextInvite = 0;
  private announcesSeen = 0;
  private notifyObserve: ((drop: ObserveDropIntent) => void) | null = null;
  private stopped = false as boolean;
  private connection: DuplexConnection | null = null;
  private announceTimer: ReturnType<typeof setInterval> | null = null;

  protected constructor(options: TestAgentOptions) {
    this.options = options;
    this.log = options.log ?? (() => {});
    this.reconnectWaitMs = options.reconnectWaitMs ?? 1_000;
    this.announceIntervalMs = options.announceIntervalMs ?? 10_000;
    this.invitableApps = new Set(options.invitableApps ?? ["line-check"]);
    this.ownsDelivery = options.delivery === undefined;
    this.observeState = {
      observeSubscribed: false,
      observeRing: this.observeRing,
      dropCensusSnapshot: () => this.dropCensus.snapshot(),
      label: options.label,
    };
  }

  session(): TestAgentSession {
    const { label, platform } = this.options;
    const { identityHash, lxmfAddress } = this.deliverySession;
    return {
      label,
      platform,
      identityHash,
      lxmfAddress,
      peers: () => this.deliverySession.peers(),
      inbox: () => [...this.inboxEntries],
      status: () => this.buildStatus(),
      send: (toLxmfAddress, nonce) =>
        this.sendProbe(toLxmfAddress, `${PROBE_PREFIX}${nonce}`),
      announce: () => this.deliverySession.delivery.announce(),
      stop: () => this.stop(),
    };
  }

  protected async init(): Promise<void> {
    await this.initDelivery();
    this.registerObservers();
    this.deliverySession.onMessage((message) => this.dispatchInbound(message));
    this.notifyObserve = (drop) => {
      if (this.observeState.observeSubscribed) {
        void this.write({ event: "observe.drop", drop });
      }
    };
    await this.announceQuietly();
    void this.dialLoop();
    this.announceTimer =
      this.announceIntervalMs > 0
        ? setInterval(
            () => void this.announceQuietly(),
            this.announceIntervalMs,
          )
        : null;
    this.announceTimer?.unref();
  }

  private async initDelivery(): Promise<void> {
    /**
     * The shipping carrier, verbatim. Headless peers create a delivery destination
     * here; GUI hosts pass the one they already started so invites never depend on
     * the agent being mounted.
     */
    this.deliverySession =
      this.options.delivery ??
      (await createHostLxmfDelivery({
        reticulum: this.options.reticulum,
        provider: this.options.provider,
        identity: this.options.identity,
        announceIntervalMs: 0, // agent owns the announce timer below
        receiveSessionInvite: async (invite) => {
          this.recordRaisedInvite(invite);
          await this.options.receiveSessionInvite?.(invite);
        },
        isInvitableApp: (appId) => this.invitableApps.has(appId),
        log: this.log,
      }));
    if (!this.ownsDelivery) {
      this.deliverySession.onInvite((invite) => {
        this.recordRaisedInvite(invite);
      });
    }
  }

  private recordRaisedInvite(invite: DeliveredSessionInvite): void {
    const peerDestinationHash = this.peerDestinationHashForInvite(invite.id);
    this.inviteEntries.push({
      kind: "raised",
      id: invite.id,
      appId: invite.appId,
      peerLabel: invite.verifiedPeerLabel,
      requestedClasses: invite.requestedClasses,
      expiresAt: invite.expiresAt,
      at: Date.now(),
      ...(peerDestinationHash === undefined ? {} : { peerDestinationHash }),
    });
  }

  private registerObservers(): void {
    const { reticulum } = this.options;
    // Count announces the harness status panel cares about without duplicating
    // the delivery peer roster owned by `deliverySession`.
    reticulum.registerAnnounceHandler({
      aspectFilter: "lxmf.delivery",
      receivedAnnounce: () => {
        this.announcesSeen += 1;
      },
    });
    reticulum.registerDropObserver((drop) => {
      this.dropCensus.record(drop);
      this.observeRing.push(drop);
      this.notifyObserve?.(drop);
    });
  }

  /** Invite ids are `${sourceHashHex.slice(0, 16)}-${senderId}`. */
  protected peerDestinationHashForInvite(inviteId: string): string | undefined {
    const prefix = inviteId.slice(0, 16);
    if (prefix.length < 16) return undefined;
    return this.deliverySession
      .peers()
      .find((peer) => peer.destinationHash.startsWith(prefix))?.destinationHash;
  }

  private outboundFor(toLxmfAddress: string) {
    const hash = hexToBytes(toLxmfAddress);
    const recipient = Identity.recall(this.options.provider, hash);
    if (recipient === null) {
      throw new Error(
        `No announced identity for ${toLxmfAddress}; peer not discovered yet`,
      );
    }
    return this.deliverySession.router.createOutboundDestination(recipient);
  }

  protected async sendMessage(
    toLxmfAddress: string,
    title: string,
    content: string,
  ): Promise<void> {
    await this.deliverySession.router.packAndSend({
      destination: this.outboundFor(toLxmfAddress),
      source: this.deliverySession.delivery,
      title,
      content,
      desiredMethod: LXMessageMethod.OPPORTUNISTIC,
      deferStamp: true,
    });
  }

  protected sendProbe(toLxmfAddress: string, content: string) {
    return this.sendMessage(toLxmfAddress, TEST_AGENT_PROBE_TITLE, content);
  }

  /**
   * A readiness body or a media frame does not fit one opportunistic LXMF
   * packet, so hex payloads ride a `<prefix><nonce>:<index>:<count>:<hex>`
   * chunk series sized to `LXMF_OPPORTUNISTIC_MAX_CONTENT`. Both ends run this
   * file, and the reassembled payload is what the harness observes.
   */
  private async sendChunkedHex(
    toLxmfAddress: string,
    title: string,
    prefix: string,
    nonce: string,
    payloadHex: string,
  ): Promise<number> {
    const { perChunk, count } = chunkSeriesPlan(
      title,
      prefix,
      nonce,
      payloadHex,
    );
    for (let index = 0; index < count; index += 1) {
      const chunk = payloadHex.slice(index * perChunk, (index + 1) * perChunk);
      await this.sendMessage(
        toLxmfAddress,
        title,
        `${prefix}${nonce}:${index}:${count}:${chunk}`,
      );
    }
    return count;
  }

  /** Returns the reassembled hex once the final chunk of a series lands. */
  private receiveChunkedHex(
    from: string,
    prefix: string,
    frame: ChunkFrame,
  ): string | null {
    const key = `${from}\0${prefix}\0${frame.nonce}`;
    const assembled = assembleChunkSeries(frame, this.partials.get(key));
    if (assembled === null) return null;
    if (!assembled.complete) {
      this.partials.set(key, { parts: assembled.parts });
      return null;
    }
    this.partials.delete(key);
    return assembledPayloadHex(assembled.parts);
  }

  protected localReadiness(): PeerMediaReadiness {
    if (this.options.mediaReadiness !== undefined) {
      return this.options.mediaReadiness();
    }
    return {
      hostApi: "0.12.0",
      accepts: [
        { classId: "microphone", maxRung: "16k-opus", encodings: ["16k-opus"] },
      ],
      offers: [
        { classId: "microphone", maxRung: "16k-opus", encodings: ["16k-opus"] },
      ],
      downlinkBucket: "audio",
      constrained: ["foreground-only"],
      consentPosture: "ask",
      expiresAt: Date.now() + LINK_READINESS_TTL_MS,
    };
  }

  protected async sendLinkControl(
    toLxmfAddress: string,
    id: string,
    envelope: Uint8Array,
  ): Promise<void> {
    await this.sendChunkedHex(
      toLxmfAddress,
      TEST_AGENT_LINK_TITLE,
      LINK_PREFIX,
      id,
      bytesToHex(envelope),
    );
  }

  protected async sendRealtime(
    toLxmfAddress: string,
    prefix: string,
    nonce: string,
    payloadHex: string,
  ): Promise<void> {
    await this.sendChunkedHex(
      toLxmfAddress,
      TEST_AGENT_REALTIME_TITLE,
      prefix,
      nonce,
      payloadHex,
    );
  }

  protected async sendCall(
    toLxmfAddress: string,
    prefix: string,
    nonce: string,
    payloadHex: string,
  ): Promise<void> {
    await this.sendChunkedHex(
      toLxmfAddress,
      TEST_AGENT_CALL_TITLE,
      prefix,
      nonce,
      payloadHex,
    );
  }

  /**
   * Answers the readiness and probe protocols. Undecodable bytes are dropped
   * in silence: this path is never a generic echo service.
   */
  private receiveLinkControl(from: string, content: string): void {
    if (!content.startsWith(LINK_PREFIX)) return;
    const framed = parseChunkedBody(content.slice(LINK_PREFIX.length));
    if (framed === null) return;
    const payloadHex = this.receiveChunkedHex(from, LINK_PREFIX, framed);
    if (payloadHex === null || payloadHex.length > 2 * (8 + 64 + 8192)) return;
    const envelope = decodeLinkControl(hexToBytes(payloadHex));
    if (envelope === null) return;
    if (envelope.type === 1) {
      this.receiveReadiness(from, envelope);
      return;
    }
    if (envelope.type === 2) {
      this.replyToLinkProbe(from, envelope);
      return;
    }
    this.recordProbeReply(envelope);
  }

  private receiveReadiness(from: string, envelope: LinkControlEnvelope): void {
    const readiness = parseMediaReadiness(envelope.payload);
    if (
      readiness === null ||
      readiness.consentPosture === "closed" ||
      readiness.expiresAt <= Date.now()
    ) {
      return;
    }
    this.readinessEntries.push({
      fromDestinationHash: from,
      kind: envelope.id === READINESS_REQUEST_ID ? "request" : "response",
      readiness,
      receivedAt: Date.now(),
    });
    if (envelope.id !== READINESS_REQUEST_ID) return;
    void this.sendLinkControl(
      from,
      READINESS_RESPONSE_ID,
      encodeReadinessEnvelope(READINESS_RESPONSE_ID, this.localReadiness()),
    ).catch((error: unknown) =>
      this.log(`test-agent readiness reply failed: ${errorText(error)}`),
    );
  }

  private replyToLinkProbe(from: string, envelope: LinkControlEnvelope): void {
    void this.sendLinkControl(
      from,
      envelope.id,
      encodeLinkControl({
        type: 3,
        id: envelope.id,
        payload: envelope.payload,
      }),
    ).catch((error: unknown) =>
      this.log(`test-agent probe reply failed: ${errorText(error)}`),
    );
  }

  /** Only a reply that matches the bytes we sent closes the measurement. */
  private recordProbeReply(envelope: LinkControlEnvelope): void {
    const pending = this.probeEntries.get(envelope.id);
    if (pending === undefined || pending.rttMs !== null) return;
    if (
      envelope.payload.length + 8 + envelope.id.length !==
      pending.budgetBytes
    ) {
      return;
    }
    this.probeEntries.set(envelope.id, {
      ...pending,
      rttMs: Math.max(1, Date.now() - pending.sentAt),
    });
  }

  /** Records a realtime/call payload and echoes it back once. */
  private receiveEchoable(
    from: string,
    content: string,
    carrier: EchoableCarrier,
  ): void {
    const echo = content.startsWith(carrier.echoPrefix);
    const prefix = echo ? carrier.echoPrefix : carrier.prefix;
    if (!content.startsWith(prefix)) return;
    const framed = parseChunkedBody(content.slice(prefix.length));
    if (framed === null) return;
    const payloadHex = this.receiveChunkedHex(from, prefix, framed);
    if (payloadHex === null) return;
    carrier.entries.push({
      nonce: framed.nonce,
      kind: echo ? "echo" : "payload",
      fromDestinationHash: from,
      payloadHex,
      receivedAt: Date.now(),
    });
    if (echo) return;
    void carrier
      .send(from, carrier.echoPrefix, framed.nonce, payloadHex)
      .catch((error: unknown) =>
        this.log(`${carrier.echoFailureLabel}: ${errorText(error)}`),
      );
  }

  private receiveProbe(from: string, content: string): void {
    const echoNonce = nonceFrom(content, ECHO_PREFIX);
    if (echoNonce !== null) {
      this.inboxEntries.push({
        nonce: echoNonce,
        kind: "echo",
        fromDestinationHash: from,
        receivedAt: Date.now(),
      });
      return;
    }
    const probeNonce = nonceFrom(content, PROBE_PREFIX);
    if (probeNonce === null) return;
    this.inboxEntries.push({
      nonce: probeNonce,
      kind: "probe",
      fromDestinationHash: from,
      receivedAt: Date.now(),
    });
    void this.sendProbe(from, `${ECHO_PREFIX}${probeNonce}`).catch(
      (error: unknown) => {
        this.log(`test-agent echo failed: ${errorText(error)}`);
      },
    );
  }

  private dispatchInbound(message: {
    contentAsString(): string;
    titleAsString(): string;
    readonly sourceHash: Uint8Array;
  }): void {
    let content: string;
    try {
      content = message.contentAsString();
    } catch {
      return;
    }
    const from = bytesToHex(message.sourceHash);
    const title = message.titleAsString();
    if (title === TEST_AGENT_LINK_TITLE) {
      this.receiveLinkControl(from, content);
      return;
    }
    if (title === TEST_AGENT_REALTIME_TITLE) {
      this.receiveEchoable(from, content, {
        prefix: REALTIME_PREFIX,
        echoPrefix: REALTIME_ECHO_PREFIX,
        entries: this.realtimeEntries,
        send: (to, prefix, nonce, payloadHex) =>
          this.sendRealtime(to, prefix, nonce, payloadHex),
        echoFailureLabel: "test-agent realtime echo failed",
      });
      return;
    }
    if (title === TEST_AGENT_CALL_TITLE) {
      this.receiveEchoable(from, content, {
        prefix: CALL_PREFIX,
        echoPrefix: CALL_ECHO_PREFIX,
        entries: this.callEntries,
        send: (to, prefix, nonce, payloadHex) =>
          this.sendCall(to, prefix, nonce, payloadHex),
        echoFailureLabel: "test-agent call echo failed",
      });
      return;
    }
    this.receiveProbe(from, content);
  }

  protected buildStatus(): TestAgentStatus {
    const { label, platform, reticulum } = this.options;
    const { identityHash, lxmfAddress } = this.deliverySession;
    const interfaces = reticulum.listInterfaces();
    return {
      label,
      platform,
      identityHash,
      lxmfAddress,
      linkOnline: interfaces.some((iface) => iface.online),
      interfaceCount: interfaces.length,
      announcesSeen: this.announcesSeen,
      dropCensus: this.dropCensus.snapshot(),
      peerCount: this.deliverySession.peers().length,
      inboxCount: this.inboxEntries.length,
      realtimeInboxCount: this.realtimeEntries.length,
      readinessCount: this.readinessEntries.length,
      probeCount: this.probeEntries.size,
      inviteCount: this.inviteEntries.length,
      callInboxCount: this.callEntries.length,
      pathTableCount: reticulum.pathTableCount,
    };
  }

  protected async dispatchCommand(
    request: ControlRequest,
  ): Promise<Record<string, unknown>> {
    if (this.options.handleCommand !== undefined) {
      return { ...(await this.options.handleCommand(request)) };
    }
    throw new Error(`Unknown test-agent command: ${request.cmd}`);
  }

  private async write(payload: Record<string, unknown>): Promise<void> {
    await this.connection?.write(
      this.encoder.encode(`${JSON.stringify(payload)}\n`),
    );
  }

  private async serve(socket: DuplexConnection): Promise<void> {
    const { label, platform } = this.options;
    const { identityHash, lxmfAddress } = this.deliverySession;
    this.connection = socket;
    await this.write({
      event: "hello",
      label,
      platform,
      identityHash,
      lxmfAddress,
    });
    let buffer = "";
    for await (const chunk of socket.readable) {
      buffer += this.decoder.decode(chunk, { stream: true });
      buffer = await this.drainControlBuffer(buffer);
    }
  }

  private async drainControlBuffer(initial: string): Promise<string> {
    let buffer = initial;
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf("\n");
      if (line === "") continue;
      await this.handleControlLine(line);
    }
    return buffer;
  }

  private async handleControlLine(line: string): Promise<void> {
    let request: ControlRequest;
    try {
      request = JSON.parse(line) as ControlRequest;
    } catch {
      return;
    }
    try {
      const result = await this.dispatchCommand(request);
      await this.write({ id: request.id, ok: true, ...result });
    } catch (error: unknown) {
      await this.write({
        id: request.id,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async dialLoop(): Promise<void> {
    const { controlHost, controlPort, reticulum } = this.options;
    while (!this.stopped) {
      try {
        const socket = await reticulum.runtime.tcp.connect({
          host: controlHost,
          port: controlPort,
        });
        this.log(`test-agent connected to ${controlHost}:${controlPort}`);
        await this.serve(socket);
      } catch (error: unknown) {
        this.log(
          `test-agent control channel: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      this.connection = null;
      if ((this.stopped as boolean) === true) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, this.reconnectWaitMs));
    }
  }

  /**
   * A peer may come up before the hub is reachable, and an announce over a
   * not-yet-connected interface throws. Mounting the agent must never take the
   * host down over that — the periodic re-announce covers the gap.
   */
  private async announceQuietly(): Promise<void> {
    try {
      await this.deliverySession.delivery.announce();
    } catch (error: unknown) {
      this.log(
        `test-agent announce deferred: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async stop(): Promise<void> {
    this.stopped = true;
    if (this.announceTimer !== null) {
      clearInterval(this.announceTimer);
    }
    await this.connection?.close().catch(() => {});
    this.connection = null;
    if (this.ownsDelivery) {
      await this.deliverySession.stop();
    }
  }
}

function nonceFrom(content: string, prefix: string): string | null {
  return content.startsWith(prefix) ? content.slice(prefix.length) : null;
}
