import {
  PROPAGATION_LINK_TIMEOUT_MS,
  PropagationTransferState,
  initialPropagationTransferState,
  planPropagationGet,
  stepPropagationTransferWithActions,
  type PropagationTransferAction,
  type PropagationTransferMachineState,
  type PropagationTransferStateValue
} from "@twistedpear/protocol";
import type { CryptoProvider, Link, RegisteredDestination, Reticulum } from "@twistedpear/reticulum-ts";
import {
  Destination,
  DestinationAllowPolicy,
  DestinationDirection,
  DestinationType,
  Identity,
  LinkStatus
} from "@twistedpear/reticulum-ts";
import {
  APP_NAME,
  MESSAGE_GET_PATH,
  PeerError
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
  private transferMachine: PropagationTransferMachineState = initialPropagationTransferState();

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
    return this.transferMachine.phase;
  }

  async syncMessages(maxMessages: number | null = null): Promise<PropagationSyncResult> {
    if (this.propagationNodeHash === null) {
      throw new Error("No propagation node configured");
    }

    const deliveryIdentity = this.router.deliveryIdentity;
    if (deliveryIdentity === null) {
      throw new Error("Router must register a delivery identity before syncing");
    }

    this.applyTransfer({ kind: "xfer/begin" });
    const link = await this.ensurePropagationLink();
    const afterLink = this.applyTransfer({ kind: "xfer/link-ready" });

    for (const action of afterLink.actions) {
      if (action.kind === "identify") {
        link.identify(deliveryIdentity);
      } else if (action.kind === "request-list") {
        const listResponse = await awaitLinkRequest(
          link,
          MESSAGE_GET_PATH,
          msgpackPackPropagationRequest(null, null),
          action.timeoutSec
        );

        if (listResponse === null) {
          this.applyTransfer({ kind: "xfer/list-null" });
          return { state: this.state, messages: [] };
        }

        const listError = decodePeerError(listResponse);
        if (listError !== null) {
          this.applyTransfer({ kind: "xfer/list-peer-error", code: listError });
          return { state: this.state, messages: [] };
        }

        let transientIds: ReadonlyArray<Uint8Array>;
        try {
          transientIds = msgpackUnpackTransientIdList(listResponse);
        } catch {
          this.applyTransfer({ kind: "xfer/list-malformed" });
          return { state: this.state, messages: [] };
        }

        const wants =
          maxMessages === null ? [...transientIds] : transientIds.slice(0, Math.max(0, maxMessages));

        if (wants.length === 0) {
          this.applyTransfer({ kind: "xfer/list-empty" });
          return { state: this.state, messages: [] };
        }

        const afterList = this.applyTransfer({ kind: "xfer/list-ready", wantCount: wants.length });
        return this.continueDownload(link, wants, afterList.actions);
      }
    }

    return { state: this.state, messages: [] };
  }

  cancel(): void {
    const result = this.applyTransfer({ kind: "xfer/cancel" });
    for (const action of result.actions) {
      if (action.kind === "teardown-link" && this.propagationLink !== null) {
        this.propagationLink.teardown();
        this.propagationLink = null;
      }
    }
  }

  private async continueDownload(
    link: Link,
    wants: ReadonlyArray<Uint8Array>,
    actions: ReadonlyArray<PropagationTransferAction>
  ): Promise<PropagationSyncResult> {
    for (const action of actions) {
      if (action.kind !== "request-download") {
        continue;
      }

      const downloadResponse = await awaitLinkRequest(
        link,
        MESSAGE_GET_PATH,
        msgpackPackPropagationRequest(wants, null, this.deliveryLimitKb),
        action.timeoutSec
      );

      if (downloadResponse === null) {
        this.applyTransfer({ kind: "xfer/download-null" });
        return { state: this.state, messages: [] };
      }

      let downloaded: ReadonlyArray<Uint8Array>;
      try {
        downloaded = msgpackUnpackMessageList(downloadResponse);
      } catch {
        this.applyTransfer({ kind: "xfer/download-malformed" });
        return { state: this.state, messages: [] };
      }

      const messages: LXMessage[] = [];
      const haves: Uint8Array[] = [];
      for (const lxmfData of downloaded) {
        const message = this.router.handlePropagationData(lxmfData);
        if (message !== null) {
          messages.push(message);
        }
        haves.push(Identity.fullHash(this.provider, lxmfData));
      }

      const afterDownload = this.applyTransfer({
        kind: "xfer/download-ready",
        downloadedCount: haves.length
      });

      for (const next of afterDownload.actions) {
        if (next.kind === "request-haves-ack" && haves.length > 0) {
          await awaitLinkRequest(
            link,
            MESSAGE_GET_PATH,
            msgpackPackPropagationRequest(null, haves),
            next.timeoutSec
          );
          this.applyTransfer({ kind: "xfer/haves-acked" });
        }
      }

      if (this.state !== PropagationTransferState.COMPLETE && haves.length === 0) {
        // download-ready with 0 already completed in the step machine
      }

      return { state: this.state, messages };
    }

    return { state: this.state, messages: [] };
  }

  private applyTransfer(
    event: Parameters<typeof stepPropagationTransferWithActions>[1]
  ): ReturnType<typeof stepPropagationTransferWithActions> {
    const result = stepPropagationTransferWithActions(this.transferMachine, event);
    this.transferMachine = result.state;
    return result;
  }

  private async ensurePropagationLink(): Promise<Link> {
    if (this.propagationLink !== null && this.propagationLink.status === LinkStatus.ACTIVE) {
      return this.propagationLink;
    }

    if (this.propagationNodeHash === null) {
      throw new Error("No propagation node configured");
    }

    const nodeIdentity = this.router.reticulum.resolveDestinationIdentity(this.propagationNodeHash);
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

    const link = await new Promise<Link>((resolve, reject) => {
      const timer = this.router.reticulum.runtime.clock.setTimeout(() => {
        this.applyTransfer({ kind: "xfer/link-timeout" });
        reject(new Error("Propagation link timeout"));
      }, PROPAGATION_LINK_TIMEOUT_MS);
      outbound.requestLink({
        linkEstablished(establishLink) {
          timer.cancel();
          resolve(establishLink);
        }
      });
    });

    this.propagationLink = link;
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

    const plan = planPropagationGet({
      wants,
      haves,
      remoteDeliveryHash,
      entries: [...this.entries.values()].map((entry) => ({
        transientId: entry.transientId,
        destinationHash: entry.destinationHash
      }))
    });

    if (plan.kind === "list-ids") {
      return msgpackPackArray(plan.transientIds.map((id) => msgpackPackBin(id)));
    }

    for (const transientId of plan.deleteIds) {
      this.delete(transientId);
    }

    const messages = plan.fetchIds
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
