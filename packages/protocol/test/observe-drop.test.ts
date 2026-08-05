import { describe, expect, it } from "vitest";
import {
  PACKET_TYPE_ANNOUNCE,
  announceValidateOutcomePlanFromActions,
  initialAcceptParsedAnnounceState,
  initialAddPathEntryState,
  initialAnnounceValidateState,
  initialIgnoreLocalAnnounceState,
  initialTransportIngressDispatchState,
  observeDropFromAnnounceRateLimit,
  observeDropFromAnnounceRateLimitActions,
  observeDropFromAnnounceValidate,
  observeDropFromIngressDispatch,
  observeDropFromLocalAnnounce,
  observeDropFromParsedAnnounce,
  observeDropFromPathEntry,
  stepAcceptParsedAnnounceWithActions,
  stepAddPathEntryWithActions,
  stepAnnounceValidateWithActions,
  stepIgnoreLocalAnnounceWithActions,
  stepTransportIngressDispatchWithActions,
  type ObserveDropIntent,
} from "../src/index.js";

function expectDrop(
  actual: ObserveDropIntent | null,
  expected: Pick<ObserveDropIntent, "stage" | "reason">,
): void {
  expect(actual).toEqual(
    expect.objectContaining({ kind: "observe/drop", ...expected }),
  );
}

describe("observe/drop announce ladder (O1)", () => {
  it("rung 3: ingress dispatch ignore emits observe/drop; accept does not", () => {
    const ignore = stepTransportIngressDispatchWithActions(
      initialTransportIngressDispatchState(),
      {
        kind: "transport/ingress-dispatch-gate",
        packetType: 255,
        destinationType: 0,
      },
    );
    expectDrop(observeDropFromIngressDispatch(ignore.actions), {
      stage: "ingress-dispatch",
      reason: "ignored",
    });

    const announce = stepTransportIngressDispatchWithActions(
      initialTransportIngressDispatchState(),
      {
        kind: "transport/ingress-dispatch-gate",
        packetType: PACKET_TYPE_ANNOUNCE,
        destinationType: 0,
      },
    );
    expect(observeDropFromIngressDispatch(announce.actions)).toBeNull();
  });

  it("rung 4: rate-limit ∧ blocked emits observe/drop; either alone does not", () => {
    expectDrop(
      observeDropFromAnnounceRateLimit({ applyRateLimit: true, blocked: true }),
      { stage: "announce-rate-limit", reason: "rate_limited" },
    );
    expect(
      observeDropFromAnnounceRateLimit({
        applyRateLimit: true,
        blocked: false,
      }),
    ).toBeNull();
    expect(
      observeDropFromAnnounceRateLimit({
        applyRateLimit: false,
        blocked: true,
      }),
    ).toBeNull();
    expectDrop(
      observeDropFromAnnounceRateLimitActions(
        [{ kind: "apply-rate-limit" }],
        [{ kind: "blocked" }],
        { destinationKey: "aabb" },
      ),
      { stage: "announce-rate-limit", reason: "rate_limited" },
    );
    expect(
      observeDropFromAnnounceRateLimitActions(
        [{ kind: "apply-rate-limit" }],
        [{ kind: "blocked" }],
        { destinationKey: "aabb" },
      )?.destinationKey,
    ).toBe("aabb");
    expect(
      observeDropFromAnnounceRateLimitActions(
        [{ kind: "record-rate" }],
        [{ kind: "blocked" }],
      ),
    ).toBeNull();
  });

  it("rung 5: each validate reject maps to its reason; accept does not", () => {
    const cases: Array<{
      parsedOk: boolean;
      publicKeyLoaded: boolean;
      signatureValid: boolean;
      destinationHashMatches: boolean;
      reason: ObserveDropIntent["reason"] | null;
    }> = [
      {
        parsedOk: false,
        publicKeyLoaded: false,
        signatureValid: false,
        destinationHashMatches: false,
        reason: "reject_parse",
      },
      {
        parsedOk: true,
        publicKeyLoaded: false,
        signatureValid: false,
        destinationHashMatches: false,
        reason: "reject_public_key",
      },
      {
        parsedOk: true,
        publicKeyLoaded: true,
        signatureValid: false,
        destinationHashMatches: false,
        reason: "reject_signature",
      },
      {
        parsedOk: true,
        publicKeyLoaded: true,
        signatureValid: true,
        destinationHashMatches: false,
        reason: "reject_destination_hash",
      },
      {
        parsedOk: true,
        publicKeyLoaded: true,
        signatureValid: true,
        destinationHashMatches: true,
        reason: null,
      },
    ];

    for (const input of cases) {
      const stepped = stepAnnounceValidateWithActions(
        initialAnnounceValidateState(),
        {
          kind: "announce/validate-gate",
          parsedOk: input.parsedOk,
          publicKeyLoaded: input.publicKeyLoaded,
          signatureValid: input.signatureValid,
          onlyValidateSignature: false,
          destinationHashMatches: input.destinationHashMatches,
        },
      );
      const plan = announceValidateOutcomePlanFromActions(stepped.actions);
      const drop = observeDropFromAnnounceValidate(plan);
      if (input.reason === null) {
        expect(drop).toBeNull();
      } else {
        expectDrop(drop, { stage: "announce-validate", reason: input.reason });
      }
    }
  });

  it("rung 6: parsed-announce skip emits observe/drop; accept does not", () => {
    const skip = stepAcceptParsedAnnounceWithActions(
      initialAcceptParsedAnnounceState(),
      {
        kind: "announce/accept-parsed-gate",
        parsedPresent: false,
      },
    );
    expectDrop(observeDropFromParsedAnnounce(skip.actions), {
      stage: "announce-parse",
      reason: "unparseable",
    });

    const accept = stepAcceptParsedAnnounceWithActions(
      initialAcceptParsedAnnounceState(),
      {
        kind: "announce/accept-parsed-gate",
        parsedPresent: true,
      },
    );
    expect(observeDropFromParsedAnnounce(accept.actions)).toBeNull();
  });

  it("rung 7: local echo ignore emits observe/drop; proceed does not", () => {
    const ignore = stepIgnoreLocalAnnounceWithActions(
      initialIgnoreLocalAnnounceState(),
      {
        kind: "announce/ignore-local-gate",
        hasLocalInboundDestination: true,
      },
    );
    expectDrop(observeDropFromLocalAnnounce(ignore.actions), {
      stage: "announce-local-echo",
      reason: "local_echo",
    });

    const proceed = stepIgnoreLocalAnnounceWithActions(
      initialIgnoreLocalAnnounceState(),
      {
        kind: "announce/ignore-local-gate",
        hasLocalInboundDestination: false,
      },
    );
    expect(observeDropFromLocalAnnounce(proceed.actions)).toBeNull();
  });

  it("rung 8: path-entry skip emits observe/drop; add does not", () => {
    const blob = new Uint8Array(16).fill(1);
    const skip = stepAddPathEntryWithActions(initialAddPathEntryState(), {
      kind: "path/add-entry-gate",
      hops: 0,
      randomBlob: blob,
      nowSeconds: 100,
      existing: {
        hops: 0,
        expires: 200,
        randomBlobs: [blob],
      },
    });
    expectDrop(observeDropFromPathEntry(skip.actions), {
      stage: "path-entry",
      reason: "path_not_added",
    });

    const add = stepAddPathEntryWithActions(initialAddPathEntryState(), {
      kind: "path/add-entry-gate",
      hops: 1,
      randomBlob: blob,
      nowSeconds: 100,
      existing: null,
    });
    expect(observeDropFromPathEntry(add.actions)).toBeNull();
  });

  it("negative control: wrong reason fails the census assertion", () => {
    const drop = observeDropFromAnnounceRateLimit({
      applyRateLimit: true,
      blocked: true,
    });
    expect(drop?.reason).not.toBe("ignored");
    expect(drop).not.toEqual(
      expect.objectContaining({ stage: "ingress-dispatch", reason: "ignored" }),
    );
  });
});
