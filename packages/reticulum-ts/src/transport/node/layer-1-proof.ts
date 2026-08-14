import {
  initialAcceptLinkLrProofCandidateState,
  initialDispatchResourceProofToLinkState,
  initialPacketReceiptProofIngressState,
  initialPacketReceiptUnregisterState,
  initialProofIngressState,
  packetReceiptUnregisterIndex,
  shouldAcceptLinkLrProofCandidateNow,
  shouldDispatchResourceProofToLinkNow,
  shouldHandleProofLrproof,
  shouldHandleProofReceipt,
  shouldHandleProofResourcePrf,
  shouldRemovePacketReceipt,
  shouldRemovePacketReceiptProofIngress,
  stepAcceptLinkLrProofCandidateWithActions,
  stepDispatchResourceProofToLinkWithActions,
  stepPacketReceiptProofIngressWithActions,
  stepPacketReceiptUnregisterWithActions,
  stepProofIngressWithActions,
} from "./protocol.js";

import { equalBytes } from "../../crypto/bytes.js";
import { Identity } from "../../identity.js";
import type { PacketInterface } from "../../interfaces/interface.js";
import type { Packet } from "../../packet.js";
import { LeafTransportLayer1Announce } from "./layer-1-announce.js";

export class LeafTransportLayer1Proof extends LeafTransportLayer1Announce {
  protected async handleProof(
    packet: Packet,
    iface: PacketInterface,
  ): Promise<void> {
    const proofStepped = stepProofIngressWithActions(
      initialProofIngressState(),
      {
        kind: "transport/proof-ingress-gate",
        context: packet.context,
      },
    );
    if (shouldHandleProofLrproof(proofStepped.actions)) {
      await this.handleLrProof(packet, iface);
      return;
    }
    if (shouldHandleProofResourcePrf(proofStepped.actions)) {
      await this.dispatchResourceProof(packet);
      return;
    }
    if (shouldHandleProofReceipt(proofStepped.actions)) {
      this.applyReceiptProofs(packet);
    }
  }

  private async handleLrProof(
    packet: Packet,
    iface: PacketInterface,
  ): Promise<void> {
    for (const link of this.pendingLinks) {
      if (
        shouldAcceptLinkLrProofCandidateNow(
          stepAcceptLinkLrProofCandidateWithActions(
            initialAcceptLinkLrProofCandidateState(),
            {
              kind: "transport/accept-link-lr-proof-candidate-gate",
              linkIdMatches: equalBytes(link.linkId, packet.destinationHash),
              hopsMatch: link.hopsMatch(packet),
            },
          ).actions,
        )
      ) {
        await link.validateProof(packet, iface);
        return;
      }
    }
  }

  private async dispatchResourceProof(packet: Packet): Promise<void> {
    const activeIndex = this.indexOfMatchingLink(
      this.activeLinks,
      packet.destinationHash,
    );
    if (
      shouldDispatchResourceProofToLinkNow(
        stepDispatchResourceProofToLinkWithActions(
          initialDispatchResourceProofToLinkState(),
          {
            kind: "transport/dispatch-resource-proof-to-link-gate",
            activeIndexPresent: activeIndex !== null,
          },
        ).actions,
      )
    ) {
      await this.activeLinks[activeIndex!]!.handleResourceProof(packet);
    }
  }

  private applyReceiptProofs(packet: Packet): void {
    for (const receipt of [...this.receipts]) {
      this.applyOneReceiptProof(packet, receipt);
    }
  }

  private applyOneReceiptProof(
    packet: Packet,
    receipt: (typeof this.receipts)[number],
  ): void {
    const identity = equalBytes(packet.destinationHash, receipt.truncatedHash)
      ? Identity.recall(this.options.provider, receipt.targetDestinationHash)
      : null;
    const proofAccepted =
      identity !== null && receipt.validateProofPacket(packet, identity);
    const proofIngressStepped = stepPacketReceiptProofIngressWithActions(
      initialPacketReceiptProofIngressState(),
      {
        kind: "receipt/proof-ingress-gate",
        truncatedHashMatches: equalBytes(
          packet.destinationHash,
          receipt.truncatedHash,
        ),
        identityPresent: identity !== null,
        proofAccepted,
      },
    );
    if (!shouldRemovePacketReceiptProofIngress(proofIngressStepped.actions)) {
      return;
    }
    const receiptStepped = stepPacketReceiptUnregisterWithActions(
      initialPacketReceiptUnregisterState(),
      {
        kind: "receipt/unregister-gate",
        index: this.receipts.indexOf(receipt),
      },
    );
    const index = packetReceiptUnregisterIndex(receiptStepped.actions);
    if (shouldRemovePacketReceipt(receiptStepped.actions) && index !== null) {
      this.receipts.splice(index, 1);
    }
  }
}
