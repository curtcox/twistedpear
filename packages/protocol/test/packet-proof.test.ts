import { describe, expect, it } from "vitest";
import {
  PACKET_EXPLICIT_PROOF_SIZE,
  PACKET_FULL_HASH_SIZE,
  PACKET_SIGNATURE_SIZE,
  isPacketTypeProof,
  initialAcceptPacketReceiptProofState,
  initialPackPacketProofState,
  initialPacketProofHashMatchState,
  initialPacketReceiptProofAcceptState,
  initialPacketTypeProofState,
  initialSplitPacketProofState,
  packPacketProof,
  packPacketProofRawFromActions,
  packetProofFieldsFromActions,
  packetProofHashMatches,
  planPacketReceiptProofAccept,
  shouldAcceptPacketReceiptProof,
  shouldAcceptPacketReceiptProofActions,
  shouldAcceptPacketReceiptProofNow,
  shouldMatchPacketProofHash,
  shouldMismatchPacketProofHash,
  shouldRejectPacketReceiptProofActions,
  shouldRejectSplitPacketProof,
  shouldSkipAcceptPacketReceiptProof,
  shouldTreatPacketTypeOther,
  shouldTreatPacketTypeProof,
  shouldUsePackPacketProof,
  shouldUseSplitPacketProof,
  splitPacketProof,
  stepAcceptPacketReceiptProofWithActions,
  stepPackPacketProofWithActions,
  stepPacketProofHashMatchWithActions,
  stepPacketReceiptProofAcceptWithActions,
  stepPacketTypeProofWithActions,
  stepSplitPacketProofWithActions
} from "../src/packet-proof.js";
import { PACKET_TYPE_DATA, PACKET_TYPE_PROOF } from "../src/packet-header.js";

describe("protocol packet proof framing", () => {
  const packetHash = new Uint8Array(PACKET_FULL_HASH_SIZE).fill(1);
  const signature = new Uint8Array(PACKET_SIGNATURE_SIZE).fill(2);

  it("packs and splits explicit proofs", () => {
    const packed = packPacketProof(packetHash, signature, true);
    expect(packed.length).toBe(PACKET_EXPLICIT_PROOF_SIZE);
    const split = splitPacketProof(packed);
    expect(split?.kind).toBe("explicit");
    if (split?.kind === "explicit") {
      expect([...split.packetHash]).toEqual([...packetHash]);
      expect([...split.signature]).toEqual([...signature]);
      expect(packetProofHashMatches(split, packetHash)).toBe(true);
      expect(packetProofHashMatches(split, new Uint8Array(PACKET_FULL_HASH_SIZE).fill(9))).toBe(false);
    }
  });

  it("packs and splits implicit proofs", () => {
    const packed = packPacketProof(packetHash, signature, false);
    expect(packed.length).toBe(PACKET_SIGNATURE_SIZE);
    const split = splitPacketProof(packed);
    expect(split).toEqual({ kind: "implicit", signature });
    expect(packetProofHashMatches(split!, packetHash)).toBe(true);
  });

  it("rejects malformed proof lengths", () => {
    expect(splitPacketProof(new Uint8Array(10))).toBeNull();
  });

  it("recognizes proof packet types", () => {
    expect(isPacketTypeProof(PACKET_TYPE_PROOF)).toBe(true);
    expect(isPacketTypeProof(PACKET_TYPE_DATA)).toBe(false);
  });

  it("emits packet-type only from proof/other actions", () => {
    const proof = stepPacketTypeProofWithActions(initialPacketTypeProofState(), {
      kind: "packet-proof/packet-type-gate",
      packetType: PACKET_TYPE_PROOF
    });
    expect(shouldTreatPacketTypeProof(proof.actions)).toBe(true);
    expect(shouldTreatPacketTypeOther(proof.actions)).toBe(false);

    const other = stepPacketTypeProofWithActions(initialPacketTypeProofState(), {
      kind: "packet-proof/packet-type-gate",
      packetType: PACKET_TYPE_DATA
    });
    expect(shouldTreatPacketTypeProof(other.actions)).toBe(false);
    expect(shouldTreatPacketTypeOther(other.actions)).toBe(true);

    const empty = stepPacketTypeProofWithActions(initialPacketTypeProofState(), {
      kind: "timer/fired",
      timer: { id: "x" }
    });
    expect(shouldTreatPacketTypeProof(empty.actions)).toBe(false);
    expect(shouldTreatPacketTypeOther(empty.actions)).toBe(false);
  });

  it("emits pack framing bytes from WithActions step", () => {
    const stepped = stepPackPacketProofWithActions(initialPackPacketProofState(), {
      kind: "packet-proof/pack-gate",
      packetHash,
      signature,
      explicit: true
    });
    expect(shouldUsePackPacketProof(stepped.actions)).toBe(true);
    const packed = packPacketProofRawFromActions(stepped.actions);
    expect(packed).not.toBeNull();
    expect([...packed!]).toEqual([...packPacketProof(packetHash, signature, true)]);
  });

  it("emits split fields or reject from WithActions step", () => {
    const packed = packPacketProof(packetHash, signature, true);
    const ok = stepSplitPacketProofWithActions(initialSplitPacketProofState(), {
      kind: "packet-proof/split-gate",
      proof: packed
    });
    expect(shouldUseSplitPacketProof(ok.actions)).toBe(true);
    expect(shouldRejectSplitPacketProof(ok.actions)).toBe(false);
    const fields = packetProofFieldsFromActions(ok.actions);
    expect(fields?.kind).toBe("explicit");
    if (fields?.kind === "explicit") {
      expect([...fields.packetHash]).toEqual([...packetHash]);
      expect([...fields.signature]).toEqual([...signature]);
    }

    const rejected = stepSplitPacketProofWithActions(initialSplitPacketProofState(), {
      kind: "packet-proof/split-gate",
      proof: new Uint8Array(10)
    });
    expect(shouldRejectSplitPacketProof(rejected.actions)).toBe(true);
    expect(shouldUseSplitPacketProof(rejected.actions)).toBe(false);
    expect(packetProofFieldsFromActions(rejected.actions)).toBeNull();
  });

  it("emits match or mismatch from hash-match WithActions step", () => {
    const packed = packPacketProof(packetHash, signature, true);
    const fields = splitPacketProof(packed)!;
    const match = stepPacketProofHashMatchWithActions(initialPacketProofHashMatchState(), {
      kind: "packet-proof/hash-match-gate",
      proof: fields,
      packetHash
    });
    expect(shouldMatchPacketProofHash(match.actions)).toBe(true);
    expect(shouldMismatchPacketProofHash(match.actions)).toBe(false);

    const mismatch = stepPacketProofHashMatchWithActions(initialPacketProofHashMatchState(), {
      kind: "packet-proof/hash-match-gate",
      proof: fields,
      packetHash: new Uint8Array(PACKET_FULL_HASH_SIZE).fill(9)
    });
    expect(shouldMatchPacketProofHash(mismatch.actions)).toBe(false);
    expect(shouldMismatchPacketProofHash(mismatch.actions)).toBe(true);

    const implicit = splitPacketProof(packPacketProof(packetHash, signature, false))!;
    const implicitMatch = stepPacketProofHashMatchWithActions(initialPacketProofHashMatchState(), {
      kind: "packet-proof/hash-match-gate",
      proof: implicit,
      packetHash: new Uint8Array(PACKET_FULL_HASH_SIZE).fill(9)
    });
    expect(shouldMatchPacketProofHash(implicitMatch.actions)).toBe(true);
  });

  it("plans packet-receipt proof accept outcomes", () => {
    expect(
      planPacketReceiptProofAccept({
        splitOk: false,
        hashMatches: false,
        signatureValid: false
      })
    ).toBe("reject");
    expect(
      planPacketReceiptProofAccept({
        splitOk: true,
        hashMatches: false,
        signatureValid: true
      })
    ).toBe("reject");
    expect(
      planPacketReceiptProofAccept({
        splitOk: true,
        hashMatches: true,
        signatureValid: false
      })
    ).toBe("reject");
    expect(
      planPacketReceiptProofAccept({
        splitOk: true,
        hashMatches: true,
        signatureValid: true
      })
    ).toBe("accept");
    expect(
      shouldAcceptPacketReceiptProof({ planAccept: true, splitPresent: true })
    ).toBe(true);
    expect(
      shouldAcceptPacketReceiptProof({ planAccept: true, splitPresent: false })
    ).toBe(false);
    expect(
      shouldAcceptPacketReceiptProof({ planAccept: false, splitPresent: true })
    ).toBe(false);
  });

  it("emits packet-receipt proof accept actions from WithActions step", () => {
    const reject = stepPacketReceiptProofAcceptWithActions(initialPacketReceiptProofAcceptState(), {
      kind: "receipt/proof-accept-gate",
      splitOk: true,
      hashMatches: true,
      signatureValid: false
    });
    expect(shouldRejectPacketReceiptProofActions(reject.actions)).toBe(true);
    expect(shouldAcceptPacketReceiptProofActions(reject.actions)).toBe(false);

    const accept = stepPacketReceiptProofAcceptWithActions(initialPacketReceiptProofAcceptState(), {
      kind: "receipt/proof-accept-gate",
      splitOk: true,
      hashMatches: true,
      signatureValid: true
    });
    expect(shouldAcceptPacketReceiptProofActions(accept.actions)).toBe(true);
    expect(shouldRejectPacketReceiptProofActions(accept.actions)).toBe(false);
  });

  it("emits accept-packet-receipt-proof actions from WithActions step", () => {
    const accept = stepAcceptPacketReceiptProofWithActions(
      initialAcceptPacketReceiptProofState(),
      {
        kind: "receipt/accept-proof-gate",
        planAccept: true,
        splitPresent: true
      }
    );
    expect(shouldAcceptPacketReceiptProofNow(accept.actions)).toBe(true);
    expect(shouldSkipAcceptPacketReceiptProof(accept.actions)).toBe(false);

    const skipPlan = stepAcceptPacketReceiptProofWithActions(
      initialAcceptPacketReceiptProofState(),
      {
        kind: "receipt/accept-proof-gate",
        planAccept: false,
        splitPresent: true
      }
    );
    expect(shouldAcceptPacketReceiptProofNow(skipPlan.actions)).toBe(false);
    expect(shouldSkipAcceptPacketReceiptProof(skipPlan.actions)).toBe(true);

    const skipSplit = stepAcceptPacketReceiptProofWithActions(
      initialAcceptPacketReceiptProofState(),
      {
        kind: "receipt/accept-proof-gate",
        planAccept: true,
        splitPresent: false
      }
    );
    expect(shouldAcceptPacketReceiptProofNow(skipSplit.actions)).toBe(false);
    expect(shouldSkipAcceptPacketReceiptProof(skipSplit.actions)).toBe(true);
  });
});
