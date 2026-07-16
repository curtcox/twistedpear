import { describe, expect, it } from "vitest";
import { escrowMachine, grantMachine, recoveryQuorumMachine } from "../src/index.js";
import { checkMachineConformance } from "../../../formal/check-machine-conformance.mjs";

const machines = [
  ["grant", grantMachine], ["escrow", escrowMachine], ["recovery", recoveryQuorumMachine]
] as const;

describe("formal twin conformance honesty", () => {
  for (const [name, machine] of machines) {
    it(`${name} accepts the real table and rejects added or removed edges`, async () => {
      await expect(checkMachineConformance(name, machine)).resolves.toMatchObject({ name });
      const removed = { ...machine, table: machine.table.slice(1) };
      await expect(checkMachineConformance(name, removed)).rejects.toThrow("executable table");
      const added = { ...machine, table: [...machine.table, { from: machine.states[0]!, on: machine.events[0]!, to: machine.states.at(-1)! }] };
      await expect(checkMachineConformance(name, added)).rejects.toThrow("executable table");
    });
  }
});
