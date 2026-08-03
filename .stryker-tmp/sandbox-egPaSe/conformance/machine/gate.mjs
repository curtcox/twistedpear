// @ts-nocheck
// SPEC-MACHINE freestanding conformance gate. Point it at any module that
// exports protocol machines and example tapes:
//
//   export const machines = {
//     "my-machine": {
//       initial: <state or () => state>,
//       step: (state, event) => ({ state, intents }),
//       tape: [ <SPEC-EVENTS events, bytes as Uint8Array or {"$bytes": hex}> ]
//     }
//   };
//
// Per machine the gate enforces the SPEC-MACHINE contract:
//   alphabet     — tape events and every produced intent are inside the
//                  SPEC-EVENTS schema alphabet
//   tripwire     — no forbidden effect (clock, RNG, timers, fetch, …) fires
//                  during any step (runtime tripwire from @twistedpear/effects)
//   determinism  — two runs from fresh initial state produce an identical
//                  canonical hash of the (event, intents, state) stream
//   frozen-input — steps tolerate deeply frozen state/event inputs, i.e. they
//                  never mutate their inputs
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createValidator } from "../tools/mini-json-schema.mjs";
import { canonicalJson, fnv1a64 } from "../kernel/runner.mjs";
import {
  installTripwire,
  uninstallTripwire
} from "../../packages/effects/dist/tripwire.js";

const here = dirname(fileURLToPath(import.meta.url));
const EVENTS_SCHEMA = join(here, "..", "..", "specs", "spec-events", "schema", "events.schema.json");

const validateEvent = createValidator(`${EVENTS_SCHEMA}#/$defs/event`);
const validateIntent = createValidator(`${EVENTS_SCHEMA}#/$defs/intent`);

function toSerializedForm(value) {
  return JSON.parse(
    JSON.stringify(value, (_key, item) => {
      if (item instanceof Uint8Array) {
        let hex = "";
        for (const b of item) hex += b.toString(16).padStart(2, "0");
        return { $bytes: hex };
      }
      return item;
    }) ?? "null"
  );
}

function reviveBytes(value) {
  if (value !== null && typeof value === "object") {
    if (value instanceof Uint8Array) return value;
    if (typeof value.$bytes === "string") {
      const hex = value.$bytes;
      const out = new Uint8Array(hex.length / 2);
      for (let i = 0; i < out.length; i += 1) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      return out;
    }
    if (Array.isArray(value)) return value.map(reviveBytes);
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = reviveBytes(item);
    return out;
  }
  return value;
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Uint8Array) return value; // typed arrays cannot be frozen
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
}

function freshInitial(machine) {
  return typeof machine.initial === "function"
    ? machine.initial()
    : structuredClone(machine.initial);
}

function runTape(machine, tape, { freeze = false } = {}) {
  let state = freshInitial(machine);
  if (freeze) deepFreeze(state);
  const stream = [];
  for (const event of tape) {
    const input = freeze ? deepFreeze(structuredClone(event)) : event;
    const result = machine.step(state, input);
    state = result.state;
    if (freeze) deepFreeze(state);
    stream.push({ event, intents: result.intents, state });
  }
  return stream;
}

/**
 * Gate one machines module. Returns { checks, failures: [{machine, check, message}] }.
 */
export function runMachineGate(machines) {
  const failures = [];
  let checks = 0;
  const fail = (machine, check, message) => failures.push({ machine, check, message });

  for (const [name, machine] of Object.entries(machines)) {
    if (typeof machine.step !== "function" || !Array.isArray(machine.tape)) {
      fail(name, "shape", "machine must provide step(state, event) and a tape array");
      continue;
    }
    const tape = machine.tape.map(reviveBytes);

    // alphabet: tape events first, then every intent the machine produces.
    checks += 1;
    let alphabetOk = true;
    for (const event of tape) {
      const errors = validateEvent(toSerializedForm(event));
      if (errors.length > 0) {
        alphabetOk = false;
        fail(name, "alphabet", `tape event outside SPEC-EVENTS alphabet: ${errors[0]}`);
      }
    }

    // tripwire: forbidden effects must not fire during any step.
    checks += 1;
    let stream;
    installTripwire();
    try {
      stream = runTape(machine, tape);
    } catch (error) {
      fail(name, "tripwire", String(error));
    } finally {
      uninstallTripwire();
    }
    if (stream === undefined) continue;

    if (alphabetOk) {
      for (const item of stream) {
        for (const intent of item.intents) {
          const errors = validateIntent(toSerializedForm(intent));
          if (errors.length > 0) {
            fail(name, "alphabet", `intent outside SPEC-EVENTS alphabet: ${errors[0]}`);
          }
        }
      }
    }

    // determinism: identical canonical stream hash across two fresh runs.
    checks += 1;
    try {
      const first = fnv1a64(canonicalJson(toSerializedForm(stream)));
      const second = fnv1a64(canonicalJson(toSerializedForm(runTape(machine, tape))));
      if (first !== second) {
        fail(name, "determinism", `double-run stream hash mismatch: ${first} != ${second}`);
      }
    } catch (error) {
      fail(name, "determinism", String(error));
    }

    // frozen-input: steps must not mutate their inputs.
    checks += 1;
    try {
      runTape(machine, tape, { freeze: true });
    } catch (error) {
      fail(name, "frozen-input", String(error));
    }
  }

  return { checks, failures };
}
