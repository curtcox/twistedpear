import { describe, expect, it } from "vitest";
import {
  IDENTITY_RATCHET_BYTES,
  IDENTITY_RATCHET_EXPIRY_SECONDS,
  decodeIdentityRatchetRecord,
  encodeIdentityRatchetRecord,
  encodeIdentityRatchetRecordRawFromActions,
  identityRatchetLookupPlanFromActions,
  identityRatchetRecordFromActions,
  identityRatchetStoreKey,
  initialCommitRestoredIdentityRatchetState,
  initialDecodeIdentityRatchetRecordState,
  initialEncodeIdentityRatchetRecordState,
  initialIdentityRatchetLookupPlanState,
  initialIdentityRatchetLookupState,
  initialIdentityRatchetRecordUsableState,
  initialPersistIdentityRatchetState,
  isIdentityRatchetRecordUsable,
  planIdentityRatchetLookup,
  shouldCommitRestoredIdentityRatchetNow,
  shouldMissIdentityRatchetLookupPlanNoStore,
  shouldMissIdentityRatchetLookupPlanStore,
  shouldMissIdentityRatchetNoStore,
  shouldMissIdentityRatchetStore,
  shouldPersistIdentityRatchet,
  shouldPersistIdentityRatchetNow,
  shouldRejectDecodeIdentityRatchetRecord,
  shouldRejectEncodeIdentityRatchetRecord,
  shouldRejectIdentityRatchetLookupPlanUnusable,
  shouldRejectIdentityRatchetUnusable,
  shouldRestoreIdentityRatchetLookup,
  shouldRestoreIdentityRatchetLookupPlan,
  shouldRestoreIdentityRatchetRecord,
  shouldSkipCommitRestoredIdentityRatchet,
  shouldSkipPersistIdentityRatchet,
  shouldTreatIdentityRatchetRecordUnusable,
  shouldTreatIdentityRatchetRecordUsable,
  shouldUseCachedIdentityRatchet,
  shouldUseCachedIdentityRatchetLookupPlan,
  shouldUseDecodeIdentityRatchetRecord,
  shouldUseEncodeIdentityRatchetRecord,
  stepCommitRestoredIdentityRatchetWithActions,
  stepDecodeIdentityRatchetRecordWithActions,
  stepEncodeIdentityRatchetRecordWithActions,
  stepIdentityRatchetLookupPlanWithActions,
  stepIdentityRatchetLookupWithActions,
  stepIdentityRatchetRecordUsableWithActions,
  stepPersistIdentityRatchetWithActions,
} from "../src/identity-ratchet-record.js";
import { utf8Encode } from "../src/utf8.js";

describe("protocol identity ratchet record", () => {
  it("round-trips JSON records", () => {
    const ratchet = new Uint8Array(IDENTITY_RATCHET_BYTES).fill(0xab);
    const encoded = encodeIdentityRatchetRecord({
      ratchet,
      received: 1_700_000_000,
    });
    const decoded = decodeIdentityRatchetRecord(encoded);
    expect([...decoded.ratchet]).toEqual([...ratchet]);
    expect(decoded.received).toBe(1_700_000_000);
  });

  it("emits encode/decode actions from WithActions steps", () => {
    const ratchet = new Uint8Array(IDENTITY_RATCHET_BYTES).fill(0xcd);
    const record = { ratchet, received: 1_700_000_100 };
    const encoded = encodeIdentityRatchetRecord(record);

    const encodeOk = stepEncodeIdentityRatchetRecordWithActions(
      initialEncodeIdentityRatchetRecordState(),
      {
        kind: "identity-ratchet/encode-gate",
        record,
      },
    );
    expect(shouldUseEncodeIdentityRatchetRecord(encodeOk.actions)).toBe(true);
    expect(shouldRejectEncodeIdentityRatchetRecord(encodeOk.actions)).toBe(
      false,
    );
    expect([
      ...encodeIdentityRatchetRecordRawFromActions(encodeOk.actions)!,
    ]).toEqual([...encoded]);

    const decodeOk = stepDecodeIdentityRatchetRecordWithActions(
      initialDecodeIdentityRatchetRecordState(),
      {
        kind: "identity-ratchet/decode-gate",
        bytes: encoded,
      },
    );
    expect(shouldUseDecodeIdentityRatchetRecord(decodeOk.actions)).toBe(true);
    const fields = identityRatchetRecordFromActions(decodeOk.actions)!;
    expect([...fields.ratchet]).toEqual([...ratchet]);
    expect(fields.received).toBe(1_700_000_100);

    const decodeReject = stepDecodeIdentityRatchetRecordWithActions(
      initialDecodeIdentityRatchetRecordState(),
      {
        kind: "identity-ratchet/decode-gate",
        bytes: utf8Encode("not-json"),
      },
    );
    expect(shouldRejectDecodeIdentityRatchetRecord(decodeReject.actions)).toBe(
      true,
    );
    expect(identityRatchetRecordFromActions(decodeReject.actions)).toBeNull();
  });

  it("builds store keys and checks usability", () => {
    expect(identityRatchetStoreKey("deadbeef")).toBe("ratchets/deadbeef");
    const good = {
      ratchet: new Uint8Array(IDENTITY_RATCHET_BYTES).fill(1),
      received: 100,
    };
    expect(isIdentityRatchetRecordUsable(good, 100)).toBe(true);
    expect(
      isIdentityRatchetRecordUsable(
        good,
        100 + IDENTITY_RATCHET_EXPIRY_SECONDS,
      ),
    ).toBe(false);
    expect(
      isIdentityRatchetRecordUsable(
        { ratchet: new Uint8Array(8), received: 100 },
        100,
      ),
    ).toBe(false);

    const usable = stepIdentityRatchetRecordUsableWithActions(
      initialIdentityRatchetRecordUsableState(),
      {
        kind: "identity-ratchet/usable-gate",
        record: good,
        nowSeconds: 100,
      },
    );
    expect(shouldTreatIdentityRatchetRecordUsable(usable.actions)).toBe(true);
    expect(shouldTreatIdentityRatchetRecordUnusable(usable.actions)).toBe(
      false,
    );

    const expired = stepIdentityRatchetRecordUsableWithActions(
      initialIdentityRatchetRecordUsableState(),
      {
        kind: "identity-ratchet/usable-gate",
        record: good,
        nowSeconds: 100 + IDENTITY_RATCHET_EXPIRY_SECONDS,
      },
    );
    expect(shouldTreatIdentityRatchetRecordUsable(expired.actions)).toBe(false);
    expect(shouldTreatIdentityRatchetRecordUnusable(expired.actions)).toBe(
      true,
    );

    const badLength = stepIdentityRatchetRecordUsableWithActions(
      initialIdentityRatchetRecordUsableState(),
      {
        kind: "identity-ratchet/usable-gate",
        record: { ratchet: new Uint8Array(8), received: 100 },
        nowSeconds: 100,
      },
    );
    expect(shouldTreatIdentityRatchetRecordUnusable(badLength.actions)).toBe(
      true,
    );

    const empty = stepIdentityRatchetRecordUsableWithActions(
      initialIdentityRatchetRecordUsableState(),
      {
        kind: "timer/fired",
        timer: { id: "x" },
      },
    );
    expect(shouldTreatIdentityRatchetRecordUsable(empty.actions)).toBe(false);
    expect(shouldTreatIdentityRatchetRecordUnusable(empty.actions)).toBe(false);
  });

  it("plans ratchet lookup across cache and store", () => {
    expect(
      planIdentityRatchetLookup({
        cachedPresent: true,
        storePresent: false,
        storedPresent: false,
        usable: false,
      }),
    ).toBe("use-cache");
    expect(
      planIdentityRatchetLookup({
        cachedPresent: false,
        storePresent: false,
        storedPresent: false,
        usable: false,
      }),
    ).toBe("miss-no-store");
    expect(
      planIdentityRatchetLookup({
        cachedPresent: false,
        storePresent: true,
        storedPresent: false,
        usable: false,
      }),
    ).toBe("miss-store");
    expect(
      planIdentityRatchetLookup({
        cachedPresent: false,
        storePresent: true,
        storedPresent: true,
        usable: false,
      }),
    ).toBe("reject-unusable");
    expect(
      planIdentityRatchetLookup({
        cachedPresent: false,
        storePresent: true,
        storedPresent: true,
        usable: true,
      }),
    ).toBe("restore");
  });

  it("emits ratchet lookup-plan actions from PlanWithActions", () => {
    const cached = stepIdentityRatchetLookupPlanWithActions(
      initialIdentityRatchetLookupPlanState(),
      {
        kind: "identity/ratchet-lookup-plan-gate",
        cachedPresent: true,
        storePresent: false,
        storedPresent: false,
        usable: false,
      },
    );
    expect(shouldUseCachedIdentityRatchetLookupPlan(cached.actions)).toBe(true);
    expect(identityRatchetLookupPlanFromActions(cached.actions)).toBe(
      "use-cache",
    );

    const missNoStore = stepIdentityRatchetLookupPlanWithActions(
      initialIdentityRatchetLookupPlanState(),
      {
        kind: "identity/ratchet-lookup-plan-gate",
        cachedPresent: false,
        storePresent: false,
        storedPresent: false,
        usable: false,
      },
    );
    expect(
      shouldMissIdentityRatchetLookupPlanNoStore(missNoStore.actions),
    ).toBe(true);

    const missStore = stepIdentityRatchetLookupPlanWithActions(
      initialIdentityRatchetLookupPlanState(),
      {
        kind: "identity/ratchet-lookup-plan-gate",
        cachedPresent: false,
        storePresent: true,
        storedPresent: false,
        usable: false,
      },
    );
    expect(shouldMissIdentityRatchetLookupPlanStore(missStore.actions)).toBe(
      true,
    );

    const reject = stepIdentityRatchetLookupPlanWithActions(
      initialIdentityRatchetLookupPlanState(),
      {
        kind: "identity/ratchet-lookup-plan-gate",
        cachedPresent: false,
        storePresent: true,
        storedPresent: true,
        usable: false,
      },
    );
    expect(shouldRejectIdentityRatchetLookupPlanUnusable(reject.actions)).toBe(
      true,
    );

    const restore = stepIdentityRatchetLookupPlanWithActions(
      initialIdentityRatchetLookupPlanState(),
      {
        kind: "identity/ratchet-lookup-plan-gate",
        cachedPresent: false,
        storePresent: true,
        storedPresent: true,
        usable: true,
      },
    );
    expect(shouldRestoreIdentityRatchetLookupPlan(restore.actions)).toBe(true);
    expect(identityRatchetLookupPlanFromActions(restore.actions)).toBe(
      "restore",
    );
  });

  it("emits ratchet lookup actions from stepIdentityRatchetLookupWithActions", () => {
    const cached = stepIdentityRatchetLookupWithActions(
      initialIdentityRatchetLookupState(),
      {
        kind: "identity/ratchet-lookup-gate",
        cachedPresent: true,
        storePresent: false,
        storedPresent: false,
        usable: false,
      },
    );
    expect(cached.actions).toEqual([{ kind: "use-cache" }]);
    expect(shouldUseCachedIdentityRatchet(cached.actions)).toBe(true);

    const missNoStore = stepIdentityRatchetLookupWithActions(
      initialIdentityRatchetLookupState(),
      {
        kind: "identity/ratchet-lookup-gate",
        cachedPresent: false,
        storePresent: false,
        storedPresent: false,
        usable: false,
      },
    );
    expect(missNoStore.actions).toEqual([{ kind: "miss-no-store" }]);
    expect(shouldMissIdentityRatchetNoStore(missNoStore.actions)).toBe(true);

    const missStore = stepIdentityRatchetLookupWithActions(
      initialIdentityRatchetLookupState(),
      {
        kind: "identity/ratchet-lookup-gate",
        cachedPresent: false,
        storePresent: true,
        storedPresent: false,
        usable: false,
      },
    );
    expect(missStore.actions).toEqual([{ kind: "miss-store" }]);
    expect(shouldMissIdentityRatchetStore(missStore.actions)).toBe(true);

    const reject = stepIdentityRatchetLookupWithActions(
      initialIdentityRatchetLookupState(),
      {
        kind: "identity/ratchet-lookup-gate",
        cachedPresent: false,
        storePresent: true,
        storedPresent: true,
        usable: false,
      },
    );
    expect(reject.actions).toEqual([{ kind: "reject-unusable" }]);
    expect(shouldRejectIdentityRatchetUnusable(reject.actions)).toBe(true);

    const restore = stepIdentityRatchetLookupWithActions(
      initialIdentityRatchetLookupState(),
      {
        kind: "identity/ratchet-lookup-gate",
        cachedPresent: false,
        storePresent: true,
        storedPresent: true,
        usable: true,
      },
    );
    expect(restore.actions).toEqual([{ kind: "restore" }]);
    expect(shouldRestoreIdentityRatchetLookup(restore.actions)).toBe(true);

    const commit = stepCommitRestoredIdentityRatchetWithActions(
      initialCommitRestoredIdentityRatchetState(),
      {
        kind: "identity/commit-restored-ratchet-gate",
        planRestore: shouldRestoreIdentityRatchetLookup(restore.actions),
        recordPresent: true,
      },
    );
    expect(commit.actions).toEqual([{ kind: "commit" }]);
    expect(shouldCommitRestoredIdentityRatchetNow(commit.actions)).toBe(true);

    const skipMissing = stepCommitRestoredIdentityRatchetWithActions(
      initialCommitRestoredIdentityRatchetState(),
      {
        kind: "identity/commit-restored-ratchet-gate",
        planRestore: shouldRestoreIdentityRatchetLookup(restore.actions),
        recordPresent: false,
      },
    );
    expect(skipMissing.actions).toEqual([{ kind: "skip" }]);
    expect(shouldSkipCommitRestoredIdentityRatchet(skipMissing.actions)).toBe(
      true,
    );
  });

  it("is deterministic for identical ratchet lookup events", () => {
    const event = {
      kind: "identity/ratchet-lookup-gate" as const,
      cachedPresent: false,
      storePresent: true,
      storedPresent: true,
      usable: true,
    };
    const a = stepIdentityRatchetLookupWithActions(
      initialIdentityRatchetLookupState(),
      event,
    );
    const b = stepIdentityRatchetLookupWithActions(
      initialIdentityRatchetLookupState(),
      event,
    );
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });

  it("gates ratchet store persistence", () => {
    expect(shouldPersistIdentityRatchet(true)).toBe(true);
    expect(shouldPersistIdentityRatchet(false)).toBe(false);
    expect(
      shouldRestoreIdentityRatchetRecord({
        planRestore: true,
        recordPresent: true,
      }),
    ).toBe(true);
    expect(
      shouldRestoreIdentityRatchetRecord({
        planRestore: true,
        recordPresent: false,
      }),
    ).toBe(false);

    const persist = stepPersistIdentityRatchetWithActions(
      initialPersistIdentityRatchetState(),
      {
        kind: "identity/persist-ratchet-gate",
        storePresent: true,
      },
    );
    expect(persist.actions).toEqual([{ kind: "persist" }]);
    expect(shouldPersistIdentityRatchetNow(persist.actions)).toBe(true);

    const skip = stepPersistIdentityRatchetWithActions(
      initialPersistIdentityRatchetState(),
      {
        kind: "identity/persist-ratchet-gate",
        storePresent: false,
      },
    );
    expect(skip.actions).toEqual([{ kind: "skip" }]);
    expect(shouldSkipPersistIdentityRatchet(skip.actions)).toBe(true);

    const commitBoth = stepCommitRestoredIdentityRatchetWithActions(
      initialCommitRestoredIdentityRatchetState(),
      {
        kind: "identity/commit-restored-ratchet-gate",
        planRestore: true,
        recordPresent: true,
      },
    );
    expect(shouldCommitRestoredIdentityRatchetNow(commitBoth.actions)).toBe(
      true,
    );
    const skipPlan = stepCommitRestoredIdentityRatchetWithActions(
      initialCommitRestoredIdentityRatchetState(),
      {
        kind: "identity/commit-restored-ratchet-gate",
        planRestore: false,
        recordPresent: true,
      },
    );
    expect(shouldSkipCommitRestoredIdentityRatchet(skipPlan.actions)).toBe(
      true,
    );
  });
});
