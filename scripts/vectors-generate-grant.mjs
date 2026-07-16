import { writeFile } from "node:fs/promises";
import { enumerateCells } from "../packages/effects/dist/index.js";
import {
  escrowMachine,
  grantMachine,
  initialEscrowState,
  initialGrantLifecycleState,
  initialRecoveryQuorumState,
  recoveryQuorumMachine,
  stepEscrow,
  stepGrantLifecycle,
  stepRecoveryQuorum
} from "../packages/protocol/dist/index.js";

const grantExamples = {
  approve: { kind: "grant/approve", at: 1, ttlMs: 9 },
  deny: { kind: "grant/deny", at: 1 },
  "first-use/live": { kind: "grant/first-use", at: 5 },
  "ttl/expired": { kind: "grant/ttl", at: 10 },
  revoke: { kind: "grant/revoke", at: 5 }
};

const escrowExamples = {
  deposit: { kind: "escrow/deposit", amount: 100 },
  "request-release": { kind: "escrow/request-release" },
  "quorum-authorize": { kind: "escrow/authorize", authorizers: ["a", "b"] },
  refund: { kind: "escrow/refund" },
  ttl: { kind: "escrow/ttl" }
};

const recoveryExamples = {
  start: { kind: "recovery/start" },
  share: { kind: "recovery/share", guardian: "a" },
  "threshold-authorize": { kind: "recovery/authorize" },
  reject: { kind: "recovery/reject" },
  ttl: { kind: "recovery/ttl" }
};

function makeVector(name, machine, examples, stateFor, step) {
  return {
    schema: "twistedpear.transition-v1",
    machine: name,
    generatedBy: "scripts/vectors-generate-grant.mjs",
    states: machine.states,
    eventClasses: machine.events.map((event) => event.name),
    cells: enumerateCells(machine).map((cell) => {
      const state = stateFor(cell.state);
      const event = examples[cell.eventClass];
      const result = step(state, event);
      return {
        state: cell.state,
        eventClass: cell.eventClass,
        event,
        expectedState: result.state,
        expectedIntents: result.intents,
        legal: cell.rows.length > 0
      };
    })
  };
}

const vectors = [
  ["grant.json", makeVector("grant-lifecycle", grantMachine, grantExamples, (phase) => ({
    ...initialGrantLifecycleState(0), phase,
    expiresAt: phase === "requested" || phase === "denied" ? null : 10
  }), stepGrantLifecycle)],
  ["escrow.json", makeVector("escrow", escrowMachine, escrowExamples, (phase) => ({
    ...initialEscrowState(2), phase, amount: phase === "pending" ? 0 : 100
  }), stepEscrow)],
  ["recovery-quorum.json", makeVector("recovery-quorum", recoveryQuorumMachine, recoveryExamples, (phase) => ({
    ...initialRecoveryQuorumState(2), phase, shares: phase === "idle" ? [] : ["a", "b"]
  }), stepRecoveryQuorum)]
];

await Promise.all(vectors.map(([filename, vector]) => writeFile(
  new URL(`../conformance/vectors/${filename}`, import.meta.url),
  `${JSON.stringify(vector, null, 2)}\n`
)));
