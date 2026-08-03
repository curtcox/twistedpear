// @ts-nocheck
import {
  initialAcceptPropagationGetRequestDataState,
  initialPropagationGetState,
  initialUnpackPropagationEnvelopeState,
  initialUnpackPropagationRequestState,
  propagationEnvelopeFieldsFromActions,
  propagationGetApplyIds,
  propagationGetListIds,
  propagationRequestFieldsFromActions,
  shouldAcceptPropagationGetRequestDataNow,
  shouldApplyPropagationGet,
  shouldListPropagationGetIds,
  shouldRejectUnpackPropagationEnvelope,
  shouldRejectUnpackPropagationRequest,
  shouldUseUnpackPropagationEnvelope,
  shouldUseUnpackPropagationRequest,
  stepAcceptPropagationGetRequestDataWithActions,
  stepPropagationGetWithActions,
  stepUnpackPropagationEnvelopeWithActions,
  stepUnpackPropagationRequestWithActions,
  type PropagationGetAction
} from "@twistedpear/protocol";
import type { CryptoProvider, Link, RegisteredDestination, Reticulum } from "@twistedpear/reticulum-ts";
import {
  Destination,
  DestinationAllowPolicy,
  DestinationDirection,
  DestinationType,
  Identity
} from "@twistedpear/reticulum-ts";
import { APP_NAME, MESSAGE_GET_PATH } from "./constants.js";
import { msgpackPackArray, msgpackPackBin } from "./msgpack.js";

interface StoredPropagationMessage {
  readonly transientId: Uint8Array;
  readonly destinationHash: Uint8Array;
  readonly lxmfData: Uint8Array;
}

/** Minimal propagation-node store for tests. Mirrors LXMF/LXMRouter propagation ingress. */
export class PropagationNodeStore {
  private readonly entries = new Map<string, StoredPropagationMessage>();

  constructor(private readonly provider: CryptoProvider) {}

  /** Store fully packed LXMF bytes (test helper). */
  store(lxmfBytes: Uint8Array): Uint8Array {
    return this.storePropagationData(lxmfBytes);
  }

  storePropagationData(lxmfData: Uint8Array): Uint8Array {
    const transientId = Identity.fullHash(this.provider, lxmfData);
    const destinationHash = lxmfData.subarray(0, 16);
    this.entries.set(Buffer.from(transientId).toString("hex"), {
      transientId,
      destinationHash,
      lxmfData: Uint8Array.from(lxmfData)
    });
    return transientId;
  }

  delete(transientId: Uint8Array): boolean {
    return this.entries.delete(Buffer.from(transientId).toString("hex"));
  }

  registerHandlers(destination: RegisteredDestination): void {
    destination.registerRequestHandler(
      MESSAGE_GET_PATH,
      (_path, data, _requestId, _linkId, remoteIdentity) => this.handleGetRequest(data, remoteIdentity),
      DestinationAllowPolicy.ALLOW_ALL
    );

    destination.setLinkEstablishedCallback((link) => {
      this.handlePropagationLink(link);
    });
  }

  private handlePropagationLink(link: Link): void {
    link.callbacks.packet = (data) => {
      const unpackStepped = stepUnpackPropagationEnvelopeWithActions(
        initialUnpackPropagationEnvelopeState(),
        {
          kind: "lxmf-codec/unpack-propagation-envelope-gate",
          data
        }
      );
      if (
        shouldRejectUnpackPropagationEnvelope(unpackStepped.actions) ||
        !shouldUseUnpackPropagationEnvelope(unpackStepped.actions)
      ) {
        return;
      }
      const fields = propagationEnvelopeFieldsFromActions(unpackStepped.actions);
      if (fields === null) {
        return;
      }
      for (const lxmfData of fields.messages) {
        this.storePropagationData(lxmfData);
      }
    };
  }

  private handleGetRequest(data: Uint8Array | null, remoteIdentity: Identity | null): Uint8Array | null {
    const acceptStepped = stepAcceptPropagationGetRequestDataWithActions(
      initialAcceptPropagationGetRequestDataState(),
      {
        kind: "propagation/accept-get-request-data-gate",
        dataPresent: data !== null
      }
    );
    if (!shouldAcceptPropagationGetRequestDataNow(acceptStepped.actions)) {
      return null;
    }

    const unpackStepped = stepUnpackPropagationRequestWithActions(
      initialUnpackPropagationRequestState(),
      {
        kind: "lxmf-codec/unpack-propagation-request-gate",
        data: data!
      }
    );
    if (
      shouldRejectUnpackPropagationRequest(unpackStepped.actions) ||
      !shouldUseUnpackPropagationRequest(unpackStepped.actions)
    ) {
      return null;
    }
    const requestFields = propagationRequestFieldsFromActions(unpackStepped.actions);
    if (requestFields === null) {
      return null;
    }
    const { wants, haves } = requestFields;
    const remoteDeliveryHash =
      remoteIdentity === null
        ? null
        : new Destination(this.provider, {
            identity: remoteIdentity,
            direction: DestinationDirection.OUT,
            type: DestinationType.SINGLE,
            appName: APP_NAME,
            aspects: ["delivery"]
          }).hash;

    const stepped = stepPropagationGetWithActions(initialPropagationGetState(), {
      kind: "get/received",
      wants,
      haves,
      remoteDeliveryHash,
      entries: [...this.entries.values()].map((entry) => ({
        transientId: entry.transientId,
        destinationHash: entry.destinationHash
      }))
    });
    return this.applyPropagationGetActions(stepped.actions);
  }

  private applyPropagationGetActions(
    actions: readonly PropagationGetAction[]
  ): Uint8Array | null {
    if (shouldListPropagationGetIds(actions)) {
      const transientIds = propagationGetListIds(actions) ?? [];
      return msgpackPackArray(transientIds.map((id) => msgpackPackBin(id)));
    }
    if (!shouldApplyPropagationGet(actions)) {
      return null;
    }

    const apply = propagationGetApplyIds(actions);
    if (apply === null) {
      return null;
    }

    for (const transientId of apply.deleteIds) {
      this.delete(transientId);
    }

    const messages = apply.fetchIds
      .map((transientId) => this.entries.get(Buffer.from(transientId).toString("hex")) ?? null)
      .filter((entry): entry is StoredPropagationMessage => entry !== null)
      .map((entry) => entry.lxmfData);

    return msgpackPackArray(messages.map((message) => msgpackPackBin(message)));
  }
}

export function createPropagationDestination(
  provider: CryptoProvider,
  reticulum: Reticulum,
  identity: Identity
): RegisteredDestination {
  return reticulum.registerDestination({
    provider,
    identity,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: APP_NAME,
    aspects: ["propagation"]
  });
}

export function propagationDestinationForIdentity(provider: CryptoProvider, identity: Identity): Destination {
  return new Destination(provider, {
    identity,
    direction: DestinationDirection.OUT,
    type: DestinationType.SINGLE,
    appName: APP_NAME,
    aspects: ["propagation"]
  });
}
