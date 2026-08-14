import { describe, expect, it } from "vitest";
import {
  PROPAGATION_DESTINATION_HASH_SIZE,
  initialApplyPropagationRestoreState,
  initialApplyPropagationStoreCommitState,
  initialCommitPropagationStoreEntryState,
  initialDeletePropagationCatalogEntryState,
  initialEvictOldestPropagationEntryState,
  initialEvictPropagationCatalogEntryState,
  initialPropagationMessageTooLargeState,
  initialPropagationRestorePlanState,
  initialPropagationRestoreState,
  initialPropagationStorePlanState,
  initialPropagationStoreState,
  initialSelectOldestPropagationKeyState,
  isPropagationMessageTooLarge,
  oldestPropagationKeyFromActions,
  planPropagationRestore,
  planPropagationStore,
  propagationDestinationHash,
  propagationEntryVisibleToRecipient,
  propagationRestorePlanFromActions,
  propagationStoreAcceptEvictKeys,
  propagationStorePlanEvictKeys,
  propagationStorePlanFromActions,
  selectOldestPropagationKey,
  shouldAcceptPropagationRestore,
  shouldAcceptPropagationRestorePlan,
  shouldAcceptPropagationStore,
  shouldAcceptPropagationStorePlan,
  shouldApplyPropagationRestore,
  shouldApplyPropagationRestoreNow,
  shouldApplyPropagationStoreCommit,
  shouldApplyPropagationStoreCommitNow,
  shouldCommitPropagationStoreEntry,
  shouldCommitPropagationStoreEntryNow,
  shouldDeletePropagationCatalogEntry,
  shouldDeletePropagationCatalogEntryNow,
  shouldDuplicatePropagationStore,
  shouldDuplicatePropagationStorePlan,
  shouldEvictOldestPropagationEntry,
  shouldEvictOldestPropagationEntryNow,
  shouldEvictPropagationCatalogEntry,
  shouldEvictPropagationCatalogEntryNow,
  shouldMissOldestPropagationKey,
  shouldRejectCapacityPropagationStorePlan,
  shouldRejectPropagationStore,
  shouldRejectPropagationStorePlan,
  shouldRejectTooLargePropagationStorePlan,
  shouldSkipApplyPropagationRestore,
  shouldSkipApplyPropagationStoreCommit,
  shouldSkipCommitPropagationStoreEntry,
  shouldSkipDeletePropagationCatalogEntry,
  shouldSkipEvictOldestPropagationEntry,
  shouldSkipEvictPropagationCatalogEntry,
  shouldTreatPropagationMessageFit,
  shouldTreatPropagationMessageTooLarge,
  shouldUseOldestPropagationKey,
  stepApplyPropagationRestoreWithActions,
  stepApplyPropagationStoreCommitWithActions,
  stepCommitPropagationStoreEntryWithActions,
  stepDeletePropagationCatalogEntryWithActions,
  stepEvictOldestPropagationEntryWithActions,
  stepEvictPropagationCatalogEntryWithActions,
  stepPropagationMessageTooLargeWithActions,
  stepPropagationRestorePlanWithActions,
  stepPropagationRestoreWithActions,
  stepPropagationStorePlanWithActions,
  stepPropagationStoreWithActions,
  stepSelectOldestPropagationKeyWithActions,
  type PropagationQuotas,
} from "../src/propagation-quota.js";

const quotas: PropagationQuotas = {
  maxBytes: 100,
  maxMessages: 2,
  maxMessageBytes: 50,
};

describe("protocol propagation quota", () => {
  it("rejects oversized messages", () => {
    expect(isPropagationMessageTooLarge(51, quotas)).toBe(true);
    expect(
      planPropagationStore({
        quotas,
        messageBytes: 51,
        alreadyStored: false,
        usedBytes: 0,
        entries: [],
      }).kind,
    ).toBe("reject-too-large");
  });

  it("short-circuits duplicates", () => {
    expect(
      planPropagationStore({
        quotas,
        messageBytes: 10,
        alreadyStored: true,
        usedBytes: 10,
        entries: [{ key: "a", size: 10, storedAt: 1 }],
      }).kind,
    ).toBe("duplicate");
  });

  it("plans oldest-first eviction to free capacity", () => {
    const plan = planPropagationStore({
      quotas,
      messageBytes: 40,
      alreadyStored: false,
      usedBytes: 80,
      entries: [
        { key: "old", size: 40, storedAt: 1 },
        { key: "new", size: 40, storedAt: 2 },
      ],
    });
    expect(plan).toEqual({ kind: "accept", evictKeys: ["old"] });
  });

  it("rejects when eviction cannot free enough space", () => {
    const plan = planPropagationStore({
      quotas: { maxBytes: 30, maxMessages: 10, maxMessageBytes: 50 },
      messageBytes: 40,
      alreadyStored: false,
      usedBytes: 0,
      entries: [],
    });
    expect(plan.kind).toBe("reject-capacity");
  });

  it("emits store-plan actions only from propagation/store-plan-gate", () => {
    const tooLarge = stepPropagationStorePlanWithActions(
      initialPropagationStorePlanState(),
      {
        kind: "propagation/store-plan-gate",
        quotas,
        messageBytes: 51,
        alreadyStored: false,
        usedBytes: 0,
        entries: [],
      },
    );
    expect(shouldRejectTooLargePropagationStorePlan(tooLarge.actions)).toBe(
      true,
    );
    expect(shouldRejectPropagationStorePlan(tooLarge.actions)).toBe(true);
    expect(propagationStorePlanFromActions(tooLarge.actions)).toEqual({
      kind: "reject-too-large",
    });

    const duplicate = stepPropagationStorePlanWithActions(
      initialPropagationStorePlanState(),
      {
        kind: "propagation/store-plan-gate",
        quotas,
        messageBytes: 10,
        alreadyStored: true,
        usedBytes: 10,
        entries: [{ key: "a", size: 10, storedAt: 1 }],
      },
    );
    expect(shouldDuplicatePropagationStorePlan(duplicate.actions)).toBe(true);
    expect(propagationStorePlanFromActions(duplicate.actions)).toEqual({
      kind: "duplicate",
    });

    const accepted = stepPropagationStorePlanWithActions(
      initialPropagationStorePlanState(),
      {
        kind: "propagation/store-plan-gate",
        quotas,
        messageBytes: 40,
        alreadyStored: false,
        usedBytes: 80,
        entries: [
          { key: "old", size: 40, storedAt: 1 },
          { key: "new", size: 40, storedAt: 2 },
        ],
      },
    );
    expect(shouldAcceptPropagationStorePlan(accepted.actions)).toBe(true);
    expect(propagationStorePlanEvictKeys(accepted.actions)).toEqual(["old"]);
    expect(propagationStorePlanFromActions(accepted.actions)).toEqual({
      kind: "accept",
      evictKeys: ["old"],
    });

    const capacity = stepPropagationStorePlanWithActions(
      initialPropagationStorePlanState(),
      {
        kind: "propagation/store-plan-gate",
        quotas: { maxBytes: 30, maxMessages: 10, maxMessageBytes: 50 },
        messageBytes: 40,
        alreadyStored: false,
        usedBytes: 0,
        entries: [],
      },
    );
    expect(shouldRejectCapacityPropagationStorePlan(capacity.actions)).toBe(
      true,
    );
    expect(shouldRejectPropagationStorePlan(capacity.actions)).toBe(true);
  });

  it("selects oldest key and destination hash prefix", () => {
    expect(
      selectOldestPropagationKey([
        { key: "b", size: 1, storedAt: 5 },
        { key: "a", size: 1, storedAt: 1 },
      ]),
    ).toBe("a");
    const data = new Uint8Array(20).map((_, i) => i);
    expect(propagationDestinationHash(data)).toHaveLength(
      PROPAGATION_DESTINATION_HASH_SIZE,
    );
    expect(propagationDestinationHash(new Uint8Array(8))).toBeNull();
    const dest = data.subarray(0, 16);
    expect(propagationEntryVisibleToRecipient(dest, null)).toBe(true);
    expect(propagationEntryVisibleToRecipient(dest, dest)).toBe(true);
    expect(propagationEntryVisibleToRecipient(dest, new Uint8Array(16))).toBe(
      false,
    );
  });
});

describe("protocol propagation quota (continued)", () => {
  it("emits message-too-large / fit and oldest-key use/miss only from machine actions", () => {
    const tooLarge = stepPropagationMessageTooLargeWithActions(
      initialPropagationMessageTooLargeState(),
      {
        kind: "propagation/message-too-large-gate",
        messageBytes: 51,
        quotas,
      },
    );
    expect(shouldTreatPropagationMessageTooLarge(tooLarge.actions)).toBe(true);
    expect(shouldTreatPropagationMessageFit(tooLarge.actions)).toBe(false);

    const fit = stepPropagationMessageTooLargeWithActions(
      initialPropagationMessageTooLargeState(),
      {
        kind: "propagation/message-too-large-gate",
        messageBytes: 50,
        quotas,
      },
    );
    expect(shouldTreatPropagationMessageFit(fit.actions)).toBe(true);
    expect(shouldTreatPropagationMessageTooLarge(fit.actions)).toBe(false);

    const selected = stepSelectOldestPropagationKeyWithActions(
      initialSelectOldestPropagationKeyState(),
      {
        kind: "propagation/select-oldest-key-gate",
        entries: [
          { key: "b", size: 1, storedAt: 5 },
          { key: "a", size: 1, storedAt: 1 },
        ],
      },
    );
    expect(shouldUseOldestPropagationKey(selected.actions)).toBe(true);
    expect(shouldMissOldestPropagationKey(selected.actions)).toBe(false);
    expect(oldestPropagationKeyFromActions(selected.actions)).toBe("a");

    const miss = stepSelectOldestPropagationKeyWithActions(
      initialSelectOldestPropagationKeyState(),
      { kind: "propagation/select-oldest-key-gate", entries: [] },
    );
    expect(shouldMissOldestPropagationKey(miss.actions)).toBe(true);
    expect(shouldUseOldestPropagationKey(miss.actions)).toBe(false);
    expect(oldestPropagationKeyFromActions(miss.actions)).toBeNull();
  });
});

describe("protocol propagation quota (continued)", () => {
  it("plans propagation restore gates", () => {
    expect(
      planPropagationRestore({
        tooLarge: true,
        alreadyStored: false,
        destinationHashPresent: true,
      }),
    ).toBe("reject-too-large");
    expect(
      planPropagationRestore({
        tooLarge: false,
        alreadyStored: true,
        destinationHashPresent: true,
      }),
    ).toBe("duplicate");
    expect(
      planPropagationRestore({
        tooLarge: false,
        alreadyStored: false,
        destinationHashPresent: false,
      }),
    ).toBe("reject-hash");
    expect(
      planPropagationRestore({
        tooLarge: false,
        alreadyStored: false,
        destinationHashPresent: true,
      }),
    ).toBe("accept");
    expect(
      shouldApplyPropagationRestore({
        planAccept: true,
        destinationHashPresent: true,
      }),
    ).toBe(true);
    expect(
      shouldApplyPropagationRestore({
        planAccept: true,
        destinationHashPresent: false,
      }),
    ).toBe(false);
    expect(
      shouldApplyPropagationRestore({
        planAccept: false,
        destinationHashPresent: true,
      }),
    ).toBe(false);
    expect(shouldCommitPropagationStoreEntry(true)).toBe(true);
    expect(shouldCommitPropagationStoreEntry(false)).toBe(false);
    expect(
      shouldApplyPropagationStoreCommit({
        planAccept: true,
        destinationHashPresent: true,
      }),
    ).toBe(true);
    expect(
      shouldApplyPropagationStoreCommit({
        planAccept: true,
        destinationHashPresent: false,
      }),
    ).toBe(false);
    expect(
      shouldApplyPropagationStoreCommit({
        planAccept: false,
        destinationHashPresent: true,
      }),
    ).toBe(false);

    const restoreApply = stepApplyPropagationRestoreWithActions(
      initialApplyPropagationRestoreState(),
      {
        kind: "propagation/apply-restore-gate",
        planAccept: true,
        destinationHashPresent: true,
      },
    );
    expect(shouldApplyPropagationRestoreNow(restoreApply.actions)).toBe(true);
    expect(shouldSkipApplyPropagationRestore(restoreApply.actions)).toBe(false);
    const restoreSkip = stepApplyPropagationRestoreWithActions(
      initialApplyPropagationRestoreState(),
      {
        kind: "propagation/apply-restore-gate",
        planAccept: true,
        destinationHashPresent: false,
      },
    );
    expect(shouldSkipApplyPropagationRestore(restoreSkip.actions)).toBe(true);
    expect(shouldApplyPropagationRestoreNow(restoreSkip.actions)).toBe(false);

    const commitOk = stepCommitPropagationStoreEntryWithActions(
      initialCommitPropagationStoreEntryState(),
      {
        kind: "propagation/commit-store-entry-gate",
        destinationHashPresent: true,
      },
    );
    expect(shouldCommitPropagationStoreEntryNow(commitOk.actions)).toBe(true);
    expect(shouldSkipCommitPropagationStoreEntry(commitOk.actions)).toBe(false);
    const commitSkip = stepCommitPropagationStoreEntryWithActions(
      initialCommitPropagationStoreEntryState(),
      {
        kind: "propagation/commit-store-entry-gate",
        destinationHashPresent: false,
      },
    );
    expect(shouldSkipCommitPropagationStoreEntry(commitSkip.actions)).toBe(
      true,
    );
    expect(shouldCommitPropagationStoreEntryNow(commitSkip.actions)).toBe(
      false,
    );
  });
});

describe("protocol propagation quota (continued)", () => {
  it("applies propagation store commits and related gates", () => {
    const storeApply = stepApplyPropagationStoreCommitWithActions(
      initialApplyPropagationStoreCommitState(),
      {
        kind: "propagation/apply-store-commit-gate",
        planAccept: true,
        destinationHashPresent: true,
      },
    );
    expect(shouldApplyPropagationStoreCommitNow(storeApply.actions)).toBe(true);
    expect(shouldSkipApplyPropagationStoreCommit(storeApply.actions)).toBe(
      false,
    );
    const storeSkip = stepApplyPropagationStoreCommitWithActions(
      initialApplyPropagationStoreCommitState(),
      {
        kind: "propagation/apply-store-commit-gate",
        planAccept: false,
        destinationHashPresent: true,
      },
    );
    expect(shouldSkipApplyPropagationStoreCommit(storeSkip.actions)).toBe(true);
    expect(shouldApplyPropagationStoreCommitNow(storeSkip.actions)).toBe(false);

    expect(shouldDeletePropagationCatalogEntry(true)).toBe(true);
    expect(shouldDeletePropagationCatalogEntry(false)).toBe(false);
    expect(shouldEvictPropagationCatalogEntry(true)).toBe(true);
    expect(shouldEvictPropagationCatalogEntry(false)).toBe(false);
    expect(
      shouldEvictOldestPropagationEntry({
        oldestKeyPresent: true,
        entryPresent: true,
      }),
    ).toBe(true);
    expect(
      shouldEvictOldestPropagationEntry({
        oldestKeyPresent: true,
        entryPresent: false,
      }),
    ).toBe(false);
    expect(
      shouldEvictOldestPropagationEntry({
        oldestKeyPresent: false,
        entryPresent: true,
      }),
    ).toBe(false);

    const deleteOk = stepDeletePropagationCatalogEntryWithActions(
      initialDeletePropagationCatalogEntryState(),
      { kind: "propagation/delete-catalog-entry-gate", entryPresent: true },
    );
    expect(shouldDeletePropagationCatalogEntryNow(deleteOk.actions)).toBe(true);
    expect(shouldSkipDeletePropagationCatalogEntry(deleteOk.actions)).toBe(
      false,
    );
    const deleteSkip = stepDeletePropagationCatalogEntryWithActions(
      initialDeletePropagationCatalogEntryState(),
      { kind: "propagation/delete-catalog-entry-gate", entryPresent: false },
    );
    expect(shouldSkipDeletePropagationCatalogEntry(deleteSkip.actions)).toBe(
      true,
    );

    const evictOk = stepEvictPropagationCatalogEntryWithActions(
      initialEvictPropagationCatalogEntryState(),
      { kind: "propagation/evict-catalog-entry-gate", entryPresent: true },
    );
    expect(shouldEvictPropagationCatalogEntryNow(evictOk.actions)).toBe(true);
    expect(shouldSkipEvictPropagationCatalogEntry(evictOk.actions)).toBe(false);
    const evictSkip = stepEvictPropagationCatalogEntryWithActions(
      initialEvictPropagationCatalogEntryState(),
      { kind: "propagation/evict-catalog-entry-gate", entryPresent: false },
    );
    expect(shouldSkipEvictPropagationCatalogEntry(evictSkip.actions)).toBe(
      true,
    );

    const oldestOk = stepEvictOldestPropagationEntryWithActions(
      initialEvictOldestPropagationEntryState(),
      {
        kind: "propagation/evict-oldest-entry-gate",
        oldestKeyPresent: true,
        entryPresent: true,
      },
    );
    expect(shouldEvictOldestPropagationEntryNow(oldestOk.actions)).toBe(true);
    expect(shouldSkipEvictOldestPropagationEntry(oldestOk.actions)).toBe(false);
    const oldestSkip = stepEvictOldestPropagationEntryWithActions(
      initialEvictOldestPropagationEntryState(),
      {
        kind: "propagation/evict-oldest-entry-gate",
        oldestKeyPresent: true,
        entryPresent: false,
      },
    );
    expect(shouldSkipEvictOldestPropagationEntry(oldestSkip.actions)).toBe(
      true,
    );
  });
});

describe("protocol propagation quota (continued)", () => {
  it("emits restore reject / duplicate / reject-hash / accept actions from restore-gate", () => {
    const tooLargePlan = stepPropagationRestorePlanWithActions(
      initialPropagationRestorePlanState(),
      {
        kind: "propagation/restore-plan-gate",
        tooLarge: true,
        alreadyStored: false,
        destinationHashPresent: true,
      },
    );
    expect(propagationRestorePlanFromActions(tooLargePlan.actions)).toBe(
      "reject-too-large",
    );
    expect(shouldAcceptPropagationRestorePlan(tooLargePlan.actions)).toBe(
      false,
    );

    const tooLarge = stepPropagationRestoreWithActions(
      initialPropagationRestoreState(),
      {
        kind: "propagation/restore-gate",
        tooLarge: true,
        alreadyStored: false,
        destinationHashPresent: true,
      },
    );
    expect(tooLarge.actions).toEqual([{ kind: "reject-too-large" }]);
    expect(shouldAcceptPropagationRestore(tooLarge.actions)).toBe(false);

    const duplicate = stepPropagationRestoreWithActions(
      initialPropagationRestoreState(),
      {
        kind: "propagation/restore-gate",
        tooLarge: false,
        alreadyStored: true,
        destinationHashPresent: true,
      },
    );
    expect(duplicate.actions).toEqual([{ kind: "duplicate" }]);

    const missingHash = stepPropagationRestoreWithActions(
      initialPropagationRestoreState(),
      {
        kind: "propagation/restore-gate",
        tooLarge: false,
        alreadyStored: false,
        destinationHashPresent: false,
      },
    );
    expect(missingHash.actions).toEqual([{ kind: "reject-hash" }]);

    const acceptedPlan = stepPropagationRestorePlanWithActions(
      initialPropagationRestorePlanState(),
      {
        kind: "propagation/restore-plan-gate",
        tooLarge: false,
        alreadyStored: false,
        destinationHashPresent: true,
      },
    );
    expect(shouldAcceptPropagationRestorePlan(acceptedPlan.actions)).toBe(true);

    const accepted = stepPropagationRestoreWithActions(
      initialPropagationRestoreState(),
      {
        kind: "propagation/restore-gate",
        tooLarge: false,
        alreadyStored: false,
        destinationHashPresent: true,
      },
    );
    expect(accepted.actions).toEqual([{ kind: "accept" }]);
    expect(shouldAcceptPropagationRestore(accepted.actions)).toBe(true);
  });

  it("emits reject / duplicate / accept actions from store/received", () => {
    const tooLarge = stepPropagationStoreWithActions(
      initialPropagationStoreState(),
      {
        kind: "store/received",
        quotas,
        messageBytes: 51,
        alreadyStored: false,
        usedBytes: 0,
        entries: [],
        destinationHashPresent: true,
      },
    );
    expect(shouldRejectPropagationStore(tooLarge.actions)).toBe(true);
    expect(shouldAcceptPropagationStore(tooLarge.actions)).toBe(false);

    const duplicate = stepPropagationStoreWithActions(
      initialPropagationStoreState(),
      {
        kind: "store/received",
        quotas,
        messageBytes: 10,
        alreadyStored: true,
        usedBytes: 10,
        entries: [{ key: "a", size: 10, storedAt: 1 }],
        destinationHashPresent: true,
      },
    );
    expect(shouldDuplicatePropagationStore(duplicate.actions)).toBe(true);
    expect(shouldRejectPropagationStore(duplicate.actions)).toBe(false);

    const accepted = stepPropagationStoreWithActions(
      initialPropagationStoreState(),
      {
        kind: "store/received",
        quotas,
        messageBytes: 40,
        alreadyStored: false,
        usedBytes: 80,
        entries: [
          { key: "old", size: 40, storedAt: 1 },
          { key: "new", size: 40, storedAt: 2 },
        ],
        destinationHashPresent: true,
      },
    );
    expect(shouldAcceptPropagationStore(accepted.actions)).toBe(true);
    expect(propagationStoreAcceptEvictKeys(accepted.actions)).toEqual(["old"]);

    const missingHash = stepPropagationStoreWithActions(
      initialPropagationStoreState(),
      {
        kind: "store/received",
        quotas,
        messageBytes: 10,
        alreadyStored: false,
        usedBytes: 0,
        entries: [],
        destinationHashPresent: false,
      },
    );
    expect(shouldRejectPropagationStore(missingHash.actions)).toBe(true);

    const capacity = stepPropagationStoreWithActions(
      initialPropagationStoreState(),
      {
        kind: "store/received",
        quotas: { maxBytes: 30, maxMessages: 10, maxMessageBytes: 50 },
        messageBytes: 40,
        alreadyStored: false,
        usedBytes: 0,
        entries: [],
        destinationHashPresent: true,
      },
    );
    expect(shouldRejectPropagationStore(capacity.actions)).toBe(true);

    expect(
      stepPropagationStoreWithActions(initialPropagationStoreState(), {
        kind: "timer/fired",
        id: "x",
        at: 0,
      }).actions,
    ).toEqual([]);
  });
});

describe("protocol propagation quota (continued)", () => {
  it("is deterministic for store receive events", () => {
    const state = initialPropagationStoreState();
    const event = {
      kind: "store/received" as const,
      quotas,
      messageBytes: 10,
      alreadyStored: false,
      usedBytes: 0,
      entries: [] as const,
      destinationHashPresent: true,
    };
    const a = stepPropagationStoreWithActions(state, event);
    const b = stepPropagationStoreWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });
});
