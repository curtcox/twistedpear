import {
  assembleByteArraysRawFromActions,
  assembleResourceHashmapBytesRawFromActions,
  initialAcceptIncomingResourceAdvertisementState,
  initialAdvanceResourceAwaitingProofState,
  initialApplyResourceFulfillPartState,
  initialApplyResourceReceivePartSlotState,
  initialAssembleByteArraysState,
  initialAssembleResourceHashmapBytesState,
  initialCommitResourceAssemblePayloadState,
  initialContainsResourceHashState,
  initialFulfillResourcePartRequestState,
  initialPackResourceHashmapUpdatePacketState,
  initialPackResourceHashmapUpdateState,
  initialPackResourceProofState,
  initialParseResourcePartRequestState,
  initialProveResourceAllowState,
  initialReadResourceRequestHashState,
  initialResourceAssembleState,
  initialResourceCompleteState,
  initialResourceContinueTransferState,
  initialResourceExpectedProofMaterialState,
  initialResourceHashmapUpdateAcceptState,
  initialResourceHashMaterialState,
  initialResourcePartMapHashMaterialState,
  initialResourceProofAcceptState,
  initialResourceReceivePartAllowState,
  initialResourceReceivePartState,
  initialResourceRequestFulfillState,
  initialSendResourceHashmapUpdateState,
  initialSplitResourceDecryptedPayloadState,
  initialSplitResourceHashmapUpdatePacketState,
  initialSplitResourceProofState,
  initialUnpackResourceHashmapUpdateState,
  packResourceHashmapUpdatePacketRawFromActions,
  packResourceHashmapUpdateRawFromActions,
  packResourceProofRawFromActions,
  readResourceRequestHashRawFromActions,
  RESOURCE_MAPHASH_LEN,
  RESOURCE_MAX_RETRIES,
  RESOURCE_WINDOW_MAX,
  resourceDecryptedPayloadFromActions,
  resourceExpectedProofMaterialRawFromActions,
  resourceHashmapUpdateFieldsFromActions,
  resourceHashmapUpdatePacketFieldsFromActions,
  resourceHashMaterialRawFromActions,
  resourcePartMapHashMaterialRawFromActions,
  resourcePartRequestFieldsFromActions,
  resourceProofFieldsFromActions,
  resourceReceivePartFromActions,
  resourceRequestFulfillFromActions,
  shouldAcceptIncomingResourceAdvertisementNow,
  shouldAdvanceResourceAwaitingProofNow,
  shouldAllowProveResource,
  shouldAllowResourceReceivePart,
  shouldApplyResourceFulfillPartNow,
  shouldApplyResourceHashmapUpdateAccept,
  shouldApplyResourceReceivePartSlotNow,
  shouldCommitResourceAssemblePayloadNow,
  shouldCompleteResourceAssemble,
  shouldCompleteResourceProofAccept,
  shouldContinueResourceTransfer,
  shouldFulfillResourcePartRequestNow,
  shouldPresentResourceHash,
  shouldRejectParseResourcePartRequest,
  shouldRejectResourceHashMaterial,
  shouldRejectResourcePartMapHashMaterial,
  shouldRejectSplitResourceDecryptedPayload,
  shouldRejectSplitResourceHashmapUpdatePacket,
  shouldRejectSplitResourceProof,
  shouldRejectUnpackResourceHashmapUpdate,
  shouldSendResourceHashmapUpdateNow,
  shouldTreatResourceComplete,
  shouldUseAssembleByteArrays,
  shouldUseAssembleResourceHashmapBytes,
  shouldUsePackResourceHashmapUpdate,
  shouldUsePackResourceHashmapUpdatePacket,
  shouldUsePackResourceProof,
  shouldUseParseResourcePartRequest,
  shouldUseReadResourceRequestHash,
  shouldUseResourceExpectedProofMaterial,
  shouldUseResourceHashMaterial,
  shouldUseResourcePartMapHashMaterial,
  shouldUseSplitResourceDecryptedPayload,
  shouldUseSplitResourceHashmapUpdatePacket,
  shouldUseSplitResourceProof,
  shouldUseUnpackResourceHashmapUpdate,
  stepAcceptIncomingResourceAdvertisementWithActions,
  stepAdvanceResourceAwaitingProofWithActions,
  stepApplyResourceFulfillPartWithActions,
  stepApplyResourceReceivePartSlotWithActions,
  stepAssembleByteArraysWithActions,
  stepAssembleResourceHashmapBytesWithActions,
  stepCommitResourceAssemblePayloadWithActions,
  stepContainsResourceHashWithActions,
  stepFulfillResourcePartRequestWithActions,
  stepPackResourceHashmapUpdatePacketWithActions,
  stepPackResourceHashmapUpdateWithActions,
  stepPackResourceProofWithActions,
  stepParseResourcePartRequestWithActions,
  stepProveResourceAllowWithActions,
  stepReadResourceRequestHashWithActions,
  stepResourceAssembleWithActions,
  stepResourceCompleteWithActions,
  stepResourceContinueTransferWithActions,
  stepResourceExpectedProofMaterialWithActions,
  stepResourceHashmapUpdateAcceptWithActions,
  stepResourceHashMaterialWithActions,
  stepResourcePartMapHashMaterialWithActions,
  stepResourceProofAcceptWithActions,
  stepResourceReceivePartAllowWithActions,
  stepResourceReceivePartWithActions,
  stepResourceRequestFulfillWithActions,
  stepSendResourceHashmapUpdateWithActions,
  stepSplitResourceDecryptedPayloadWithActions,
  stepSplitResourceHashmapUpdatePacketWithActions,
  stepSplitResourceProofWithActions,
  stepUnpackResourceHashmapUpdateWithActions,
} from "./protocol.js";

import Bunzip from "seek-bzip";
import type { CryptoProvider } from "../crypto/provider.js";
import { equalBytes } from "../crypto/bytes.js";
import { Identity } from "../identity.js";
import type { Link } from "../link.js";
import type { LeafTransport } from "../transport/node.js";
import {
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  TransportType,
} from "../packet.js";
import { DestinationType } from "../destination.js";
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
import { Resource } from "../resource.js";
import { ResourceLayer1 } from "./layer-1.js";
export class ResourceLayer2Core extends ResourceLayer1 {
  static accept(
    link: Link,
    plaintext: Uint8Array,
    packet: Packet,
    options: ResourceCallbacks = {},
  ): Resource | null {
    try {
      const adv = ResourceAdvertisement.unpack(plaintext);
      const provider = link.cryptoProvider;
      const containsStepped = stepContainsResourceHashWithActions(
        initialContainsResourceHashState(),
        {
          kind: "resource-hashmap/contains-hash-gate",
          hashes: link.incomingResources.map((resource) => resource.hash),
          target: adv.h,
        },
      );
      if (
        !shouldAcceptIncomingResourceAdvertisementNow(
          stepAcceptIncomingResourceAdvertisementWithActions(
            initialAcceptIncomingResourceAdvertisementState(),
            {
              kind: "resource/accept-incoming-adv-gate",
              alreadyIncoming: shouldPresentResourceHash(
                containsStepped.actions,
              ),
            },
          ).actions,
        )
      ) {
        return null;
      }

      const resource = new Resource(provider, link, {
        initiator: false,
        hash: adv.h,
        originalHash: adv.o,
        randomHash: adv.r,
        encrypted: adv.e,
        compressed: adv.c,
        size: adv.t,
        totalSize: adv.d,
        totalParts: adv.n,
        hashmapBytes: adv.m,
        expectedProof: new Uint8Array(0),
        parts: [],
        requestId: adv.q,
        isResponse: adv.p,
        split: adv.l > 1,
        segmentIndex: adv.i,
        totalSegments: adv.l,
        callbacks: {
          ...(options.callback === undefined
            ? {}
            : { callback: options.callback }),
          ...(options.progressCallback === undefined
            ? {}
            : { progressCallback: options.progressCallback }),
        },
      });

      resource.applyStatus({ kind: "resource/transferring" });
      resource.receivedParts.length = adv.n;
      resource.receivedParts.fill(null);
      resource.hashmap = new Array(adv.n).fill(null);
      resource.startedTransferring = link.linkTransport.clock.now() / 1000;
      resource.hashmapUpdate(0, adv.m);
      link.registerIncomingResource(resource);
      resource.startWatchdog();
      return resource;
    } catch {
      return null;
    }
  }

  static reject(link: Link, plaintext: Uint8Array): void {
    try {
      const adv = ResourceAdvertisement.unpack(plaintext);
      void link.sendContext(PacketContext.RESOURCE_RCL, adv.h);
    } catch {
      // Ignore malformed advertisements.
    }
  }

  static readRequestHash(requestData: Uint8Array): Uint8Array {
    const stepped = stepReadResourceRequestHashWithActions(
      initialReadResourceRequestHashState(),
      {
        kind: "resource-hashmap/read-request-hash-gate",
        requestData,
      },
    );
    const hash = shouldUseReadResourceRequestHash(stepped.actions)
      ? readResourceRequestHashRawFromActions(stepped.actions)
      : null;
    if (hash === null) {
      throw new Error("Resource request hash read rejected");
    }
    return hash;
  }

  getTransferSize(): number {
    return this.size;
  }

  getDataSize(): number {
    return this.totalSize;
  }

  getParts(): number {
    return this.totalParts;
  }

  isComplete(): boolean {
    return shouldTreatResourceComplete(
      stepResourceCompleteWithActions(initialResourceCompleteState(), {
        kind: "resource/complete-gate",
        status: this.status,
      }).actions,
    );
  }

  hasSeenRequest(packet: Packet): boolean {
    const key = bytesToHex(packet.raw);
    return this.reqHashlist.has(key);
  }

  trackRequest(packet: Packet): void {
    this.reqHashlist.add(bytesToHex(packet.raw));
  }

  async handleRequest(requestData: Uint8Array): Promise<void> {
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
    this.retriesLeft = RESOURCE_MAX_RETRIES;
    this.startWatchdog();

    const parseStepped = stepParseResourcePartRequestWithActions(
      initialParseResourcePartRequestState(),
      {
        kind: "resource-hashmap/parse-part-request-gate",
        requestData,
      },
    );
    const request = shouldRejectParseResourcePartRequest(parseStepped.actions)
      ? null
      : shouldUseParseResourcePartRequest(parseStepped.actions)
        ? resourcePartRequestFieldsFromActions(parseStepped.actions)
        : null;
    if (
      !shouldFulfillResourcePartRequestNow(
        stepFulfillResourcePartRequestWithActions(
          initialFulfillResourcePartRequestState(),
          {
            kind: "resource-hashmap/fulfill-part-request-gate",
            requestPresent: request !== null,
          },
        ).actions,
      )
    ) {
      return;
    }

    const { actions } = stepResourceRequestFulfillWithActions(
      initialResourceRequestFulfillState(),
      {
        kind: "resource/request-fulfill-gate",
        request: request!,
        partMapHashes: this.parts.map((part) => part.mapHash),
        partSent: this.parts.map((part) => part.sent),
        receiverMinConsecutiveHeight: this.receiverMinConsecutiveHeight,
        hashmapMaxLen: ResourceAdvertisement.HASHMAP_MAX_LEN,
        windowMax: RESOURCE_WINDOW_MAX,
        totalParts: this.totalParts,
        sentParts: this.sentParts,
      },
    );
    await this.applyResourceRequestFulfillActions(actions);
  }

  protected async applyResourceRequestFulfillActions(
    actions: ReturnType<
      typeof stepResourceRequestFulfillWithActions
    >["actions"],
  ): Promise<void> {
    const plan = resourceRequestFulfillFromActions(actions);
    if (plan === null) {
      return;
    }

    for (const action of plan.partActions) {
      const part = this.parts[action.index];
      const applyStepped = stepApplyResourceFulfillPartWithActions(
        initialApplyResourceFulfillPartState(),
        {
          kind: "resource-hashmap/apply-fulfill-part-gate",
          partPresent: part !== undefined,
        },
      );
      if (!shouldApplyResourceFulfillPartNow(applyStepped.actions)) {
        continue;
      }
      if (action.kind === "send") {
        await this.link.sendResourcePart(part!.data);
        part!.sent = true;
      } else {
        await this.link.resendPacket(part!.raw);
      }
    }
    this.sentParts = plan.nextSentParts;
    this.receiverMinConsecutiveHeight = plan.nextReceiverMinConsecutiveHeight;

    if (
      shouldSendResourceHashmapUpdateNow(
        stepSendResourceHashmapUpdateWithActions(
          initialSendResourceHashmapUpdateState(),
          {
            kind: "resource-hashmap/send-hashmap-update-gate",
            hashmapUpdatePresent: plan.hashmapUpdate !== null,
          },
        ).actions,
      )
    ) {
      const assembleStepped = stepAssembleResourceHashmapBytesWithActions(
        initialAssembleResourceHashmapBytesState(),
        {
          kind: "resource-hashmap/assemble-bytes-gate",
          mapHashes: plan.hashmapUpdate!.mapHashes,
        },
      );
      const hashmap = shouldUseAssembleResourceHashmapBytes(
        assembleStepped.actions,
      )
        ? assembleResourceHashmapBytesRawFromActions(assembleStepped.actions)
        : null;
      if (hashmap === null) {
        return;
      }
      const packUpdateStepped = stepPackResourceHashmapUpdateWithActions(
        initialPackResourceHashmapUpdateState(),
        {
          kind: "resource-hashmap/pack-update-gate",
          segment: plan.hashmapUpdate!.segment,
          hashmap,
        },
      );
      const update = shouldUsePackResourceHashmapUpdate(
        packUpdateStepped.actions,
      )
        ? packResourceHashmapUpdateRawFromActions(packUpdateStepped.actions)
        : null;
      if (update === null) {
        return;
      }
      const packPacketStepped = stepPackResourceHashmapUpdatePacketWithActions(
        initialPackResourceHashmapUpdatePacketState(),
        {
          kind: "resource-hashmap/pack-packet-gate",
          resourceHash: this.hash,
          updateBytes: update,
        },
      );
      const packet = shouldUsePackResourceHashmapUpdatePacket(
        packPacketStepped.actions,
      )
        ? packResourceHashmapUpdatePacketRawFromActions(
            packPacketStepped.actions,
          )
        : null;
      if (packet === null) {
        return;
      }
      await this.link.sendContext(PacketContext.RESOURCE_HMU, packet);
    }

    if (
      shouldAdvanceResourceAwaitingProofNow(
        stepAdvanceResourceAwaitingProofWithActions(
          initialAdvanceResourceAwaitingProofState(),
          {
            kind: "resource-hashmap/advance-awaiting-proof-gate",
            status: plan.status,
          },
        ).actions,
      )
    ) {
      this.applyStatus({ kind: "resource/awaiting-proof" });
    }
  }

  hashmapUpdatePacket(plaintext: Uint8Array): void {
    const splitStepped = stepSplitResourceHashmapUpdatePacketWithActions(
      initialSplitResourceHashmapUpdatePacketState(),
      {
        kind: "resource-hashmap/split-packet-gate",
        plaintext,
      },
    );
    const split = shouldRejectSplitResourceHashmapUpdatePacket(
      splitStepped.actions,
    )
      ? null
      : shouldUseSplitResourceHashmapUpdatePacket(splitStepped.actions)
        ? resourceHashmapUpdatePacketFieldsFromActions(splitStepped.actions)
        : null;
    const unpackStepped =
      split === null
        ? null
        : stepUnpackResourceHashmapUpdateWithActions(
            initialUnpackResourceHashmapUpdateState(),
            {
              kind: "resource-hashmap/unpack-update-gate",
              bytes: split.updateBytes,
            },
          );
    const update =
      unpackStepped === null ||
      shouldRejectUnpackResourceHashmapUpdate(unpackStepped.actions)
        ? null
        : shouldUseUnpackResourceHashmapUpdate(unpackStepped.actions)
          ? resourceHashmapUpdateFieldsFromActions(unpackStepped.actions)
          : null;
    const { actions } = stepResourceHashmapUpdateAcceptWithActions(
      initialResourceHashmapUpdateAcceptState(),
      {
        kind: "resource/hashmap-update-accept-gate",
        canContinue: shouldContinueResourceTransfer(
          stepResourceContinueTransferWithActions(
            initialResourceContinueTransferState(),
            {
              kind: "resource/continue-transfer-gate",
              status: this.status,
            },
          ).actions,
        ),
        splitOk: split !== null,
        unpackOk: update !== null,
      },
    );
    if (!shouldApplyResourceHashmapUpdateAccept(actions) || update === null) {
      return;
    }
    this.hashmapUpdate(update.segment, update.hashmap);
  }

  receivePart(packet: Packet): void {
    if (
      !shouldAllowResourceReceivePart(
        stepResourceReceivePartAllowWithActions(
          initialResourceReceivePartAllowState(),
          {
            kind: "resource/receive-part-allow-gate",
            status: this.status,
          },
        ).actions,
      )
    ) {
      return;
    }

    const partData = packet.data;
    const partMapStepped = stepResourcePartMapHashMaterialWithActions(
      initialResourcePartMapHashMaterialState(),
      {
        kind: "resource-material/part-map-hash-gate",
        partData,
        randomHash: this.randomHash,
      },
    );
    const partMapMaterial = resourcePartMapHashMaterialRawFromActions(
      partMapStepped.actions,
    );
    if (
      shouldRejectResourcePartMapHashMaterial(partMapStepped.actions) ||
      !shouldUseResourcePartMapHashMaterial(partMapStepped.actions) ||
      partMapMaterial === null
    ) {
      return;
    }
    const partHash = Identity.fullHash(this.provider, partMapMaterial).subarray(
      0,
      RESOURCE_MAPHASH_LEN,
    );

    const { actions } = stepResourceReceivePartWithActions(
      initialResourceReceivePartState(),
      {
        kind: "resource/receive-part-gate",
        partHash,
        hashmap: this.hashmap,
        receivedParts: this.receivedParts,
        consecutiveCompletedHeight: this.consecutiveCompletedHeight,
        window: this.window,
        receivedCount: this.receivedCount,
        outstandingParts: this.outstandingParts,
        totalParts: this.totalParts,
        assemblyStarted: this.assemblyStarted,
      },
    );
    this.applyResourceReceivePartActions(partData, actions);
  }

  protected applyResourceReceivePartActions(
    partData: Uint8Array,
    actions: ReturnType<typeof stepResourceReceivePartWithActions>["actions"],
  ): void {
    const plan = resourceReceivePartFromActions(actions);
    if (plan === null) {
      return;
    }

    if (
      shouldApplyResourceReceivePartSlotNow(
        stepApplyResourceReceivePartSlotWithActions(
          initialApplyResourceReceivePartSlotState(),
          {
            kind: "resource-hashmap/apply-receive-part-slot-gate",
            matched: plan.matched,
            slotPresent: plan.slot !== null,
          },
        ).actions,
      )
    ) {
      this.receivedParts[plan.slot!] = Uint8Array.from(partData);
      this.receivedCount = plan.receivedCount;
      this.outstandingParts = plan.outstandingParts;
      this.consecutiveCompletedHeight = plan.consecutiveCompletedHeight;
      this.progress = plan.progress;
      this.callbacks.progressCallback?.(this as unknown as Resource);
    }

    if (plan.shouldAssemble) {
      this.assemblyStarted = true;
      void this.assemble();
    } else if (plan.shouldRequestNext) {
      void this.requestNext();
    }
  }

  async assemble(): Promise<void> {
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

    try {
      this.applyStatus({ kind: "resource/assemble" });
      const assembleStepped = stepAssembleByteArraysWithActions(
        initialAssembleByteArraysState(),
        {
          kind: "bytes/assemble-gate",
          parts: this.receivedParts.map((part) => part!),
        },
      );
      const stream = shouldUseAssembleByteArrays(assembleStepped.actions)
        ? assembleByteArraysRawFromActions(assembleStepped.actions)
        : null;
      if (stream === null) {
        return;
      }
      const decrypted = this.link.decrypt(stream);
      const decryptedStepped =
        decrypted === null
          ? null
          : stepSplitResourceDecryptedPayloadWithActions(
              initialSplitResourceDecryptedPayloadState(),
              {
                kind: "resource-proof/split-decrypted-gate",
                decrypted,
              },
            );
      const payload =
        decryptedStepped === null ||
        shouldRejectSplitResourceDecryptedPayload(decryptedStepped.actions) ||
        !shouldUseSplitResourceDecryptedPayload(decryptedStepped.actions)
          ? null
          : resourceDecryptedPayloadFromActions(decryptedStepped.actions);
      const decodedPayload =
        payload === null
          ? null
          : decodeResourcePayload(payload, this.compressed);
      const hashMaterialStepped =
        decodedPayload === null
          ? null
          : stepResourceHashMaterialWithActions(
              initialResourceHashMaterialState(),
              {
                kind: "resource-material/hash-gate",
                data: decodedPayload,
                randomHash: this.randomHash,
              },
            );
      const hashInput =
        hashMaterialStepped === null ||
        shouldRejectResourceHashMaterial(hashMaterialStepped.actions) ||
        !shouldUseResourceHashMaterial(hashMaterialStepped.actions)
          ? null
          : resourceHashMaterialRawFromActions(hashMaterialStepped.actions);
      const calculatedHash =
        hashInput === null ? null : Identity.fullHash(this.provider, hashInput);
      const { actions } = stepResourceAssembleWithActions(
        initialResourceAssembleState(),
        {
          kind: "resource/assemble-gate",
          decryptedPresent: decrypted !== null,
          payloadPresent: decodedPayload !== null,
          hashMatches:
            calculatedHash !== null && equalBytes(calculatedHash, this.hash),
        },
      );

      const commitStepped = stepCommitResourceAssemblePayloadWithActions(
        initialCommitResourceAssemblePayloadState(),
        {
          kind: "resource/commit-assemble-payload-gate",
          outcomeComplete: shouldCompleteResourceAssemble(actions),
          payloadPresent: decodedPayload !== null,
        },
      );
      if (!shouldCommitResourceAssemblePayloadNow(commitStepped.actions)) {
        this.applyStatus({ kind: "resource/corrupt" });
        this.cancel();
        return;
      }

      this.data = decodedPayload!;
      this.applyStatus({ kind: "resource/complete" });
      this.progress = 1;
      // Every segment is proven on its own; only the last one concludes the
      // transfer, and it hands back all the segments joined in order.
      await this.prove();
      if (this.split) {
        this.link.appendResourceSegment(this.originalHash, decodedPayload!);
        if (this.segmentIndex < this.totalSegments) {
          this.link.resourceConcluded(this as unknown as Resource);
          return;
        }
        this.data = this.link.takeResourceSegments(this.originalHash);
      }
      this.link.resourceConcluded(this as unknown as Resource);
      this.callbacks.callback?.(this as unknown as Resource);
    } catch {
      this.applyStatus({ kind: "resource/corrupt" });
      this.cancel();
    }
  }

  async prove(): Promise<void> {
    if (
      !shouldAllowProveResource(
        stepProveResourceAllowWithActions(initialProveResourceAllowState(), {
          kind: "resource/prove-allow-gate",
          dataPresent: this.data !== null,
        }).actions,
      )
    ) {
      return;
    }

    const expectedProofStepped = stepResourceExpectedProofMaterialWithActions(
      initialResourceExpectedProofMaterialState(),
      {
        kind: "resource-material/expected-proof-gate",
        data: this.data!,
        resourceHash: this.hash,
      },
    );
    const expectedProofMaterial = resourceExpectedProofMaterialRawFromActions(
      expectedProofStepped.actions,
    );
    if (
      !shouldUseResourceExpectedProofMaterial(expectedProofStepped.actions) ||
      expectedProofMaterial === null
    ) {
      return;
    }
    const proof = Identity.fullHash(this.provider, expectedProofMaterial);
    const stepped = stepPackResourceProofWithActions(
      initialPackResourceProofState(),
      {
        kind: "resource-proof/pack-gate",
        resourceHash: this.hash,
        proofHash: proof,
      },
    );
    const proofData = shouldUsePackResourceProof(stepped.actions)
      ? packResourceProofRawFromActions(stepped.actions)
      : null;
    if (proofData === null) {
      return;
    }
    await this.link.sendProof(PacketContext.RESOURCE_PRF, proofData);
  }
}
