import {
  CHANNEL_MAX_TRIES,
  CHANNEL_SEQ_MAX,
  CHANNEL_SEQ_MODULUS,
  channelEmplaceIndex,
  channelEnvelopeFieldsFromActions,
  ChannelExceptionTypeCode,
  channelMessageHandlerUnregisterIndex,
  ChannelMessageState,
  channelPacketTimeoutFromActions,
  channelPayloadMdu,
  channelRingSequenceIndexFromActions,
  channelTxEnvelopeIndexFromActions,
  channelTxOutstandingCountFromActions,
  channelTxReceiptTimeoutExtensions,
  channelTxTimeoutRetryAction,
  ChannelWindowLimits,
  drainContiguousChannelSequences,
  initialAcceptChannelSequenceState,
  initialApplyChannelTxReceiptTimeoutExtensionState,
  initialChannelAllowsSendState,
  initialChannelEnvelopePackState,
  initialChannelEnvelopeUnpackState,
  initialChannelMessageHandlerUnregisterState,
  initialChannelMessageTypeRegistrationState,
  initialChannelOutletTransmitState,
  initialChannelPacketTimeoutSecondsState,
  initialChannelSendState,
  initialChannelTxEnvelopeOpState,
  initialChannelTxReceiptTimeoutRefreshState,
  initialChannelWindowState,
  initialClearChannelEnvelopePacketState,
  initialCountChannelTxOutstandingState,
  initialDrainChannelRingIndexState,
  initialEmitChannelImmediateDeliveryState,
  initialEmplaceChannelEnvelopeState,
  initialIndexOfChannelRingSequenceState,
  initialIndexOfChannelTxEnvelopeState,
  initialPackChannelEnvelopeState,
  initialRegisterChannelMessageHandlerState,
  initialReplaceChannelResentPacketState,
  initialResendChannelTimeoutPacketState,
  initialStopChannelHandlerFanoutState,
  initialUnpackChannelEnvelopeState,
  nextChannelSequence,
  packChannelEnvelopeRawFromActions,
  shouldAcceptChannelOutletTransmit,
  shouldAcceptChannelSequenceNow,
  shouldAllowChannelSend,
  shouldApplyChannelTxReceiptTimeoutExtensionNow,
  shouldClearChannelEnvelopePacketNow,
  shouldDrainChannelRingIndexNow,
  shouldEmitChannelImmediateDeliveryNow,
  shouldEmplaceChannelEnvelopeNow,
  shouldGiveUpChannelTxTimeout,
  shouldMissChannelTxEnvelopeOp,
  shouldProceedChannelEnvelopePack,
  shouldProceedChannelEnvelopeUnpack,
  shouldProceedChannelMessageTypeRegistration,
  shouldProceedChannelSend,
  shouldRegisterChannelMessageHandlerNow,
  shouldRejectChannelEnvelopePackMissingMessage,
  shouldRejectChannelEnvelopeUnpackMissingRaw,
  shouldRejectChannelEnvelopeUnpackNotRegistered,
  shouldRejectChannelEnvelopeUnpackTruncate,
  shouldRejectChannelMessageTypeMissingMsgtype,
  shouldRejectChannelMessageTypeSystemReserved,
  shouldRejectChannelSendLinkNotReady,
  shouldRejectChannelSendTooBig,
  shouldRejectPackChannelEnvelope,
  shouldRejectUnpackChannelEnvelope,
  shouldRemoveChannelMessageHandler,
  shouldReplaceChannelResentPacketNow,
  shouldResendChannelTimeoutPacketNow,
  shouldRetryChannelTxTimeout,
  shouldStopChannelHandlerFanoutNow,
  shouldUseChannelPacketTimeout,
  shouldUseChannelRingSequenceIndex,
  shouldUseChannelTxEnvelopeIndex,
  shouldUseChannelTxOutstandingCount,
  shouldUsePackChannelEnvelope,
  shouldUseUnpackChannelEnvelope,
  stepAcceptChannelSequenceWithActions,
  stepApplyChannelTxReceiptTimeoutExtensionWithActions,
  stepChannelAllowsSendWithActions,
  stepChannelEnvelopePackWithActions,
  stepChannelEnvelopeUnpackWithActions,
  stepChannelMessageHandlerUnregisterWithActions,
  stepChannelMessageTypeRegistrationWithActions,
  stepChannelOutletTransmitWithActions,
  stepChannelPacketTimeoutSecondsWithActions,
  stepChannelSendWithActions,
  stepChannelTxEnvelopeOpWithActions,
  stepChannelTxReceiptTimeoutRefreshWithActions,
  stepChannelTxTimeoutWithActions,
  stepChannelWindow,
  stepClearChannelEnvelopePacketWithActions,
  stepCountChannelTxOutstandingWithActions,
  stepDrainChannelRingIndexWithActions,
  stepEmitChannelImmediateDeliveryWithActions,
  stepEmplaceChannelEnvelopeWithActions,
  stepIndexOfChannelRingSequenceWithActions,
  stepIndexOfChannelTxEnvelopeWithActions,
  stepPackChannelEnvelopeWithActions,
  stepRegisterChannelMessageHandlerWithActions,
  stepReplaceChannelResentPacketWithActions,
  stepResendChannelTimeoutPacketWithActions,
  stepStopChannelHandlerFanoutWithActions,
  stepUnpackChannelEnvelopeWithActions,
  type ChannelTxTimeoutAction,
  type ChannelWindowState,
  type UnpackedChannelEnvelope,
} from "./protocol.js";

import type { Link } from "../link.js";
import { PacketContext } from "../packet.js";
import type { PacketReceipt } from "../packet-receipt.js";
import { ChannelRegister } from "./part-1-register.js";
import {
  ChannelException,
  ChannelExceptionType,
  type ChannelMessage,
  type ChannelMessageConstructor,
  type ChannelMessageHandler,
  type ChannelOutlet,
  type ChannelPacket,
} from "./part-1-types.js";

/** Mirrors RNS/Channel.py MessageState. */
export const MessageState = ChannelMessageState;

export type MessageStateValue =
  (typeof MessageState)[keyof typeof MessageState];

export {
  ChannelException,
  ChannelExceptionType,
  type ChannelMessage,
  type ChannelMessageConstructor,
  type ChannelMessageHandler,
  type ChannelOutlet,
  type ChannelPacket,
} from "./part-1-types.js";

export { Envelope } from "./part-3.js";
import { Envelope } from "./part-3.js";

/** Mirrors RNS/Channel.py ordered reliable delivery over links. */
export class Channel extends ChannelRegister {
  static readonly WINDOW = ChannelWindowLimits.WINDOW;
  static readonly WINDOW_MIN = ChannelWindowLimits.WINDOW_MIN;
  static readonly WINDOW_MIN_LIMIT_MEDIUM =
    ChannelWindowLimits.WINDOW_MIN_LIMIT_MEDIUM;
  static readonly WINDOW_MIN_LIMIT_FAST =
    ChannelWindowLimits.WINDOW_MIN_LIMIT_FAST;
  static readonly WINDOW_MAX_SLOW = ChannelWindowLimits.WINDOW_MAX_SLOW;
  static readonly WINDOW_MAX_MEDIUM = ChannelWindowLimits.WINDOW_MAX_MEDIUM;
  static readonly WINDOW_MAX_FAST = ChannelWindowLimits.WINDOW_MAX_FAST;
  static readonly WINDOW_MAX = ChannelWindowLimits.WINDOW_MAX_FAST;
  static readonly FAST_RATE_THRESHOLD = ChannelWindowLimits.FAST_RATE_THRESHOLD;
  static readonly RTT_FAST = ChannelWindowLimits.RTT_FAST;
  static readonly RTT_MEDIUM = ChannelWindowLimits.RTT_MEDIUM;
  static readonly RTT_SLOW = ChannelWindowLimits.RTT_SLOW;
  static readonly WINDOW_FLEXIBILITY = ChannelWindowLimits.WINDOW_FLEXIBILITY;
  static readonly SEQ_MAX = CHANNEL_SEQ_MAX;
  static readonly SEQ_MODULUS = CHANNEL_SEQ_MODULUS;

  private readonly txRing: Envelope[] = [];
  private readonly rxRing: Envelope[] = [];
  private nextSequence = 0;
  private nextRxSequence = 0;
  private readonly maxTries = CHANNEL_MAX_TRIES;
  private windowState: ChannelWindowState;

  get window(): number {
    return this.windowState.window;
  }

  set window(value: number) {
    this.windowState = { ...this.windowState, window: value };
  }

  get windowMax(): number {
    return this.windowState.windowMax;
  }

  set windowMax(value: number) {
    this.windowState = { ...this.windowState, windowMax: value };
  }

  get windowMin(): number {
    return this.windowState.windowMin;
  }

  set windowMin(value: number) {
    this.windowState = { ...this.windowState, windowMin: value };
  }

  get windowFlexibility(): number {
    return this.windowState.windowFlexibility;
  }

  set windowFlexibility(value: number) {
    this.windowState = { ...this.windowState, windowFlexibility: value };
  }

  constructor(private readonly outlet: ChannelOutlet) {
    super();
    this.windowState = initialChannelWindowState(outlet.rtt);
  }

  get mdu(): number {
    return channelPayloadMdu(this.outlet.mdu);
  }

  isReadyToSend(): boolean {
    /** Adapt TX outstanding / send-allow via protocol actions (no ad-hoc
     * `countChannelTxOutstanding` / `channelAllowsSend` reads). */
    const outstandingStepped = stepCountChannelTxOutstandingWithActions(
      initialCountChannelTxOutstandingState(),
      {
        kind: "channel/tx-outstanding-gate",
        entries: this.txRing.map((envelope) => ({
          packetPresent: envelope.packet !== null,
          delivered:
            envelope.packet !== null &&
            this.outlet.getPacketState(envelope.packet) ===
              MessageState.MSGSTATE_DELIVERED,
        })),
      },
    );
    const outstanding = shouldUseChannelTxOutstandingCount(
      outstandingStepped.actions,
    )
      ? channelTxOutstandingCountFromActions(outstandingStepped.actions)
      : null;
    if (outstanding === null) {
      throw new Error("Channel.isReadyToSend: missing use-count action");
    }

    const allowStepped = stepChannelAllowsSendWithActions(
      initialChannelAllowsSendState(),
      {
        kind: "channel/allows-send-gate",
        isUsable: this.outlet.isUsable,
        outstanding,
        window: this.windowState.window,
      },
    );
    return shouldAllowChannelSend(allowStepped.actions);
  }

  async send(message: ChannelMessage): Promise<Envelope> {
    const readyGate = stepChannelSendWithActions(initialChannelSendState(), {
      kind: "channel/send-gate",
      ready: this.isReadyToSend(),
      packedLength: null,
      mdu: this.outlet.mdu,
    });
    if (shouldRejectChannelSendLinkNotReady(readyGate.actions)) {
      throw new ChannelException(
        ChannelExceptionType.ME_LINK_NOT_READY,
        "Link is not ready",
      );
    }
    this.assertChannelSendProceeds(readyGate.actions);

    const reservedSequence = this.nextSequence;
    const envelope = new Envelope(this.outlet, {
      message,
      sequence: reservedSequence,
    });
    envelope.pack();
    this.assertChannelSendSize(envelope);
    this.nextSequence = nextChannelSequence(reservedSequence);
    const packet = await this.outlet.send(envelope.raw!);
    /** Adapt outlet-transmit via protocol actions (no ad-hoc
     * `isChannelOutletTransmitOk` reads). */
    const transmitStepped = stepChannelOutletTransmitWithActions(
      initialChannelOutletTransmitState(),
      {
        kind: "channel/outlet-transmit-gate",
        packetPresent: packet !== null,
        rawLength: packet?.raw.length ?? 0,
        receiptPresent: packet?.receipt !== null,
      },
    );
    if (
      packet === null ||
      !shouldAcceptChannelOutletTransmit(transmitStepped.actions)
    ) {
      this.nextSequence = reservedSequence;
      throw new ChannelException(
        ChannelExceptionType.ME_LINK_NOT_READY,
        "Outlet did not transmit packet",
      );
    }

    envelope.packet = packet;
    this.emplaceEnvelope(envelope, this.txRing);
    envelope.tries += 1;
    this.outlet.setPacketDeliveredCallback(packet, (deliveredPacket) => {
      this.packetDelivered(deliveredPacket);
    });
    this.outlet.setPacketTimeoutCallback(
      packet,
      (timedOutPacket) => {
        void this.packetTimeout(timedOutPacket);
      },
      this.getPacketTimeoutTime(envelope.tries),
    );
    this.updatePacketTimeouts();

    if (
      shouldEmitChannelImmediateDeliveryNow(
        stepEmitChannelImmediateDeliveryWithActions(
          initialEmitChannelImmediateDeliveryState(),
          {
            kind: "channel/emit-immediate-delivery-gate",
            packetState: this.outlet.getPacketState(packet),
          },
        ).actions,
      )
    ) {
      this.packetDelivered(packet);
    }

    return envelope;
  }

  private assertChannelSendSize(envelope: Envelope): void {
    const sizeGate = stepChannelSendWithActions(initialChannelSendState(), {
      kind: "channel/send-gate",
      ready: true,
      packedLength: envelope.raw?.length ?? null,
      mdu: this.outlet.mdu,
    });
    if (shouldRejectChannelSendTooBig(sizeGate.actions)) {
      throw new ChannelException(
        ChannelExceptionType.ME_TOO_BIG,
        `Packed message too big for packet: ${envelope.raw!.length} > ${this.outlet.mdu}`,
      );
    }
    this.assertChannelSendProceeds(sizeGate.actions);
  }

  private assertChannelSendProceeds(
    actions: ReturnType<typeof stepChannelSendWithActions>["actions"],
  ): void {
    if (!shouldProceedChannelSend(actions)) {
      throw new ChannelException(
        ChannelExceptionType.ME_LINK_NOT_READY,
        "Link is not ready",
      );
    }
  }

  receive(raw: Uint8Array): void {
    const envelope = new Envelope(this.outlet, { raw: Uint8Array.from(raw) });
    envelope.unpack(this.messageFactories);

    if (
      !shouldAcceptChannelSequenceNow(
        stepAcceptChannelSequenceWithActions(
          initialAcceptChannelSequenceState(),
          {
            kind: "channel/accept-sequence-gate",
            sequence: envelope.sequence,
            nextRxSequence: this.nextRxSequence,
            windowMax: Channel.WINDOW_MAX,
          },
        ).actions,
      )
    ) {
      return;
    }

    if (!this.emplaceEnvelope(envelope, this.rxRing)) {
      return;
    }

    const drained = drainContiguousChannelSequences({
      ringSequences: this.rxRing.map((candidate) => candidate.sequence),
      nextRxSequence: this.nextRxSequence,
    });
    this.nextRxSequence = drained.nextRxSequence;

    for (const sequence of drained.contiguous) {
      /** Adapt ring-sequence index via protocol actions (no ad-hoc
       * `indexOfChannelRingSequence` reads). */
      const indexStepped = stepIndexOfChannelRingSequenceWithActions(
        initialIndexOfChannelRingSequenceState(),
        {
          kind: "channel/ring-sequence-index-gate",
          ringSequences: this.rxRing.map((candidate) => candidate.sequence),
          target: sequence,
        },
      );
      const index = shouldUseChannelRingSequenceIndex(indexStepped.actions)
        ? channelRingSequenceIndexFromActions(indexStepped.actions)
        : null;
      if (
        !shouldDrainChannelRingIndexNow(
          stepDrainChannelRingIndexWithActions(
            initialDrainChannelRingIndexState(),
            {
              kind: "channel/drain-ring-index-gate",
              indexPresent: index !== null,
            },
          ).actions,
        )
      ) {
        continue;
      }
      const candidate = this.rxRing.splice(index!, 1)[0]!;
      const delivered = candidate.unpack(this.messageFactories);

      for (const callback of [...this.messageCallbacks]) {
        if (
          shouldStopChannelHandlerFanoutNow(
            stepStopChannelHandlerFanoutWithActions(
              initialStopChannelHandlerFanoutState(),
              {
                kind: "channel/stop-handler-fanout-gate",
                handled: callback(delivered),
              },
            ).actions,
          )
        ) {
          break;
        }
      }
    }
  }

  shutdown(): void {
    this.messageCallbacks.length = 0;
    for (const envelope of this.txRing) {
      if (
        shouldClearChannelEnvelopePacketNow(
          stepClearChannelEnvelopePacketWithActions(
            initialClearChannelEnvelopePacketState(),
            {
              kind: "channel/clear-envelope-packet-gate",
              packetPresent: envelope.packet !== null,
            },
          ).actions,
        )
      ) {
        this.outlet.setPacketTimeoutCallback(envelope.packet!, null);
        this.outlet.setPacketDeliveredCallback(envelope.packet!, null);
      }
    }

    this.txRing.length = 0;
    this.rxRing.length = 0;
  }

  private emplaceEnvelope(envelope: Envelope, ring: Envelope[]): boolean {
    const index = channelEmplaceIndex({
      sequence: envelope.sequence,
      ringSequences: ring.map((existing) => existing.sequence),
      wrapBaseSequence: this.nextRxSequence,
    });
    const emplaceStepped = stepEmplaceChannelEnvelopeWithActions(
      initialEmplaceChannelEnvelopeState(),
      {
        kind: "channel/emplace-envelope-gate",
        indexPresent: index !== null,
      },
    );
    if (!shouldEmplaceChannelEnvelopeNow(emplaceStepped.actions)) {
      return false;
    }

    ring.splice(index!, 0, envelope);
    envelope.tracked = true;
    return true;
  }

  private packetDelivered(packet: ChannelPacket): void {
    this.packetTxOp(packet, () => true);
  }

  private async packetTimeout(packet: ChannelPacket): Promise<void> {
    const index = this.indexOfTxEnvelope(packet);
    const envelope = index === null ? undefined : this.txRing[index];
    const stepped = stepChannelTxTimeoutWithActions(this.windowState, {
      kind: "channel/tx-timeout",
      indexOk: index !== null,
      envelopePresent: envelope !== undefined,
      delivered:
        this.outlet.getPacketState(packet) === MessageState.MSGSTATE_DELIVERED,
      tries: envelope?.tries ?? 0,
      maxTries: this.maxTries,
    });
    this.windowState = stepped.state;
    await this.applyChannelTxTimeoutActions(envelope, stepped.actions);
  }

  private async applyChannelTxTimeoutActions(
    envelope: Envelope | undefined,
    actions: readonly ChannelTxTimeoutAction[],
  ): Promise<void> {
    if (shouldGiveUpChannelTxTimeout(actions)) {
      this.shutdown();
      this.outlet.timedOut();
      return;
    }

    if (!shouldRetryChannelTxTimeout(actions) || envelope === undefined) {
      return;
    }

    const retry = channelTxTimeoutRetryAction(actions);
    if (retry === null) {
      return;
    }

    envelope.tries = retry.nextTries;
    if (
      !shouldResendChannelTimeoutPacketNow(
        stepResendChannelTimeoutPacketWithActions(
          initialResendChannelTimeoutPacketState(),
          {
            kind: "channel/resend-timeout-packet-gate",
            packetPresent: envelope.packet !== null,
          },
        ).actions,
      ) ||
      envelope.packet === null
    ) {
      return;
    }

    let packet = envelope.packet;
    const resent = await this.outlet.resend(packet);
    if (
      shouldReplaceChannelResentPacketNow(
        stepReplaceChannelResentPacketWithActions(
          initialReplaceChannelResentPacketState(),
          {
            kind: "channel/replace-resent-packet-gate",
            resentPresent: resent !== null,
          },
        ).actions,
      )
    ) {
      packet = resent!;
      envelope.packet = packet;
    }

    this.outlet.setPacketDeliveredCallback(packet, (deliveredPacket) => {
      this.packetDelivered(deliveredPacket);
    });
    this.outlet.setPacketTimeoutCallback(
      packet,
      (timedOutPacket) => {
        void this.packetTimeout(timedOutPacket);
      },
      this.getPacketTimeoutTime(envelope.tries),
    );
    this.updatePacketTimeouts();

    if (
      shouldEmitChannelImmediateDeliveryNow(
        stepEmitChannelImmediateDeliveryWithActions(
          initialEmitChannelImmediateDeliveryState(),
          {
            kind: "channel/emit-immediate-delivery-gate",
            packetState: this.outlet.getPacketState(packet),
          },
        ).actions,
      )
    ) {
      this.packetDelivered(packet);
    }
  }

  private packetTxOp(
    packet: ChannelPacket,
    op: (envelope: Envelope) => boolean,
  ): void {
    const index = this.indexOfTxEnvelope(packet);
    const envelope = index === null ? undefined : this.txRing[index];
    const stepped = stepChannelTxEnvelopeOpWithActions(
      initialChannelTxEnvelopeOpState(),
      {
        kind: "channel/tx-envelope-op-gate",
        indexOk: index !== null,
        envelopePresent: envelope !== undefined,
        opOk: envelope === undefined ? false : op(envelope),
      },
    );
    if (shouldMissChannelTxEnvelopeOp(stepped.actions)) {
      return;
    }

    envelope!.tracked = false;
    this.txRing.splice(index!, 1);

    this.windowState = stepChannelWindow(this.windowState, {
      kind: "channel/delivered",
      rtt: this.outlet.rtt,
    }).state;
  }

  private indexOfTxEnvelope(packet: ChannelPacket): number | null {
    /** Adapt TX-envelope index via protocol actions (no ad-hoc
     * `indexOfChannelTxEnvelope` reads). */
    const stepped = stepIndexOfChannelTxEnvelopeWithActions(
      initialIndexOfChannelTxEnvelopeState(),
      {
        kind: "channel/tx-envelope-index-gate",
        packetIds: this.txRing.map((candidate) =>
          candidate.packet === null
            ? null
            : this.outlet.getPacketId(candidate.packet),
        ),
        targetId: this.outlet.getPacketId(packet),
      },
    );
    return shouldUseChannelTxEnvelopeIndex(stepped.actions)
      ? channelTxEnvelopeIndexFromActions(stepped.actions)
      : null;
  }

  private getPacketTimeoutTime(tries: number): number {
    /** Adapt packet timeout via protocol actions (no ad-hoc `channelPacketTimeoutSeconds` reads). */
    const stepped = stepChannelPacketTimeoutSecondsWithActions(
      initialChannelPacketTimeoutSecondsState(),
      {
        kind: "channel/packet-timeout-gate",
        tries,
        rtt: this.outlet.rtt,
        txRingLength: this.txRing.length,
      },
    );
    const timeout = shouldUseChannelPacketTimeout(stepped.actions)
      ? channelPacketTimeoutFromActions(stepped.actions)
      : null;
    if (timeout === null) {
      throw new Error(
        "Channel.getPacketTimeoutTime: missing use-timeout action",
      );
    }
    return timeout;
  }

  private updatePacketTimeouts(): void {
    const stepped = stepChannelTxReceiptTimeoutRefreshWithActions(
      initialChannelTxReceiptTimeoutRefreshState(),
      {
        kind: "channel/tx-receipt-timeout-refresh-gate",
        entries: this.txRing.map((envelope) => ({
          receiptPresent: envelope.packet?.receipt != null,
          currentTimeout: envelope.packet?.receipt?.timeout ?? null,
          tries: envelope.tries,
          rtt: this.outlet.rtt,
          txRingLength: this.txRing.length,
        })),
      },
    );
    for (const extension of channelTxReceiptTimeoutExtensions(
      stepped.actions,
    )) {
      const receipt = this.txRing[extension.index]?.packet?.receipt;
      if (
        shouldApplyChannelTxReceiptTimeoutExtensionNow(
          stepApplyChannelTxReceiptTimeoutExtensionWithActions(
            initialApplyChannelTxReceiptTimeoutExtensionState(),
            {
              kind: "channel/apply-tx-receipt-timeout-extension-gate",
              extensionPresent: receipt != null,
            },
          ).actions,
        )
      ) {
        receipt!.setTimeout(extension.timeoutSeconds);
      }
    }
  }
}

export class LinkChannelPacket implements ChannelPacket {
  constructor(
    readonly raw: Uint8Array,
    readonly receipt: PacketReceipt | null,
  ) {}
}
