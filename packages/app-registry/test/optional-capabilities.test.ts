import { describe, expect, it } from "vitest";
import {
  launchGrantsSatisfyDeclarations,
  parseCapabilityDeclarations,
} from "../src/index.js";
import {
  capabilityUpdateDelta,
  grantsPreservedAcrossUpdate,
} from "../src/update-delta.js";

describe("optional capabilities", () => {
  it("defaults omitted optional to essential", () => {
    const declarations = parseCapabilityDeclarations(
      [{ id: "lxmf:send", optional: true }, { id: "identity" }, "storage:kv"],
      2,
    );
    expect(declarations.map((entry) => [entry.id, entry.optional])).toEqual([
      ["lxmf:send", true],
      ["identity", false],
      ["storage:kv", false],
    ]);
  });

  it("allows launch when every essential capability is granted", () => {
    const mixed = parseCapabilityDeclarations(
      ["identity", { id: "lxmf:send", optional: true }],
      2,
    );
    expect(launchGrantsSatisfyDeclarations(mixed, ["identity"])).toBe(true);
    expect(
      launchGrantsSatisfyDeclarations(mixed, ["identity", "lxmf:send"]),
    ).toBe(true);
    expect(launchGrantsSatisfyDeclarations(mixed, ["lxmf:send"])).toBe(false);
    expect(launchGrantsSatisfyDeclarations(mixed, [])).toBe(false);
  });

  it("allows launch of an all-optional app with an empty grant set", () => {
    const optionalOnly = parseCapabilityDeclarations(
      [{ id: "lxmf:send", optional: true }],
      2,
    );
    expect(launchGrantsSatisfyDeclarations(optionalOnly, [])).toBe(true);
  });

  it("allows a zero-capability app to launch", () => {
    expect(launchGrantsSatisfyDeclarations([], [])).toBe(true);
  });

  it("keys an update delta off id, ignoring optional and scope", () => {
    const delta = capabilityUpdateDelta(
      ["storage:kv"],
      [
        "storage:kv",
        {
          id: "lxmf:send",
          optional: true,
          scope: { kind: "offer", targetKind: "peer" },
        },
      ],
      (id) => (id === "lxmf:send" ? "sensitive" : "benign"),
    );
    expect(delta.added).toEqual([{ id: "lxmf:send", riskClass: "sensitive" }]);
    expect(
      grantsPreservedAcrossUpdate(
        ["storage:kv"],
        [{ id: "storage:kv", optional: true }],
      ),
    ).toEqual(["storage:kv"]);
  });
});
