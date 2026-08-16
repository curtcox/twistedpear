import {
  initialAcceptLinkIdentifyState,
  initialAcceptResourceHashmapUpdateFrameState,
  initialCommitLinkRemoteIdentityState,
  initialDeliverPendingLinkAppResponseState,
  initialDispatchLinkPlaintextState,
  initialHandleIncomingResourceByHashState,
  initialHandleOutgoingResourceRequestState,
  initialIndexOfPendingLinkAppRequestState,
  initialInvokeLinkAppRequestHandlerState,
  initialLinkAppRequestInboundState,
  initialLinkIdentifySignedMaterialState,
  initialLinkIdentifyState,
  initialLinkResourceAdvertisementState,
  initialPackLinkResponseState,
  initialSendLinkAppRequestResponseState,
  initialSplitLinkIdentifyPayloadState,
  initialSplitResourceHashmapUpdatePacketState,
  initialUnpackLinkRequestState,
  initialUnpackLinkResponseState,
  linkIdentifyPayloadFieldsFromActions,
  linkIdentifySignedMaterialRawFromActions,
  linkRequestFieldsFromActions,
  linkResponseFieldsFromActions,
  packLinkResponseRawFromActions,
  pendingLinkAppRequestIndexFromActions,
  resourceHashmapUpdatePacketFieldsFromActions,
  shouldAcceptLinkIdentifyNow,
  shouldAcceptLinkResourceAdvertisement,
  shouldAcceptResourceHashmapUpdateFrameNow,
  shouldAskAppLinkResourceAdvertisement,
  shouldCommitLinkIdentify,
  shouldCommitLinkRemoteIdentityNow,
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
  shouldRejectLinkAppRequestInboundTooBig,
  shouldRejectLinkIdentify,
  shouldRejectLinkResourceAdvertisement,
  shouldRejectSplitLinkIdentifyPayload,
  shouldRejectSplitResourceHashmapUpdatePacket,
  shouldRejectUnpackLinkRequest,
  shouldRejectUnpackLinkResponse,
  shouldSendLinkAppRequestInboundResponse,
  shouldSendLinkAppRequestResponseNow,
  shouldUseLinkIdentifySignedMaterial,
  shouldUsePackLinkResponse,
  shouldUsePendingLinkAppRequestIndex,
  shouldUseSplitLinkIdentifyPayload,
  shouldUseSplitResourceHashmapUpdatePacket,
  shouldUseUnpackLinkRequest,
  shouldUseUnpackLinkResponse,
  stepAcceptLinkIdentifyWithActions,
  stepAcceptResourceHashmapUpdateFrameWithActions,
  stepCommitLinkRemoteIdentityWithActions,
  stepDeliverPendingLinkAppResponseWithActions,
  stepDispatchLinkPlaintextWithActions,
  stepHandleIncomingResourceByHashWithActions,
  stepHandleOutgoingResourceRequestWithActions,
  stepIndexOfPendingLinkAppRequestWithActions,
  stepInvokeLinkAppRequestHandlerWithActions,
  stepLinkAppRequestInboundWithActions,
  stepLinkIdentifySignedMaterialWithActions,
  stepLinkIdentifyWithActions,
  stepLinkResourceAdvertisementWithActions,
  stepPackLinkResponseWithActions,
  stepSendLinkAppRequestResponseWithActions,
  stepSplitLinkIdentifyPayloadWithActions,
  stepSplitResourceHashmapUpdatePacketWithActions,
  stepUnpackLinkRequestWithActions,
  stepUnpackLinkResponseWithActions,
  type LinkAppRequestInboundAction,
  type LinkAppRequestInboundState,
  type LinkIdentifyAction,
  type LinkRequestFields,
  type LinkResourceAdvertisementAction,
  type LinkResourceAdvertisementState,
} from "./protocol.js";

import { equalBytes } from "../crypto/bytes.js";
import { Identity } from "../identity.js";
import { Packet, PacketContext } from "../packet.js";
import type { RequestHandler } from "../registered-destination.js";
import { Resource, ResourceAdvertisement } from "../resource.js";
import type { Link } from "../link.js";
import { LinkLayer3Core } from "./layer-3-core.js";
export class LinkLayer3 extends LinkLayer3Core {
  protected async handleIdentifyPacket(packet: Packet): Promise<void> {
    const parsed = this.parseIdentifyPacket(packet);
    const stepped = stepLinkIdentifyWithActions(
      initialLinkIdentifyState({ initiator: this.initiator }),
      {
        kind: "identify/received",
        plaintextPresent: parsed.plaintext !== null,
        partsPresent: parsed.parts !== null,
        identityPresent: parsed.identity !== null,
        signatureValid: parsed.signatureValid,
      },
    );
    this.applyLinkIdentifyActions(stepped.actions, parsed.identity);
    await Promise.resolve();
  }

  private parseIdentifyPacket(packet: Packet): {
    plaintext: Uint8Array | null;
    parts: ReturnType<typeof linkIdentifyPayloadFieldsFromActions>;
    identity: Identity | null;
    signatureValid: boolean;
  } {
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
    const parts = splitIdentifyPayload(plaintext);
    const identity =
      parts !== null
        ? Identity.fromPublicKey(this.provider, parts.publicKey)
        : null;
    const signedData = identifySignedMaterial(this.linkId, parts);
    const signatureValid =
      identity !== null &&
      parts !== null &&
      signedData !== null &&
      identity.validate(parts.signature, signedData);
    return { plaintext, parts, identity, signatureValid };
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
    const unpacked = unpackLinkAppRequest(plaintext);
    const resolved = resolveAppRequestHandler(
      this.owner ?? this.destination,
      unpacked,
    );
    const stepped = stepLinkAppRequestInboundWithActions(
      initialLinkAppRequestInboundState({ mdu: this.mdu }),
      {
        kind: "app-request/received",
        plaintextPresent: plaintext !== null,
        handlerDestinationPresent: resolved.handlerDestination !== null,
        handlerPresent: resolved.handler !== undefined,
        allow: resolved.allow,
        allowedList: resolved.allowedList,
        remoteIdentityHash: this.remoteIdentity?.hash ?? null,
        unpackedPresent: unpacked !== null,
      },
    );
    await this.applyLinkAppRequestInboundActions(
      stepped.state,
      stepped.actions,
      {
        unpacked,
        handler: resolved.handler,
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
      await this.invokeLinkAppRequestHandler(state, ctx);
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

  private async invokeLinkAppRequestHandler(
    state: LinkAppRequestInboundState,
    ctx: {
      readonly unpacked: LinkRequestFields | null;
      readonly handler: RequestHandler | undefined;
      readonly requestId: Uint8Array;
      readonly packedResponse: Uint8Array | null;
    },
  ): Promise<void> {
    const response = await ctx.handler!.responseGenerator({
      path: ctx.handler!.path,
      data: ctx.unpacked!.data,
      requestId: ctx.requestId,
      linkId: this.linkId,
      remoteIdentity: this.remoteIdentity,
      requestedAt: ctx.unpacked!.requestedAt,
    });

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

function splitIdentifyPayload(
  plaintext: Uint8Array | null,
): ReturnType<typeof linkIdentifyPayloadFieldsFromActions> {
  if (plaintext === null) {
    return null;
  }
  const splitStepped = stepSplitLinkIdentifyPayloadWithActions(
    initialSplitLinkIdentifyPayloadState(),
    {
      kind: "link-identify/split-gate",
      plaintext,
    },
  );
  if (
    shouldRejectSplitLinkIdentifyPayload(splitStepped.actions) ||
    !shouldUseSplitLinkIdentifyPayload(splitStepped.actions)
  ) {
    return null;
  }
  return linkIdentifyPayloadFieldsFromActions(splitStepped.actions);
}

function identifySignedMaterial(
  linkId: Uint8Array,
  parts: ReturnType<typeof linkIdentifyPayloadFieldsFromActions>,
): Uint8Array | null {
  if (parts === null) {
    return null;
  }
  const signedStepped = stepLinkIdentifySignedMaterialWithActions(
    initialLinkIdentifySignedMaterialState(),
    {
      kind: "link-identify/signed-material-gate",
      linkId,
      publicKey: parts.publicKey,
    },
  );
  if (!shouldUseLinkIdentifySignedMaterial(signedStepped.actions)) {
    return null;
  }
  return linkIdentifySignedMaterialRawFromActions(signedStepped.actions);
}

function unpackLinkAppRequest(
  plaintext: Uint8Array | null,
): ReturnType<typeof linkRequestFieldsFromActions> {
  if (plaintext === null) {
    return null;
  }
  const unpackStepped = stepUnpackLinkRequestWithActions(
    initialUnpackLinkRequestState(),
    {
      kind: "link-request-codec/unpack-gate",
      data: plaintext,
    },
  );
  if (
    shouldRejectUnpackLinkRequest(unpackStepped.actions) ||
    !shouldUseUnpackLinkRequest(unpackStepped.actions)
  ) {
    return null;
  }
  return linkRequestFieldsFromActions(unpackStepped.actions);
}

function resolveAppRequestHandler(
  handlerDestination: LinkLayer3["owner"],
  unpacked: ReturnType<typeof linkRequestFieldsFromActions>,
): {
  handlerDestination: LinkLayer3["owner"];
  handler: RequestHandler | undefined;
  allow: number;
  allowedList: RequestHandler["allowedList"];
} {
  const pathHash = unpacked?.pathHash ?? null;
  if (handlerDestination === null || pathHash === null) {
    return {
      handlerDestination,
      handler: undefined,
      allow: 0,
      allowedList: [],
    };
  }
  const handler = handlerDestination.getRequestHandler(pathHash);
  return {
    handlerDestination,
    handler,
    allow: handler?.allow ?? 0,
    allowedList: handler?.allowedList ?? [],
  };
}
