import type { Event } from "../src/types.js";
import {
  UndeclaredGateActionError,
  decideGate,
  defineBooleanGate,
  defineGate,
  defineOptionGate,
  enumerateGateCells,
  gateConcluded,
  gateConclusion,
  gatePayload,
  initialGateState,
  interpretGate,
  type GateEvent,
} from "../src/gate.js";
import { describe, expect, it } from "vitest";

type FilterInput = {
  readonly foreignTransport: boolean;
  readonly alreadySeen: boolean;
};

type FilterGateEvent = GateEvent<"test/filter-gate", FilterInput>;
type FilterAction = { readonly kind: "accept" | "reject" };

const filterGate = defineBooleanGate<FilterGateEvent, "accept", "reject">({
  event: "test/filter-gate",
  whenTrue: "accept",
  whenFalse: "reject",
  decide: (event) => !event.foreignTransport && !event.alreadySeen,
});

const stepFilter = interpretGate(filterGate);
const filterAccepted = gateConcluded<FilterAction>("accept");
const filterConclusion = gateConclusion<FilterAction>("accept", "reject");

type TargetInput = {
  readonly sameInterface: boolean;
  readonly hopsMatch: boolean;
};
type TargetGateEvent = GateEvent<"test/target-gate", TargetInput>;

const targetGate = defineOptionGate<
  TargetGateEvent,
  "outbound" | "received",
  "ignore"
>({
  event: "test/target-gate",
  kinds: ["outbound", "received"],
  none: "ignore",
  decide: (event) => {
    if (!event.hopsMatch) {
      return null;
    }
    return event.sameInterface ? "outbound" : "received";
  },
});

type IndexGateEvent = GateEvent<"test/index-gate", { readonly index: number }>;
type IndexAction =
  | { readonly kind: "use-index"; readonly index: number }
  | { readonly kind: "miss" };

const indexGate = defineGate<IndexGateEvent, IndexAction>({
  event: "test/index-gate",
  actions: ["use-index", "miss"],
  decide: (event) =>
    event.index < 0
      ? [{ kind: "miss" }]
      : [{ kind: "use-index", index: event.index }],
});

describe("stateless decision gates", () => {
  it("concludes with a declared action and leaves state uninhabited", () => {
    const result = stepFilter(initialGateState(), {
      kind: "test/filter-gate",
      foreignTransport: false,
      alreadySeen: false,
    });
    expect(result.state).toEqual({});
    expect(result.intents).toEqual([]);
    expect(result.actions).toEqual([{ kind: "accept" }]);
    expect(filterAccepted(result.actions)).toBe(true);
    expect(filterConclusion(result.actions)).toBe("accept");
  });

  it("ignores events outside its own kind", () => {
    const state = initialGateState();
    const result = stepFilter(state, { kind: "start" } as Event);
    expect(result.state).toBe(state);
    expect(result.actions).toEqual([]);
    expect(filterConclusion(result.actions)).toBeNull();
  });

  it("makes abstention explicit for option gates", () => {
    const step = interpretGate(targetGate);
    const matched = step(initialGateState(), {
      kind: "test/target-gate",
      sameInterface: false,
      hopsMatch: true,
    });
    expect(matched.actions).toEqual([{ kind: "received" }]);

    const abstained = step(initialGateState(), {
      kind: "test/target-gate",
      sameInterface: true,
      hopsMatch: false,
    });
    expect(abstained.actions).toEqual([{ kind: "ignore" }]);
    // `ignore` is a conclusion, but not a target: readers restricted to the
    // real targets report null.
    expect(
      gateConclusion<
        { readonly kind: "outbound" | "received" | "ignore" },
        "outbound" | "received"
      >(
        "outbound",
        "received",
      )(abstained.actions),
    ).toBeNull();
  });

  it("carries action payloads through readers", () => {
    const step = interpretGate(indexGate);
    const hit = step(initialGateState(), { kind: "test/index-gate", index: 3 });
    const miss = step(initialGateState(), {
      kind: "test/index-gate",
      index: -1,
    });
    const indexOf = gatePayload<IndexAction, "use-index", "index">(
      "use-index",
      "index",
    );
    expect(indexOf(hit.actions)).toBe(3);
    expect(indexOf(miss.actions)).toBeNull();
    expect(gateConcluded<IndexAction>("miss")(miss.actions)).toBe(true);
  });

  it("runs nested gates without restating the step envelope", () => {
    const actions = decideGate(filterGate, {
      kind: "test/filter-gate",
      foreignTransport: true,
      alreadySeen: false,
    });
    expect(actions).toEqual([{ kind: "reject" }]);
  });

  it("rejects conclusions outside the declared alphabet", () => {
    const rogue = {
      event: "test/rogue-gate" as const,
      actions: ["allow"] as const,
      decide: () => [{ kind: "deny" }],
    };
    expect(() => decideGate(rogue, { kind: "test/rogue-gate" })).toThrow(
      UndeclaredGateActionError,
    );
  });

  it("rejects malformed alphabets at construction", () => {
    expect(() =>
      defineGate({ event: "test/empty", actions: [], decide: () => [] }),
    ).toThrow(/declares no actions/);
    expect(() =>
      defineGate<
        GateEvent<"test/dupe", Record<string, never>>,
        { readonly kind: "allow" }
      >({
        event: "test/dupe",
        actions: ["allow", "allow"],
        decide: () => [{ kind: "allow" }],
      }),
    ).toThrow(/duplicate action/);
  });

  it("enumerates the gate coverage frame", () => {
    expect(enumerateGateCells(filterGate)).toEqual([
      { event: "test/filter-gate", actionKind: "accept" },
      { event: "test/filter-gate", actionKind: "reject" },
    ]);
    expect(
      enumerateGateCells(targetGate).map((cell) => cell.actionKind),
    ).toEqual(["outbound", "received", "ignore"]);
  });
});
