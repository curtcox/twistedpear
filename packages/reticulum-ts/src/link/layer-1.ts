import {
  encodeLinkSignallingBytesRawFromActions,
  initialEncodeLinkSignallingBytesState,
  initialEncryptLinkPayloadState,
  initialLinkClosedState,
  initialLinkKeepaliveContextState,
  initialLinkModeEnabledState,
  initialLinkRequestHashablePartState,
  initialLinkSendAllowState,
  initialLinkTeardownState,
  initialLinkTokenAccessState,
  initialPackLinkKeepaliveProbeState,
  initialPendingLinkRequestUnregisterState,
  LINK_KEEPALIVE,
  LINK_MODE_DEFAULT,
  LINK_STALE_FACTOR,
  linkRequestHashablePartRawFromActions,
  LinkResourceStrategy,
  LinkStatus,
  linkTeardownRemoteCloseAction,
  linkTeardownSendThenCloseAction,
  packLinkKeepaliveProbeRawFromActions,
  pendingLinkRequestUnregisterIndex,
  shouldAcceptRemoteLinkTeardown,
  shouldAllowLinkSend,
  shouldCloseOnlyLinkTeardown,
  shouldCreateLinkToken,
  shouldEncryptLinkPayloadNow,
  shouldRejectLinkTokenNoKey,
  shouldRemovePendingLinkRequest,
  shouldSendLinkTeardownThenClose,
  shouldTreatLinkClosed,
  shouldTreatLinkKeepaliveContext,
  shouldTreatLinkModeEnabled,
  shouldUseEncodeLinkSignallingBytes,
  shouldUseLinkRequestHashablePart,
  shouldUsePackLinkKeepaliveProbe,
  stepEncodeLinkSignallingBytesWithActions,
  stepEncryptLinkPayloadWithActions,
  stepLinkClosedWithActions,
  stepLinkKeepaliveContextWithActions,
  stepLinkModeEnabledWithActions,
  stepLinkRequestHashablePartWithActions,
  stepLinkSendAllowWithActions,
  stepLinkTeardownWithActions,
  stepLinkTokenAccessWithActions,
  stepLinkWatchdogWithActions,
  stepPackLinkKeepaliveProbeWithActions,
  stepPendingLinkRequestUnregisterWithActions,
  type LinkModeValue,
  type LinkResourceStrategyValue,
  type LinkStatusValue,
  type LinkTeardownAction,
  type LinkTeardownReasonValue,
  type LinkWatchdogState,
  type LinkWatchdogStepResult,
} from "./protocol.js";

import type { CryptoProvider } from "../crypto/provider.js";
import { Token } from "../crypto/token.js";
import { Channel, LinkChannelOutlet } from "../channel.js";
import { bytesToHex, equalBytes } from "../crypto/bytes.js";
import { DestinationDirection, DestinationType } from "../destination.js";
import { Identity } from "../identity.js";
import type { PacketInterface } from "../interfaces/interface.js";
import { LinkRequestReceipt } from "../link-request-receipt.js";
import {
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  TransportType,
} from "../packet.js";
import type { PacketReceipt } from "../packet-receipt.js";
import type {
  RegisteredDestination,
  RequestHandler,
} from "../registered-destination.js";
import { RETICULUM_MTU } from "../reticulum-constants.js";
import type { Clock } from "../runtime/runtime.js";
import type { LeafTransport } from "../transport/node.js";
import { PATHFINDER_MAX_HOPS } from "../transport/node.js";
import { Resource, ResourceAdvertisement } from "../resource.js";
import {
  LINK_ECPUB_SIZE,
  LINK_KEY_SIZE,
  LINK_MTU_SIZE,
  LINK_SIGNATURE_SIZE,
  linkEstablishmentTimeoutForHops,
  linkMduForMtu,
  linkRttSecondsForRequest,
  mergedLinkRtt,
} from "./shared.js";
import type {
  InitiatorLinkOptions,
  LinkCallbacks,
  LinkSendContextResult,
} from "./shared.js";
import type { Link } from "../link.js";
export class LinkLayer1 {
  readonly type = DestinationType.LINK;
  readonly callbacks: LinkCallbacks;
  readonly initiator: boolean;
  readonly owner: RegisteredDestination | null;
  readonly destination: RegisteredDestination | null;

  linkId!: Uint8Array;
  hash!: Uint8Array;
  status: LinkStatusValue = LinkStatus.PENDING;
  rtt: number | null = null;
  mtu = RETICULUM_MTU;
  mdu = 0;
  expectedHops: number | null = null;
  attachedInterface: PacketInterface | null = null;
  establishmentCost = 0;
  requestTime = 0;
  activatedAt: number | null = null;
  lastInbound = 0;
  lastOutbound = 0;
  lastKeepalive = 0;
  lastData = 0;
  keepalive = LINK_KEEPALIVE;
  staleTime = LINK_KEEPALIVE * LINK_STALE_FACTOR;
  establishmentTimeout = linkEstablishmentTimeoutForHops(1, LINK_KEEPALIVE);
  teardownReason: LinkTeardownReasonValue | null = null;
  remoteIdentity: Identity | null = null;
  mode: LinkModeValue = LINK_MODE_DEFAULT;
  resourceStrategy: LinkResourceStrategyValue = LinkResourceStrategy.ACCEPT_ALL;

  protected readonly outgoingResourcesList: Resource[] = [];
  protected readonly incomingResourcesList: Resource[] = [];
  /**
   * Assembled segments of split resources, keyed by hex `originalHash`. Each
   * segment arrives as its own resource, so the completed pieces accumulate
   * here until the last one lands and the whole payload can be handed over.
   */
  protected readonly resourceSegmentsByOriginalHash = new Map<
    string,
    Uint8Array[]
  >();

  protected readonly provider: CryptoProvider;
  protected readonly transport: LeafTransport;
  protected readonly clock: Clock;
  protected readonly pendingRequests: LinkRequestReceipt[] = [];
  protected privateKey: Uint8Array | null = null;
  protected publicKeyBytes: Uint8Array | null = null;
  protected peerPublicKeyBytes: Uint8Array | null = null;
  protected peerSignaturePublicKeyBytes: Uint8Array | null = null;
  protected derivedKey: Uint8Array | null = null;
  protected token: Token | null = null;
  protected channel: Channel | null = null;
  protected watchdogTimer: ReturnType<Clock["setTimeout"]> | null = null;

  protected constructor(
    provider: CryptoProvider,
    transport: LeafTransport,
    clock: Clock,
    options: {
      readonly initiator: boolean;
      readonly owner: RegisteredDestination | null;
      readonly destination: RegisteredDestination | null;
      readonly callbacks?: LinkCallbacks;
    },
  ) {
    this.provider = provider;
    this.transport = transport;
    this.clock = clock;
    this.initiator = options.initiator;
    this.owner = options.owner;
    this.destination = options.destination;
    this.callbacks = options.callbacks ?? {};
  }

  static linkIdFromLrPacket(
    provider: CryptoProvider,
    packet: Packet,
  ): Uint8Array {
    const stepped = stepLinkRequestHashablePartWithActions(
      initialLinkRequestHashablePartState(),
      {
        kind: "link-proof/request-hashable-gate",
        hashablePart: packet.hashablePart(),
        requestDataLength: packet.data.length,
      },
    );
    const hashablePart = shouldUseLinkRequestHashablePart(stepped.actions)
      ? linkRequestHashablePartRawFromActions(stepped.actions)
      : null;
    if (hashablePart === null) {
      throw new Error("Link.linkIdFromLrPacket: missing use-raw action");
    }
    return Identity.truncatedHash(provider, hashablePart);
  }

  static signallingBytes(mtu: number, mode: LinkModeValue): Uint8Array {
    const modeEnabled = stepLinkModeEnabledWithActions(
      initialLinkModeEnabledState(),
      {
        kind: "link/mode-enabled-gate",
        mode,
      },
    );
    if (!shouldTreatLinkModeEnabled(modeEnabled.actions)) {
      throw new Error(`Requested link mode ${mode} is not enabled`);
    }

    const stepped = stepEncodeLinkSignallingBytesWithActions(
      initialEncodeLinkSignallingBytesState(),
      {
        kind: "link-proof/encode-signalling-gate",
        mtu,
        mode,
      },
    );
    const raw = encodeLinkSignallingBytesRawFromActions(stepped.actions);
    if (!shouldUseEncodeLinkSignallingBytes(stepped.actions) || raw === null) {
      throw new Error("Could not encode link signalling bytes");
    }
    return raw;
  }

  setLinkId(packet: Packet): void {
    this.linkId = LinkLayer1.linkIdFromLrPacket(this.provider, packet);
    this.hash = this.linkId;
  }

  get cryptoProvider(): CryptoProvider {
    return this.provider;
  }

  get incomingResources(): readonly Resource[] {
    return this.incomingResourcesList;
  }

  get outgoingResources(): readonly Resource[] {
    return this.outgoingResourcesList;
  }

  /** Record one assembled segment of a split resource. */
  appendResourceSegment(originalHash: Uint8Array, segment: Uint8Array): void {
    const key = bytesToHex(originalHash);
    const segments = this.resourceSegmentsByOriginalHash.get(key);
    if (segments === undefined) {
      this.resourceSegmentsByOriginalHash.set(key, [segment]);
      return;
    }
    segments.push(segment);
  }

  /**
   * Concatenate and forget every segment recorded for `originalHash`. Called
   * once the final segment of a split resource is assembled.
   */
  takeResourceSegments(originalHash: Uint8Array): Uint8Array {
    const key = bytesToHex(originalHash);
    const segments = this.resourceSegmentsByOriginalHash.get(key) ?? [];
    this.resourceSegmentsByOriginalHash.delete(key);
    const total = segments.reduce((sum, segment) => sum + segment.length, 0);
    const joined = new Uint8Array(total);
    let offset = 0;
    for (const segment of segments) {
      joined.set(segment, offset);
      offset += segment.length;
    }
    return joined;
  }

  unregisterPendingRequest(receipt: LinkRequestReceipt): void {
    const stepped = stepPendingLinkRequestUnregisterWithActions(
      initialPendingLinkRequestUnregisterState(),
      {
        kind: "link/pending-request-unregister-gate",
        index: this.pendingRequests.indexOf(receipt),
      },
    );
    const index = pendingLinkRequestUnregisterIndex(stepped.actions);
    if (shouldRemovePendingLinkRequest(stepped.actions) && index !== null) {
      this.pendingRequests.splice(index, 1);
    }
  }

  encrypt(plaintext: Uint8Array): Uint8Array {
    return this.tokenInstance().encrypt(plaintext, {
      entropy: this.transport.entropy,
    });
  }

  async send(data: Uint8Array): Promise<void> {
    await this.sendContext(PacketContext.NONE, data);
  }

  async sendContext(
    context: number,
    data: Uint8Array,
    options: { createReceipt?: boolean; encrypt?: boolean } = {},
  ): Promise<LinkSendContextResult> {
    const sendAllow = stepLinkSendAllowWithActions(
      initialLinkSendAllowState(),
      {
        kind: "link/send-allow-gate",
        status: this.status,
      },
    );
    if (!shouldAllowLinkSend(sendAllow.actions)) {
      throw new Error("Cannot send on inactive link");
    }

    const encryptStepped = stepEncryptLinkPayloadWithActions(
      initialEncryptLinkPayloadState(),
      {
        kind: "link/encrypt-payload-gate",
        encryptOption: options.encrypt,
      },
    );
    const payload = shouldEncryptLinkPayloadNow(encryptStepped.actions)
      ? this.encrypt(data)
      : data;
    const packet = Packet.fromFields(this.provider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.LINK,
      packetType: PacketType.DATA,
      destinationHash: this.linkId,
      context,
      data: payload,
    });

    const receipt = await this.transport.sendPacket(packet, {
      attachedInterface: this.attachedInterface,
      createReceipt: options.createReceipt ?? false,
    });
    this.hadOutbound(
      shouldTreatLinkKeepaliveContext(
        stepLinkKeepaliveContextWithActions(
          initialLinkKeepaliveContextState(),
          {
            kind: "link/keepalive-context-gate",
            context,
          },
        ).actions,
      ),
    );
    return { raw: packet.raw, receipt };
  }

  async teardown(): Promise<void> {
    await this.applyLinkTeardownActions(
      stepLinkTeardownWithActions(
        initialLinkTeardownState({
          status: this.status,
          initiator: this.initiator,
        }),
        { kind: "teardown/local" },
      ).actions,
    );
  }

  close(): void {
    this.stopWatchdog();
    this.status = LinkStatus.CLOSED;
    this.privateKey = null;
    this.publicKeyBytes = null;
    this.derivedKey = null;
    this.token = null;
    this.channel?.shutdown();
    this.channel = null;
    for (const resource of [
      ...this.incomingResourcesList,
      ...this.outgoingResourcesList,
    ]) {
      resource.cancel();
    }
    this.incomingResourcesList.length = 0;
    this.outgoingResourcesList.length = 0;
    this.resourceSegmentsByOriginalHash.clear();
    this.transport.unregisterLink(this as unknown as Link);
    this.callbacks.linkClosed?.(this as unknown as Link);
  }

  updateMdu(): void {
    this.mdu = linkMduForMtu(this.mtu);
  }

  hadOutbound(isKeepalive = false): void {
    const now = this.clock.now() / 1000;
    this.lastOutbound = now;
    this.lastInbound = now;
    if (isKeepalive) {
      this.applyWatchdogResult(
        stepLinkWatchdogWithActions(this.snapshotWatchdogState(), {
          kind: "link/keepalive-sent",
          at: now,
        }),
      );
    } else {
      this.lastData = now;
    }
  }

  protected async applyLinkTeardownActions(
    actions: readonly LinkTeardownAction[],
  ): Promise<void> {
    if (shouldCloseOnlyLinkTeardown(actions)) {
      this.close();
      return;
    }

    if (shouldSendLinkTeardownThenClose(actions)) {
      const send = linkTeardownSendThenCloseAction(actions);
      if (send === null) {
        return;
      }
      await this.sendTeardownPacket();
      this.teardownReason = send.reason;
      this.close();
      return;
    }

    if (!shouldAcceptRemoteLinkTeardown(actions)) {
      return;
    }
    const remote = linkTeardownRemoteCloseAction(actions);
    if (remote === null) {
      return;
    }
    this.teardownReason = remote.reason;
    this.close();
  }

  protected async sendTeardownPacket(): Promise<void> {
    await this.sendContext(PacketContext.LINKCLOSE, this.linkId);
  }

  protected async sendKeepalive(): Promise<void> {
    const packProbe = stepPackLinkKeepaliveProbeWithActions(
      initialPackLinkKeepaliveProbeState(),
      { kind: "link-keepalive/pack-probe-gate" },
    );
    if (!shouldUsePackLinkKeepaliveProbe(packProbe.actions)) {
      throw new Error("Link.sendKeepalive: missing use-raw action");
    }
    const probe = packLinkKeepaliveProbeRawFromActions(packProbe.actions);
    if (probe === null) {
      throw new Error("Link.sendKeepalive: missing use-raw action");
    }
    await this.sendContext(PacketContext.KEEPALIVE, probe);
  }

  protected startWatchdog(): void {
    this.applyWatchdogResult(
      stepLinkWatchdogWithActions(this.snapshotWatchdogState(), {
        kind: "link/watchdog-start",
      }),
    );
  }

  protected stopWatchdog(): void {
    this.watchdogTimer?.cancel();
    this.watchdogTimer = null;
  }

  protected scheduleWatchdog(delayMs: number): void {
    this.watchdogTimer?.cancel();
    this.watchdogTimer = this.clock.setTimeout(() => {
      this.watchdogTick();
    }, delayMs);
  }

  protected watchdogTick(): void {
    const closedStepped = stepLinkClosedWithActions(initialLinkClosedState(), {
      kind: "link/closed-gate",
      status: this.status,
    });
    if (shouldTreatLinkClosed(closedStepped.actions)) {
      return;
    }

    this.applyWatchdogResult(
      stepLinkWatchdogWithActions(this.snapshotWatchdogState(), {
        kind: "timer/fired",
        id: "link-watchdog",
        at: this.clock.now(),
      }),
    );
  }

  protected snapshotWatchdogState(): LinkWatchdogState {
    return {
      status: this.status,
      initiator: this.initiator,
      requestTime: this.requestTime,
      establishmentTimeout: this.establishmentTimeout,
      activatedAt: this.activatedAt,
      lastInbound: this.lastInbound,
      lastKeepalive: this.lastKeepalive,
      keepalive: this.keepalive,
      staleTime: this.staleTime,
      rtt: this.rtt,
      teardownReason: this.teardownReason,
    };
  }

  protected applyWatchdogResult(result: LinkWatchdogStepResult): void {
    this.status = result.state.status as LinkStatusValue;
    this.keepalive = result.state.keepalive;
    this.staleTime = result.state.staleTime;
    this.rtt = result.state.rtt;
    this.activatedAt = result.state.activatedAt;
    this.lastInbound = result.state.lastInbound;
    this.lastKeepalive = result.state.lastKeepalive;
    this.teardownReason = result.state
      .teardownReason as LinkTeardownReasonValue | null;

    for (const action of result.actions) {
      if (action.kind === "send-keepalive") {
        void this.sendKeepalive().catch(() => {
          // The link can close between the watchdog step and this best-effort send.
        });
      } else if (action.kind === "send-teardown") {
        void this.sendTeardownPacket().catch(() => {
          // A concurrent close can make the teardown packet unsendable.
        });
      } else if (action.kind === "mark-stale") {
        this.status = LinkStatus.STALE;
      } else {
        this.teardownReason = action.reason as LinkTeardownReasonValue;
        this.close();
        return;
      }
    }

    for (const intent of result.intents) {
      if (intent.kind === "timer/set" && intent.timer.id === "link-watchdog") {
        this.scheduleWatchdog(intent.timer.delayMs);
      }
    }
  }

  protected tokenInstance(): Token {
    const gate = stepLinkTokenAccessWithActions(initialLinkTokenAccessState(), {
      kind: "token/access-gate",
      derivedKeyPresent: this.derivedKey !== null,
      tokenPresent: this.token !== null,
    });
    if (shouldRejectLinkTokenNoKey(gate.actions)) {
      throw new Error("Link has no derived key");
    }
    if (shouldCreateLinkToken(gate.actions)) {
      this.token = new Token(this.provider, this.derivedKey!);
    }

    return this.token!;
  }
}
