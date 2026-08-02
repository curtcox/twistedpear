/** Extracted from channel.ts; the original module remains the public composition point. */
import { ChannelExceptionTypeCode,ChannelMessageState,CHANNEL_MAX_TRIES,CHANNEL_SEQ_MAX,CHANNEL_SEQ_MODULUS,ChannelWindowLimits,shouldAllowLinkSend,initialLinkSendAllowState,stepLinkSendAllowWithActions,channelEmplaceIndex,channelEnvelopeFieldsFromActions,channelMessageStateFromActions,channelPacketTimeoutFromActions,channelPayloadMdu,channelRingSequenceIndexFromActions,channelTxEnvelopeIndexFromActions,channelTxOutstandingCountFromActions,channelTxTimeoutRetryAction,drainContiguousChannelSequences,initialAcceptChannelSequenceState,initialApplyChannelPacketReceiptTimeoutState,initialApplyChannelTxReceiptTimeoutExtensionState,initialArmChannelPacketReceiptState,initialChannelAllowsSendState,initialChannelOutletTransmitState,initialChannelPacketTimeoutSecondsState,initialChannelWindowState,initialClearChannelEnvelopePacketState,initialCountChannelTxOutstandingState,initialDrainChannelRingIndexState,initialEmplaceChannelEnvelopeState,initialEmitChannelImmediateDeliveryState,initialChannelMessageStateFromPacketReceiptState,initialIndexOfChannelRingSequenceState,initialIndexOfChannelTxEnvelopeState,initialRegisterChannelMessageHandlerState,initialReplaceChannelResentPacketState,initialResendChannelTimeoutPacketState,initialStopChannelHandlerFanoutState,nextChannelSequence,initialChannelEnvelopePackState,initialChannelEnvelopeUnpackState,initialChannelMessageHandlerUnregisterState,initialChannelMessageTypeRegistrationState,initialChannelSendState,initialChannelTxEnvelopeOpState,initialChannelTxReceiptTimeoutRefreshState,initialPackChannelEnvelopeState,
  initialUnpackChannelEnvelopeState,packChannelEnvelopeRawFromActions,shouldAcceptChannelOutletTransmit,shouldAcceptChannelSequenceNow,shouldAllowChannelSend,shouldApplyChannelPacketReceiptTimeoutNow,shouldApplyChannelTxReceiptTimeoutExtensionNow,shouldArmChannelPacketReceiptNow,shouldClearChannelEnvelopePacketNow,shouldDrainChannelRingIndexNow,shouldEmplaceChannelEnvelopeNow,shouldEmitChannelImmediateDeliveryNow,shouldGiveUpChannelTxTimeout,shouldMissChannelTxEnvelopeOp,shouldProceedChannelEnvelopePack,shouldProceedChannelEnvelopeUnpack,shouldProceedChannelMessageTypeRegistration,shouldProceedChannelSend,shouldRegisterChannelMessageHandlerNow,shouldRejectChannelEnvelopePackMissingMessage,shouldRejectChannelEnvelopeUnpackMissingRaw,shouldRejectChannelEnvelopeUnpackNotRegistered,shouldRejectChannelEnvelopeUnpackTruncate,shouldRejectChannelMessageTypeMissingMsgtype,shouldRejectChannelMessageTypeSystemReserved,shouldRejectChannelSendLinkNotReady,shouldRejectChannelSendTooBig,shouldRejectPackChannelEnvelope,shouldRejectUnpackChannelEnvelope,shouldRemoveChannelMessageHandler,shouldReplaceChannelResentPacketNow,shouldResendChannelTimeoutPacketNow,shouldRetryChannelTxTimeout,shouldStopChannelHandlerFanoutNow,shouldUseChannelPacketTimeout,shouldUseChannelRingSequenceIndex,shouldUseChannelTxEnvelopeIndex,shouldUseChannelTxOutstandingCount,shouldUsePackChannelEnvelope,shouldUseUnpackChannelEnvelope,channelMessageHandlerUnregisterIndex,channelTxReceiptTimeoutExtensions,stepAcceptChannelSequenceWithActions,stepApplyChannelPacketReceiptTimeoutWithActions,
  stepApplyChannelTxReceiptTimeoutExtensionWithActions,stepArmChannelPacketReceiptWithActions,stepChannelAllowsSendWithActions,stepChannelEnvelopePackWithActions,stepChannelEnvelopeUnpackWithActions,stepChannelMessageHandlerUnregisterWithActions,stepChannelMessageTypeRegistrationWithActions,stepChannelOutletTransmitWithActions,stepChannelPacketTimeoutSecondsWithActions,stepChannelSendWithActions,stepChannelTxEnvelopeOpWithActions,stepChannelTxReceiptTimeoutRefreshWithActions,stepChannelTxTimeoutWithActions,stepChannelWindow,stepClearChannelEnvelopePacketWithActions,stepCountChannelTxOutstandingWithActions,stepDrainChannelRingIndexWithActions,stepEmplaceChannelEnvelopeWithActions,stepEmitChannelImmediateDeliveryWithActions,stepChannelMessageStateFromPacketReceiptWithActions,stepIndexOfChannelRingSequenceWithActions,stepIndexOfChannelTxEnvelopeWithActions,stepPackChannelEnvelopeWithActions,stepRegisterChannelMessageHandlerWithActions,stepReplaceChannelResentPacketWithActions,stepResendChannelTimeoutPacketWithActions,stepStopChannelHandlerFanoutWithActions,stepUnpackChannelEnvelopeWithActions,type ChannelTxTimeoutAction,type ChannelWindowState,type UnpackedChannelEnvelope } from "@twistedpear/protocol";
import type { Link } from "../link.js";
import { PacketContext } from "../packet.js";
import type { PacketReceipt } from "../packet-receipt.js";
import { Channel, LinkChannelPacket } from "./part-1.js";
import type { ChannelOutlet, ChannelPacket, MessageStateValue } from "./part-1.js";
/** Mirrors RNS/Channel.py LinkChannelOutlet. */
export class LinkChannelOutlet implements ChannelOutlet {
  constructor(private readonly link: Link) {}

  get mdu(): number {
    return this.link.mdu;
  }

  get rtt(): number {
    return this.link.rtt ?? 0;
  }

  get isUsable(): boolean {
    const sendAllow = stepLinkSendAllowWithActions(initialLinkSendAllowState(), {
      kind: "link/send-allow-gate",
      status: this.link.status
    });
    return shouldAllowLinkSend(sendAllow.actions);
  }

  async send(raw: Uint8Array): Promise<ChannelPacket | null> {
    const result = await this.link.sendContext(PacketContext.CHANNEL, raw, { createReceipt: true });
    if (result === null) {
      return null;
    }

    return new LinkChannelPacket(result.raw, result.receipt);
  }

  async resend(packet: ChannelPacket): Promise<ChannelPacket | null> {
    const resent = await this.link.resendPacket(packet.raw, { createReceipt: true });
    if (resent === null) {
      return null;
    }

    return new LinkChannelPacket(resent.raw, resent.receipt);
  }

  getPacketState(packet: ChannelPacket): MessageStateValue {
    const messageState = channelMessageStateFromActions(
      stepChannelMessageStateFromPacketReceiptWithActions(
        initialChannelMessageStateFromPacketReceiptState(),
        {
          kind: "channel/message-state-from-receipt-gate",
          receiptStatus: packet.receipt === null ? null : packet.receipt.getStatus()
        }
      ).actions
    );
    if (messageState === null) {
      throw new Error("getPacketState: missing use-state action");
    }
    return messageState;
  }

  timedOut(): void {
    void this.link.teardown();
  }

  setPacketTimeoutCallback(
    packet: ChannelPacket,
    callback: ((packet: ChannelPacket) => void) | null,
    timeout: number | null = null
  ): void {
    if (
      !shouldArmChannelPacketReceiptNow(
        stepArmChannelPacketReceiptWithActions(initialArmChannelPacketReceiptState(), {
          kind: "channel/arm-packet-receipt-gate",
          receiptPresent: packet.receipt !== null
        }).actions
      )
    ) {
      return;
    }

    if (
      shouldApplyChannelPacketReceiptTimeoutNow(
        stepApplyChannelPacketReceiptTimeoutWithActions(
          initialApplyChannelPacketReceiptTimeoutState(),
          {
            kind: "channel/apply-packet-receipt-timeout-gate",
            timeoutPresent: timeout !== null
          }
        ).actions
      )
    ) {
      packet.receipt!.setTimeout(timeout!);
    }

    packet.receipt!.setTimeoutCallback(
      callback === null ? null : () => {
        callback(packet);
      }
    );
  }

  setPacketDeliveredCallback(
    packet: ChannelPacket,
    callback: ((packet: ChannelPacket) => void) | null
  ): void {
    if (
      !shouldArmChannelPacketReceiptNow(
        stepArmChannelPacketReceiptWithActions(initialArmChannelPacketReceiptState(), {
          kind: "channel/arm-packet-receipt-gate",
          receiptPresent: packet.receipt !== null
        }).actions
      )
    ) {
      return;
    }

    packet.receipt!.setDeliveryCallback(
      callback === null
        ? null
        : () => {
            callback(packet);
          }
    );
  }

  getPacketId(packet: ChannelPacket): Uint8Array | null {
    return packet.receipt?.hash ?? null;
  }
}
