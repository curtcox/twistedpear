// @ts-nocheck
import { RESOURCE_ADVERTISEMENT_OVERHEAD,RESOURCE_HASHMAP_IS_EXHAUSTED,RESOURCE_HASHMAP_IS_NOT_EXHAUSTED,RESOURCE_MAPHASH_LEN,RESOURCE_MAX_ADV_RETRIES,RESOURCE_MAX_RETRIES,RESOURCE_PART_TIMEOUT_FACTOR,RESOURCE_PROCESSING_GRACE,RESOURCE_RANDOM_HASH_SIZE,RESOURCE_SENDER_GRACE_TIME,RESOURCE_ADVERTISE_WAIT_TIMER_ID,RESOURCE_WINDOW,RESOURCE_WINDOW_FLEXIBILITY,RESOURCE_WINDOW_MAX,RESOURCE_WINDOW_MAX_FAST,RESOURCE_WINDOW_MAX_SLOW,RESOURCE_WINDOW_MIN,ResourceStatus,applyResourceStatusEvent,assembleByteArraysRawFromActions,assembleResourceHashmapBytesRawFromActions,encodeResourceAdvertisementFlagsFromActions,initialAcceptIncomingResourceAdvertisementState,initialAdvertiseResourceState,initialAppendResourceMapHashCollisionGuardState,initialAssembleByteArraysState,initialAssembleResourceHashmapBytesState,initialClassifyResourceAdvertisementState,initialComputeResourceTimeoutState,initialComputeResourceTotalPartsState,initialContainsResourceHashState,initialDecodeResourceAdvertisementFlagsState,initialEncodeResourceAdvertisementFlagsState,initialProveResourceAllowState,initialResourceAdvertisementRoleFlagsState,initialResourceAdvertiseWaitState,initialResourceContinueTransferState,initialResourceEncryptMaterialState,initialResourceExpectedProofMaterialState,initialResourceHashMaterialState,initialResourceHashmapSlotWritesState,initialResourcePartMapHashMaterialState,initialResourceReceivePartAllowState,initialResourceRequestNextAllowState,initialResourceStatusState,initialResourceWatchdogAllowState,initialResourceCompleteState,initialPackResourceAdvertisementState,
  initialReadResourceRequestHashState,initialUnpackResourceAdvertisementState,packResourceAdvertisementRawFromActions,packResourceHashmapUpdatePacketRawFromActions,packResourceHashmapUpdateRawFromActions,packResourceProofRawFromActions,applyResourceHashmapSlotWritesFieldsFromActions,initialApplyResourceHashmapSlotWritesState,initialPackResourceHashmapUpdatePacketState,initialPackResourceHashmapUpdateState,initialPackResourceProofState,initialParseResourcePartRequestState,initialResourceAssembleState,initialResourceHashmapUpdateAcceptState,initialResourcePartRequestState,initialResourceProofAcceptState,initialResourceReceivePartState,initialResourceRequestFulfillState,initialSplitResourceDecryptedPayloadState,initialSplitResourceHashmapUpdatePacketState,initialSplitResourceProofState,initialUnpackResourceHashmapUpdateState,resourceAdvertisementFieldsFromActions,resourceAdvertisementFlagFieldsFromActions,resourceAdvertisementRoleFlagsFromActions,resourceDecryptedPayloadFromActions,resourceHashmapSlotWritesFromActions,resourceHashmapUpdateFieldsFromActions,resourceHashmapUpdatePacketFieldsFromActions,resourceMapHashCollisionGuardFromActions,resourcePartRequestFieldsFromActions,resourcePartRequestFromActions,resourceProofFieldsFromActions,resourceReceivePartFromActions,resourceRequestFulfillFromActions,readResourceRequestHashRawFromActions,shouldAppendResourceMapHashCollisionGuard,shouldApplyResourceHashmapUpdateAccept,shouldCollideResourceMapHashCollisionGuard,shouldCompleteResourceAssemble,shouldCompleteResourceProofAccept,shouldClassifyResourceAdvertisementRequest,
  shouldClassifyResourceAdvertisementResponse,shouldPresentResourceHash,shouldRejectUnpackResourceAdvertisement,shouldRejectParseResourcePartRequest,shouldRejectSplitResourceDecryptedPayload,shouldRejectSplitResourceHashmapUpdatePacket,shouldRejectSplitResourceProof,shouldRejectUnpackResourceHashmapUpdate,shouldUseApplyResourceHashmapSlotWrites,shouldUseAssembleByteArrays,shouldUseAssembleResourceHashmapBytes,shouldUseDecodeResourceAdvertisementFlags,shouldUseEncodeResourceAdvertisementFlags,shouldUsePackResourceAdvertisement,shouldUsePackResourceHashmapUpdate,shouldUsePackResourceHashmapUpdatePacket,shouldUsePackResourceProof,shouldUseParseResourcePartRequest,shouldUseReadResourceRequestHash,shouldUseResourceAdvertisementRoleFlags,shouldUseUnpackResourceAdvertisement,shouldUseSplitResourceDecryptedPayload,shouldUseSplitResourceHashmapUpdatePacket,shouldUseSplitResourceProof,shouldUseUnpackResourceHashmapUpdate,shouldWriteResourceHashmapSlots,stepAppendResourceMapHashCollisionGuardWithActions,stepApplyResourceHashmapSlotWritesWithActions,stepAssembleByteArraysWithActions,stepAssembleResourceHashmapBytesWithActions,stepClassifyResourceAdvertisementWithActions,stepComputeResourceTimeoutWithActions,stepComputeResourceTotalPartsWithActions,stepContainsResourceHashWithActions,stepDecodeResourceAdvertisementFlagsWithActions,stepEncodeResourceAdvertisementFlagsWithActions,stepPackResourceAdvertisementWithActions,stepReadResourceRequestHashWithActions,stepResourceEncryptMaterialWithActions,stepResourceExpectedProofMaterialWithActions,stepResourceHashMaterialWithActions,
  stepResourcePartMapHashMaterialWithActions,stepPackResourceHashmapUpdatePacketWithActions,stepPackResourceHashmapUpdateWithActions,stepPackResourceProofWithActions,stepParseResourcePartRequestWithActions,stepResourceAdvertisementRoleFlagsWithActions,stepUnpackResourceAdvertisementWithActions,stepCommitResourceAssemblePayloadWithActions,stepResourceAssembleWithActions,stepResourceHashmapSlotWritesWithActions,stepResourceHashmapUpdateAcceptWithActions,stepResourcePartRequestWithActions,stepResourceProofAcceptWithActions,stepResourceReceivePartWithActions,stepResourceRequestFulfillWithActions,stepSplitResourceDecryptedPayloadWithActions,stepSplitResourceHashmapUpdatePacketWithActions,stepSplitResourceProofWithActions,stepUnpackResourceHashmapUpdateWithActions,resourceEncryptMaterialRawFromActions,resourceExpectedProofMaterialRawFromActions,resourceHashMaterialRawFromActions,resourceHashmapMaxLen,resourcePartMapHashMaterialRawFromActions,resourceTimeoutFromActions,resourceTotalPartsFromActions,shouldAcceptResourceRandomHashLength,initialResourceRandomHashLengthValidState,stepResourceRandomHashLengthValidWithActions,shouldRejectResourceEncryptMaterial,shouldRejectResourceHashMaterial,shouldRejectResourcePartMapHashMaterial,shouldUseComputeResourceTotalParts,shouldUseResourceTimeout,shouldUseResourceEncryptMaterial,shouldUseResourceExpectedProofMaterial,shouldUseResourceHashMaterial,shouldUseResourcePartMapHashMaterial,shouldAcceptIncomingResourceAdvertisementNow,shouldAdvertiseResourceNow,shouldAdvanceResourceAwaitingProofNow,shouldAllowProveResource,
  shouldAllowResourceReceivePart,shouldAllowResourceRequestNext,shouldAllowResourceWatchdog,shouldApplyResourceFulfillPartNow,shouldApplyResourceReceivePartSlotNow,shouldCommitResourceAssemblePayloadNow,shouldContinueResourceTransfer,shouldFulfillResourcePartRequestNow,shouldSendResourceHashmapUpdateNow,shouldTreatResourceComplete,stepAcceptIncomingResourceAdvertisementWithActions,stepAdvertiseResourceWithActions,stepAdvanceResourceAwaitingProofWithActions,stepApplyResourceFulfillPartWithActions,stepApplyResourceReceivePartSlotWithActions,stepFulfillResourcePartRequestWithActions,stepProveResourceAllowWithActions,stepResourceAdvertiseWaitWithActions,stepResourceCompleteWithActions,stepResourceContinueTransferWithActions,stepResourceReceivePartAllowWithActions,stepResourceRequestNextAllowWithActions,stepResourceWatchdogAllowWithActions,stepResourceWatchdogWithActions,stepSendResourceHashmapUpdateWithActions,initialAdvanceResourceAwaitingProofState,initialApplyResourceFulfillPartState,initialApplyResourceReceivePartSlotState,initialCommitResourceAssemblePayloadState,initialFulfillResourcePartRequestState,initialSendResourceHashmapUpdateState,type ResourceStatusEvent,type ResourceStatusValue,type ResourceWatchdogState,type ResourceWatchdogStepResult } from "@twistedpear/protocol";
import Bunzip from "seek-bzip";
import type { CryptoProvider } from "../crypto/provider.js";
import { equalBytes } from "../crypto/bytes.js";
import { Identity } from "../identity.js";
import type { Link } from "../link.js";
import type { LeafTransport } from "../transport/node.js";
import { Packet,PacketContext,PacketHeaderType,PacketType,TransportType } from "../packet.js";
import { DestinationType } from "../destination.js";
import { RESOURCE_IFAC_MIN_SIZE, RESOURCE_PACKET_HEADER_MAX, ResourceAdvertisement, bytesToHex, decodeResourcePayload, resourceTimeoutForLink } from "./shared.js";
import type { ResourceCallbacks, ResourceOptions, ResourcePart } from "./shared.js";
import { Resource } from "../resource.js";
export class ResourceLayer1 {
readonly link: Link;
  readonly initiator: boolean;
  readonly hash: Uint8Array;
  readonly originalHash: Uint8Array;
  readonly randomHash: Uint8Array;
  readonly encrypted: boolean;
  readonly compressed: boolean;
  readonly split = false;
  readonly hasMetadata = false;
  readonly segmentIndex = 1;
  readonly totalSegments = 1;
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
  protected watchdogTimer: ReturnType<LeafTransport["clock"]["setTimeout"]> | null = null;
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
    }
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
    this.sdu = link.mtu - RESOURCE_PACKET_HEADER_MAX - RESOURCE_IFAC_MIN_SIZE;
    this.timeout = options.timeout ?? resourceTimeoutForLink(link);
  }

  static send(link: Link, data: Uint8Array, options: ResourceOptions = {}): Resource {
    const provider = link.cryptoProvider;
    const randomHash =
      options.randomHash !== undefined
        ? Uint8Array.from(options.randomHash.subarray(0, RESOURCE_RANDOM_HASH_SIZE))
        : Identity.getRandomHash(provider, link.linkTransport.entropy).subarray(
            0,
            RESOURCE_RANDOM_HASH_SIZE
          );
    if (
      !shouldAcceptResourceRandomHashLength(
        stepResourceRandomHashLengthValidWithActions(
          initialResourceRandomHashLengthValidState(),
          {
            kind: "resource-proof/random-hash-length-valid-gate",
            length: randomHash.length
          }
        ).actions
      )
    ) {
      throw new Error(`Resource random hash must be ${RESOURCE_RANDOM_HASH_SIZE} bytes`);
    }
    const encryptStepped = stepResourceEncryptMaterialWithActions(
      initialResourceEncryptMaterialState(),
      {
        kind: "resource-material/encrypt-gate",
        randomHash,
        data
      }
    );
    const payload = resourceEncryptMaterialRawFromActions(encryptStepped.actions);
    if (
      shouldRejectResourceEncryptMaterial(encryptStepped.actions) ||
      !shouldUseResourceEncryptMaterial(encryptStepped.actions) ||
      payload === null
    ) {
      throw new Error("Resource encrypt material rejected");
    }
    const encryptedPayload = link.encrypt(payload);
    const sdu = link.mtu - RESOURCE_PACKET_HEADER_MAX - RESOURCE_IFAC_MIN_SIZE;
    const totalPartsStepped = stepComputeResourceTotalPartsWithActions(
      initialComputeResourceTotalPartsState(),
      {
        kind: "resource-material/total-parts-gate",
        length: encryptedPayload.length,
        sdu
      }
    );
    const totalParts = resourceTotalPartsFromActions(totalPartsStepped.actions);
    if (
      !shouldUseComputeResourceTotalParts(totalPartsStepped.actions) ||
      totalParts === null
    ) {
      throw new Error("Resource total parts rejected");
    }
    const hashMaterialStepped = stepResourceHashMaterialWithActions(
      initialResourceHashMaterialState(),
      {
        kind: "resource-material/hash-gate",
        data,
        randomHash
      }
    );
    const hashInput = resourceHashMaterialRawFromActions(hashMaterialStepped.actions);
    if (
      shouldRejectResourceHashMaterial(hashMaterialStepped.actions) ||
      !shouldUseResourceHashMaterial(hashMaterialStepped.actions) ||
      hashInput === null
    ) {
      throw new Error("Resource hash material rejected");
    }
    const hash = Identity.fullHash(provider, hashInput);
    const expectedProofStepped = stepResourceExpectedProofMaterialWithActions(
      initialResourceExpectedProofMaterialState(),
      {
        kind: "resource-material/expected-proof-gate",
        data,
        resourceHash: hash
      }
    );
    const expectedProofMaterial = resourceExpectedProofMaterialRawFromActions(
      expectedProofStepped.actions
    );
    if (
      !shouldUseResourceExpectedProofMaterial(expectedProofStepped.actions) ||
      expectedProofMaterial === null
    ) {
      throw new Error("Resource expected-proof material rejected");
    }
    const expectedProof = Identity.fullHash(provider, expectedProofMaterial);

    const parts: ResourcePart[] = [];
    const mapHashes: Uint8Array[] = [];
    let collisionGuard: Uint8Array[] = [];

    let hashmapOk = false;
    while (!hashmapOk) {
      hashmapOk = true;
      parts.length = 0;
      mapHashes.length = 0;
      collisionGuard = [];

      for (let index = 0; index < totalParts; index += 1) {
        const partData = encryptedPayload.subarray(index * sdu, (index + 1) * sdu);
        const partMapStepped = stepResourcePartMapHashMaterialWithActions(
          initialResourcePartMapHashMaterialState(),
          {
            kind: "resource-material/part-map-hash-gate",
            partData,
            randomHash
          }
        );
        const partMapMaterial = resourcePartMapHashMaterialRawFromActions(partMapStepped.actions);
        if (
          shouldRejectResourcePartMapHashMaterial(partMapStepped.actions) ||
          !shouldUseResourcePartMapHashMaterial(partMapStepped.actions) ||
          partMapMaterial === null
        ) {
          throw new Error("Resource part map-hash material rejected");
        }
        const mapHash = Identity.fullHash(provider, partMapMaterial).subarray(
          0,
          RESOURCE_MAPHASH_LEN
        );

        const collisionStepped = stepAppendResourceMapHashCollisionGuardWithActions(
          initialAppendResourceMapHashCollisionGuardState(),
          {
            kind: "resource-hashmap/collision-guard-gate",
            guard: collisionGuard,
            mapHash,
            hashmapMaxLen: ResourceAdvertisement.HASHMAP_MAX_LEN
          }
        );
        if (shouldCollideResourceMapHashCollisionGuard(collisionStepped.actions)) {
          hashmapOk = false;
          break;
        }
        const nextGuard = resourceMapHashCollisionGuardFromActions(collisionStepped.actions);
        if (
          !shouldAppendResourceMapHashCollisionGuard(collisionStepped.actions) ||
          nextGuard === null
        ) {
          hashmapOk = false;
          break;
        }
        collisionGuard = [...nextGuard];

        const packet = Packet.fromFields(provider, {
          headerType: PacketHeaderType.HEADER_1,
          transportType: TransportType.BROADCAST,
          destinationType: DestinationType.LINK,
          packetType: PacketType.DATA,
          destinationHash: link.linkId,
          context: PacketContext.RESOURCE,
          data: partData
        });

        parts.push({
          data: partData,
          mapHash: Uint8Array.from(mapHash),
          raw: packet.raw,
          sent: false
        });
        mapHashes.push(Uint8Array.from(mapHash));
      }
    }

    const assembleStepped = stepAssembleResourceHashmapBytesWithActions(
      initialAssembleResourceHashmapBytesState(),
      {
        kind: "resource-hashmap/assemble-bytes-gate",
        mapHashes
      }
    );
    const hashmapBytes = shouldUseAssembleResourceHashmapBytes(assembleStepped.actions)
      ? assembleResourceHashmapBytesRawFromActions(assembleStepped.actions)
      : null;
    if (hashmapBytes === null) {
      throw new Error("Resource hashmap assemble rejected");
    }

    const resource = new Resource(provider, link, {
      initiator: true,
      hash,
      originalHash: hash,
      randomHash,
      encrypted: true,
      compressed: false,
      size: encryptedPayload.length,
      totalSize: data.length,
      totalParts,
      hashmapBytes,
      expectedProof,
      parts,
      callbacks: {
        ...(options.callback === undefined ? {} : { callback: options.callback }),
        ...(options.progressCallback === undefined ? {} : { progressCallback: options.progressCallback })
      },
      ...(options.timeout === undefined ? {} : { timeout: options.timeout })
    });

    if (
      shouldAdvertiseResourceNow(
        stepAdvertiseResourceWithActions(initialAdvertiseResourceState(), {
          kind: "resource/advertise-option-gate",
          advertiseOption: options.advertise
        }).actions
      )
    ) {
      void resource.advertise();
    }

    return resource;
  }

  async advertise(): Promise<void> {
    await new Promise<void>((resolve) => {
      const armed = stepResourceAdvertiseWaitWithActions(initialResourceAdvertiseWaitState(), {
        kind: "advertise-wait/arm"
      });
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
        intents: ReturnType<typeof stepResourceAdvertiseWaitWithActions>["intents"]
      ): void => {
        for (const intent of intents) {
          if (intent.kind === "timer/cancel" && intent.timer.id === RESOURCE_ADVERTISE_WAIT_TIMER_ID) {
            timer?.cancel();
            timer = null;
          }
          if (intent.kind === "timer/set" && intent.timer.id === RESOURCE_ADVERTISE_WAIT_TIMER_ID) {
            timer?.cancel();
            timer = this.link.linkTransport.clock.setTimeout(() => {
              timer = null;
              const tick = stepResourceAdvertiseWaitWithActions(waitState, {
                kind: "timer/fired",
                id: RESOURCE_ADVERTISE_WAIT_TIMER_ID,
                at: this.link.linkTransport.clock.now()
              });
              waitState = tick.state;
              applyIntents(tick.intents);
              applyActions(tick.actions);
            }, intent.timer.delayMs);
          }
        }
      };

      const applyActions = (
        actions: ReturnType<typeof stepResourceAdvertiseWaitWithActions>["actions"]
      ): void => {
        for (const action of actions) {
          if (action.kind === "queue") {
            this.applyStatus({ kind: "resource/queue" });
          }
          if (action.kind === "probe") {
            const probe = stepResourceAdvertiseWaitWithActions(waitState, {
              kind: "advertise-wait/link-ready",
              ready: this.link.readyForNewResource()
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

    const packed = new ResourceAdvertisement((this as unknown as Resource)).pack();
    this.applyStatus({ kind: "resource/advertise" });
    this.advSent = this.link.linkTransport.clock.now() / 1000;
    this.startedTransferring = this.advSent;
    this.retriesLeft = RESOURCE_MAX_ADV_RETRIES;
    this.link.registerOutgoingResource((this as unknown as Resource));
    await this.link.sendContext(PacketContext.RESOURCE_ADV, packed);
    this.startWatchdog();
  }

  hashmapUpdate(segment: number, hashmap: Uint8Array): void {
    if (
      !shouldContinueResourceTransfer(
        stepResourceContinueTransferWithActions(initialResourceContinueTransferState(), {
          kind: "resource/continue-transfer-gate",
          status: this.status
        }).actions
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
        hashmapMaxLen: ResourceAdvertisement.HASHMAP_MAX_LEN
      }
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
        writes
      }
    );
    /* Apply slot fills only from `use-fields` (no ad-hoc `applyResourceHashmapSlotWrites` reads). */
    if (shouldUseApplyResourceHashmapSlotWrites(appliedStepped.actions)) {
      const applied = applyResourceHashmapSlotWritesFieldsFromActions(appliedStepped.actions);
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
        stepResourceRequestNextAllowWithActions(initialResourceRequestNextAllowState(), {
          kind: "resource/request-next-allow-gate",
          status: this.status,
          waitingForHashmap: this.waitingForHashmap
        }).actions
      )
    ) {
      return;
    }

    const { actions } = stepResourcePartRequestWithActions(initialResourcePartRequestState(), {
      kind: "resource/part-request-gate",
      receivedParts: this.receivedParts,
      hashmap: this.hashmap,
      consecutiveCompletedHeight: this.consecutiveCompletedHeight,
      window: this.window,
      hashmapHeight: this.hashmapHeight,
      resourceHash: this.hash
    });
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
    this.link.resourceConcluded((this as unknown as Resource));
  }

  protected startWatchdog(): void {
    this.stopWatchdog();
    this.applyWatchdogResult(
      stepResourceWatchdogWithActions(this.snapshotWatchdogState(), { kind: "resource/watchdog-start" })
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
        stepResourceWatchdogAllowWithActions(initialResourceWatchdogAllowState(), {
          kind: "resource/watchdog-allow-gate",
          status: this.status
        }).actions
      )
    ) {
      return;
    }

    const result = stepResourceWatchdogWithActions(this.snapshotWatchdogState(), {
      kind: "timer/fired",
      id: "resource-watchdog",
      at: this.link.linkTransport.clock.now()
    });

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
      totalParts: this.totalParts
    };
  }

  protected applyStatus(event: ResourceStatusEvent): void {
    this.status = applyResourceStatusEvent(initialResourceStatusState(this.status), event).status;
  }

  protected applyWatchdogResult(result: ResourceWatchdogStepResult): void {
    this.retriesLeft = result.state.retriesLeft;

    for (const intent of result.intents) {
      if (intent.kind === "timer/set" && intent.timer.id === "resource-watchdog") {
        this.scheduleWatchdog(intent.timer.delayMs);
      }
    }
  }

  protected async applyWatchdogResultAsync(result: ResourceWatchdogStepResult): Promise<void> {
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
      if (intent.kind === "timer/set" && intent.timer.id === "resource-watchdog") {
        this.scheduleWatchdog(intent.timer.delayMs);
      }
    }
  }
}
