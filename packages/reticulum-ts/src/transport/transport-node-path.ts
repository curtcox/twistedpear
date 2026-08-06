import {
  initialAnswerLocalPathRequestState,
  initialAnswerPathRequestState,
  initialAnswerPathWithEntryState,
  initialBeginPathDiscoveryState,
  initialClearExpiredDiscoveryPathRequestState,
  initialDiscoveryPathRequestExpiredState,
  initialDiscoveryPathRequestFulfillState,
  initialFulfillDiscoveryPendingState,
  initialMatchLocalInboundDestinationState,
  initialPathRequestIngressState,
  initialRememberPathRequestTagState,
  initialTransmitOnInterfaceState,
  shouldAnswerLocalPathRequestNow,
  shouldAnswerPathRequestLocal,
  shouldAnswerPathRequestNow,
  shouldAnswerPathRequestPath,
  shouldAnswerPathWithEntryNow,
  shouldBeginPathDiscoveryNow,
  shouldClearExpiredDiscoveryPathRequestNow,
  shouldFulfillDiscoveryPathRequest,
  shouldFulfillDiscoveryPendingNow,
  shouldIgnoreDiscoveryPathFulfillActions,
  shouldIgnorePathRequestInFlightDiscovery,
  shouldIgnorePathRequestIngress,
  shouldIgnorePathRequestSeenTag,
  shouldIgnorePathRequestUnparsed,
  shouldMatchLocalInboundDestinationNow,
  shouldRememberPathRequestTagNow,
  shouldStartPathRequestDiscovery,
  shouldTransmitOnInterfaceNow,
  shouldTreatDiscoveryPathRequestExpired,
  stepAnswerLocalPathRequestWithActions,
  stepAnswerPathRequestWithActions,
  stepAnswerPathWithEntryWithActions,
  stepBeginPathDiscoveryWithActions,
  stepClearExpiredDiscoveryPathRequestWithActions,
  stepDiscoveryPathRequestExpiredWithActions,
  stepDiscoveryPathRequestFulfillWithActions,
  stepFulfillDiscoveryPendingWithActions,
  stepMatchLocalInboundDestinationWithActions,
  stepPathRequestIngressWithActions,
  stepRememberPathRequestTagWithActions,
  stepTransmitOnInterfaceWithActions,
} from "./protocol.js";

import { equalBytes } from "../crypto/bytes.js";
import { DestinationDirection } from "../destination.js";
import type { PacketInterface } from "../interfaces/interface.js";
import type { Packet } from "../packet.js";
import { buildPathResponseAnnounce, hashKey } from "./node.js";
import {
  PATH_REQUEST_TIMEOUT_SECONDS,
  parsePathRequestData,
  pathRequestTagKey,
} from "./path.js";
import { TransportNodeBase } from "./transport-node-base.js";

/** Path-request ingress, discovery, and fulfillment for transport nodes. */
export class TransportNodePath extends TransportNodeBase {
  protected override async handlePathRequest(
    packet: Packet,
    iface: PacketInterface,
  ): Promise<void> {
    if (!this.transportEnabled) {
      await super.handlePathRequest(packet, iface);
      return;
    }
    const parsed = parsePathRequestData(packet.data);
    const path =
      parsed === null ? undefined : this.getPathEntry(parsed.destinationHash);
    const localDestination =
      parsed === null
        ? undefined
        : this.destinations.find((entry) =>
            shouldMatchLocalInboundDestinationNow(
              stepMatchLocalInboundDestinationWithActions(
                initialMatchLocalInboundDestinationState(),
                {
                  kind: "transport/match-local-inbound-destination-gate",
                  hashMatches: equalBytes(entry.hash, parsed.destinationHash),
                  directionIn: entry.direction === DestinationDirection.IN,
                },
              ).actions,
            ),
          );
    const tagKey =
      parsed !== null && parsed.tag !== null
        ? pathRequestTagKey(parsed.destinationHash, parsed.tag)
        : null;
    const destinationKey =
      parsed !== null ? hashKey(parsed.destinationHash) : null;
    const existingDiscovery =
      destinationKey !== null
        ? this.discoveryPathRequests.get(destinationKey)
        : undefined;
    const nowSeconds = this.clock.now() / 1000;
    const discoveryExpired =
      existingDiscovery !== undefined &&
      shouldTreatDiscoveryPathRequestExpired(
        stepDiscoveryPathRequestExpiredWithActions(
          initialDiscoveryPathRequestExpiredState(),
          {
            kind: "path-request/discovery-expired-gate",
            timeoutAt: existingDiscovery.timeout,
            nowSeconds,
          },
        ).actions,
      );

    const stepped = stepPathRequestIngressWithActions(
      initialPathRequestIngressState(),
      {
        kind: "path-request/ingress-gate",
        parsedOk: parsed !== null,
        hasTag: parsed?.tag !== null && parsed?.tag !== undefined,
        tagAlreadySeen: tagKey !== null && this.discoveryPrTags.has(tagKey),
        hasLocalAnswerer: localDestination?.answerPathRequest !== undefined,
        transportEnabled: this.transportEnabled,
        hasPath: path !== undefined,
        shouldAnswerPath:
          path !== undefined &&
          shouldAnswerPathRequestNow(
            stepAnswerPathRequestWithActions(initialAnswerPathRequestState(), {
              kind: "path-request/answer-path-gate",
              nextHop: path.nextHop,
              requestorTransportId: parsed?.requestorTransportId ?? null,
            }).actions,
          ),
        discoveryPresent: existingDiscovery !== undefined,
        discoveryExpired,
        allowDiscovery: true,
      },
    );

    if (
      shouldIgnorePathRequestUnparsed(stepped.actions) ||
      shouldIgnorePathRequestSeenTag(stepped.actions)
    ) {
      return;
    }

    if (
      shouldRememberPathRequestTagNow(
        stepRememberPathRequestTagWithActions(
          initialRememberPathRequestTagState(),
          {
            kind: "path-request/remember-tag-gate",
            tagKeyPresent: tagKey !== null,
          },
        ).actions,
      )
    ) {
      this.discoveryPrTags.add(tagKey!);
    }

    if (shouldAnswerPathRequestLocal(stepped.actions)) {
      if (
        !shouldAnswerLocalPathRequestNow(
          stepAnswerLocalPathRequestWithActions(
            initialAnswerLocalPathRequestState(),
            {
              kind: "path-request/answer-local-handler-gate",
              handlerPresent: localDestination?.answerPathRequest !== undefined,
            },
          ).actions,
        )
      ) {
        return;
      }
      await localDestination!.answerPathRequest!(iface);
      return;
    }

    if (shouldAnswerPathRequestPath(stepped.actions)) {
      if (
        !shouldAnswerPathWithEntryNow(
          stepAnswerPathWithEntryWithActions(
            initialAnswerPathWithEntryState(),
            {
              kind: "path-request/answer-path-entry-gate",
              pathPresent: path !== undefined,
            },
          ).actions,
        )
      ) {
        return;
      }
      await this.sendPathResponse(path!, iface);
      return;
    }

    if (
      shouldIgnorePathRequestIngress(stepped.actions) ||
      shouldIgnorePathRequestInFlightDiscovery(stepped.actions)
    ) {
      return;
    }

    if (!shouldStartPathRequestDiscovery(stepped.actions)) {
      return;
    }

    if (
      !shouldBeginPathDiscoveryNow(
        stepBeginPathDiscoveryWithActions(initialBeginPathDiscoveryState(), {
          kind: "path-request/begin-discovery-gate",
          parsedOk: parsed !== null,
          tagPresent: parsed !== null && parsed.tag !== null,
          destinationKeyPresent: destinationKey !== null,
        }).actions,
      )
    ) {
      return;
    }

    const discoveryKey = destinationKey!;
    const discoveryParsed = parsed!;
    if (
      shouldClearExpiredDiscoveryPathRequestNow(
        stepClearExpiredDiscoveryPathRequestWithActions(
          initialClearExpiredDiscoveryPathRequestState(),
          {
            kind: "path-request/clear-expired-discovery-gate",
            discoveryExpired,
          },
        ).actions,
      )
    ) {
      this.discoveryPathRequests.delete(discoveryKey);
    }

    this.discoveryPathRequests.set(discoveryKey, {
      timeout: nowSeconds + PATH_REQUEST_TIMEOUT_SECONDS,
      requestingInterface: iface,
    });

    for (const outbound of this.interfaces) {
      if (
        !shouldTransmitOnInterfaceNow(
          stepTransmitOnInterfaceWithActions(
            initialTransmitOnInterfaceState(),
            {
              kind: "transport/transmit-on-interface-gate",
              outgoing: outbound.outgoing,
              isExcludedInterface: outbound === iface,
            },
          ).actions,
        )
      ) {
        continue;
      }

      this.forwardPathRequest(
        discoveryParsed.destinationHash,
        discoveryParsed.tag!,
        outbound,
      );
    }
  }

  protected async fulfillDiscoveryPathRequest(
    packet: Packet,
    iface: PacketInterface,
  ): Promise<void> {
    const destinationKey = hashKey(packet.destinationHash);
    const pending = this.discoveryPathRequests.get(destinationKey);
    const nowSeconds = this.clock.now() / 1000;
    const stepped = stepDiscoveryPathRequestFulfillWithActions(
      initialDiscoveryPathRequestFulfillState(),
      {
        kind: "path-request/discovery-fulfill-gate",
        hasPending: pending !== undefined,
        expired:
          pending !== undefined &&
          shouldTreatDiscoveryPathRequestExpired(
            stepDiscoveryPathRequestExpiredWithActions(
              initialDiscoveryPathRequestExpiredState(),
              {
                kind: "path-request/discovery-expired-gate",
                timeoutAt: pending.timeout,
                nowSeconds,
              },
            ).actions,
          ),
      },
    );

    if (shouldIgnoreDiscoveryPathFulfillActions(stepped.actions)) {
      return;
    }

    this.discoveryPathRequests.delete(destinationKey);
    if (
      !shouldFulfillDiscoveryPendingNow(
        stepFulfillDiscoveryPendingWithActions(
          initialFulfillDiscoveryPendingState(),
          {
            kind: "path-request/fulfill-pending-gate",
            fulfillOk: shouldFulfillDiscoveryPathRequest(stepped.actions),
            pendingPresent: pending !== undefined,
          },
        ).actions,
      )
    ) {
      return;
    }

    const response = buildPathResponseAnnounce(
      this.provider,
      packet,
      this.transportIdentity,
      packet.hops,
    );
    await this.transmit(pending!.requestingInterface, response.raw);
  }
}
