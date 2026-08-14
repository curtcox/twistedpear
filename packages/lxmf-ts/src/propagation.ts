import {
  PROPAGATION_LINK_TIMER_ID,
  initialLinkAppRequestAwaitState,
  initialLxmfPropagationLinkReadyState,
  initialLxmfPropagationSyncPrepState,
  initialPropagationTransferState,
  shouldEstablishLxmfPropagationLink,
  shouldProceedLxmfPropagationSyncPrep,
  shouldRejectLxmfPropagationMissingIdentity,
  shouldRejectLxmfPropagationMissingNode,
  shouldRejectLxmfPropagationSyncMissingDeliveryIdentity,
  shouldRejectLxmfPropagationSyncMissingNode,
  shouldReuseActiveLinkNow,
  initialReuseActiveLinkState,
  initialTeardownLxmfPropagationLinkState,
  stepReuseActiveLinkWithActions,
  shouldTeardownLxmfPropagationLinkNow,
  stepLinkAppRequestAwaitWithActions,
  stepLxmfPropagationLinkReadyWithActions,
  stepLxmfPropagationSyncPrepWithActions,
  stepTeardownLxmfPropagationLinkWithActions,
  stepPropagationTransferWithActions,
  type PropagationTransferAction,
  type PropagationTransferMachineState,
  type PropagationTransferStateValue,
} from "@twistedpear/protocol";
import {
  acceptsDeliveredMessage,
  acceptsPeerResponse,
  packPropagationRequest,
  peerErrorCode,
  requestsHavesAck,
  treatsListAsEmpty,
  unpackBinListEntries,
} from "./propagation-codec.js";
import type { Intent } from "@twistedpear/effects";
import type {
  CryptoProvider,
  Link,
  RegisteredDestination,
  Reticulum,
} from "@twistedpear/reticulum-ts";
import {
  Destination,
  DestinationDirection,
  DestinationType,
  Identity,
} from "@twistedpear/reticulum-ts";
import { APP_NAME, MESSAGE_GET_PATH } from "./constants.js";
import { LXMessage } from "./message.js";
import { msgpackPackArray, msgpackPackBin } from "./msgpack.js";
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
  private transferMachine: PropagationTransferMachineState =
    initialPropagationTransferState();
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
    this.discardPropagationLink();
  }

  get propagationNode(): Uint8Array | null {
    return this.propagationNodeHash;
  }

  get state(): PropagationTransferStateValue {
    return this.transferMachine.phase;
  }

  async syncMessages(
    maxMessages: number | null = null,
  ): Promise<PropagationSyncResult> {
    const prep = stepLxmfPropagationSyncPrepWithActions(
      initialLxmfPropagationSyncPrepState(),
      {
        kind: "propagation-sync-prep/gate",
        nodeConfigured: this.propagationNodeHash !== null,
        deliveryIdentityPresent: this.router.deliveryIdentity !== null,
      },
    );
    if (shouldRejectLxmfPropagationSyncMissingNode(prep.actions)) {
      throw new Error("No propagation node configured");
    }
    if (shouldRejectLxmfPropagationSyncMissingDeliveryIdentity(prep.actions)) {
      throw new Error(
        "Router must register a delivery identity before syncing",
      );
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
        return this.downloadListed(link, action.timeoutSec, maxMessages);
      }
    }

    return { state: this.state, messages: [] };
  }

  /** Requests the transient-id list, then downloads what it announces. */
  private async downloadListed(
    link: Link,
    timeoutSec: number,
    maxMessages: number | null,
  ): Promise<PropagationSyncResult> {
    const listRequest = packPropagationRequest({ wants: null, haves: null });
    if (listRequest === null) {
      return this.abortTransfer({ kind: "xfer/list-malformed" });
    }
    const listResponse = await awaitLinkRequest(
      link,
      MESSAGE_GET_PATH,
      listRequest,
      timeoutSec,
    );
    if (!acceptsPeerResponse(listResponse)) {
      return this.abortTransfer({ kind: "xfer/list-null" });
    }

    const listError = peerErrorCode(listResponse!);
    if (listError !== null) {
      return this.abortTransfer({
        kind: "xfer/list-peer-error",
        code: listError,
      });
    }

    const transientIds = unpackBinListEntries(
      listResponse!,
      "transient id list",
    );
    if (transientIds === null) {
      return this.abortTransfer({ kind: "xfer/list-malformed" });
    }

    const wants =
      maxMessages === null
        ? [...transientIds]
        : transientIds.slice(0, Math.max(0, maxMessages));
    if (treatsListAsEmpty(wants.length)) {
      return this.abortTransfer({ kind: "xfer/list-empty" });
    }

    const afterList = this.applyTransfer({
      kind: "xfer/list-ready",
      wantCount: wants.length,
    });
    return this.continueDownload(link, wants, afterList.actions);
  }

  /** Applies a terminal transfer event and reports the empty sync result. */
  private abortTransfer(
    event: Parameters<typeof stepPropagationTransferWithActions>[1],
  ): PropagationSyncResult {
    this.applyTransfer(event);
    return { state: this.state, messages: [] };
  }

  cancel(): void {
    this.applyTransfer({ kind: "xfer/cancel" });
  }

  private async continueDownload(
    link: Link,
    wants: ReadonlyArray<Uint8Array>,
    actions: ReadonlyArray<PropagationTransferAction>,
  ): Promise<PropagationSyncResult> {
    for (const action of actions) {
      if (action.kind !== "request-download") {
        continue;
      }

      const downloadRequest = packPropagationRequest({
        wants,
        haves: null,
        transferLimitKb: this.deliveryLimitKb,
      });
      if (downloadRequest === null) {
        return this.abortTransfer({ kind: "xfer/download-malformed" });
      }
      const downloadResponse = await awaitLinkRequest(
        link,
        MESSAGE_GET_PATH,
        downloadRequest,
        action.timeoutSec,
      );
      if (!acceptsPeerResponse(downloadResponse)) {
        return this.abortTransfer({ kind: "xfer/download-null" });
      }

      const downloaded = unpackBinListEntries(
        downloadResponse!,
        "message list response",
      );
      if (downloaded === null) {
        return this.abortTransfer({ kind: "xfer/download-malformed" });
      }

      const { messages, haves } = this.acceptDownloaded(downloaded);
      const afterDownload = this.applyTransfer({
        kind: "xfer/download-ready",
        downloadedCount: haves.length,
      });
      await this.acknowledgeHaves(link, haves, afterDownload.actions);

      return { state: this.state, messages };
    }

    return { state: this.state, messages: [] };
  }

  /** Feeds downloaded frames to the router, collecting messages and haves. */
  private acceptDownloaded(downloaded: ReadonlyArray<Uint8Array>): {
    messages: LXMessage[];
    haves: Uint8Array[];
  } {
    const messages: LXMessage[] = [];
    const haves: Uint8Array[] = [];
    for (const lxmfData of downloaded) {
      const message = this.router.handlePropagationData(lxmfData);
      if (acceptsDeliveredMessage(message !== null)) {
        messages.push(message!);
      }
      haves.push(Identity.fullHash(this.provider, lxmfData));
    }
    return { messages, haves };
  }

  private async acknowledgeHaves(
    link: Link,
    haves: ReadonlyArray<Uint8Array>,
    actions: ReadonlyArray<PropagationTransferAction>,
  ): Promise<void> {
    for (const next of actions) {
      if (next.kind !== "request-haves-ack") continue;
      if (!requestsHavesAck(haves.length)) continue;

      const havesRequest = packPropagationRequest({ wants: null, haves });
      if (havesRequest !== null) {
        await awaitLinkRequest(
          link,
          MESSAGE_GET_PATH,
          havesRequest,
          next.timeoutSec,
        );
      }
      this.applyTransfer({ kind: "xfer/haves-acked" });
    }
  }

  private applyTransfer(
    event: Parameters<typeof stepPropagationTransferWithActions>[1],
  ): ReturnType<typeof stepPropagationTransferWithActions> {
    const result = stepPropagationTransferWithActions(
      this.transferMachine,
      event,
    );
    this.transferMachine = result.state;
    this.applyTransferIntents(result.intents);
    this.applyTransferActions(result.actions);
    return result;
  }

  private applyTransferIntents(intents: readonly Intent[]): void {
    for (const intent of intents) {
      if (
        intent.kind === "timer/cancel" &&
        intent.timer.id === PROPAGATION_LINK_TIMER_ID
      ) {
        this.linkTimer?.cancel();
        this.linkTimer = null;
      }
      if (
        intent.kind === "timer/set" &&
        intent.timer.id === PROPAGATION_LINK_TIMER_ID
      ) {
        this.linkTimer?.cancel();
        this.linkTimer = this.router.reticulum.runtime.clock.setTimeout(() => {
          this.linkTimer = null;
          this.applyTransfer({
            kind: "timer/fired",
            id: PROPAGATION_LINK_TIMER_ID,
            at: this.router.reticulum.runtime.clock.now(),
          });
        }, intent.timer.delayMs);
      }
    }
  }

  private applyTransferActions(
    actions: ReadonlyArray<PropagationTransferAction>,
  ): void {
    for (const action of actions) {
      if (action.kind === "establish-link") this.establishLink();
      if (action.kind === "teardown-link") this.discardPropagationLink();
      if (action.kind === "resolve-link-wait") this.resolveLinkWait();
      if (action.kind === "reject-link-wait") this.rejectLinkWait();
    }
  }

  private establishLink(): void {
    // Reuse path applies begin without arming a wait — ignore establish IO.
    const outbound = this.pendingEstablishOutbound;
    if (this.pendingLinkResolve === null || outbound === null) return;
    outbound.requestLink({
      linkEstablished: (establishLink) => {
        this.pendingEstablishedLink = establishLink;
        this.applyTransfer({ kind: "xfer/link-arrived" });
      },
    });
  }

  /**
   * Drops the active link when the teardown gate allows it. The link is being
   * discarded either way, so a teardown packet that fails to send is swallowed
   * rather than leaking an unhandled rejection (`void` would satisfy the
   * linter without attaching a handler).
   */
  private discardPropagationLink(): void {
    if (
      !shouldTeardownLxmfPropagationLinkNow(
        stepTeardownLxmfPropagationLinkWithActions(
          initialTeardownLxmfPropagationLinkState(),
          {
            kind: "lxmf/teardown-propagation-link-gate",
            linkPresent: this.propagationLink !== null,
          },
        ).actions,
      )
    ) {
      return;
    }
    this.propagationLink!.teardown().catch(() => {});
    this.propagationLink = null;
  }

  private resolveLinkWait(): void {
    const link = this.pendingEstablishedLink;
    const resolve = this.pendingLinkResolve;
    this.pendingEstablishedLink = null;
    this.clearPendingLinkWait();
    if (link === null) return;
    this.propagationLink = link;
    resolve?.(link);
  }

  private rejectLinkWait(): void {
    const reject = this.pendingLinkReject;
    this.pendingEstablishedLink = null;
    this.clearPendingLinkWait();
    reject?.(new Error("Propagation link timeout"));
  }

  private clearPendingLinkWait(): void {
    this.pendingLinkResolve = null;
    this.pendingLinkReject = null;
    this.pendingEstablishOutbound = null;
  }

  private async ensurePropagationLink(): Promise<Link> {
    const reuseStepped = stepReuseActiveLinkWithActions(
      initialReuseActiveLinkState(),
      {
        kind: "link/reuse-active-gate",
        linkPresent: this.propagationLink !== null,
        status: this.propagationLink?.status ?? 0,
      },
    );
    if (shouldReuseActiveLinkNow(reuseStepped.actions)) {
      // Keep transfer phase in sync; establish-link is ignored without a pending wait.
      this.applyTransfer({ kind: "xfer/begin" });
      return this.propagationLink!;
    }

    // Preflight before arming so prep failures never leave LINK_ESTABLISHING armed.
    const nodeIdentity =
      this.propagationNodeHash === null
        ? null
        : this.router.reticulum.resolveDestinationIdentity(
            this.propagationNodeHash,
          );
    const ready = stepLxmfPropagationLinkReadyWithActions(
      initialLxmfPropagationLinkReadyState(),
      {
        kind: "propagation-link/gate",
        canReuseLink: false,
        nodeConfigured: this.propagationNodeHash !== null,
        nodeIdentityPresent: nodeIdentity !== null,
      },
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
      aspects: ["propagation"],
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
  timeout: number,
): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const armed = stepLinkAppRequestAwaitWithActions(
      initialLinkAppRequestAwaitState(),
      {
        kind: "app-request-await/arm",
        timeoutSec: timeout,
      },
    );
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
      actions: ReturnType<typeof stepLinkAppRequestAwaitWithActions>["actions"],
    ): void => {
      for (const action of actions) {
        if (action.kind === "send-request") {
          void link
            .request(path, data, {
              timeout: action.timeoutSec,
              response: (receipt) => {
                const result = stepLinkAppRequestAwaitWithActions(state, {
                  kind: "app-request-await/response",
                  response: receipt.response,
                });
                state = result.state;
                applyActions(result.actions);
              },
              failed: () => {
                const result = stepLinkAppRequestAwaitWithActions(state, {
                  kind: "app-request-await/failed",
                });
                state = result.state;
                applyActions(result.actions);
              },
            })
            .then((receipt) => {
              if (receipt === false) {
                const result = stepLinkAppRequestAwaitWithActions(state, {
                  kind: "app-request-await/send-rejected",
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
