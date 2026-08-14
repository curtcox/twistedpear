import {
  assembleByteArraysRawFromActions,
  assembleResourceHashmapBytesRawFromActions,
  initialAdvanceResourceAwaitingProofState,
  initialApplyResourceFulfillPartState,
  initialAssembleByteArraysState,
  initialAssembleResourceHashmapBytesState,
  initialCommitResourceAssemblePayloadState,
  initialPackResourceHashmapUpdatePacketState,
  initialPackResourceHashmapUpdateState,
  initialResourceAssembleState,
  initialResourceContinueTransferState,
  initialResourceHashMaterialState,
  initialSendResourceHashmapUpdateState,
  initialSplitResourceDecryptedPayloadState,
  packResourceHashmapUpdatePacketRawFromActions,
  packResourceHashmapUpdateRawFromActions,
  resourceDecryptedPayloadFromActions,
  resourceHashMaterialRawFromActions,
  resourceRequestFulfillFromActions,
  shouldAdvanceResourceAwaitingProofNow,
  shouldApplyResourceFulfillPartNow,
  shouldCommitResourceAssemblePayloadNow,
  shouldCompleteResourceAssemble,
  shouldContinueResourceTransfer,
  shouldRejectResourceHashMaterial,
  shouldRejectSplitResourceDecryptedPayload,
  shouldSendResourceHashmapUpdateNow,
  shouldUseAssembleByteArrays,
  shouldUseAssembleResourceHashmapBytes,
  shouldUsePackResourceHashmapUpdate,
  shouldUsePackResourceHashmapUpdatePacket,
  shouldUseResourceHashMaterial,
  shouldUseSplitResourceDecryptedPayload,
  stepAdvanceResourceAwaitingProofWithActions,
  stepApplyResourceFulfillPartWithActions,
  stepAssembleByteArraysWithActions,
  stepAssembleResourceHashmapBytesWithActions,
  stepCommitResourceAssemblePayloadWithActions,
  stepPackResourceHashmapUpdatePacketWithActions,
  stepPackResourceHashmapUpdateWithActions,
  stepResourceAssembleWithActions,
  stepResourceContinueTransferWithActions,
  stepResourceHashMaterialWithActions,
  stepSendResourceHashmapUpdateWithActions,
  stepSplitResourceDecryptedPayloadWithActions,
} from "./protocol.js";

import { equalBytes } from "../crypto/bytes.js";
import { Identity } from "../identity.js";
import { PacketContext } from "../packet.js";
import { decodeResourcePayload } from "./shared.js";
import type { Resource } from "../resource.js";
import { ResourceLayer2Core } from "./layer-2-core.js";

export class ResourceLayer2Assemble extends ResourceLayer2Core {
  protected override async applyResourceRequestFulfillActions(
    actions: Parameters<
      ResourceLayer2Core["applyResourceRequestFulfillActions"]
    >[0],
  ): Promise<void> {
    const plan = resourceRequestFulfillFromActions(actions);
    if (plan === null) {
      return;
    }

    await this.applyFulfillPartActions(plan.partActions);
    this.sentParts = plan.nextSentParts;
    this.receiverMinConsecutiveHeight = plan.nextReceiverMinConsecutiveHeight;
    await this.sendHashmapUpdateIfPresent(plan.hashmapUpdate);
    this.advanceAwaitingProofIfNeeded(plan.status);
  }

  private async applyFulfillPartActions(
    partActions: NonNullable<
      ReturnType<typeof resourceRequestFulfillFromActions>
    >["partActions"],
  ): Promise<void> {
    for (const action of partActions) {
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
  }

  private async sendHashmapUpdateIfPresent(
    hashmapUpdate: NonNullable<
      ReturnType<typeof resourceRequestFulfillFromActions>
    >["hashmapUpdate"],
  ): Promise<void> {
    if (
      !shouldSendResourceHashmapUpdateNow(
        stepSendResourceHashmapUpdateWithActions(
          initialSendResourceHashmapUpdateState(),
          {
            kind: "resource-hashmap/send-hashmap-update-gate",
            hashmapUpdatePresent: hashmapUpdate !== null,
          },
        ).actions,
      )
    ) {
      return;
    }
    const packet = packHashmapUpdatePacket(
      this.hash,
      hashmapUpdate!.segment,
      hashmapUpdate!.mapHashes,
    );
    if (packet === null) {
      return;
    }
    await this.link.sendContext(PacketContext.RESOURCE_HMU, packet);
  }

  private advanceAwaitingProofIfNeeded(
    status: "transferring" | "awaiting-proof",
  ): void {
    if (
      shouldAdvanceResourceAwaitingProofNow(
        stepAdvanceResourceAwaitingProofWithActions(
          initialAdvanceResourceAwaitingProofState(),
          {
            kind: "resource-hashmap/advance-awaiting-proof-gate",
            status,
          },
        ).actions,
      )
    ) {
      this.applyStatus({ kind: "resource/awaiting-proof" });
    }
  }

  override async assemble(): Promise<void> {
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
      await this.assemblePayload();
    } catch {
      this.applyStatus({ kind: "resource/corrupt" });
      this.cancel();
    }
  }

  private async assemblePayload(): Promise<void> {
    this.applyStatus({ kind: "resource/assemble" });
    const decoded = this.decodeAssembledPayload();
    if (decoded === null) {
      return;
    }
    const { actions } = stepResourceAssembleWithActions(
      initialResourceAssembleState(),
      {
        kind: "resource/assemble-gate",
        decryptedPresent: decoded.decrypted !== null,
        payloadPresent: decoded.decodedPayload !== null,
        hashMatches: decoded.hashMatches,
      },
    );

    const commitStepped = stepCommitResourceAssemblePayloadWithActions(
      initialCommitResourceAssemblePayloadState(),
      {
        kind: "resource/commit-assemble-payload-gate",
        outcomeComplete: shouldCompleteResourceAssemble(actions),
        payloadPresent: decoded.decodedPayload !== null,
      },
    );
    if (!shouldCommitResourceAssemblePayloadNow(commitStepped.actions)) {
      this.applyStatus({ kind: "resource/corrupt" });
      this.cancel();
      return;
    }

    this.data = decoded.decodedPayload!;
    this.applyStatus({ kind: "resource/complete" });
    this.progress = 1;
    await this.prove();
    if (this.split) {
      this.link.appendResourceSegment(
        this.originalHash,
        decoded.decodedPayload!,
      );
      if (this.segmentIndex < this.totalSegments) {
        this.link.resourceConcluded(this as unknown as Resource);
        return;
      }
      this.data = this.link.takeResourceSegments(this.originalHash);
    }
    this.link.resourceConcluded(this as unknown as Resource);
    this.callbacks.callback?.(this as unknown as Resource);
  }

  private decodeAssembledPayload(): {
    decrypted: Uint8Array | null;
    decodedPayload: Uint8Array | null;
    hashMatches: boolean;
  } | null {
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
      return null;
    }
    const decrypted = this.link.decrypt(stream);
    const payload = splitDecryptedResourcePayload(decrypted);
    const decodedPayload =
      payload === null ? null : decodeResourcePayload(payload, this.compressed);
    const hashInput = resourceHashInput(decodedPayload, this.randomHash);
    const calculatedHash =
      hashInput === null ? null : Identity.fullHash(this.provider, hashInput);
    return {
      decrypted,
      decodedPayload,
      hashMatches:
        calculatedHash !== null && equalBytes(calculatedHash, this.hash),
    };
  }
}

function packHashmapUpdatePacket(
  resourceHash: Uint8Array,
  segment: number,
  mapHashes: readonly Uint8Array[],
): Uint8Array | null {
  const assembleStepped = stepAssembleResourceHashmapBytesWithActions(
    initialAssembleResourceHashmapBytesState(),
    {
      kind: "resource-hashmap/assemble-bytes-gate",
      mapHashes,
    },
  );
  const hashmap = shouldUseAssembleResourceHashmapBytes(assembleStepped.actions)
    ? assembleResourceHashmapBytesRawFromActions(assembleStepped.actions)
    : null;
  if (hashmap === null) {
    return null;
  }
  const packUpdateStepped = stepPackResourceHashmapUpdateWithActions(
    initialPackResourceHashmapUpdateState(),
    {
      kind: "resource-hashmap/pack-update-gate",
      segment,
      hashmap,
    },
  );
  const update = shouldUsePackResourceHashmapUpdate(packUpdateStepped.actions)
    ? packResourceHashmapUpdateRawFromActions(packUpdateStepped.actions)
    : null;
  if (update === null) {
    return null;
  }
  const packPacketStepped = stepPackResourceHashmapUpdatePacketWithActions(
    initialPackResourceHashmapUpdatePacketState(),
    {
      kind: "resource-hashmap/pack-packet-gate",
      resourceHash,
      updateBytes: update,
    },
  );
  if (!shouldUsePackResourceHashmapUpdatePacket(packPacketStepped.actions)) {
    return null;
  }
  return packResourceHashmapUpdatePacketRawFromActions(
    packPacketStepped.actions,
  );
}

function splitDecryptedResourcePayload(
  decrypted: Uint8Array | null,
): Uint8Array | null {
  if (decrypted === null) {
    return null;
  }
  const decryptedStepped = stepSplitResourceDecryptedPayloadWithActions(
    initialSplitResourceDecryptedPayloadState(),
    {
      kind: "resource-proof/split-decrypted-gate",
      decrypted,
    },
  );
  if (
    shouldRejectSplitResourceDecryptedPayload(decryptedStepped.actions) ||
    !shouldUseSplitResourceDecryptedPayload(decryptedStepped.actions)
  ) {
    return null;
  }
  return resourceDecryptedPayloadFromActions(decryptedStepped.actions);
}

function resourceHashInput(
  decodedPayload: Uint8Array | null,
  randomHash: Uint8Array,
): Uint8Array | null {
  if (decodedPayload === null) {
    return null;
  }
  const hashMaterialStepped = stepResourceHashMaterialWithActions(
    initialResourceHashMaterialState(),
    {
      kind: "resource-material/hash-gate",
      data: decodedPayload,
      randomHash,
    },
  );
  if (
    shouldRejectResourceHashMaterial(hashMaterialStepped.actions) ||
    !shouldUseResourceHashMaterial(hashMaterialStepped.actions)
  ) {
    return null;
  }
  return resourceHashMaterialRawFromActions(hashMaterialStepped.actions);
}
