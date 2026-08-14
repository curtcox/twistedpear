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
import type { LocalDestination } from "./node.js";
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
    const localDestination = this.findPathRequestLocalDestination(parsed);
    const tagKey = pathRequestTagKeyFromParsed(parsed);
    const destinationKey =
      parsed !== null ? hashKey(parsed.destinationHash) : null;
    const nowSeconds = this.clock.now() / 1000;
    const discoveryExpired = this.isDiscoveryExpired(
      destinationKey,
      nowSeconds,
    );
    const stepped = this.stepPathRequestIngress({
      parsed,
      path,
      localDestination,
      tagKey,
      destinationKey,
      discoveryExpired,
    });
    const handled = await this.applyPathRequestIngress(stepped.actions, {
      parsed,
      path,
      localDestination,
      tagKey,
      destinationKey,
      discoveryExpired,
      nowSeconds,
      iface,
    });
    if (handled) {
      return;
    }
  }

  private stepPathRequestIngress(input: {
    parsed: ReturnType<typeof parsePathRequestData>;
    path: ReturnType<TransportNodePath["getPathEntry"]>;
    localDestination: LocalDestination | undefined;
    tagKey: string | null;
    destinationKey: string | null;
    discoveryExpired: boolean;
  }) {
    return stepPathRequestIngressWithActions(initialPathRequestIngressState(), {
      kind: "path-request/ingress-gate",
      parsedOk: input.parsed !== null,
      hasTag: input.parsed?.tag !== null && input.parsed?.tag !== undefined,
      tagAlreadySeen:
        input.tagKey !== null && this.discoveryPrTags.has(input.tagKey),
      hasLocalAnswerer: input.localDestination?.answerPathRequest !== undefined,
      transportEnabled: this.transportEnabled,
      hasPath: input.path !== undefined,
      shouldAnswerPath: this.shouldAnswerStoredPath(input.path, input.parsed),
      discoveryPresent:
        input.destinationKey !== null &&
        this.discoveryPathRequests.get(input.destinationKey) !== undefined,
      discoveryExpired: input.discoveryExpired,
      allowDiscovery: true,
    });
  }

  private findPathRequestLocalDestination(
    parsed: ReturnType<typeof parsePathRequestData>,
  ): LocalDestination | undefined {
    if (parsed === null) {
      return undefined;
    }
    return this.destinations.find((entry) =>
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
  }

  private isDiscoveryExpired(
    destinationKey: string | null,
    nowSeconds: number,
  ): boolean {
    const existingDiscovery =
      destinationKey !== null
        ? this.discoveryPathRequests.get(destinationKey)
        : undefined;
    if (existingDiscovery === undefined) {
      return false;
    }
    return shouldTreatDiscoveryPathRequestExpired(
      stepDiscoveryPathRequestExpiredWithActions(
        initialDiscoveryPathRequestExpiredState(),
        {
          kind: "path-request/discovery-expired-gate",
          timeoutAt: existingDiscovery.timeout,
          nowSeconds,
        },
      ).actions,
    );
  }

  private shouldAnswerStoredPath(
    path: ReturnType<TransportNodePath["getPathEntry"]>,
    parsed: ReturnType<typeof parsePathRequestData>,
  ): boolean {
    if (path === undefined) {
      return false;
    }
    return shouldAnswerPathRequestNow(
      stepAnswerPathRequestWithActions(initialAnswerPathRequestState(), {
        kind: "path-request/answer-path-gate",
        nextHop: path.nextHop,
        requestorTransportId: parsed?.requestorTransportId ?? null,
      }).actions,
    );
  }

  private async applyPathRequestIngress(
    actions: ReturnType<typeof stepPathRequestIngressWithActions>["actions"],
    input: {
      parsed: ReturnType<typeof parsePathRequestData>;
      path: ReturnType<TransportNodePath["getPathEntry"]>;
      localDestination: LocalDestination | undefined;
      tagKey: string | null;
      destinationKey: string | null;
      discoveryExpired: boolean;
      nowSeconds: number;
      iface: PacketInterface;
    },
  ): Promise<boolean> {
    if (
      shouldIgnorePathRequestUnparsed(actions) ||
      shouldIgnorePathRequestSeenTag(actions)
    ) {
      return true;
    }

    if (
      shouldRememberPathRequestTagNow(
        stepRememberPathRequestTagWithActions(
          initialRememberPathRequestTagState(),
          {
            kind: "path-request/remember-tag-gate",
            tagKeyPresent: input.tagKey !== null,
          },
        ).actions,
      )
    ) {
      this.discoveryPrTags.add(input.tagKey!);
    }

    if (shouldAnswerPathRequestLocal(actions)) {
      await this.answerLocalPathRequest(input.localDestination, input.iface);
      return true;
    }

    if (shouldAnswerPathRequestPath(actions)) {
      await this.answerStoredPathRequest(input.path, input.iface);
      return true;
    }

    if (
      shouldIgnorePathRequestIngress(actions) ||
      shouldIgnorePathRequestInFlightDiscovery(actions)
    ) {
      return true;
    }

    if (!shouldStartPathRequestDiscovery(actions)) {
      return true;
    }

    this.beginPathDiscovery({
      parsed: input.parsed,
      destinationKey: input.destinationKey,
      discoveryExpired: input.discoveryExpired,
      nowSeconds: input.nowSeconds,
      iface: input.iface,
    });
    return true;
  }

  private async answerLocalPathRequest(
    localDestination: LocalDestination | undefined,
    iface: PacketInterface,
  ): Promise<void> {
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
  }

  private async answerStoredPathRequest(
    path: ReturnType<TransportNodePath["getPathEntry"]>,
    iface: PacketInterface,
  ): Promise<void> {
    if (
      !shouldAnswerPathWithEntryNow(
        stepAnswerPathWithEntryWithActions(initialAnswerPathWithEntryState(), {
          kind: "path-request/answer-path-entry-gate",
          pathPresent: path !== undefined,
        }).actions,
      )
    ) {
      return;
    }
    await this.sendPathResponse(path!, iface);
  }

  private beginPathDiscovery(input: {
    parsed: ReturnType<typeof parsePathRequestData>;
    destinationKey: string | null;
    discoveryExpired: boolean;
    nowSeconds: number;
    iface: PacketInterface;
  }): void {
    const { parsed, destinationKey, discoveryExpired, nowSeconds, iface } =
      input;
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
    _iface: PacketInterface,
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

function pathRequestTagKeyFromParsed(
  parsed: ReturnType<typeof parsePathRequestData>,
): string | null {
  if (parsed === null || parsed.tag === null) {
    return null;
  }
  return pathRequestTagKey(parsed.destinationHash, parsed.tag);
}
