import { describe, expect, it } from "vitest";
import {
  LINK_IDENTIFY_PAYLOAD_SIZE,
  canAcceptLinkIdentify,
  initialAcceptLinkIdentifyState,
  initialLinkIdentifyState,
  initialLinkIdentifySignedMaterialState,
  initialPackLinkIdentifyPayloadState,
  initialSplitLinkIdentifyPayloadState,
  linkIdentifyPayloadFieldsFromActions,
  linkIdentifySignedMaterial,
  linkIdentifySignedMaterialRawFromActions,
  packLinkIdentifyPayload,
  packLinkIdentifyPayloadRawFromActions,
  planLinkIdentifyOutcome,
  shouldAcceptLinkIdentifyNow,
  shouldCommitLinkIdentify,
  shouldCommitLinkRemoteIdentity,
  shouldRejectLinkIdentify,
  shouldRejectPackLinkIdentifyPayload,
  shouldRejectSplitLinkIdentifyPayload,
  shouldSkipLinkIdentifyAccept,
  shouldUseLinkIdentifySignedMaterial,
  shouldUsePackLinkIdentifyPayload,
  shouldUseSplitLinkIdentifyPayload,
  splitLinkIdentifyPayload,
  stepAcceptLinkIdentifyWithActions,
  stepLinkIdentifyWithActions,
  stepLinkIdentifySignedMaterialWithActions,
  stepPackLinkIdentifyPayloadWithActions,
  stepSplitLinkIdentifyPayloadWithActions
} from "../src/link-identify.js";
import {
  computeLinkMdu,
  initialComputeLinkMduState,
  initialLinkHopsMatchState,
  linkHopsMatch,
  linkMduFromActions,
  linkPayloadFitsMdu,
  shouldMatchLinkHops,
  shouldMismatchLinkHops,
  shouldUseLinkMdu,
  stepComputeLinkMduWithActions,
  stepLinkHopsMatchWithActions
} from "../src/link-metrics.js";
import { PATHFINDER_MAX_HOPS } from "../src/path-table.js";

describe("protocol link identify", () => {
  it("accepts identify only on responder links", () => {
    expect(canAcceptLinkIdentify(false)).toBe(true);
    expect(canAcceptLinkIdentify(true)).toBe(false);

    const accept = stepAcceptLinkIdentifyWithActions(initialAcceptLinkIdentifyState(), {
      kind: "link-identify/accept-gate",
      initiator: false
    });
    expect(accept.actions).toEqual([{ kind: "accept" }]);
    expect(shouldAcceptLinkIdentifyNow(accept.actions)).toBe(true);
    expect(shouldSkipLinkIdentifyAccept(accept.actions)).toBe(false);

    const skip = stepAcceptLinkIdentifyWithActions(initialAcceptLinkIdentifyState(), {
      kind: "link-identify/accept-gate",
      initiator: true
    });
    expect(skip.actions).toEqual([{ kind: "skip" }]);
    expect(shouldAcceptLinkIdentifyNow(skip.actions)).toBe(false);
    expect(shouldSkipLinkIdentifyAccept(skip.actions)).toBe(true);
  });

  it("plans identify outcome from crypto edge flags", () => {
    expect(
      planLinkIdentifyOutcome({
        canAccept: true,
        plaintextPresent: true,
        partsPresent: true,
        identityPresent: true,
        signatureValid: true
      })
    ).toBe("accept");
    expect(
      planLinkIdentifyOutcome({
        canAccept: false,
        plaintextPresent: true,
        partsPresent: true,
        identityPresent: true,
        signatureValid: true
      })
    ).toBe("reject");
    expect(
      planLinkIdentifyOutcome({
        canAccept: true,
        plaintextPresent: true,
        partsPresent: true,
        identityPresent: true,
        signatureValid: false
      })
    ).toBe("reject");
    expect(
      shouldCommitLinkRemoteIdentity({ planAccept: true, identityPresent: true })
    ).toBe(true);
    expect(
      shouldCommitLinkRemoteIdentity({ planAccept: true, identityPresent: false })
    ).toBe(false);
    expect(
      shouldCommitLinkRemoteIdentity({ planAccept: false, identityPresent: true })
    ).toBe(false);
  });

  it("emits reject / commit actions from identify/received", () => {
    const initiator = stepLinkIdentifyWithActions(
      initialLinkIdentifyState({ initiator: true }),
      {
        kind: "identify/received",
        plaintextPresent: true,
        partsPresent: true,
        identityPresent: true,
        signatureValid: true
      }
    );
    expect(shouldRejectLinkIdentify(initiator.actions)).toBe(true);
    expect(shouldCommitLinkIdentify(initiator.actions)).toBe(false);

    const badSig = stepLinkIdentifyWithActions(
      initialLinkIdentifyState({ initiator: false }),
      {
        kind: "identify/received",
        plaintextPresent: true,
        partsPresent: true,
        identityPresent: true,
        signatureValid: false
      }
    );
    expect(shouldRejectLinkIdentify(badSig.actions)).toBe(true);

    const accepted = stepLinkIdentifyWithActions(
      initialLinkIdentifyState({ initiator: false }),
      {
        kind: "identify/received",
        plaintextPresent: true,
        partsPresent: true,
        identityPresent: true,
        signatureValid: true
      }
    );
    expect(shouldCommitLinkIdentify(accepted.actions)).toBe(true);
    expect(shouldRejectLinkIdentify(accepted.actions)).toBe(false);

    const missingIdentity = stepLinkIdentifyWithActions(
      initialLinkIdentifyState({ initiator: false }),
      {
        kind: "identify/received",
        plaintextPresent: true,
        partsPresent: true,
        identityPresent: false,
        signatureValid: true
      }
    );
    expect(shouldRejectLinkIdentify(missingIdentity.actions)).toBe(true);

    expect(
      stepLinkIdentifyWithActions(initialLinkIdentifyState({ initiator: false }), {
        kind: "timer/fired",
        id: "x",
        atMs: 0
      }).actions
    ).toEqual([]);
  });

  it("is deterministic for identify receive events", () => {
    const state = initialLinkIdentifyState({ initiator: false });
    const event = {
      kind: "identify/received" as const,
      plaintextPresent: true,
      partsPresent: true,
      identityPresent: true,
      signatureValid: true
    };
    const a = stepLinkIdentifyWithActions(state, event);
    const b = stepLinkIdentifyWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });

  it("splits and packs identify payloads", () => {
    const publicKey = new Uint8Array(64).map((_, i) => i);
    const signature = new Uint8Array(64).map((_, i) => 200 - i);
    const packed = packLinkIdentifyPayload(publicKey, signature);
    expect(packed).toHaveLength(LINK_IDENTIFY_PAYLOAD_SIZE);
    const split = splitLinkIdentifyPayload(packed);
    expect(split).not.toBeNull();
    expect([...split!.publicKey]).toEqual([...publicKey]);
    expect([...split!.signature]).toEqual([...signature]);
    expect(splitLinkIdentifyPayload(new Uint8Array(10))).toBeNull();
  });

  it("emits use-raw / reject from identify pack-gate", () => {
    const publicKey = new Uint8Array(64).map((_, i) => i);
    const signature = new Uint8Array(64).map((_, i) => 200 - i);
    const ok = stepPackLinkIdentifyPayloadWithActions(initialPackLinkIdentifyPayloadState(), {
      kind: "link-identify/pack-gate",
      publicKey,
      signature
    });
    expect(shouldUsePackLinkIdentifyPayload(ok.actions)).toBe(true);
    expect(shouldRejectPackLinkIdentifyPayload(ok.actions)).toBe(false);
    const raw = packLinkIdentifyPayloadRawFromActions(ok.actions);
    expect(raw).not.toBeNull();
    expect([...raw!]).toEqual([...packLinkIdentifyPayload(publicKey, signature)]);

    const bad = stepPackLinkIdentifyPayloadWithActions(initialPackLinkIdentifyPayloadState(), {
      kind: "link-identify/pack-gate",
      publicKey: new Uint8Array(8),
      signature
    });
    expect(shouldRejectPackLinkIdentifyPayload(bad.actions)).toBe(true);
    expect(shouldUsePackLinkIdentifyPayload(bad.actions)).toBe(false);
    expect(packLinkIdentifyPayloadRawFromActions(bad.actions)).toBeNull();

    expect(
      stepPackLinkIdentifyPayloadWithActions(initialPackLinkIdentifyPayloadState(), {
        kind: "timer/fired",
        id: "x",
        atMs: 0
      }).actions
    ).toEqual([]);
  });

  it("emits use-fields / reject from identify split-gate", () => {
    const publicKey = new Uint8Array(64).map((_, i) => i);
    const signature = new Uint8Array(64).map((_, i) => 200 - i);
    const packed = packLinkIdentifyPayload(publicKey, signature);
    const ok = stepSplitLinkIdentifyPayloadWithActions(initialSplitLinkIdentifyPayloadState(), {
      kind: "link-identify/split-gate",
      plaintext: packed
    });
    expect(shouldUseSplitLinkIdentifyPayload(ok.actions)).toBe(true);
    expect(shouldRejectSplitLinkIdentifyPayload(ok.actions)).toBe(false);
    const fields = linkIdentifyPayloadFieldsFromActions(ok.actions);
    expect(fields).not.toBeNull();
    expect([...fields!.publicKey]).toEqual([...publicKey]);
    expect([...fields!.signature]).toEqual([...signature]);

    const bad = stepSplitLinkIdentifyPayloadWithActions(initialSplitLinkIdentifyPayloadState(), {
      kind: "link-identify/split-gate",
      plaintext: new Uint8Array(10)
    });
    expect(shouldRejectSplitLinkIdentifyPayload(bad.actions)).toBe(true);
    expect(shouldUseSplitLinkIdentifyPayload(bad.actions)).toBe(false);
    expect(linkIdentifyPayloadFieldsFromActions(bad.actions)).toBeNull();
  });

  it("is deterministic for identify pack / split gates", () => {
    const publicKey = new Uint8Array(64).fill(1);
    const signature = new Uint8Array(64).fill(2);
    const packEvent = {
      kind: "link-identify/pack-gate" as const,
      publicKey,
      signature
    };
    const packA = stepPackLinkIdentifyPayloadWithActions(
      initialPackLinkIdentifyPayloadState(),
      packEvent
    );
    const packB = stepPackLinkIdentifyPayloadWithActions(
      initialPackLinkIdentifyPayloadState(),
      packEvent
    );
    expect(packA).toEqual(packB);

    const packed = packLinkIdentifyPayload(publicKey, signature);
    const splitEvent = {
      kind: "link-identify/split-gate" as const,
      plaintext: packed
    };
    const splitA = stepSplitLinkIdentifyPayloadWithActions(
      initialSplitLinkIdentifyPayloadState(),
      splitEvent
    );
    const splitB = stepSplitLinkIdentifyPayloadWithActions(
      initialSplitLinkIdentifyPayloadState(),
      splitEvent
    );
    expect(splitA).toEqual(splitB);
  });

  it("builds signed material as linkId || publicKey", () => {
    const linkId = Uint8Array.from([1, 2, 3]);
    const publicKey = Uint8Array.from([4, 5]);
    const signed = linkIdentifySignedMaterial(linkId, publicKey);
    expect([...signed]).toEqual([1, 2, 3, 4, 5]);

    const signedStepped = stepLinkIdentifySignedMaterialWithActions(
      initialLinkIdentifySignedMaterialState(),
      {
        kind: "link-identify/signed-material-gate",
        linkId,
        publicKey
      }
    );
    expect(shouldUseLinkIdentifySignedMaterial(signedStepped.actions)).toBe(true);
    const signedFromActions = linkIdentifySignedMaterialRawFromActions(signedStepped.actions);
    expect(signedFromActions).not.toBeNull();
    expect([...signedFromActions!]).toEqual([...signed]);
  });
});

describe("protocol link metrics", () => {
  it("computes MDU from MTU", () => {
    expect(computeLinkMdu(500)).toBe(
      Math.floor((500 - 18 - 48) / 16) * 16 - 1
    );
  });

  it("emits MDU only from use-mdu actions", () => {
    const stepped = stepComputeLinkMduWithActions(initialComputeLinkMduState(), {
      kind: "link/mdu-gate",
      mtu: 500
    });
    expect(shouldUseLinkMdu(stepped.actions)).toBe(true);
    expect(linkMduFromActions(stepped.actions)).toBe(computeLinkMdu(500));

    const empty = stepComputeLinkMduWithActions(initialComputeLinkMduState(), {
      kind: "noop"
    } as never);
    expect(shouldUseLinkMdu(empty.actions)).toBe(false);
    expect(linkMduFromActions(empty.actions)).toBeNull();
  });

  it("matches hops with pathfinder wildcard", () => {
    expect(
      linkHopsMatch({ expectedHops: null, packetHops: 3, pathfinderMaxHops: PATHFINDER_MAX_HOPS })
    ).toBe(true);
    expect(
      linkHopsMatch({ expectedHops: 2, packetHops: 2, pathfinderMaxHops: PATHFINDER_MAX_HOPS })
    ).toBe(true);
    expect(
      linkHopsMatch({ expectedHops: 2, packetHops: 3, pathfinderMaxHops: PATHFINDER_MAX_HOPS })
    ).toBe(false);
    expect(
      linkHopsMatch({
        expectedHops: PATHFINDER_MAX_HOPS,
        packetHops: 9,
        pathfinderMaxHops: PATHFINDER_MAX_HOPS
      })
    ).toBe(true);
  });

  it("applies hops-match only from step actions", () => {
    const match = stepLinkHopsMatchWithActions(initialLinkHopsMatchState(), {
      kind: "link/hops-match-gate",
      expectedHops: 2,
      packetHops: 2,
      pathfinderMaxHops: PATHFINDER_MAX_HOPS
    });
    expect(shouldMatchLinkHops(match.actions)).toBe(true);
    expect(shouldMismatchLinkHops(match.actions)).toBe(false);

    const mismatch = stepLinkHopsMatchWithActions(initialLinkHopsMatchState(), {
      kind: "link/hops-match-gate",
      expectedHops: 2,
      packetHops: 3,
      pathfinderMaxHops: PATHFINDER_MAX_HOPS
    });
    expect(shouldMatchLinkHops(mismatch.actions)).toBe(false);
    expect(shouldMismatchLinkHops(mismatch.actions)).toBe(true);

    const wildcard = stepLinkHopsMatchWithActions(initialLinkHopsMatchState(), {
      kind: "link/hops-match-gate",
      expectedHops: PATHFINDER_MAX_HOPS,
      packetHops: 9,
      pathfinderMaxHops: PATHFINDER_MAX_HOPS
    });
    expect(shouldMatchLinkHops(wildcard.actions)).toBe(true);
  });

  it("gates packed payload size against MDU", () => {
    expect(linkPayloadFitsMdu(100, 100)).toBe(true);
    expect(linkPayloadFitsMdu(101, 100)).toBe(false);
  });
});
