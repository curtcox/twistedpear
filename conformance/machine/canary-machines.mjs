// Deliberately non-conforming machines, one per SPEC-MACHINE gate check.
// They mutation-test the gate: each canary must fail the check named in
// EXPECTED_FAILURE, proving the gate actually enforces the contract.

const probeTape = [
  { kind: "start", at: 0 },
  { kind: "tick", at: 10 }
];

let leakedCounter = 0;

export const machines = {
  "canary-wall-clock": {
    initial: { readings: 0 },
    step: (state, event) =>
      event.kind === "tick"
        ? {
            state: { readings: state.readings + 1 },
            intents: [{ kind: "log", level: "debug", message: `now=${Date.now()}` }]
          }
        : { state, intents: [] },
    tape: probeTape
  },
  "canary-ambient-randomness": {
    initial: null,
    step: (state, event) =>
      event.kind === "tick"
        ? { state, intents: [{ kind: "need_entropy", nbytes: Math.random() > 0.5 ? 1 : 2 }] }
        : { state, intents: [] },
    tape: probeTape
  },
  "canary-nondeterministic": {
    initial: null,
    step: (state, event) => {
      if (event.kind === "tick") {
        leakedCounter += 1;
        return { state, intents: [{ kind: "log", level: "debug", message: `run=${leakedCounter}` }] };
      }
      return { state, intents: [] };
    },
    tape: probeTape
  },
  "canary-input-mutator": {
    initial: { seen: [] },
    step: (state, event) => {
      if (event.kind === "tick") {
        state.seen.push(event.at); // mutates its input state
        return { state, intents: [] };
      }
      return { state, intents: [] };
    },
    tape: probeTape
  },
  "canary-invented-intent": {
    initial: null,
    step: (state, event) =>
      event.kind === "tick"
        ? { state, intents: [{ kind: "teleport", destination: "b" }] }
        : { state, intents: [] },
    tape: probeTape
  }
};

export const EXPECTED_FAILURE = {
  "canary-wall-clock": "tripwire",
  "canary-ambient-randomness": "tripwire",
  "canary-nondeterministic": "determinism",
  "canary-input-mutator": "frozen-input",
  "canary-invented-intent": "alphabet"
};
