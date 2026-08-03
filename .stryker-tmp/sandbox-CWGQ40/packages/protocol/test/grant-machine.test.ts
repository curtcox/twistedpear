// @ts-nocheck
import { enumerateCells } from "@twistedpear/effects";
import {
  grantMachine,
  initialGrantLifecycleState,
  stepGrantLifecycle
} from "../src/grant-machine.js";
import vectors from "../../../conformance/vectors/grant.json";
import { describe, expect, it } from "vitest";

describe("grant lifecycle transition table", () => {
  it("contains only the legal lifecycle edges", () => {
    expect(grantMachine.table.map((row) => `${row.from}:${row.on.name}->${row.to}`)).toEqual([
      "requested:approve->granted",
      "requested:deny->denied",
      "granted:first-use/live->active",
      "granted:ttl/expired->expired",
      "active:ttl/expired->expired",
      "granted:revoke->revoked",
      "active:revoke->revoked"
    ]);
    const revoked = { ...initialGrantLifecycleState(), phase: "revoked" as const };
    expect(stepGrantLifecycle(revoked, { kind: "grant/approve", at: 10, ttlMs: 100 })).toEqual({
      state: revoked,
      intents: []
    });
  });

  it("checks in a vector for every table cell", () => {
    expect(vectors.cells).toHaveLength(enumerateCells(grantMachine).length);
    expect(vectors.cells).toHaveLength(grantMachine.states.length * grantMachine.events.length);
    expect(vectors.cells.filter((cell) => cell.legal)).toHaveLength(grantMachine.table.length);
  });
});
