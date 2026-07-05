import type { CryptoProvider, Identity, Link, RegisteredDestination, Reticulum } from "@twistedpear/reticulum-ts";
import {
  Destination,
  DestinationAllowPolicy,
  DestinationDirection,
  DestinationType,
  Identity as RnsIdentity,
  LinkStatus
} from "@twistedpear/reticulum-ts";
import {
  APP_NAME,
  MESSAGE_GET_PATH,
  PeerError,
  PropagationTransferState,
  type PropagationTransferStateValue
} from "./constants.js";
import { LXMessage } from "./message.js";
import {
  msgpackPackArray,
  msgpackPackBin,
  msgpackPackPropagationRequest,
  msgpackUnpack,
  msgpackUnpackMessageList,
  msgpackUnpackPropagationEnvelope,
  msgpackUnpackPropagationRequest,
  msgpackUnpackTransientIdList
} from "./msgpack.js";
import type { LXMFRouter } from "./router.js";

export interface PropagationClientOptions {
  readonly router: LXMFRouter;
  readonly provider: CryptoProvider;
  readonly deliveryLimitKb?: number;
}

export interface PropagationSyncResult {
  readonly state: PropagationTransferStateValue;
  readonly messages: ReadonlyArray<LXMessage>;
}

interface StoredPropagationMessage {
  readonly transientId: Uint8Array;
  readonly destinationHash: Uint8Array;
  readonly lxmfData: Uint8Array;
}

/** Minimal propagation-node client. Mirrors LXMF/LXMRouter.py download flow. */
export class PropagationClient {
  readonly router: LXMFRouter;
  readonly provider: CryptoProvider;
  readonly deliveryLimitKb: number;
  private propagationNodeHash: Uint8Array | null = null;
  private propagationLink: Link | null = null;
  private transferState: PropagationTransferStateValue = PropagationTransferState.IDLE;

  constructor(options: PropagationClientOptions) {
    this.router = options.router;
    this.provider = options.provider;
    this.deliveryLimitKb = options.deliveryLimitKb ?? 1000;
  }

  setPropagationNode(destinationHash: Uint8Array): void {
    this.propagationNodeHash = Uint8Array.from(destinationHash);
    if (this.propagationLink !== null) {
      this.propagationLink.teardown();
      this.propagationLink = null;
    }
  }

  get propagationNode(): Uint8Array | null {
    return this.propagationNodeHash;
  }

  get state(): PropagationTransferStateValue {
    return this.transferState;
  }

  async syncMessages(maxMessages: number | null = null): Promise<PropagationSyncResult> {
    if (this.propagationNodeHash === null) {
      throw new Error("No propagation node configured");
    }

    const deliveryIdentity = this.router.deliveryIdentity;
    if (deliveryIdentity === null) {
      throw new Error("Router must register a delivery identity before syncing");
    }

    const link = await this.ensurePropagationLink();
    link.identify(deliveryIdentity);

    const listResponse = await awaitLinkRequest(
      link,
      MESSAGE_GET_PATH,
      msgpackPackPropagationRequest(null, null),
      10
    );

    if (listResponse === null) {
      this.transferState = PropagationTransferState.TRANSFER_FAILED;
      return { state: this.transferState, messages: [] };
    }

    const listError = decodePeerError(listResponse);
    if (listError !== null) {
      this.transferState =
        listError === PeerError.NO_IDENTITY
          ? PropagationTransferState.NO_IDENTITY_RCVD
          : PropagationTransferState.NO_ACCESS;
      return { state: this.transferState, messages: [] };
    }

    let transientIds: ReadonlyArray<Uint8Array>;
    try {
      transientIds = msgpackUnpackTransientIdList(listResponse);
    } catch {
      this.transferState = PropagationTransferState.TRANSFER_FAILED;
      return { state: this.transferState, messages: [] };
    }

    const wants =
      maxMessages === null ? [...transientIds] : transientIds.slice(0, Math.max(0, maxMessages));

    if (wants.length === 0) {
      this.transferState = PropagationTransferState.COMPLETE;
      return { state: this.transferState, messages: [] };
    }

    const downloadResponse = await awaitLinkRequest(
      link,
      MESSAGE_GET_PATH,
      msgpackPackPropagationRequest(wants, null, this.deliveryLimitKb),
      30
    );

    if (downloadResponse === null) {
      this.transferState = PropagationTransferState.TRANSFER_FAILED;
      return { state: this.transferState, messages: [] };
    }

    let downloaded: ReadonlyArray<Uint8Array>;
    try {
      downloaded = msgpackUnpackMessageList(downloadResponse);
    } catch {
      this.transferState = PropagationTransferState.TRANSFER_FAILED;
      return { state: this.transferState, messages: [] };
    }

    const messages: LXMessage[] = [];
    const haves: Uint8Array[] = [];
    for (const lxmfData of downloaded) {
      const message = this.router.handlePropagationData(lxmfData);
      if (message !== null) {
        messages.push(message);
      }

      haves.push(RnsIdentity.fullHash(this.provider, lxmfData));
    }

    if (haves.length > 0) {
      await awaitLinkRequest(
        link,
        MESSAGE_GET_PATH,
        msgpackPackPropagationRequest(null, haves),
        10
      );
    }

    this.transferState = PropagationTransferState.COMPLETE;
    return { state: this.transferState, messages };
  }

  cancel(): void {
    if (this.propagationLink !== null) {
      this.propagationLink.teardown();
      this.propagationLink = null;
    }

    this.transferState = PropagationTransferState.IDLE;
  }

  private async ensurePropagationLink(): Promise<Link> {
    if (this.propagationLink !== null && this.propagationLink.status === LinkStatus.ACTIVE) {
      return this.propagationLink;
    }

    if (this.propagationNodeHash === null) {
      throw new Error("No propagation node configured");
    }

    const nodeIdentity = RnsIdentity.recall(this.provider, this.propagationNodeHash);
    if (nodeIdentity === null) {
      throw new Error("Propagation node identity is unknown");
    }

    const outbound = this.router.reticulum.registerDestination({
      provider: this.provider,
      identity: nodeIdentity,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: APP_NAME,
      aspects: ["propagation"]
    });

    this.transferState = PropagationTransferState.LINK_ESTABLISHING;
    const link = await new Promise<Link>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Propagation link timeout")), 5000);
      outbound.requestLink({
        linkEstablished(establishLink) {
          clearTimeout(timer);
          resolve(establishLink);
        }
      });
    });

    this.propagationLink = link;
    this.transferState = PropagationTransferState.LINK_ESTABLISHED;
    return link;
  }
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
    const transientId = RnsIdentity.fullHash(this.provider, lxmfData);
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
      try {
        const messages = msgpackUnpackPropagationEnvelope(data);
        for (const lxmfData of messages) {
          this.storePropagationData(lxmfData);
        }
      } catch {
        // Ignore malformed propagation envelopes.
      }
    };
  }

  private handleGetRequest(data: Uint8Array | null, remoteIdentity: Identity | null): Uint8Array | null {
    if (data === null) {
      return null;
    }

    const [wants, haves] = msgpackUnpackPropagationRequest(data);
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

    if (wants === null && haves === null) {
      const ids = [...this.entries.values()]
        .filter((entry) => remoteDeliveryHash === null || equalDestinationHash(entry.destinationHash, remoteDeliveryHash))
        .map((entry) => entry.transientId);
      return msgpackPackArray(ids.map((id) => msgpackPackBin(id)));
    }

    if (haves !== null) {
      for (const transientId of haves) {
        this.delete(transientId);
      }
    }

    if (wants === null || wants.length === 0) {
      return msgpackPackArray([]);
    }

    const messages = wants
      .map((transientId) => this.entries.get(Buffer.from(transientId).toString("hex")) ?? null)
      .filter(
        (entry): entry is StoredPropagationMessage =>
          entry !== null &&
          (remoteDeliveryHash === null || equalDestinationHash(entry.destinationHash, remoteDeliveryHash))
      )
      .map((entry) => entry.lxmfData);

    return msgpackPackArray(messages.map((message) => msgpackPackBin(message)));
  }
}

function equalDestinationHash(left: Uint8Array, right: Uint8Array): boolean {
  return Buffer.from(left).equals(Buffer.from(right));
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

async function awaitLinkRequest(
  link: Link,
  path: string,
  data: Uint8Array | null,
  timeout: number
): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    void link
      .request(path, data, {
        timeout,
        response: (receipt) => resolve(receipt.response),
        failed: () => resolve(null)
      })
      .then((receipt) => {
        if (receipt === false) {
          resolve(null);
        }
      });
  });
}

function decodePeerError(response: Uint8Array): number | null {
  try {
    const value = msgpackUnpack(response);
    if (value.type === "int" && (value.int === PeerError.NO_IDENTITY || value.int === PeerError.NO_ACCESS)) {
      return value.int;
    }
  } catch {
    // Not an error payload.
  }

  return null;
}
