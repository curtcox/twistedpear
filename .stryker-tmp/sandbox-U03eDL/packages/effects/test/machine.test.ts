// @ts-nocheck
import type { Event, Intent } from "../src/types.js";
import { enumerateCells, interpret, type EventClass, type Machine } from "../src/machine.js";
import { doubleRunHashes, SimKernel } from "../src/adapters/sim/kernel.js";
import { describe, expect, it } from "vitest";

interface ToggleState {
  readonly control: "off" | "on";
  readonly entropy: readonly number[];
}

const start: EventClass<Event> = { name: "start", matches: (event) => event.kind === "start" };
const entropy: EventClass<Event> = {
  name: "entropy",
  matches: (event) => event.kind === "entropy"
};

const toggle: Machine<ToggleState> = {
  states: ["off", "on"],
  events: [start, entropy],
  initial: "off",
  stateOf: (state) => state.control,
  withState: (state, control) => ({ ...state, control: control as ToggleState["control"] }),
  table: [
    {
      from: "off",
      on: start,
      to: "on",
      emit: (): Intent[] => [{ kind: "need_entropy", nbytes: 4 }]
    },
    {
      from: "on",
      on: entropy,
      to: "off",
      reduce: (state, event) => ({
        ...state,
        entropy: event.kind === "entropy" ? [...event.bytes] : state.entropy
      })
    }
  ]
};

describe("transition-table machine", () => {
  it("runs under the kernel with entropy on the tape", () => {
    const config = {
      seed: 123,
      nodes: [{
        id: "toggle",
        initial: { control: "off" as const, entropy: [] },
        step: interpret(toggle)
      }]
    };
    const kernel = new SimKernel(config);
    kernel.start();
    expect(kernel.getNodeState("toggle").control).toBe("off");
    expect(kernel.getNodeState("toggle").entropy).toHaveLength(4);
    expect(doubleRunHashes(config).a).toBe(doubleRunHashes(config).b);
  });

  it("enumerates every control-state/event-class cell", () => {
    const cells = enumerateCells(toggle);
    expect(cells.map((cell) => `${cell.state}:${cell.eventClass}`)).toEqual([
      "off:start",
      "off:entropy",
      "on:start",
      "on:entropy"
    ]);
    expect(cells.filter((cell) => cell.rows.length > 0)).toHaveLength(2);
  });
});
