# Sans-IO protocol discipline

TwistedPear protocol behavior is deterministic: protocol modules receive effects as
events and return effects as data. They do not directly read clocks or entropy, schedule
work, access storage, perform network IO, inspect the environment, or log.

The canonical statement of the machine contract and the forbidden-effects table is
[SPEC-MACHINE](../specs/spec-machine/spec.md); this document is the maintenance guide
for the enforcement machinery.

## Current status

The migration is complete for the configured protocol roots:

- [`sansio-ratchet.json`](../sansio-ratchet.json) has no exceptions.
- [`violations.json`](../violations.json) is the generated inventory report.
- [`packages/protocol/tsconfig.json`](../packages/protocol/tsconfig.json) compiles the pure
  protocol package with `lib: ["ES2022"]` and no ambient Node or DOM types.
- [`packages/effects`](../packages/effects/) provides effect contracts plus real and simulated
  adapters.
- `npm run sansio` runs the complete boundary, canary, and determinism gate.

The source, inventory, and tests are the authoritative record of converted transitions. This
document defines the boundary and how it is maintained; it intentionally does not duplicate a
list of every protocol step function.

## Boundary

The protocol roots and edge exceptions are declared in
[`sansio-ratchet.json`](../sansio-ratchet.json). Update that file when a package moves across the
boundary; do not maintain a second path list here.

Inside a protocol root, code may perform pure computation and use explicitly allowed pure
libraries. Cryptographic hashing, signing, verification, and deterministic key derivation are
allowed. Key generation, nonces, and other entropy-dependent operations must consume injected
entropy.

The following direct effects are forbidden:

| Effect | Examples |
|---|---|
| Current time | `Date.now`, `new Date()`, `performance.now`, `process.hrtime` |
| Randomness | `Math.random`, platform crypto RNGs, UUID or nanoid generators |
| Scheduling | timers, immediates, microtasks, animation frames, timer-like floating promises |
| Network | `fetch`, WebSocket, TCP/UDP/TLS/HTTP, BLE, LoRa, or serial modules |
| Storage | filesystem APIs, AsyncStorage, databases, keychains, or browser storage |
| Environment | `process.env`, OS, locale, or timezone queries |
| Direct logging | `console`; adapters receive structured log intents instead |

Adapter implementations are deliberately outside the pure boundary. They may import protocol
code; protocol code must not import adapters or IO-capable packages.

## Transition model

Protocol behavior uses explicit state, events, and intents:

```ts
type StepResult<State, Intent> = {
  state: State;
  intents: Intent[];
};

function step(
  state: State,
  event: Event,
): StepResult<State, Intent> {
  // Pure and synchronous.
}
```

Effects flow in one direction:

1. A real adapter or the simulator turns an observation into an event.
2. The protocol transition returns its next state and declared intents.
3. The adapter executes those intents.
4. Completion, failure, timeout, or received data returns as a later event.

Promise-shaped IO is represented as a continuation in state, not awaited inside the transition.
The same compiled transition code runs behind production adapters and the deterministic simulation
kernel.

## Effect interfaces

[`packages/effects/src/types.ts`](../packages/effects/src/types.ts) is the source of truth for the
interfaces. The main categories are:

- clock observations supplied as events;
- deterministic entropy streams, seeded per simulated node;
- timer request/cancel intents and expiry events;
- transport send intents and receive/result events;
- store request intents and result events;
- structured trace and log records.

Real adapters execute operating-system effects. Simulated adapters provide virtual time, seeded
entropy, in-memory storage, event scheduling, transport models, recording, replay, shrinking, and
global oracles.

## Enforcement

The boundary is protected by independent layers:

| Layer | What it catches |
|---|---|
| TypeScript project boundary | Ambient Node/DOM APIs referenced from the pure protocol package |
| Inventory and empty ratchet | Deny-list use across all configured roots and growth in exceptions |
| Scoped ESLint rules | Restricted globals, imports, syntax, and inline suppressions |
| Dependency-cruiser gate | Imports from protocol roots into adapters, native modules, or built-ins |
| Runtime tripwire | Dynamic or indirect access that static checks can miss |
| Determinism and replay tests | Unnamed nondeterminism and platform-dependent behavior |
| Canary | Regressions in the enforcement layers themselves |

The canary temporarily seeds a forbidden time read in a fixture, verifies that the configured
layers reject it, and restores the fixture. The simulator additionally requires externally visible
actions to match declared intents.

## Commands

Run the full gate from the repository root:

```sh
npm run sansio
```

Focused commands are useful while diagnosing a failure:

```sh
npm run sansio:inventory
npm run sansio:ratchet
npm run sansio:eslint
npm run sansio:depcruise
npm run sansio:canary
npm run sansio:determinism
```

Wire compatibility remains a separate requirement:

```sh
npm run test:interop
```

## Change checklist

When adding or changing protocol behavior:

1. Keep the transition synchronous and express required effects as intents and follow-up events.
2. Put real and simulated effect execution in their respective adapters.
3. Add a deterministic transition test and, where relevant, a replay or adapter test.
4. Run `npm run sansio` and the applicable Python RNS/LXMF conformance tests.
5. If the boundary changes, update `sansio-ratchet.json` and verify that the exception list remains
   empty.

Acceptance remains: an empty ratchet, no IO-capable protocol dependencies, byte-identical replay
from the same seed and configuration, a working multi-layer canary, and unchanged wire behavior.
