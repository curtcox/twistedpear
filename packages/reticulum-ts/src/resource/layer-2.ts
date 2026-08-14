import {
  initialResourceProofAcceptState,
  initialSplitResourceProofState,
  resourceProofFieldsFromActions,
  shouldCompleteResourceProofAccept,
  shouldRejectSplitResourceProof,
  shouldUseSplitResourceProof,
  stepResourceProofAcceptWithActions,
  stepSplitResourceProofWithActions,
} from "./protocol.js";

import { equalBytes } from "../crypto/bytes.js";
import type { Resource } from "../resource.js";
import { ResourceLayer2Assemble } from "./layer-2-assemble.js";

export class ResourceLayer2 extends ResourceLayer2Assemble {
  validateProof(proofData: Uint8Array): void {
    const splitStepped = stepSplitResourceProofWithActions(
      initialSplitResourceProofState(),
      {
        kind: "resource-proof/split-gate",
        proofData,
      },
    );
    const split =
      shouldRejectSplitResourceProof(splitStepped.actions) ||
      !shouldUseSplitResourceProof(splitStepped.actions)
        ? null
        : resourceProofFieldsFromActions(splitStepped.actions);
    const { actions } = stepResourceProofAcceptWithActions(
      initialResourceProofAcceptState(),
      {
        kind: "resource/proof-accept-gate",
        status: this.status,
        proofValid:
          split !== null && equalBytes(split.proofHash, this.expectedProof),
      },
    );
    if (!shouldCompleteResourceProofAccept(actions)) {
      return;
    }

    this.applyStatus({ kind: "resource/complete" });
    this.progress = 1;
    this.link.resourceConcluded(this as unknown as Resource);
    if (this.segmentIndex < this.totalSegments) {
      // More segments to come: the transfer is not done, so the caller's
      // callback stays silent until the last segment is proven.
      void this.advertiseNextSegment();
      return;
    }
    this.callbacks.callback?.(this as unknown as Resource);
  }
}
