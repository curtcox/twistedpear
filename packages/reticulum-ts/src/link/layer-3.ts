import {
  identityPublicKeyFieldsFromActions,
  incomingLinkResourceConcludeIndex,
  initialAcceptLinkIdentifyState,
  initialAcceptLinkRttState,
  initialAcceptResourceHashmapUpdateFrameState,
  initialAttemptLinkProofCryptoState,
  initialClassifyLinkProofPayloadState,
  initialCommitLinkRemoteIdentityState,
  initialCreateLinkChannelState,
  initialDeliverPendingLinkAppResponseState,
  initialDispatchLinkPlaintextState,
  initialExpectedLinkModeState,
  initialHandleIncomingResourceByHashState,
  initialHandleOutgoingResourceRequestState,
  initialIndexOfPendingLinkAppRequestState,
  initialInvokeLinkAppRequestHandlerState,
  initialLinkAppRequestInboundState,
  initialLinkEstablishState,
  initialLinkIdentifySignedMaterialState,
  initialLinkIdentifyState,
  initialLinkProofSignedMaterialState,
  initialLinkProofValidateState,
  initialLinkResourceAdvertisementState,
  initialLinkResourceConcludeState,
  initialPackLinkResponseState,
  initialSendLinkAppRequestResponseState,
  initialSplitIdentityPublicKeyState,
  initialSplitLinkIdentifyPayloadState,
  initialSplitLinkProofBodyState,
  initialSplitResourceHashmapUpdatePacketState,
  initialUnpackLinkRequestState,
  initialUnpackLinkResponseState,
  initialValidateLinkProofAllowState,
  LINK_PROOF_BODY_SIZE,
  linkIdentifyPayloadFieldsFromActions,
  linkIdentifySignedMaterialRawFromActions,
  linkProofBodyFieldsFromActions,
  linkProofSignedMaterialRawFromActions,
  linkRequestFieldsFromActions,
  linkResponseFieldsFromActions,
  outgoingLinkResourceConcludeIndex,
  packLinkResponseRawFromActions,
  pendingLinkAppRequestIndexFromActions,
  resourceHashmapUpdatePacketFieldsFromActions,
  shouldAcceptLinkIdentifyNow,
  shouldAcceptLinkResourceAdvertisement,
  shouldAcceptLinkRttNow,
  shouldAcceptResourceHashmapUpdateFrameNow,
  shouldAllowValidateLinkProof,
  shouldAskAppLinkResourceAdvertisement,
  shouldAttemptLinkProofCryptoNow,
  shouldClassifyLinkProofPayloadBodyOnly,
  shouldClassifyLinkProofPayloadBodyWithMtu,
  shouldCommitLinkIdentify,
  shouldCommitLinkRemoteIdentityNow,
  shouldCreateLinkChannelNow,
  shouldDeliverPendingLinkAppResponseNow,
  shouldDispatchLinkPlaintextNow,
  shouldForbidLinkAppRequestInbound,
  shouldHandleIncomingResourceByHashNow,
  shouldHandleOutgoingResourceRequestNow,
  shouldIgnoreLinkAppRequestInbound,
  shouldIgnoreLinkAppRequestInboundResponse,
  shouldIgnoreLinkResourceAdvertisement,
  shouldInvokeLinkAppRequestHandlerNow,
  shouldInvokeLinkAppRequestInbound,
  shouldMatchExpectedLinkMode,
  shouldRejectLinkAppRequestInboundTooBig,
  shouldRejectLinkIdentify,
  shouldRejectLinkProofValidate,
  shouldRejectLinkResourceAdvertisement,
  shouldRejectSplitLinkIdentifyPayload,
  shouldRejectSplitLinkProofBody,
  shouldRejectSplitResourceHashmapUpdatePacket,
  shouldRejectUnpackLinkRequest,
  shouldRejectUnpackLinkResponse,
  shouldRemoveIncomingLinkResourceConclude,
  shouldRemoveOutgoingLinkResourceConclude,
  shouldSendLinkAppRequestInboundResponse,
  shouldSendLinkAppRequestResponseNow,
  shouldUseLinkIdentifySignedMaterial,
  shouldUseLinkProofSignedMaterial,
  shouldUsePackLinkResponse,
  shouldUsePendingLinkAppRequestIndex,
  shouldUseSplitIdentityPublicKey,
  shouldUseSplitLinkIdentifyPayload,
  shouldUseSplitLinkProofBody,
  shouldUseSplitResourceHashmapUpdatePacket,
  shouldUseUnpackLinkRequest,
  shouldUseUnpackLinkResponse,
  stepAcceptLinkIdentifyWithActions,
  stepAcceptLinkRttWithActions,
  stepAcceptResourceHashmapUpdateFrameWithActions,
  stepAttemptLinkProofCryptoWithActions,
  stepClassifyLinkProofPayloadWithActions,
  stepCommitLinkRemoteIdentityWithActions,
  stepCreateLinkChannelWithActions,
  stepDeliverPendingLinkAppResponseWithActions,
  stepDispatchLinkPlaintextWithActions,
  stepExpectedLinkModeWithActions,
  stepHandleIncomingResourceByHashWithActions,
  stepHandleOutgoingResourceRequestWithActions,
  stepIndexOfPendingLinkAppRequestWithActions,
  stepInvokeLinkAppRequestHandlerWithActions,
  stepLinkAppRequestInboundWithActions,
  stepLinkEstablishWithActions,
  stepLinkIdentifySignedMaterialWithActions,
  stepLinkIdentifyWithActions,
  stepLinkProofSignedMaterialWithActions,
  stepLinkProofValidateWithActions,
  stepLinkResourceAdvertisementWithActions,
  stepLinkResourceConcludeWithActions,
  stepPackLinkResponseWithActions,
  stepSendLinkAppRequestResponseWithActions,
  stepSplitIdentityPublicKeyWithActions,
  stepSplitLinkIdentifyPayloadWithActions,
  stepSplitLinkProofBodyWithActions,
  stepSplitResourceHashmapUpdatePacketWithActions,
  stepUnpackLinkRequestWithActions,
  stepUnpackLinkResponseWithActions,
  stepValidateLinkProofAllowWithActions,
  type LinkAppRequestInboundAction,
  type LinkAppRequestInboundState,
  type LinkIdentifyAction,
  type LinkRequestFields,
  type LinkResourceAdvertisementAction,
  type LinkResourceAdvertisementState,
} from "./protocol.js";

import type { CryptoProvider } from "../crypto/provider.js";
import { Token } from "../crypto/token.js";
import { Channel, LinkChannelOutlet } from "../channel.js";
import { equalBytes } from "../crypto/bytes.js";
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
  linkRequestTimeoutForRtt,
  linkRttSecondsForRequest,
  mergedLinkRtt,
} from "./shared.js";
import type {
  InitiatorLinkOptions,
  LinkCallbacks,
  LinkRequestOptions,
  LinkSendContextResult,
} from "./shared.js";
import type { Link } from "../link.js";
import { LinkLayer3Core } from "./layer-3-core.js";
export class LinkLayer3 extends LinkLayer3Core {
  protected async handleIdentifyPacket(packet: Packet): Promise<void> {
    const acceptStepped = stepAcceptLinkIdentifyWithActions(
      initialAcceptLinkIdentifyState(),
      {
        kind: "link-identify/accept-gate",
        initiator: this.initiator,
      },
    );
    const plaintext = shouldAcceptLinkIdentifyNow(acceptStepped.actions)
      ? this.decrypt(packet.data)
      : null;
    const splitStepped =
      plaintext !== null
        ? stepSplitLinkIdentifyPayloadWithActions(
            initialSplitLinkIdentifyPayloadState(),
            {
              kind: "link-identify/split-gate",
              plaintext,
            },
          )
        : null;
    const parts =
      splitStepped === null ||
      shouldRejectSplitLinkIdentifyPayload(splitStepped.actions) ||
      !shouldUseSplitLinkIdentifyPayload(splitStepped.actions)
        ? null
        : linkIdentifyPayloadFieldsFromActions(splitStepped.actions);
    const identity =
      parts !== null
        ? Identity.fromPublicKey(this.provider, parts.publicKey)
        : null;
    const signedStepped =
      parts !== null
        ? stepLinkIdentifySignedMaterialWithActions(
            initialLinkIdentifySignedMaterialState(),
            {
              kind: "link-identify/signed-material-gate",
              linkId: this.linkId,
              publicKey: parts.publicKey,
            },
          )
        : null;
    const signedData =
      signedStepped !== null &&
      shouldUseLinkIdentifySignedMaterial(signedStepped.actions)
        ? linkIdentifySignedMaterialRawFromActions(signedStepped.actions)
        : null;
    const signatureValid =
      identity !== null &&
      parts !== null &&
      signedData !== null &&
      identity.validate(parts.signature, signedData);

    const stepped = stepLinkIdentifyWithActions(
      initialLinkIdentifyState({ initiator: this.initiator }),
      {
        kind: "identify/received",
        plaintextPresent: plaintext !== null,
        partsPresent: parts !== null,
        identityPresent: identity !== null,
        signatureValid,
      },
    );
    this.applyLinkIdentifyActions(stepped.actions, identity);
    await Promise.resolve();
  }

  protected applyLinkIdentifyActions(
    actions: readonly LinkIdentifyAction[],
    identity: Identity | null,
  ): void {
    if (shouldRejectLinkIdentify(actions)) {
      return;
    }

    const commitStepped = stepCommitLinkRemoteIdentityWithActions(
      initialCommitLinkRemoteIdentityState(),
      {
        kind: "link-identify/commit-remote-identity-gate",
        planAccept: shouldCommitLinkIdentify(actions),
        identityPresent: identity !== null,
      },
    );
    /* Commit remoteIdentity only from `commit` (no ad-hoc identity !== null). */
    if (!shouldCommitLinkRemoteIdentityNow(commitStepped.actions)) {
      return;
    }
    this.remoteIdentity = identity!;
    this.callbacks.remoteIdentified?.(this as unknown as Link, identity!);
  }

  protected async handleRequestPacket(packet: Packet): Promise<void> {
    const requestId = packet.truncatedHash();
    const plaintext = this.decrypt(packet.data);

    const unpackStepped =
      plaintext !== null
        ? stepUnpackLinkRequestWithActions(initialUnpackLinkRequestState(), {
            kind: "link-request-codec/unpack-gate",
            data: plaintext,
          })
        : null;
    const unpacked =
      unpackStepped !== null &&
      !shouldRejectUnpackLinkRequest(unpackStepped.actions) &&
      shouldUseUnpackLinkRequest(unpackStepped.actions)
        ? linkRequestFieldsFromActions(unpackStepped.actions)
        : null;

    const handlerDestination = this.owner ?? this.destination;
    const pathHash = unpacked?.pathHash ?? null;
    const handler =
      handlerDestination !== null && pathHash !== null
        ? handlerDestination.getRequestHandler(pathHash)
        : undefined;

    const stepped = stepLinkAppRequestInboundWithActions(
      initialLinkAppRequestInboundState({ mdu: this.mdu }),
      {
        kind: "app-request/received",
        plaintextPresent: plaintext !== null,
        handlerDestinationPresent: handlerDestination !== null,
        handlerPresent: handler !== undefined,
        allow: handler?.allow ?? 0,
        allowedList: handler?.allowedList ?? [],
        remoteIdentityHash: this.remoteIdentity?.hash ?? null,
        unpackedPresent: unpacked !== null,
      },
    );
    await this.applyLinkAppRequestInboundActions(
      stepped.state,
      stepped.actions,
      {
        unpacked,
        handler,
        requestId,
        packedResponse: null,
      },
    );
  }

  protected async applyLinkAppRequestInboundActions(
    state: LinkAppRequestInboundState,
    actions: readonly LinkAppRequestInboundAction[],
    ctx: {
      readonly unpacked: LinkRequestFields | null;
      readonly handler: RequestHandler | undefined;
      readonly requestId: Uint8Array;
      readonly packedResponse: Uint8Array | null;
    },
  ): Promise<void> {
    if (
      shouldIgnoreLinkAppRequestInbound(actions) ||
      shouldForbidLinkAppRequestInbound(actions)
    ) {
      return;
    }

    const invokeStepped = stepInvokeLinkAppRequestHandlerWithActions(
      initialInvokeLinkAppRequestHandlerState(),
      {
        kind: "link/invoke-app-request-handler-gate",
        dispatchInvoke: shouldInvokeLinkAppRequestInbound(actions),
        unpackedPresent: ctx.unpacked !== null,
        handlerPresent: ctx.handler !== undefined,
      },
    );
    /* Invoke handler only from `invoke` (no ad-hoc unpacked/handler presence). */
    if (shouldInvokeLinkAppRequestHandlerNow(invokeStepped.actions)) {
      const response = await ctx.handler!.responseGenerator(
        ctx.handler!.path,
        ctx.unpacked!.data,
        ctx.requestId,
        this.linkId,
        this.remoteIdentity,
        ctx.unpacked!.requestedAt,
      );

      const packStepped =
        response !== null
          ? stepPackLinkResponseWithActions(initialPackLinkResponseState(), {
              kind: "link-response-codec/pack-gate",
              requestId: ctx.requestId,
              response,
            })
          : null;
      const packedResponse =
        packStepped !== null && shouldUsePackLinkResponse(packStepped.actions)
          ? packLinkResponseRawFromActions(packStepped.actions)
          : null;
      const next = stepLinkAppRequestInboundWithActions(state, {
        kind: "app-request/handler-result",
        responsePresent: packedResponse !== null,
        packedLength: packedResponse?.length ?? 0,
      });
      await this.applyLinkAppRequestInboundActions(next.state, next.actions, {
        ...ctx,
        packedResponse,
      });
      return;
    }

    if (
      shouldIgnoreLinkAppRequestInboundResponse(actions) ||
      shouldRejectLinkAppRequestInboundTooBig(actions)
    ) {
      return;
    }

    const sendStepped = stepSendLinkAppRequestResponseWithActions(
      initialSendLinkAppRequestResponseState(),
      {
        kind: "link/send-app-request-response-gate",
        planSend: shouldSendLinkAppRequestInboundResponse(actions),
        packedPresent: ctx.packedResponse !== null,
      },
    );
    /* Transmit packed response only from `send` (no ad-hoc packedResponse reads). */
    if (shouldSendLinkAppRequestResponseNow(sendStepped.actions)) {
      await this.sendContext(PacketContext.RESPONSE, ctx.packedResponse!);
    }
  }

  protected handleResponsePacket(packet: Packet): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    if (
      !shouldDispatchLinkPlaintextNow(
        stepDispatchLinkPlaintextWithActions(
          initialDispatchLinkPlaintextState(),
          {
            kind: "link/dispatch-plaintext-gate",
            plaintextPresent: plaintext !== null,
          },
        ).actions,
      )
    ) {
      return Promise.resolve();
    }

    const unpackStepped = stepUnpackLinkResponseWithActions(
      initialUnpackLinkResponseState(),
      {
        kind: "link-response-codec/unpack-gate",
        data: plaintext!,
      },
    );
    if (
      shouldRejectUnpackLinkResponse(unpackStepped.actions) ||
      !shouldUseUnpackLinkResponse(unpackStepped.actions)
    ) {
      return Promise.resolve();
    }
    const fields = linkResponseFieldsFromActions(unpackStepped.actions);
    if (fields === null) {
      return Promise.resolve();
    }
    const pending = [...this.pendingRequests];
    /** Adapt pending app-request index via protocol actions (no ad-hoc
     * `indexOfPendingLinkAppRequest` reads). */
    const indexStepped = stepIndexOfPendingLinkAppRequestWithActions(
      initialIndexOfPendingLinkAppRequestState(),
      {
        kind: "link/pending-app-request-index-gate",
        requestIds: pending.map((entry) => entry.requestId),
        target: fields.requestId,
      },
    );
    /** Adapt RESPONSE deliver via protocol actions (no ad-hoc
     * `shouldDeliverPendingLinkAppResponse` reads). */
    const deliverStepped = stepDeliverPendingLinkAppResponseWithActions(
      initialDeliverPendingLinkAppResponseState(),
      {
        kind: "link/pending-app-response-deliver-gate",
        indexPresent: shouldUsePendingLinkAppRequestIndex(indexStepped.actions),
      },
    );
    if (shouldDeliverPendingLinkAppResponseNow(deliverStepped.actions)) {
      const index = pendingLinkAppRequestIndexFromActions(
        indexStepped.actions,
      )!;
      pending[index]!.responseReceived(fields.response);
    }
    return Promise.resolve();
  }

  protected async handleResourceAdvertisementPacket(
    packet: Packet,
  ): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    if (
      !shouldDispatchLinkPlaintextNow(
        stepDispatchLinkPlaintextWithActions(
          initialDispatchLinkPlaintextState(),
          {
            kind: "link/dispatch-plaintext-gate",
            plaintextPresent: plaintext !== null,
          },
        ).actions,
      )
    ) {
      return;
    }

    const stepped = stepLinkResourceAdvertisementWithActions(
      initialLinkResourceAdvertisementState({
        strategy: this.resourceStrategy,
      }),
      {
        kind: "resource-adv/received",
        isRequest: ResourceAdvertisement.isRequest(plaintext!),
      },
    );
    await this.applyLinkResourceAdvertisementActions(
      stepped.state,
      stepped.actions,
      plaintext!,
      packet,
    );
  }

  protected async applyLinkResourceAdvertisementActions(
    state: LinkResourceAdvertisementState,
    actions: readonly LinkResourceAdvertisementAction[],
    plaintext: Uint8Array,
    packet: Packet,
  ): Promise<void> {
    if (shouldIgnoreLinkResourceAdvertisement(actions)) {
      return;
    }

    if (shouldAskAppLinkResourceAdvertisement(actions)) {
      try {
        const advertisement = ResourceAdvertisement.unpack(plaintext);
        const next = stepLinkResourceAdvertisementWithActions(state, {
          kind: "resource-adv/app-result",
          accepted: this.callbacks.resource?.(advertisement) === true,
        });
        await this.applyLinkResourceAdvertisementActions(
          next.state,
          next.actions,
          plaintext,
          packet,
        );
      } catch {
        return;
      }
      return;
    }

    if (shouldRejectLinkResourceAdvertisement(actions)) {
      Resource.reject(this as unknown as Link, plaintext);
      return;
    }

    if (!shouldAcceptLinkResourceAdvertisement(actions)) {
      return;
    }
    Resource.accept(this as unknown as Link, plaintext, packet, {
      callback: (resource) => this.callbacks.resourceConcluded?.(resource),
    });
  }

  protected async handleResourceRequestPacket(packet: Packet): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    if (
      !shouldDispatchLinkPlaintextNow(
        stepDispatchLinkPlaintextWithActions(
          initialDispatchLinkPlaintextState(),
          {
            kind: "link/dispatch-plaintext-gate",
            plaintextPresent: plaintext !== null,
          },
        ).actions,
      )
    ) {
      return;
    }

    const resourceHash = Resource.readRequestHash(plaintext!);
    for (const resource of this.outgoingResourcesList) {
      if (
        shouldHandleOutgoingResourceRequestNow(
          stepHandleOutgoingResourceRequestWithActions(
            initialHandleOutgoingResourceRequestState(),
            {
              kind: "link/handle-outgoing-resource-request-gate",
              hashMatches: equalBytes(resource.hash, resourceHash),
              alreadySeen: resource.hasSeenRequest(packet),
            },
          ).actions,
        )
      ) {
        resource.trackRequest(packet);
        await resource.handleRequest(plaintext!);
        return;
      }
    }
  }

  protected handleResourceHashmapUpdatePacket(packet: Packet): Promise<void> {
    const plaintext = this.decrypt(packet.data);
    if (
      !shouldDispatchLinkPlaintextNow(
        stepDispatchLinkPlaintextWithActions(
          initialDispatchLinkPlaintextState(),
          {
            kind: "link/dispatch-plaintext-gate",
            plaintextPresent: plaintext !== null,
          },
        ).actions,
      )
    ) {
      return Promise.resolve();
    }

    const splitStepped = stepSplitResourceHashmapUpdatePacketWithActions(
      initialSplitResourceHashmapUpdatePacketState(),
      {
        kind: "resource-hashmap/split-packet-gate",
        plaintext: plaintext!,
      },
    );
    const split = shouldRejectSplitResourceHashmapUpdatePacket(
      splitStepped.actions,
    )
      ? null
      : shouldUseSplitResourceHashmapUpdatePacket(splitStepped.actions)
        ? resourceHashmapUpdatePacketFieldsFromActions(splitStepped.actions)
        : null;
    if (
      !shouldAcceptResourceHashmapUpdateFrameNow(
        stepAcceptResourceHashmapUpdateFrameWithActions(
          initialAcceptResourceHashmapUpdateFrameState(),
          {
            kind: "resource-hashmap/accept-update-frame-gate",
            splitOk: split !== null,
          },
        ).actions,
      )
    ) {
      return Promise.resolve();
    }
    for (const resource of this.incomingResourcesList) {
      if (
        shouldHandleIncomingResourceByHashNow(
          stepHandleIncomingResourceByHashWithActions(
            initialHandleIncomingResourceByHashState(),
            {
              kind: "link/handle-incoming-resource-by-hash-gate",
              hashMatches: equalBytes(resource.hash, split!.resourceHash),
            },
          ).actions,
        )
      ) {
        resource.hashmapUpdatePacket(plaintext!);
        return Promise.resolve();
      }
    }
    return Promise.resolve();
  }
}
