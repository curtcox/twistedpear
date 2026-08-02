import {
  PROPAGATION_LINK_TIMER_ID,
  initialAcceptPropagationDeliveredMessageState,
  initialAcceptPropagationPeerResponseState,
  initialDecodeLxmfPeerErrorState,
  initialHandlePropagationPeerErrorState,
  initialLinkAppRequestAwaitState,
  initialLxmfPropagationLinkReadyState,
  initialLxmfPropagationSyncPrepState,
  initialPackPropagationRequestState,
  initialPropagationTransferState,
  initialRequestPropagationHavesAckState,
  initialTreatPropagationListAsEmptyState,
  initialUnpackBinListState,
  binListFieldsFromActions,
  lxmfPeerErrorFromActions,
  packPropagationRequestRawFromActions,
  shouldAcceptPropagationPeerResponseNow,
  shouldAcceptPropagationDeliveredMessageNow,
  shouldEstablishLxmfPropagationLink,
  shouldHandlePropagationPeerErrorNow,
  shouldProceedLxmfPropagationSyncPrep,
  shouldRejectLxmfPropagationMissingIdentity,
  shouldRejectLxmfPropagationMissingNode,
  shouldRejectLxmfPropagationSyncMissingDeliveryIdentity,
  shouldRejectLxmfPropagationSyncMissingNode,
  shouldRejectUnpackBinList,
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
  stepAcceptPropagationDeliveredMessageWithActions,
  stepAcceptPropagationPeerResponseWithActions,
  stepDecodeLxmfPeerErrorWithActions,
  stepHandlePropagationPeerErrorWithActions,
  stepLinkAppRequestAwaitWithActions,
  stepLxmfPropagationLinkReadyWithActions,
  stepLxmfPropagationSyncPrepWithActions,
  stepTeardownLxmfPropagationLinkWithActions,
  stepPackPropagationRequestWithActions,
  stepPropagationTransferWithActions,
  stepRequestPropagationHavesAckWithActions,
  stepTreatPropagationListAsEmptyWithActions,
  stepUnpackBinListWithActions,
  type PropagationTransferAction,
  type PropagationTransferMachineState,
  type PropagationTransferStateValue
} from "@twistedpear/protocol";
import type { Intent } from "@twistedpear/effects";
import type { CryptoProvider, Link, RegisteredDestination, Reticulum } from "@twistedpear/reticulum-ts";
import {
  Destination,
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
  private pendingEstablishOutbound: RegisteredDestination | null = null;

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

    // Link wait concludes only via resolve-link-wait / reject-link-wait actions
    // (no ad-hoc phase / LINK_FAILED reads beside the machine).
    const link = await this.ensurePropagationLink();
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
      if (action.kind === "establish-link") {
        // Reuse path applies begin without arming a wait — ignore establish IO.
        const outbound = this.pendingEstablishOutbound;
        if (this.pendingLinkResolve === null || outbound === null) {
          continue;
        }
        outbound.requestLink({
          linkEstablished: (establishLink) => {
            this.pendingEstablishedLink = establishLink;
            this.applyTransfer({ kind: "xfer/link-arrived" });
          }
        });
      }
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
    this.pendingEstablishOutbound = null;
  }

  private async ensurePropagationLink(): Promise<Link> {
    const reuseStepped = stepReuseActiveLinkWithActions(initialReuseActiveLinkState(), {
      kind: "link/reuse-active-gate",
      linkPresent: this.propagationLink !== null,
      status: this.propagationLink?.status ?? 0
    });
    if (shouldReuseActiveLinkNow(reuseStepped.actions)) {
      // Keep transfer phase in sync; establish-link is ignored without a pending wait.
      this.applyTransfer({ kind: "xfer/begin" });
      return this.propagationLink!;
    }

    // Preflight before arming so prep failures never leave LINK_ESTABLISHING armed.
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
      this.pendingEstablishOutbound = outbound;
      // establish-link is applied inside applyTransferActions (same path as
      // awaitOutboundLink's request-link).
      this.applyTransfer({ kind: "xfer/begin" });
    });
  }
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
