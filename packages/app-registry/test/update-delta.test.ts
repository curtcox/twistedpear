import { describe, expect, it } from "vitest";
import {
  capabilityUpdateDelta,
  grantsPreservedAcrossUpdate,
} from "../src/update-delta.js";

/** Risk classes from the generated registry — HA-11 names the delta's risk. */
const RISK: Readonly<Record<string, string>> = {
  "storage:kv": "benign",
  identity: "elevated",
  "lxmf:send": "sensitive",
  "relay:configure": "critical",
};

function riskClassFor(id: string): string {
  const riskClass = RISK[id];
  if (riskClass === undefined) {
    throw new Error(`untested capability ${id}`);
  }
  return riskClass;
}

describe("capability update delta", () => {
  it("names added capabilities and their risk, and does not auto-activate them", () => {
    const delta = capabilityUpdateDelta(
      ["storage:kv"],
      ["storage:kv", "lxmf:send"],
      riskClassFor,
    );
    expect(delta.retained).toEqual(["storage:kv"]);
    expect(delta.removed).toEqual([]);
    expect(delta.added).toEqual([{ id: "lxmf:send", riskClass: "sensitive" }]);
    expect(
      grantsPreservedAcrossUpdate(["storage:kv"], ["storage:kv", "lxmf:send"]),
    ).toEqual(["storage:kv"]);
  });

  it("treats a first install as an added set, still without auto-activation", () => {
    const delta = capabilityUpdateDelta(
      [],
      ["identity", "lxmf:send"],
      riskClassFor,
    );
    expect(delta.added).toEqual([
      { id: "identity", riskClass: "elevated" },
      { id: "lxmf:send", riskClass: "sensitive" },
    ]);
    expect(grantsPreservedAcrossUpdate([], ["identity", "lxmf:send"])).toEqual(
      [],
    );
  });

  it("drops grants for capabilities the update no longer declares", () => {
    const delta = capabilityUpdateDelta(
      ["storage:kv", "lxmf:send"],
      ["storage:kv"],
      riskClassFor,
    );
    expect(delta.removed).toEqual([
      { id: "lxmf:send", riskClass: "sensitive" },
    ]);
    expect(
      grantsPreservedAcrossUpdate(["storage:kv", "lxmf:send"], ["storage:kv"]),
    ).toEqual(["storage:kv"]);
  });

  it("names a critical addition rather than silently inheriting the previous grant set", () => {
    const delta = capabilityUpdateDelta(
      ["identity"],
      ["identity", "relay:configure"],
      riskClassFor,
    );
    expect(delta.added).toEqual([
      { id: "relay:configure", riskClass: "critical" },
    ]);
    expect(
      grantsPreservedAcrossUpdate(
        ["identity"],
        ["identity", "relay:configure"],
      ),
    ).toEqual(["identity"]);
  });
});
