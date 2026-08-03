// @ts-nocheck
import { enumerateCells } from "@twistedpear/effects";
import escrowVectors from "../../../conformance/vectors/escrow.json";
import recoveryVectors from "../../../conformance/vectors/recovery-quorum.json";
import {
  escrowMachine,
  escrowSafetyViolation,
  initialEscrowState,
  stepEscrow
} from "../src/escrow.js";
import {
  initialRecoveryQuorumState,
  recoveryQuorumMachine,
  recoveryQuorumSafetyViolation,
  stepRecoveryQuorum
} from "../src/recovery-quorum.js";
import { describe, expect, it } from "vitest";

describe("design-first escrow and recovery tables", () => {
  it("never releases escrow without quorum", () => {
    let state = initialEscrowState(2);
    state = stepEscrow(state, { kind: "escrow/deposit", amount: 100 }).state;
    state = stepEscrow(state, { kind: "escrow/request-release" }).state;
    const below = stepEscrow(state, { kind: "escrow/authorize", authorizers: ["a"] }).state;
    expect(below.phase).toBe("release-requested");
    const released = stepEscrow(state, { kind: "escrow/authorize", authorizers: ["a", "b"] }).state;
    expect(released.phase).toBe("released");
    expect(escrowSafetyViolation(released)).toBeNull();
  });

  it("never recovers below threshold, including duplicate shares", () => {
    let state = initialRecoveryQuorumState(2);
    state = stepRecoveryQuorum(state, { kind: "recovery/start" }).state;
    state = stepRecoveryQuorum(state, { kind: "recovery/share", guardian: "a" }).state;
    state = stepRecoveryQuorum(state, { kind: "recovery/share", guardian: "a" }).state;
    expect(stepRecoveryQuorum(state, { kind: "recovery/authorize" }).state.phase).toBe("collecting");
    state = stepRecoveryQuorum(state, { kind: "recovery/share", guardian: "b" }).state;
    const recovered = stepRecoveryQuorum(state, { kind: "recovery/authorize" }).state;
    expect(recovered.phase).toBe("recovered");
    expect(recoveryQuorumSafetyViolation(recovered)).toBeNull();
  });

  it("commits every state/event vector cell from both tables", () => {
    expect(escrowVectors.cells).toHaveLength(enumerateCells(escrowMachine).length);
    expect(recoveryVectors.cells).toHaveLength(enumerateCells(recoveryQuorumMachine).length);
  });
});
