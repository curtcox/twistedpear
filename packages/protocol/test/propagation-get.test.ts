import { describe, expect, it } from "vitest";
import { planPropagationGet, shouldAcceptPropagationGetRequestData } from "../src/propagation-get.js";

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

  it("gates /get request body presence", () => {
    expect(shouldAcceptPropagationGetRequestData(true)).toBe(true);
    expect(shouldAcceptPropagationGetRequestData(false)).toBe(false);
  });
});
