import {
  initialAcceptCachedPathResponsePacketState,
  initialAnswerLocalPathRequestState,
  initialAnswerPathRequestState,
  initialAnswerPathWithEntryState,
  initialDestinationProofState,
  initialDispatchLocalPlainDataDeliveryState,
  initialEmitDestinationProofState,
  initialLocalPathRequestPacketState,
  initialLocalPlainDataDeliveryState,
  initialMatchLocalInboundDestinationState,
  initialMatchLocalTypedDestinationState,
  initialPathOutboundState,
  initialPathRequestIngressState,
  initialPathResponseGraceState,
  initialTransportIngressDispatchState,
  PATH_RESPONSE_GRACE_TIMER_ID,
  shouldAcceptCachedPathResponsePacketNow,
  shouldAnswerLocalPathRequestNow,
  shouldAnswerPathRequestLocal,
  shouldAnswerPathRequestNow,
  shouldAnswerPathRequestPath,
  shouldAnswerPathWithEntryNow,
  shouldDirectPathOutbound,
  shouldDispatchLocalPlainDataDeliveryActions,
  shouldDispatchLocalPlainDataDeliveryNow,
  shouldEmitDestinationProofNow,
  shouldIgnorePathRequestSeenTag,
  shouldIgnorePathRequestUnparsed,
  shouldIgnoreTransportIngressDispatch,
  shouldDispatchTransportAnnounce,
  shouldDispatchTransportLinkData,
  shouldDispatchTransportLinkRequest,
  shouldDispatchTransportPlainData,
  shouldDispatchTransportProof,
  shouldMatchLocalInboundDestinationNow,
  shouldMatchLocalTypedDestinationNow,
  shouldProveDestination,
  shouldRememberPathRequestTagNow,
  shouldTransmitOnInterfaceNow,
  shouldTreatLocalPathRequestPacket,
  shouldUsePathForOutboundNow,
  shouldWrapPathOutbound,
  stepAcceptCachedPathResponsePacketWithActions,
  stepAnswerLocalPathRequestWithActions,
  stepAnswerPathRequestWithActions,
  stepAnswerPathWithEntryWithActions,
  stepDestinationProofWithActions,
  stepDispatchLocalPlainDataDeliveryWithActions,
  stepEmitDestinationProofWithActions,
  stepLocalPathRequestPacketWithActions,
  stepLocalPlainDataDeliveryWithActions,
  stepMatchLocalInboundDestinationWithActions,
  stepMatchLocalTypedDestinationWithActions,
  stepPathOutboundWithActions,
  stepPathRequestIngressWithActions,
  stepPathResponseGraceWithActions,
  stepRememberPathRequestTagWithActions,
  stepTransportIngressDispatchWithActions,
  stepTransmitOnInterfaceWithActions,
  stepUsePathForOutboundWithActions,
  initialRememberPathRequestTagState,
  initialTransmitOnInterfaceState,
  initialUsePathForOutboundState,
} from "./protocol.js";

import { equalBytes } from "../../crypto/bytes.js";
import { DestinationDirection, DestinationType } from "../../destination.js";
import type { PacketInterface } from "../../interfaces/interface.js";
import {
  Packet,
  PacketHeaderType,
  PacketType,
  TransportType,
} from "../../packet.js";
import { parsePathRequestData, pathRequestTagKey } from "../path.js";
import {
  buildPathResponseAnnounce,
  cloneWithHops,
  hashKey,
  wrapTransportPacket,
} from "./shared.js";
import type { LocalDestination, PathEntry } from "./shared.js";
import { dropFromIngressIgnore } from "../drop-notify.js";
import { LeafTransportLayer1Proof } from "./layer-1-proof.js";

export class LeafTransportLayer1 extends LeafTransportLayer1Proof {
  protected async inbound(
    packet: Packet,
    iface: PacketInterface,
  ): Promise<void> {
    const workingPacket = cloneWithHops(
      this.options.provider,
      packet,
      packet.hops + 1,
    );

    if (!this.packetFilter(workingPacket)) {
      return;
    }

    this.packetHashes.add(hashKey(workingPacket.hash()));

    const dispatchStepped = stepTransportIngressDispatchWithActions(
      initialTransportIngressDispatchState(),
      {
        kind: "transport/ingress-dispatch-gate",
        packetType: workingPacket.packetType,
        destinationType: workingPacket.destinationType,
      },
    );
    if (shouldDispatchTransportAnnounce(dispatchStepped.actions)) {
      await this.handleAnnounce(workingPacket, iface);
      return;
    }
    if (shouldDispatchTransportLinkRequest(dispatchStepped.actions)) {
      await this.handleLinkRequest(workingPacket, iface);
      return;
    }
    if (shouldDispatchTransportLinkData(dispatchStepped.actions)) {
      await this.handleLinkData(workingPacket, iface);
      return;
    }
    if (shouldDispatchTransportPlainData(dispatchStepped.actions)) {
      await this.handleData(workingPacket, iface);
      return;
    }
    if (shouldDispatchTransportProof(dispatchStepped.actions)) {
      await this.handleProof(workingPacket, iface);
      return;
    }
    if (shouldIgnoreTransportIngressDispatch(dispatchStepped.actions)) {
      this.emitDrop(dropFromIngressIgnore(dispatchStepped.actions, iface.name));
      return;
    }
  }

  protected async handleData(
    packet: Packet,
    iface: PacketInterface,
  ): Promise<void> {
    const pathRequestStepped = stepLocalPathRequestPacketWithActions(
      initialLocalPathRequestPacketState(),
      {
        kind: "transport/local-path-request-packet-gate",
        destinationTypePlain: packet.destinationType === DestinationType.PLAIN,
        destinationHashMatches: equalBytes(
          packet.destinationHash,
          this.pathRequestHash,
        ),
      },
    );
    /* Handle path-request DATA only from `path-request` (no ad-hoc `isLocalPathRequestPacket` reads). */
    if (shouldTreatLocalPathRequestPacket(pathRequestStepped.actions)) {
      await this.handlePathRequest(packet, iface);
      return;
    }

    const destination = this.destinations.find((entry) =>
      shouldMatchLocalTypedDestinationNow(
        stepMatchLocalTypedDestinationWithActions(
          initialMatchLocalTypedDestinationState(),
          {
            kind: "transport/match-local-typed-destination-gate",
            hashMatches: equalBytes(entry.hash, packet.destinationHash),
            typeMatches: entry.type === packet.destinationType,
          },
        ).actions,
      ),
    );
    const plaintext =
      destination === undefined ? null : destination.decrypt(packet.data);
    const deliveryStepped = stepLocalPlainDataDeliveryWithActions(
      initialLocalPlainDataDeliveryState(),
      {
        kind: "transport/local-plain-data-gate",
        destinationPresent: destination !== undefined,
        plaintextPresent: plaintext !== null,
      },
    );
    const dispatchStepped = stepDispatchLocalPlainDataDeliveryWithActions(
      initialDispatchLocalPlainDataDeliveryState(),
      {
        kind: "transport/dispatch-local-plain-data-gate",
        planDispatch: shouldDispatchLocalPlainDataDeliveryActions(
          deliveryStepped.actions,
        ),
        destinationPresent: destination !== undefined,
        plaintextPresent: plaintext !== null,
      },
    );
    if (!shouldDispatchLocalPlainDataDeliveryNow(dispatchStepped.actions)) {
      return;
    }

    destination!.dispatchPacket(plaintext!, packet);

    const proofStepped = stepDestinationProofWithActions(
      initialDestinationProofState(),
      {
        kind: "destination/proof-gate",
        strategy: destination!.proofStrategy,
        appWantsProof: destination!.shouldProve(packet),
      },
    );
    if (shouldProveDestination(proofStepped.actions)) {
      await this.sendProof(destination!, packet, iface);
    }
  }

  protected async sendProof(
    destination: LocalDestination,
    packet: Packet,
    iface: PacketInterface,
  ): Promise<void> {
    const emit = stepEmitDestinationProofWithActions(
      initialEmitDestinationProofState(),
      {
        kind: "destination/emit-proof-gate",
        identityPresent: destination.identity !== null,
      },
    );
    if (!shouldEmitDestinationProofNow(emit.actions)) {
      return;
    }

    const packetHash = packet.hash();
    await destination.identity!.prove(
      packetHash,
      packet.proofDestinationHash(),
      async (proofDestinationHash: Uint8Array, proofData: Uint8Array) => {
        const proofPacket = Packet.fromFields(this.options.provider, {
          headerType: PacketHeaderType.HEADER_1,
          transportType: TransportType.BROADCAST,
          destinationType: DestinationType.SINGLE,
          packetType: PacketType.PROOF,
          destinationHash: proofDestinationHash,
          data: proofData,
        });
        await this.outbound(proofPacket, iface);
      },
      this.useImplicitProof,
    );
  }

  protected async outbound(
    packet: Packet,
    attachedInterface: PacketInterface | null,
  ): Promise<boolean> {
    const path = this.getPathEntry(packet.destinationHash);
    const stepped = stepPathOutboundWithActions(initialPathOutboundState(), {
      kind: "path/outbound-gate",
      packetType: packet.packetType,
      destinationType: packet.destinationType,
      headerType: packet.headerType,
      hasPath: path !== undefined,
      pathHops: path?.hops ?? 0,
    });

    if (
      shouldWrapPathOutbound(stepped.actions) &&
      shouldUsePathForOutboundNow(
        stepUsePathForOutboundWithActions(initialUsePathForOutboundState(), {
          kind: "path/use-for-outbound-gate",
          pathPresent: path !== undefined,
        }).actions,
      )
    ) {
      const wrapped = wrapTransportPacket(packet, path!.nextHop);
      await this.transmit(path!.receivedInterface, wrapped);
      return true;
    }

    if (
      shouldDirectPathOutbound(stepped.actions) &&
      shouldUsePathForOutboundNow(
        stepUsePathForOutboundWithActions(initialUsePathForOutboundState(), {
          kind: "path/use-for-outbound-gate",
          pathPresent: path !== undefined,
        }).actions,
      )
    ) {
      await this.transmit(path!.receivedInterface, packet.raw);
      return true;
    }

    let sent = false;
    for (const iface of this.interfaces) {
      if (
        !shouldTransmitOnInterfaceNow(
          stepTransmitOnInterfaceWithActions(
            initialTransmitOnInterfaceState(),
            {
              kind: "transport/transmit-on-interface-gate",
              outgoing: iface.outgoing,
              requireAttached: attachedInterface !== null,
              isAttached:
                attachedInterface !== null && iface === attachedInterface,
            },
          ).actions,
        )
      ) {
        continue;
      }

      this.packetHashes.add(hashKey(packet.hash()));
      await this.transmit(iface, packet.raw);
      sent = true;
    }

    return sent;
  }

  protected async handlePathRequest(
    packet: Packet,
    iface: PacketInterface,
  ): Promise<void> {
    const parsed = parsePathRequestData(packet.data);
    const path =
      parsed === null ? undefined : this.getPathEntry(parsed.destinationHash);
    const localDestination = this.findLocalPathRequestDestination(parsed);
    const tagKey =
      parsed !== null && parsed.tag !== null
        ? pathRequestTagKey(parsed.destinationHash, parsed.tag)
        : null;
    const stepped = this.stepLocalPathRequestIngress(
      parsed,
      path,
      localDestination,
      tagKey,
    );
    await this.applyLocalPathRequestIngress(
      stepped.actions,
      localDestination,
      path,
      tagKey,
      iface,
    );
  }

  private findLocalPathRequestDestination(
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

  private stepLocalPathRequestIngress(
    parsed: ReturnType<typeof parsePathRequestData>,
    path: ReturnType<LeafTransportLayer1["getPathEntry"]>,
    localDestination: LocalDestination | undefined,
    tagKey: string | null,
  ) {
    return stepPathRequestIngressWithActions(initialPathRequestIngressState(), {
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
      discoveryPresent: false,
      discoveryExpired: false,
      allowDiscovery: false,
    });
  }

  private async applyLocalPathRequestIngress(
    actions: ReturnType<typeof stepPathRequestIngressWithActions>["actions"],
    localDestination: LocalDestination | undefined,
    path: ReturnType<LeafTransportLayer1["getPathEntry"]>,
    tagKey: string | null,
    iface: PacketInterface,
  ): Promise<void> {
    if (
      shouldIgnorePathRequestUnparsed(actions) ||
      shouldIgnorePathRequestSeenTag(actions)
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

    if (shouldAnswerPathRequestLocal(actions)) {
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

    if (
      shouldAnswerPathRequestPath(actions) &&
      shouldAnswerPathWithEntryNow(
        stepAnswerPathWithEntryWithActions(initialAnswerPathWithEntryState(), {
          kind: "path-request/answer-path-entry-gate",
          pathPresent: path !== undefined,
        }).actions,
      )
    ) {
      await this.sendPathResponse(path!, iface);
    }
  }

  protected async sendPathResponse(
    path: PathEntry,
    iface: PacketInterface,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const armed = stepPathResponseGraceWithActions(
        initialPathResponseGraceState(),
        {
          kind: "path-response-grace/arm",
        },
      );
      let state = armed.state;
      let concluded = false;

      const finish = (): void => {
        if (concluded) {
          return;
        }
        concluded = true;
        resolve();
      };

      const applyIntents = (
        intents: ReturnType<typeof stepPathResponseGraceWithActions>["intents"],
      ): void => {
        for (const intent of intents) {
          if (
            intent.kind === "timer/set" &&
            intent.timer.id === PATH_RESPONSE_GRACE_TIMER_ID
          ) {
            this.clock.setTimeout(() => {
              const tick = stepPathResponseGraceWithActions(state, {
                kind: "timer/fired",
                id: PATH_RESPONSE_GRACE_TIMER_ID,
                at: this.clock.now(),
              });
              state = tick.state;
              applyIntents(tick.intents);
              void applyActions(tick.actions).catch(reject);
            }, intent.timer.delayMs);
          }
        }
      };

      const applyActions = async (
        actions: ReturnType<typeof stepPathResponseGraceWithActions>["actions"],
      ): Promise<void> => {
        for (const action of actions) {
          if (action.kind === "transmit") {
            const cached = Packet.decode(this.provider, path.announceRaw);
            if (
              !shouldAcceptCachedPathResponsePacketNow(
                stepAcceptCachedPathResponsePacketWithActions(
                  initialAcceptCachedPathResponsePacketState(),
                  {
                    kind: "path-response/accept-cached-packet-gate",
                    decodedOk: cached !== null,
                  },
                ).actions,
              )
            ) {
              return;
            }
            const response = buildPathResponseAnnounce(
              this.provider,
              cached!,
              this.transportIdentity,
              path.hops,
            );
            await this.outbound(response, iface);
          }
          if (action.kind === "resolve") {
            finish();
          }
        }
      };

      applyIntents(armed.intents);
      void applyActions(armed.actions).catch(reject);
    });
  }
}
