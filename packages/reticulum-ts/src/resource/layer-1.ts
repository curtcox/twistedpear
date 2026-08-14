import {
  applyResourceHashmapSlotWritesFieldsFromActions,
  applyResourceStatusEvent,
  initialAdvertiseResourceState,
  initialApplyResourceHashmapSlotWritesState,
  initialComputeResourceTotalPartsState,
  initialResourceAdvertiseWaitState,
  initialResourceContinueTransferState,
  initialResourceEncryptMaterialState,
  initialResourceExpectedProofMaterialState,
  initialResourceHashmapSlotWritesState,
  initialResourceHashMaterialState,
  initialResourcePartRequestState,
  initialResourceRandomHashLengthValidState,
  initialResourceRequestNextAllowState,
  initialResourceStatusState,
  initialResourceWatchdogAllowState,
  RESOURCE_ADVERTISE_WAIT_TIMER_ID,
  RESOURCE_MAX_ADV_RETRIES,
  RESOURCE_MAX_RETRIES,
  RESOURCE_RANDOM_HASH_SIZE,
  RESOURCE_WINDOW,
  RESOURCE_WINDOW_FLEXIBILITY,
  RESOURCE_WINDOW_MAX_SLOW,
  RESOURCE_WINDOW_MIN,
  resourceEncryptMaterialRawFromActions,
  resourceExpectedProofMaterialRawFromActions,
  resourceHashmapSlotWritesFromActions,
  resourceHashMaterialRawFromActions,
  resourcePartRequestFromActions,
  RESOURCE_MAX_EFFICIENT_SIZE,
  resourceSegmentCount,
  resourceSegmentRange,
  ResourceStatus,
  resourceTotalPartsFromActions,
  shouldAcceptResourceRandomHashLength,
  shouldAdvertiseResourceNow,
  shouldAllowResourceRequestNext,
  shouldAllowResourceWatchdog,
  shouldContinueResourceTransfer,
  shouldRejectResourceEncryptMaterial,
  shouldRejectResourceHashMaterial,
  shouldUseApplyResourceHashmapSlotWrites,
  shouldUseComputeResourceTotalParts,
  shouldUseResourceEncryptMaterial,
  shouldUseResourceExpectedProofMaterial,
  shouldUseResourceHashMaterial,
  shouldWriteResourceHashmapSlots,
  stepAdvertiseResourceWithActions,
  stepApplyResourceHashmapSlotWritesWithActions,
  stepComputeResourceTotalPartsWithActions,
  stepResourceAdvertiseWaitWithActions,
  stepResourceContinueTransferWithActions,
  stepResourceEncryptMaterialWithActions,
  stepResourceExpectedProofMaterialWithActions,
  stepResourceHashmapSlotWritesWithActions,
  stepResourceHashMaterialWithActions,
  stepResourcePartRequestWithActions,
  stepResourceRandomHashLengthValidWithActions,
  stepResourceRequestNextAllowWithActions,
  stepResourceWatchdogAllowWithActions,
  stepResourceWatchdogWithActions,
  type ResourceStatusEvent,
  type ResourceStatusValue,
  type ResourceWatchdogState,
  type ResourceWatchdogStepResult,
} from "./protocol.js";

import Bunzip from "seek-bzip";
import type { CryptoProvider } from "../crypto/provider.js";
import { equalBytes } from "../crypto/bytes.js";
import { Identity } from "../identity.js";
import type { Link } from "../link.js";
import type { LeafTransport } from "../transport/node.js";
import { PacketContext } from "../packet.js";
import {
  RESOURCE_IFAC_MIN_SIZE,
  RESOURCE_PACKET_HEADER_MAX,
  ResourceAdvertisement,
  bytesToHex,
  decodeResourcePayload,
  resourceTimeoutForLink,
} from "./shared.js";
import type {
  ResourceCallbacks,
  ResourceOptions,
  ResourcePart,
} from "./shared.js";
import type { Resource } from "../resource.js";
import { buildResourceParts } from "./send-parts.js";
export class ResourceLayer1 {
  readonly link: Link;
  readonly initiator: boolean;
  readonly hash: Uint8Array;
  readonly originalHash: Uint8Array;
  readonly randomHash: Uint8Array;
  readonly encrypted: boolean;
  readonly compressed: boolean;
  readonly split: boolean;
  readonly hasMetadata = false;
  readonly segmentIndex: number;
  readonly totalSegments: number;
  /**
   * Sender-side payload spanning every segment. Held so segments after the
   * first can be cut without the caller re-supplying the data; `null` on the
   * receiving side and on unsplit resources.
   */
  protected readonly segmentSource: Uint8Array | null;
  protected nextSegment: Resource | null = null;
  protected readonly maxSegmentSize: number;
  readonly requestId: Uint8Array | null;
  readonly isResponse: boolean;
  readonly hashmapBytes: Uint8Array;
  readonly expectedProof: Uint8Array;
  readonly totalSize: number;
  readonly sdu: number;

  size = 0;
  totalParts = 0;
  status: ResourceStatusValue = ResourceStatus.NONE;
  data: Uint8Array | null = null;
  progress = 0;
  window = RESOURCE_WINDOW;
  windowMax = RESOURCE_WINDOW_MAX_SLOW;
  windowMin = RESOURCE_WINDOW_MIN;
  windowFlexibility = RESOURCE_WINDOW_FLEXIBILITY;
  eifr: number | null = null;

  protected readonly provider: CryptoProvider;
  protected readonly parts: ResourcePart[] = [];
  protected readonly receivedParts: Array<Uint8Array | null> = [];
  protected hashmap: Array<Uint8Array | null> = [];
  protected readonly reqHashlist = new Set<string>();
  protected readonly callbacks: ResourceCallbacks;
  protected readonly timeout: number;
  protected retriesLeft = RESOURCE_MAX_RETRIES;
  protected advSent = 0;
  protected consecutiveCompletedHeight = -1;
  protected receivedCount = 0;
  protected outstandingParts = 0;
  protected waitingForHashmap = false;
  protected receiverMinConsecutiveHeight = 0;
  protected sentParts = 0;
  protected hashmapHeight = 0;
  protected assemblyStarted = false;
  protected watchdogTimer: ReturnType<
    LeafTransport["clock"]["setTimeout"]
  > | null = null;
  startedTransferring: number | null = null;

  protected constructor(
    provider: CryptoProvider,
    link: Link,
    options: {
      readonly initiator: boolean;
      readonly hash: Uint8Array;
      readonly originalHash: Uint8Array;
      readonly randomHash: Uint8Array;
      readonly encrypted: boolean;
      readonly compressed: boolean;
      readonly size: number;
      readonly totalSize: number;
      readonly totalParts: number;
      readonly hashmapBytes: Uint8Array;
      readonly expectedProof: Uint8Array;
      readonly parts: ResourcePart[];
      readonly requestId?: Uint8Array | null;
      readonly isResponse?: boolean;
      readonly callbacks?: ResourceCallbacks;
      readonly timeout?: number;
      readonly split?: boolean;
      readonly segmentIndex?: number;
      readonly totalSegments?: number;
      readonly segmentSource?: Uint8Array | null;
      readonly maxSegmentSize?: number;
    },
  ) {
    this.provider = provider;
    this.link = link;
    this.initiator = options.initiator;
    this.hash = options.hash;
    this.originalHash = options.originalHash;
    this.randomHash = options.randomHash;
    this.encrypted = options.encrypted;
    this.compressed = options.compressed;
    this.size = options.size;
    this.totalSize = options.totalSize;
    this.totalParts = options.totalParts;
    this.hashmapBytes = options.hashmapBytes;
    this.expectedProof = options.expectedProof;
    this.parts = options.parts;
    this.requestId = options.requestId ?? null;
    this.isResponse = options.isResponse ?? false;
    this.callbacks = options.callbacks ?? {};
    this.split = options.split ?? false;
    this.segmentIndex = options.segmentIndex ?? 1;
    this.totalSegments = options.totalSegments ?? 1;
    this.segmentSource = options.segmentSource ?? null;
    this.maxSegmentSize = options.maxSegmentSize ?? RESOURCE_MAX_EFFICIENT_SIZE;
    this.sdu = link.mtu - RESOURCE_PACKET_HEADER_MAX - RESOURCE_IFAC_MIN_SIZE;
    this.timeout = options.timeout ?? resourceTimeoutForLink(link);
  }

  static send(
    link: Link,
    fullData: Uint8Array,
    options: ResourceOptions = {},
  ): Resource {
    // A payload past MAX_EFFICIENT_SIZE travels as a chain of segments that
    // share one originalHash; this call builds one of them and keeps the whole
    // payload so the sender can cut the next after this segment is proven.
    const maxSegmentSize =
      options.maxSegmentSize ?? RESOURCE_MAX_EFFICIENT_SIZE;
    const totalSegments = resourceSegmentCount(fullData.length, maxSegmentSize);
    const split = totalSegments > 1;
    const segmentIndex = options.segmentIndex ?? 1;
    const { start, end } = resourceSegmentRange(
      fullData.length,
      segmentIndex,
      maxSegmentSize,
    );
    const data = split ? fullData.subarray(start, end) : fullData;
    const provider = link.cryptoProvider;
    const randomHash = this.resourceRandomHash(link, options);
    const materials = this.encryptAndHashResource({
      link,
      provider,
      data,
      randomHash,
    });
    const { parts, hashmapBytes } = buildResourceParts({
      provider,
      linkId: link.linkId,
      encryptedPayload: materials.encryptedPayload,
      randomHash,
      totalParts: materials.totalParts,
      sdu: materials.sdu,
      hashmapMaxLen: ResourceAdvertisement.HASHMAP_MAX_LEN,
    });
    const resource = new this(provider, link, {
      initiator: true,
      hash: materials.hash,
      originalHash: options.originalHash ?? materials.hash,
      randomHash,
      encrypted: true,
      compressed: false,
      size: materials.encryptedPayload.length,
      // The advertisement reports the size of the whole transfer, not of this
      // segment, matching `RNS.Resource.total_size`.
      totalSize: fullData.length,
      totalParts: materials.totalParts,
      split,
      segmentIndex,
      totalSegments,
      segmentSource: split ? fullData : null,
      maxSegmentSize,
      hashmapBytes,
      expectedProof: materials.expectedProof,
      parts,
      callbacks: this.sendCallbacks(options),
      ...(options.timeout === undefined ? {} : { timeout: options.timeout }),
    }) as Resource;

    if (
      shouldAdvertiseResourceNow(
        stepAdvertiseResourceWithActions(initialAdvertiseResourceState(), {
          kind: "resource/advertise-option-gate",
          advertiseOption: options.advertise,
        }).actions,
      )
    ) {
      void resource.advertise();
    }

    return resource;
  }

  private static sendCallbacks(options: ResourceOptions): ResourceCallbacks {
    return {
      ...(options.callback === undefined ? {} : { callback: options.callback }),
      ...(options.progressCallback === undefined
        ? {}
        : { progressCallback: options.progressCallback }),
    };
  }

  private static resourceRandomHash(
    link: Link,
    options: ResourceOptions,
  ): Uint8Array {
    const randomHash =
      options.randomHash !== undefined
        ? Uint8Array.from(
            options.randomHash.subarray(0, RESOURCE_RANDOM_HASH_SIZE),
          )
        : Identity.getRandomHash(
            link.cryptoProvider,
            link.linkTransport.entropy,
          ).subarray(
            0,
            RESOURCE_RANDOM_HASH_SIZE,
          );
    if (
      !shouldAcceptResourceRandomHashLength(
        stepResourceRandomHashLengthValidWithActions(
          initialResourceRandomHashLengthValidState(),
          {
            kind: "resource-proof/random-hash-length-valid-gate",
            length: randomHash.length,
          },
        ).actions,
      )
    ) {
      throw new Error(
        `Resource random hash must be ${RESOURCE_RANDOM_HASH_SIZE} bytes`,
      );
    }
    return randomHash;
  }

  private static encryptAndHashResource(input: {
    link: Link;
    provider: CryptoProvider;
    data: Uint8Array;
    randomHash: Uint8Array;
  }): {
    encryptedPayload: Uint8Array;
    totalParts: number;
    sdu: number;
    hash: Uint8Array;
    expectedProof: Uint8Array;
  } {
    const { link, provider, data, randomHash } = input;
    const encryptStepped = stepResourceEncryptMaterialWithActions(
      initialResourceEncryptMaterialState(),
      {
        kind: "resource-material/encrypt-gate",
        randomHash,
        data,
      },
    );
    const payload = resourceEncryptMaterialRawFromActions(
      encryptStepped.actions,
    );
    if (
      shouldRejectResourceEncryptMaterial(encryptStepped.actions) ||
      !shouldUseResourceEncryptMaterial(encryptStepped.actions) ||
      payload === null
    ) {
      throw new Error("Resource encrypt material rejected");
    }
    const encryptedPayload = link.encrypt(payload);
    const sdu = link.mtu - RESOURCE_PACKET_HEADER_MAX - RESOURCE_IFAC_MIN_SIZE;
    const totalParts = this.resourceTotalParts(encryptedPayload.length, sdu);
    const hash = this.resourceHash(provider, data, randomHash);
    return {
      encryptedPayload,
      totalParts,
      sdu,
      hash,
      expectedProof: this.resourceExpectedProof(provider, data, hash),
    };
  }

  private static resourceTotalParts(length: number, sdu: number): number {
    const totalPartsStepped = stepComputeResourceTotalPartsWithActions(
      initialComputeResourceTotalPartsState(),
      {
        kind: "resource-material/total-parts-gate",
        length,
        sdu,
      },
    );
    const totalParts = resourceTotalPartsFromActions(totalPartsStepped.actions);
    if (
      !shouldUseComputeResourceTotalParts(totalPartsStepped.actions) ||
      totalParts === null
    ) {
      throw new Error("Resource total parts rejected");
    }
    return totalParts;
  }

  private static resourceHash(
    provider: CryptoProvider,
    data: Uint8Array,
    randomHash: Uint8Array,
  ): Uint8Array {
    const hashMaterialStepped = stepResourceHashMaterialWithActions(
      initialResourceHashMaterialState(),
      {
        kind: "resource-material/hash-gate",
        data,
        randomHash,
      },
    );
    const hashInput = resourceHashMaterialRawFromActions(
      hashMaterialStepped.actions,
    );
    if (
      shouldRejectResourceHashMaterial(hashMaterialStepped.actions) ||
      !shouldUseResourceHashMaterial(hashMaterialStepped.actions) ||
      hashInput === null
    ) {
      throw new Error("Resource hash material rejected");
    }
    return Identity.fullHash(provider, hashInput);
  }

  private static resourceExpectedProof(
    provider: CryptoProvider,
    data: Uint8Array,
    hash: Uint8Array,
  ): Uint8Array {
    const expectedProofStepped = stepResourceExpectedProofMaterialWithActions(
      initialResourceExpectedProofMaterialState(),
      {
        kind: "resource-material/expected-proof-gate",
        data,
        resourceHash: hash,
      },
    );
    const expectedProofMaterial = resourceExpectedProofMaterialRawFromActions(
      expectedProofStepped.actions,
    );
    if (
      !shouldUseResourceExpectedProofMaterial(expectedProofStepped.actions) ||
      expectedProofMaterial === null
    ) {
      throw new Error("Resource expected-proof material rejected");
    }
    return Identity.fullHash(provider, expectedProofMaterial);
  }

  async advertise(): Promise<void> {
    await new Promise<void>((resolve) => {
      const armed = stepResourceAdvertiseWaitWithActions(
        initialResourceAdvertiseWaitState(),
        {
          kind: "advertise-wait/arm",
        },
      );
      let waitState = armed.state;
      let timer: ReturnType<LeafTransport["clock"]["setTimeout"]> | null = null;
      let concluded = false;

      const finish = (): void => {
        if (concluded) {
          return;
        }
        concluded = true;
        timer?.cancel();
        timer = null;
        resolve();
      };

      const applyIntents = (
        intents: ReturnType<
          typeof stepResourceAdvertiseWaitWithActions
        >["intents"],
      ): void => {
        for (const intent of intents) {
          if (
            intent.kind === "timer/cancel" &&
            intent.timer.id === RESOURCE_ADVERTISE_WAIT_TIMER_ID
          ) {
            timer?.cancel();
            timer = null;
          }
          if (
            intent.kind === "timer/set" &&
            intent.timer.id === RESOURCE_ADVERTISE_WAIT_TIMER_ID
          ) {
            timer?.cancel();
            timer = this.link.linkTransport.clock.setTimeout(() => {
              timer = null;
              const tick = stepResourceAdvertiseWaitWithActions(waitState, {
                kind: "timer/fired",
                id: RESOURCE_ADVERTISE_WAIT_TIMER_ID,
                at: this.link.linkTransport.clock.now(),
              });
              waitState = tick.state;
              applyIntents(tick.intents);
              applyActions(tick.actions);
            }, intent.timer.delayMs);
          }
        }
      };

      const applyActions = (
        actions: ReturnType<
          typeof stepResourceAdvertiseWaitWithActions
        >["actions"],
      ): void => {
        for (const action of actions) {
          if (action.kind === "queue") {
            this.applyStatus({ kind: "resource/queue" });
          }
          if (action.kind === "probe") {
            const probe = stepResourceAdvertiseWaitWithActions(waitState, {
              kind: "advertise-wait/link-ready",
              ready: this.link.readyForNewResource(),
            });
            waitState = probe.state;
            applyIntents(probe.intents);
            applyActions(probe.actions);
          }
          if (action.kind === "resolve") {
            finish();
          }
        }
      };

      applyIntents(armed.intents);
      applyActions(armed.actions);
    });

    const packed = new ResourceAdvertisement(
      this as unknown as Resource,
    ).pack();
    this.applyStatus({ kind: "resource/advertise" });
    this.advSent = this.link.linkTransport.clock.now() / 1000;
    this.startedTransferring = this.advSent;
    this.retriesLeft = RESOURCE_MAX_ADV_RETRIES;
    this.link.registerOutgoingResource(this as unknown as Resource);
    await this.link.sendContext(PacketContext.RESOURCE_ADV, packed);
    this.startWatchdog();
    this.prepareNextSegment();
  }

  /**
   * Cut the next segment of a split transfer, ready to advertise as soon as
   * this one is proven. Building it here rather than at proof time keeps the
   * gap between segments off the transfer's critical path, as the reference
   * implementation does.
   */
  protected prepareNextSegment(): void {
    if (
      this.segmentSource === null ||
      this.segmentIndex >= this.totalSegments ||
      this.nextSegment !== null
    ) {
      return;
    }
    const ResourceClass = this.constructor as typeof ResourceLayer1;
    this.nextSegment = ResourceClass.send(this.link, this.segmentSource, {
      advertise: false,
      segmentIndex: this.segmentIndex + 1,
      originalHash: this.originalHash,
      maxSegmentSize: this.maxSegmentSize,
      ...(this.callbacks.callback === undefined
        ? {}
        : { callback: this.callbacks.callback }),
      ...(this.callbacks.progressCallback === undefined
        ? {}
        : { progressCallback: this.callbacks.progressCallback }),
    });
  }

  /**
   * Advertise the segment that follows this one, preparing it first if the
   * proof arrived before preparation finished.
   */
  protected async advertiseNextSegment(): Promise<void> {
    this.prepareNextSegment();
    await this.nextSegment?.advertise();
  }

  hashmapUpdate(segment: number, hashmap: Uint8Array): void {
    if (
      !shouldContinueResourceTransfer(
        stepResourceContinueTransferWithActions(
          initialResourceContinueTransferState(),
          {
            kind: "resource/continue-transfer-gate",
            status: this.status,
          },
        ).actions,
      )
    ) {
      return;
    }

    this.applyStatus({ kind: "resource/transferring" });
    const writesStepped = stepResourceHashmapSlotWritesWithActions(
      initialResourceHashmapSlotWritesState(),
      {
        kind: "resource/hashmap-slot-writes-gate",
        segment,
        hashmap,
        hashmapMaxLen: ResourceAdvertisement.HASHMAP_MAX_LEN,
      },
    );
    const writes = shouldWriteResourceHashmapSlots(writesStepped.actions)
      ? resourceHashmapSlotWritesFromActions(writesStepped.actions)
      : [];
    const appliedStepped = stepApplyResourceHashmapSlotWritesWithActions(
      initialApplyResourceHashmapSlotWritesState(),
      {
        kind: "resource-hashmap/apply-slot-writes-gate",
        hashmap: this.hashmap,
        hashmapHeight: this.hashmapHeight,
        writes,
      },
    );
    /* Apply slot fills only from `use-fields` (no ad-hoc `applyResourceHashmapSlotWrites` reads). */
    if (shouldUseApplyResourceHashmapSlotWrites(appliedStepped.actions)) {
      const applied = applyResourceHashmapSlotWritesFieldsFromActions(
        appliedStepped.actions,
      );
      if (applied !== null) {
        this.hashmap = applied.hashmap;
        this.hashmapHeight = applied.hashmapHeight;
      }
    }

    this.waitingForHashmap = false;
    void this.requestNext();
  }

  async requestNext(): Promise<void> {
    if (
      !shouldAllowResourceRequestNext(
        stepResourceRequestNextAllowWithActions(
          initialResourceRequestNextAllowState(),
          {
            kind: "resource/request-next-allow-gate",
            status: this.status,
            waitingForHashmap: this.waitingForHashmap,
          },
        ).actions,
      )
    ) {
      return;
    }

    const { actions } = stepResourcePartRequestWithActions(
      initialResourcePartRequestState(),
      {
        kind: "resource/part-request-gate",
        receivedParts: this.receivedParts,
        hashmap: this.hashmap,
        consecutiveCompletedHeight: this.consecutiveCompletedHeight,
        window: this.window,
        hashmapHeight: this.hashmapHeight,
        resourceHash: this.hash,
      },
    );
    const plan = resourcePartRequestFromActions(actions);
    if (plan === null) {
      return;
    }
    this.outstandingParts = plan.outstandingParts;
    this.waitingForHashmap = plan.waitingForHashmap;
    await this.link.sendContext(PacketContext.RESOURCE_REQ, plan.requestData);
  }

  cancel(): void {
    this.applyStatus({ kind: "resource/fail" });
    this.stopWatchdog();
    this.link.resourceConcluded(this as unknown as Resource);
  }

  protected startWatchdog(): void {
    this.stopWatchdog();
    this.applyWatchdogResult(
      stepResourceWatchdogWithActions(this.snapshotWatchdogState(), {
        kind: "resource/watchdog-start",
      }),
    );
  }

  protected stopWatchdog(): void {
    this.watchdogTimer?.cancel();
    this.watchdogTimer = null;
  }

  protected scheduleWatchdog(delayMs: number): void {
    this.watchdogTimer?.cancel();
    this.watchdogTimer = this.link.linkTransport.clock.setTimeout(() => {
      void this.watchdogTick();
    }, delayMs);
  }

  protected async watchdogTick(): Promise<void> {
    if (
      !shouldAllowResourceWatchdog(
        stepResourceWatchdogAllowWithActions(
          initialResourceWatchdogAllowState(),
          {
            kind: "resource/watchdog-allow-gate",
            status: this.status,
          },
        ).actions,
      )
    ) {
      return;
    }

    const result = stepResourceWatchdogWithActions(
      this.snapshotWatchdogState(),
      {
        kind: "timer/fired",
        id: "resource-watchdog",
        at: this.link.linkTransport.clock.now(),
      },
    );

    await this.applyWatchdogResultAsync(result);
  }

  protected snapshotWatchdogState(): ResourceWatchdogState {
    return {
      status: this.status,
      initiator: this.initiator,
      advSent: this.advSent,
      timeout: this.timeout,
      retriesLeft: this.retriesLeft,
      outstandingParts: this.outstandingParts,
      receivedCount: this.receivedCount,
      totalParts: this.totalParts,
    };
  }

  protected applyStatus(event: ResourceStatusEvent): void {
    this.status = applyResourceStatusEvent(
      initialResourceStatusState(this.status),
      event,
    ).status;
  }

  protected applyWatchdogResult(result: ResourceWatchdogStepResult): void {
    this.retriesLeft = result.state.retriesLeft;

    for (const intent of result.intents) {
      if (
        intent.kind === "timer/set" &&
        intent.timer.id === "resource-watchdog"
      ) {
        this.scheduleWatchdog(intent.timer.delayMs);
      }
    }
  }

  protected async applyWatchdogResultAsync(
    result: ResourceWatchdogStepResult,
  ): Promise<void> {
    this.retriesLeft = result.state.retriesLeft;

    for (const action of result.actions) {
      if (action.kind === "cancel") {
        this.cancel();
        return;
      }
      if (action.kind === "advertise") {
        await this.advertise();
      } else if (action.kind === "request-next") {
        await this.requestNext();
      }
    }

    for (const intent of result.intents) {
      if (
        intent.kind === "timer/set" &&
        intent.timer.id === "resource-watchdog"
      ) {
        this.scheduleWatchdog(intent.timer.delayMs);
      }
    }
  }
}
