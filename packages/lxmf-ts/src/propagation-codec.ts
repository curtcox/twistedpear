import {
  binListFieldsFromActions,
  initialAcceptPropagationDeliveredMessageState,
  initialAcceptPropagationPeerResponseState,
  initialDecodeLxmfPeerErrorState,
  initialHandlePropagationPeerErrorState,
  initialPackPropagationRequestState,
  initialRequestPropagationHavesAckState,
  initialTreatPropagationListAsEmptyState,
  initialUnpackBinListState,
  lxmfPeerErrorFromActions,
  packPropagationRequestRawFromActions,
  shouldAcceptPropagationDeliveredMessageNow,
  shouldAcceptPropagationPeerResponseNow,
  shouldHandlePropagationPeerErrorNow,
  shouldRejectUnpackBinList,
  shouldRequestPropagationHavesAckNow,
  shouldTreatPropagationListAsEmptyNow,
  shouldUseDecodeLxmfPeerError,
  shouldUsePackPropagationRequest,
  shouldUseUnpackBinList,
  stepAcceptPropagationDeliveredMessageWithActions,
  stepAcceptPropagationPeerResponseWithActions,
  stepDecodeLxmfPeerErrorWithActions,
  stepHandlePropagationPeerErrorWithActions,
  stepPackPropagationRequestWithActions,
  stepRequestPropagationHavesAckWithActions,
  stepTreatPropagationListAsEmptyWithActions,
  stepUnpackBinListWithActions,
} from "@twistedpear/protocol";

/**
 * Propagation-transfer gates and codecs used by `PropagationClient`.
 *
 * Each wrapper drives one gate and answers with the value the caller acts on —
 * `null` where the gate rejects — so the client reads as request/decode steps
 * instead of repeated step/should/from-actions triples.
 */

export interface PropagationRequestParts {
  readonly wants: ReadonlyArray<Uint8Array> | null;
  readonly haves: ReadonlyArray<Uint8Array> | null;
  readonly transferLimitKb?: number;
}

/** Packs a propagation request, or null when the gate withholds the bytes. */
export function packPropagationRequest(
  parts: PropagationRequestParts,
): Uint8Array | null {
  const stepped = stepPackPropagationRequestWithActions(
    initialPackPropagationRequestState(),
    {
      kind: "lxmf-codec/pack-propagation-request-gate",
      wants: parts.wants,
      haves: parts.haves,
      ...(parts.transferLimitKb === undefined
        ? {}
        : { transferLimitKb: parts.transferLimitKb }),
    },
  );
  if (!shouldUsePackPropagationRequest(stepped.actions)) return null;
  return packPropagationRequestRawFromActions(stepped.actions);
}

/** Decodes a binary list response, or null when it is malformed. */
export function unpackBinListEntries(
  data: Uint8Array,
  label: string,
): ReadonlyArray<Uint8Array> | null {
  const stepped = stepUnpackBinListWithActions(initialUnpackBinListState(), {
    kind: "lxmf-codec/unpack-bin-list-gate",
    data,
    label,
  });
  if (
    shouldRejectUnpackBinList(stepped.actions) ||
    !shouldUseUnpackBinList(stepped.actions)
  ) {
    return null;
  }
  return binListFieldsFromActions(stepped.actions)?.entries ?? null;
}

export function acceptsPeerResponse(response: Uint8Array | null): boolean {
  return shouldAcceptPropagationPeerResponseNow(
    stepAcceptPropagationPeerResponseWithActions(
      initialAcceptPropagationPeerResponseState(),
      {
        kind: "propagation-transfer/accept-peer-response-gate",
        responsePresent: response !== null,
      },
    ).actions,
  );
}

/** The peer's error code when the response carries one, else null. */
export function peerErrorCode(
  response: Uint8Array,
): ReturnType<typeof lxmfPeerErrorFromActions> {
  const decoded = stepDecodeLxmfPeerErrorWithActions(
    initialDecodeLxmfPeerErrorState(),
    { kind: "lxmf/peer-error-decode-gate", response },
  );
  const handle = shouldHandlePropagationPeerErrorNow(
    stepHandlePropagationPeerErrorWithActions(
      initialHandlePropagationPeerErrorState(),
      {
        kind: "propagation-transfer/handle-peer-error-gate",
        errorPresent: shouldUseDecodeLxmfPeerError(decoded.actions),
      },
    ).actions,
  );
  if (!handle) return null;
  return lxmfPeerErrorFromActions(decoded.actions);
}

export function acceptsDeliveredMessage(messagePresent: boolean): boolean {
  return shouldAcceptPropagationDeliveredMessageNow(
    stepAcceptPropagationDeliveredMessageWithActions(
      initialAcceptPropagationDeliveredMessageState(),
      {
        kind: "propagation-transfer/accept-delivered-message-gate",
        messagePresent,
      },
    ).actions,
  );
}

export function treatsListAsEmpty(wantCount: number): boolean {
  return shouldTreatPropagationListAsEmptyNow(
    stepTreatPropagationListAsEmptyWithActions(
      initialTreatPropagationListAsEmptyState(),
      {
        kind: "propagation-transfer/list-as-empty-gate",
        wantCount,
      },
    ).actions,
  );
}

export function requestsHavesAck(haveCount: number): boolean {
  return shouldRequestPropagationHavesAckNow(
    stepRequestPropagationHavesAckWithActions(
      initialRequestPropagationHavesAckState(),
      {
        kind: "propagation-transfer/request-haves-ack-gate",
        actionIsHavesAck: true,
        haveCount,
      },
    ).actions,
  );
}
