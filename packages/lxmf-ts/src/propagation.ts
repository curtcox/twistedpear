import {
  PROPAGATION_LINK_TIMER_ID,
  PropagationTransferState,
  initialAcceptPropagationDeliveredMessageState,
  initialAcceptPropagationPeerResponseState,
  initialDecodeLxmfPeerErrorState,
  initialHandlePropagationPeerErrorState,
  initialLinkAppRequestAwaitState,
  initialLxmfPropagationLinkReadyState,
  initialLxmfPropagationSyncPrepState,
  initialPackPropagationRequestState,
  initialPropagationGetState,
  initialPropagationTransferState,
  initialRequestPropagationHavesAckState,
  initialTreatPropagationListAsEmptyState,
  initialUnpackBinListState,
  initialUnpackPropagationEnvelopeState,
  initialUnpackPropagationRequestState,
  binListFieldsFromActions,
  lxmfPeerErrorFromActions,
  packPropagationRequestRawFromActions,
  propagationEnvelopeFieldsFromActions,
  propagationGetApplyIds,
  propagationGetListIds,
  propagationRequestFieldsFromActions,
  shouldAcceptPropagationGetRequestData,
  shouldAcceptPropagationPeerResponseNow,
  shouldAcceptPropagationDeliveredMessageNow,
  shouldApplyPropagationGet,
  shouldEstablishLxmfPropagationLink,
  shouldHandlePropagationPeerErrorNow,
  shouldListPropagationGetIds,
  shouldProceedLxmfPropagationSyncPrep,
  shouldRejectLxmfPropagationMissingIdentity,
  shouldRejectLxmfPropagationMissingNode,
  shouldRejectLxmfPropagationSyncMissingDeliveryIdentity,
  shouldRejectLxmfPropagationSyncMissingNode,
  shouldRejectUnpackBinList,
  shouldRejectUnpackPropagationEnvelope,
  shouldRejectUnpackPropagationRequest,
  shouldRequestPropagationHavesAckNow,
  shouldReuseActiveLinkNow,
  initialReuseActiveLinkState,
  initialTeardownLxmfPropagationLinkState,
  stepReuseActiveLinkWithActions,
  shouldTeardownLxmfPropagationLinkNow,
  shouldTreatPropagationListAsEmptyNow,
  shouldUseDecodeLxmfPeerError,
  shouldUsePackPropagationRequest,
  shouldUseUnpackBinList,
  shouldUseUnpackPropagationEnvelope,
  shouldUseUnpackPropagationRequest,
  stepAcceptPropagationDeliveredMessageWithActions,
  stepAcceptPropagationPeerResponseWithActions,
  stepDecodeLxmfPeerErrorWithActions,
  stepHandlePropagationPeerErrorWithActions,
  stepLinkAppRequestAwaitWithActions,
  stepLxmfPropagationLinkReadyWithActions,
  stepLxmfPropagationSyncPrepWithActions,
  stepTeardownLxmfPropagationLinkWithActions,
  stepPackPropagationRequestWithActions,
  stepPropagationGetWithActions,
  stepPropagationTransferWithActions,
  stepRequestPropagationHavesAckWithActions,
  stepTreatPropagationListAsEmptyWithActions,
  stepUnpackBinListWithActions,
  stepUnpackPropagationEnvelopeWithActions,
  stepUnpackPropagationRequestWithActions,
  type PropagationGetAction,
  type PropagationTransferAction,
  type PropagationTransferMachineState,
  type PropagationTransferStateValue
} from "@twistedpear/protocol";
import type { Intent } from "@twistedpear/effects";
import type { CryptoProvider, Link, RegisteredDestination, Reticulum } from "@twistedpear/reticulum-ts";
import {
  Destination,
  DestinationAllowPolicy,
  DestinationDirection,
  DestinationType,
  Identity
} from "@twistedpear/reticulum-ts";
import {
  APP_NAME,
  MESSAGE_GET_PATH
} from "./constants.js";
import { LXMessage } from "./message.js";
import {
  msgpackPackArray,
  msgpackPackBin
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
  private linkTimer: { cancel(): void } | null = null;
  private pendingLinkResolve: ((link: Link) => void) | null = null;
  private pendingLinkReject: ((error: Error) => void) | null = null;
  private pendingEstablishedLink: Link | null = null;

  constructor(options: PropagationClientOptions) {
    this.router = options.router;
    this.provider = options.provider;
    this.deliveryLimitKb = options.deliveryLimitKb ?? 1000;
  }

  setPropagationNode(destinationHash: Uint8Array): void {
    this.propagationNodeHash = Uint8Array.from(destinationHash);
    if (
      shouldTeardownLxmfPropagationLinkNow(
        stepTeardownLxmfPropagationLinkWithActions(
          initialTeardownLxmfPropagationLinkState(),
          {
            kind: "lxmf/teardown-propagation-link-gate",
            linkPresent: this.propagationLink !== null
          }
        ).actions
      )
    ) {
      this.propagationLink!.teardown();
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
    const prep = stepLxmfPropagationSyncPrepWithActions(initialLxmfPropagationSyncPrepState(), {
      kind: "propagation-sync-prep/gate",
      nodeConfigured: this.propagationNodeHash !== null,
      deliveryIdentityPresent: this.router.deliveryIdentity !== null
    });
    if (shouldRejectLxmfPropagationSyncMissingNode(prep.actions)) {
      throw new Error("No propagation node configured");
    }
    if (shouldRejectLxmfPropagationSyncMissingDeliveryIdentity(prep.actions)) {
      throw new Error("Router must register a delivery identity before syncing");
    }
    if (
      !shouldProceedLxmfPropagationSyncPrep(prep.actions) ||
      this.router.deliveryIdentity === null
    ) {
      throw new Error("Propagation sync prep rejected");
    }

    const deliveryIdentity = this.router.deliveryIdentity;

    const begin = this.applyTransfer({ kind: "xfer/begin" });
    let link: Link;
    try {
      link = await this.ensurePropagationLink(begin.actions);
    } catch (error) {
      if (this.transferMachine.phase === PropagationTransferState.LINK_ESTABLISHING) {
        this.applyTransfer({ kind: "xfer/link-timeout" });
      }
      throw error;
    }
    if (this.state === PropagationTransferState.LINK_FAILED) {
      throw new Error("Propagation link timeout");
    }
    const afterLink = this.applyTransfer({ kind: "xfer/link-ready" });

    for (const action of afterLink.actions) {
      if (action.kind === "identify") {
        link.identify(deliveryIdentity);
      } else if (action.kind === "request-list") {
        const packListStepped = stepPackPropagationRequestWithActions(
          initialPackPropagationRequestState(),
          {
            kind: "lxmf-codec/pack-propagation-request-gate",
            wants: null,
            haves: null
          }
        );
        const listRequest = shouldUsePackPropagationRequest(packListStepped.actions)
          ? packPropagationRequestRawFromActions(packListStepped.actions)
          : null;
        if (listRequest === null) {
          this.applyTransfer({ kind: "xfer/list-malformed" });
          return { state: this.state, messages: [] };
        }
        const listResponse = await awaitLinkRequest(
          link,
          MESSAGE_GET_PATH,
          listRequest,
          action.timeoutSec
        );

        if (
          !shouldAcceptPropagationPeerResponseNow(
            stepAcceptPropagationPeerResponseWithActions(
              initialAcceptPropagationPeerResponseState(),
              {
                kind: "propagation-transfer/accept-peer-response-gate",
                responsePresent: listResponse !== null
              }
            ).actions
          )
        ) {
          this.applyTransfer({ kind: "xfer/list-null" });
          return { state: this.state, messages: [] };
        }

        const listErrorStepped = stepDecodeLxmfPeerErrorWithActions(
          initialDecodeLxmfPeerErrorState(),
          {
            kind: "lxmf/peer-error-decode-gate",
            response: listResponse!
          }
        );
        if (
          shouldHandlePropagationPeerErrorNow(
            stepHandlePropagationPeerErrorWithActions(
              initialHandlePropagationPeerErrorState(),
              {
                kind: "propagation-transfer/handle-peer-error-gate",
                errorPresent: shouldUseDecodeLxmfPeerError(listErrorStepped.actions)
              }
            ).actions
          )
        ) {
          const listError = lxmfPeerErrorFromActions(listErrorStepped.actions);
          this.applyTransfer({ kind: "xfer/list-peer-error", code: listError! });
          return { state: this.state, messages: [] };
        }

        const unpackListStepped = stepUnpackBinListWithActions(initialUnpackBinListState(), {
          kind: "lxmf-codec/unpack-bin-list-gate",
          data: listResponse!,
          label: "transient id list"
        });
        if (
          shouldRejectUnpackBinList(unpackListStepped.actions) ||
          !shouldUseUnpackBinList(unpackListStepped.actions)
        ) {
          this.applyTransfer({ kind: "xfer/list-malformed" });
          return { state: this.state, messages: [] };
        }
        const listFields = binListFieldsFromActions(unpackListStepped.actions);
        if (listFields === null) {
          this.applyTransfer({ kind: "xfer/list-malformed" });
          return { state: this.state, messages: [] };
        }
        const transientIds = listFields.entries;

        const wants =
          maxMessages === null ? [...transientIds] : transientIds.slice(0, Math.max(0, maxMessages));

        if (
          shouldTreatPropagationListAsEmptyNow(
            stepTreatPropagationListAsEmptyWithActions(
              initialTreatPropagationListAsEmptyState(),
              {
                kind: "propagation-transfer/list-as-empty-gate",
                wantCount: wants.length
              }
            ).actions
          )
        ) {
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
    this.applyTransfer({ kind: "xfer/cancel" });
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

      const packDownloadStepped = stepPackPropagationRequestWithActions(
        initialPackPropagationRequestState(),
        {
          kind: "lxmf-codec/pack-propagation-request-gate",
          wants,
          haves: null,
          transferLimitKb: this.deliveryLimitKb
        }
      );
      const downloadRequest = shouldUsePackPropagationRequest(packDownloadStepped.actions)
        ? packPropagationRequestRawFromActions(packDownloadStepped.actions)
        : null;
      if (downloadRequest === null) {
        this.applyTransfer({ kind: "xfer/download-malformed" });
        return { state: this.state, messages: [] };
      }
      const downloadResponse = await awaitLinkRequest(
        link,
        MESSAGE_GET_PATH,
        downloadRequest,
        action.timeoutSec
      );

      if (
        !shouldAcceptPropagationPeerResponseNow(
          stepAcceptPropagationPeerResponseWithActions(
            initialAcceptPropagationPeerResponseState(),
            {
              kind: "propagation-transfer/accept-peer-response-gate",
              responsePresent: downloadResponse !== null
            }
          ).actions
        )
      ) {
        this.applyTransfer({ kind: "xfer/download-null" });
        return { state: this.state, messages: [] };
      }

      const unpackDownloadStepped = stepUnpackBinListWithActions(initialUnpackBinListState(), {
        kind: "lxmf-codec/unpack-bin-list-gate",
        data: downloadResponse!,
        label: "message list response"
      });
      if (
        shouldRejectUnpackBinList(unpackDownloadStepped.actions) ||
        !shouldUseUnpackBinList(unpackDownloadStepped.actions)
      ) {
        this.applyTransfer({ kind: "xfer/download-malformed" });
        return { state: this.state, messages: [] };
      }
      const downloadFields = binListFieldsFromActions(unpackDownloadStepped.actions);
      if (downloadFields === null) {
        this.applyTransfer({ kind: "xfer/download-malformed" });
        return { state: this.state, messages: [] };
      }
      const downloaded = downloadFields.entries;

      const messages: LXMessage[] = [];
      const haves: Uint8Array[] = [];
      for (const lxmfData of downloaded) {
        const message = this.router.handlePropagationData(lxmfData);
        if (
          shouldAcceptPropagationDeliveredMessageNow(
            stepAcceptPropagationDeliveredMessageWithActions(
              initialAcceptPropagationDeliveredMessageState(),
              {
                kind: "propagation-transfer/accept-delivered-message-gate",
                messagePresent: message !== null
              }
            ).actions
          )
        ) {
          messages.push(message!);
        }
        haves.push(Identity.fullHash(this.provider, lxmfData));
      }

      const afterDownload = this.applyTransfer({
        kind: "xfer/download-ready",
        downloadedCount: haves.length
      });

      for (const next of afterDownload.actions) {
        if (
          next.kind === "request-haves-ack" &&
          shouldRequestPropagationHavesAckNow(
            stepRequestPropagationHavesAckWithActions(
              initialRequestPropagationHavesAckState(),
              {
                kind: "propagation-transfer/request-haves-ack-gate",
                actionIsHavesAck: true,
                haveCount: haves.length
              }
            ).actions
          )
        ) {
          const packHavesStepped = stepPackPropagationRequestWithActions(
            initialPackPropagationRequestState(),
            {
              kind: "lxmf-codec/pack-propagation-request-gate",
              wants: null,
              haves
            }
          );
          const havesRequest = shouldUsePackPropagationRequest(packHavesStepped.actions)
            ? packPropagationRequestRawFromActions(packHavesStepped.actions)
            : null;
          if (havesRequest !== null) {
            await awaitLinkRequest(
              link,
              MESSAGE_GET_PATH,
              havesRequest,
              next.timeoutSec
            );
          }
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
    this.applyTransferIntents(result.intents);
    this.applyTransferActions(result.actions);
    return result;
  }

  private applyTransferIntents(intents: readonly Intent[]): void {
    for (const intent of intents) {
      if (intent.kind === "timer/cancel" && intent.timer.id === PROPAGATION_LINK_TIMER_ID) {
        this.linkTimer?.cancel();
        this.linkTimer = null;
      }
      if (intent.kind === "timer/set" && intent.timer.id === PROPAGATION_LINK_TIMER_ID) {
        this.linkTimer?.cancel();
        this.linkTimer = this.router.reticulum.runtime.clock.setTimeout(() => {
          this.linkTimer = null;
          this.applyTransfer({
            kind: "timer/fired",
            id: PROPAGATION_LINK_TIMER_ID,
            at: this.router.reticulum.runtime.clock.now()
          });
        }, intent.timer.delayMs);
      }
    }
  }

  private applyTransferActions(actions: ReadonlyArray<PropagationTransferAction>): void {
    for (const action of actions) {
      if (
        action.kind === "teardown-link" &&
        shouldTeardownLxmfPropagationLinkNow(
          stepTeardownLxmfPropagationLinkWithActions(
            initialTeardownLxmfPropagationLinkState(),
            {
              kind: "lxmf/teardown-propagation-link-gate",
              linkPresent: this.propagationLink !== null
            }
          ).actions
        )
      ) {
        this.propagationLink!.teardown();
        this.propagationLink = null;
      }
      if (action.kind === "resolve-link-wait") {
        const link = this.pendingEstablishedLink;
        const resolve = this.pendingLinkResolve;
        this.pendingEstablishedLink = null;
        this.clearPendingLinkWait();
        if (link !== null) {
          this.propagationLink = link;
          resolve?.(link);
        }
      }
      if (action.kind === "reject-link-wait") {
        const reject = this.pendingLinkReject;
        this.pendingEstablishedLink = null;
        this.clearPendingLinkWait();
        reject?.(new Error("Propagation link timeout"));
      }
    }
  }

  private clearPendingLinkWait(): void {
    this.pendingLinkResolve = null;
    this.pendingLinkReject = null;
  }

  private async ensurePropagationLink(
    actions: ReadonlyArray<PropagationTransferAction>
  ): Promise<Link> {
    const reuseStepped = stepReuseActiveLinkWithActions(initialReuseActiveLinkState(), {
      kind: "link/reuse-active-gate",
      linkPresent: this.propagationLink !== null,
      status: this.propagationLink?.status ?? 0
    });
    if (shouldReuseActiveLinkNow(reuseStepped.actions)) {
      return this.propagationLink!;
    }

    let hasEstablish = false;
    for (const action of actions) {
      if (action.kind === "establish-link") {
        hasEstablish = true;
        break;
      }
    }
    if (!hasEstablish) {
      throw new Error("Propagation transfer did not request a link");
    }

    const nodeIdentity =
      this.propagationNodeHash === null
        ? null
        : this.router.reticulum.resolveDestinationIdentity(this.propagationNodeHash);
    const ready = stepLxmfPropagationLinkReadyWithActions(
      initialLxmfPropagationLinkReadyState(),
      {
        kind: "propagation-link/gate",
        canReuseLink: false,
        nodeConfigured: this.propagationNodeHash !== null,
        nodeIdentityPresent: nodeIdentity !== null
      }
    );
    if (shouldRejectLxmfPropagationMissingNode(ready.actions)) {
      throw new Error("No propagation node configured");
    }
    if (
      shouldRejectLxmfPropagationMissingIdentity(ready.actions) ||
      nodeIdentity === null
    ) {
      throw new Error("Propagation node identity is unknown");
    }
    if (!shouldEstablishLxmfPropagationLink(ready.actions)) {
      throw new Error("Propagation link establish rejected");
    }

    const outbound = this.router.reticulum.registerDestination({
      provider: this.provider,
      identity: nodeIdentity,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: APP_NAME,
      aspects: ["propagation"]
    });

    return new Promise<Link>((resolve, reject) => {
      this.pendingLinkResolve = resolve;
      this.pendingLinkReject = reject;
      outbound.requestLink({
        linkEstablished: (establishLink) => {
          this.pendingEstablishedLink = establishLink;
          this.applyTransfer({ kind: "xfer/link-arrived" });
        }
      });
    });
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
    if (!shouldAcceptPropagationGetRequestData(data !== null)) {
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

async function awaitLinkRequest(
  link: Link,
  path: string,
  data: Uint8Array | null,
  timeout: number
): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const armed = stepLinkAppRequestAwaitWithActions(initialLinkAppRequestAwaitState(), {
      kind: "app-request-await/arm",
      timeoutSec: timeout
    });
    let state = armed.state;
    let concluded = false;

    const finish = (response: Uint8Array | null): void => {
      if (concluded) {
        return;
      }
      concluded = true;
      resolve(response);
    };

    const applyActions = (
      actions: ReturnType<typeof stepLinkAppRequestAwaitWithActions>["actions"]
    ): void => {
      for (const action of actions) {
        if (action.kind === "send-request") {
          void link
            .request(path, data, {
              timeout: action.timeoutSec,
              response: (receipt) => {
                const result = stepLinkAppRequestAwaitWithActions(state, {
                  kind: "app-request-await/response",
                  response: receipt.response
                });
                state = result.state;
                applyActions(result.actions);
              },
              failed: () => {
                const result = stepLinkAppRequestAwaitWithActions(state, {
                  kind: "app-request-await/failed"
                });
                state = result.state;
                applyActions(result.actions);
              }
            })
            .then((receipt) => {
              if (receipt === false) {
                const result = stepLinkAppRequestAwaitWithActions(state, {
                  kind: "app-request-await/send-rejected"
                });
                state = result.state;
                applyActions(result.actions);
              }
            });
        }
        if (action.kind === "resolve") {
          finish(action.response);
        }
      }
    };

    applyActions(armed.actions);
  });
}
