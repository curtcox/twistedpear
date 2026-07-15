import { describe, expect, it } from "vitest";
import {
  initialAcceptPropagationGetRequestDataState,
  initialPropagationGetPlanState,
  initialPropagationGetState,
  planPropagationGet,
  propagationGetApplyIds,
  propagationGetListIds,
  propagationGetPlanApplyIds,
  propagationGetPlanFromActions,
  propagationGetPlanListIds,
  shouldAcceptPropagationGetRequestData,
  shouldAcceptPropagationGetRequestDataNow,
  shouldApplyPropagationGet,
  shouldApplyPropagationGetPlan,
  shouldListPropagationGetIds,
  shouldListPropagationGetPlanIds,
  shouldSkipAcceptPropagationGetRequestData,
  stepAcceptPropagationGetRequestDataWithActions,
  stepPropagationGetPlanWithActions,
  stepPropagationGetWithActions
} from "../src/propagation-get.js";

describe("protocol propagation get planner", () => {
  const alice = new Uint8Array(16).map((_, i) => i + 1);
  const bob = new Uint8Array(16).map((_, i) => i + 50);
  const idA = new Uint8Array(32).map((_, i) => i);
  const idB = new Uint8Array(32).map((_, i) => 100 + i);
  const idC = new Uint8Array(32).map((_, i) => 200 + i);

  const entries = [
    { transientId: idA, destinationHash: alice },
    { transientId: idB, destinationHash: bob },
    { transientId: idC, destinationHash: alice }
  ];

  it("lists ids visible to the recipient", () => {
    const plan = planPropagationGet({
      wants: null,
      haves: null,
      remoteDeliveryHash: alice,
      entries
    });
    expect(plan.kind).toBe("list-ids");
    if (plan.kind === "list-ids") {
      expect(plan.transientIds).toHaveLength(2);
      expect([...plan.transientIds[0]!]).toEqual([...idA]);
      expect([...plan.transientIds[1]!]).toEqual([...idC]);
    }
  });

  it("lists all ids when recipient is anonymous", () => {
    const plan = planPropagationGet({
      wants: null,
      haves: null,
      remoteDeliveryHash: null,
      entries
    });
    expect(plan.kind).toBe("list-ids");
    if (plan.kind === "list-ids") {
      expect(plan.transientIds).toHaveLength(3);
    }
  });

  it("plans deletes and ordered visible fetches", () => {
    const plan = planPropagationGet({
      wants: [idB, idA, new Uint8Array(32)],
      haves: [idC],
      remoteDeliveryHash: alice,
      entries
    });
    expect(plan).toEqual({
      kind: "apply",
      deleteIds: [idC],
      fetchIds: [idA]
    });
  });

  it("returns empty fetch after deletes when wants empty", () => {
    const plan = planPropagationGet({
      wants: [],
      haves: [idA],
      remoteDeliveryHash: null,
      entries
    });
    expect(plan).toEqual({ kind: "apply", deleteIds: [idA], fetchIds: [] });
  });

  it("emits get-plan actions only from propagation/get-plan-gate", () => {
    const listed = stepPropagationGetPlanWithActions(initialPropagationGetPlanState(), {
      kind: "propagation/get-plan-gate",
      wants: null,
      haves: null,
      remoteDeliveryHash: alice,
      entries
    });
    expect(shouldListPropagationGetPlanIds(listed.actions)).toBe(true);
    expect(shouldApplyPropagationGetPlan(listed.actions)).toBe(false);
    const ids = propagationGetPlanListIds(listed.actions);
    expect(ids).toHaveLength(2);
    expect([...ids![0]!]).toEqual([...idA]);
    expect([...ids![1]!]).toEqual([...idC]);
    expect(propagationGetPlanFromActions(listed.actions)).toEqual({
      kind: "list-ids",
      transientIds: [idA, idC]
    });

    const applied = stepPropagationGetPlanWithActions(initialPropagationGetPlanState(), {
      kind: "propagation/get-plan-gate",
      wants: [idB, idA, new Uint8Array(32)],
      haves: [idC],
      remoteDeliveryHash: alice,
      entries
    });
    expect(shouldApplyPropagationGetPlan(applied.actions)).toBe(true);
    expect(shouldListPropagationGetPlanIds(applied.actions)).toBe(false);
    expect(propagationGetPlanApplyIds(applied.actions)).toEqual({
      deleteIds: [idC],
      fetchIds: [idA]
    });
    expect(propagationGetPlanFromActions(applied.actions)).toEqual({
      kind: "apply",
      deleteIds: [idC],
      fetchIds: [idA]
    });

    expect(
      stepPropagationGetPlanWithActions(initialPropagationGetPlanState(), {
        kind: "timer/fired",
        id: "x",
        at: 0
      }).actions
    ).toEqual([]);
  });

  it("gates /get request body presence", () => {
    expect(shouldAcceptPropagationGetRequestData(true)).toBe(true);
    expect(shouldAcceptPropagationGetRequestData(false)).toBe(false);

    const accept = stepAcceptPropagationGetRequestDataWithActions(
      initialAcceptPropagationGetRequestDataState(),
      { kind: "propagation/accept-get-request-data-gate", dataPresent: true }
    );
    expect(shouldAcceptPropagationGetRequestDataNow(accept.actions)).toBe(true);
    expect(shouldSkipAcceptPropagationGetRequestData(accept.actions)).toBe(false);

    const skip = stepAcceptPropagationGetRequestDataWithActions(
      initialAcceptPropagationGetRequestDataState(),
      { kind: "propagation/accept-get-request-data-gate", dataPresent: false }
    );
    expect(shouldSkipAcceptPropagationGetRequestData(skip.actions)).toBe(true);
    expect(shouldAcceptPropagationGetRequestDataNow(skip.actions)).toBe(false);
  });

  it("emits list-ids / apply actions from get/received", () => {
    const listed = stepPropagationGetWithActions(initialPropagationGetState(), {
      kind: "get/received",
      wants: null,
      haves: null,
      remoteDeliveryHash: alice,
      entries
    });
    expect(shouldListPropagationGetIds(listed.actions)).toBe(true);
    expect(shouldApplyPropagationGet(listed.actions)).toBe(false);
    const ids = propagationGetListIds(listed.actions);
    expect(ids).toHaveLength(2);
    expect([...ids![0]!]).toEqual([...idA]);
    expect([...ids![1]!]).toEqual([...idC]);

    const applied = stepPropagationGetWithActions(initialPropagationGetState(), {
      kind: "get/received",
      wants: [idB, idA, new Uint8Array(32)],
      haves: [idC],
      remoteDeliveryHash: alice,
      entries
    });
    expect(shouldApplyPropagationGet(applied.actions)).toBe(true);
    expect(shouldListPropagationGetIds(applied.actions)).toBe(false);
    expect(propagationGetApplyIds(applied.actions)).toEqual({
      deleteIds: [idC],
      fetchIds: [idA]
    });

    expect(
      stepPropagationGetWithActions(initialPropagationGetState(), {
        kind: "timer/fired",
        id: "x",
        at: 0
      }).actions
    ).toEqual([]);
  });

  it("is deterministic for get receive events", () => {
    const state = initialPropagationGetState();
    const event = {
      kind: "get/received" as const,
      wants: null,
      haves: null,
      remoteDeliveryHash: alice,
      entries
    };
    const a = stepPropagationGetWithActions(state, event);
    const b = stepPropagationGetWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });
});
