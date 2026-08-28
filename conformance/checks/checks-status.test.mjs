import { describe, expect, it } from "vitest";
import { runAndRecord } from "../../scripts/checks/run-and-record.mjs";

function scriptedSpawn(statuses, calls) {
  return (command, args) => {
    calls.push([command, ...args]);
    return { status: statuses.shift() };
  };
}

describe("checks:status orchestration", () => {
  it("records status but preserves a failed gate-run exit code", () => {
    const calls = [];
    const status = runAndRecord({
      spawn: scriptedSpawn([7, 0], calls),
      node: "node",
      args: ["--only=format"],
    });

    expect(status).toBe(7);
    expect(calls).toEqual([
      ["node", "scripts/checks/run.mjs", "--tier=pr", "--only=format"],
      ["node", "scripts/checks/status.mjs", "--write"],
    ]);
  });

  it("surfaces a recording failure after green gates", () => {
    expect(
      runAndRecord({
        spawn: scriptedSpawn([0, 9], []),
        node: "node",
      }),
    ).toBe(9);
  });

  it("succeeds only when both phases succeed", () => {
    expect(
      runAndRecord({
        spawn: scriptedSpawn([0, 0], []),
        node: "node",
      }),
    ).toBe(0);
  });
});
