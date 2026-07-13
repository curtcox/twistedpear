# Migrate TwistedPear to Sans-IO Protocol Discipline

> **Status:** Protocol deny-list ratchet is **empty**. Inventory reports 0 violations under
> configured roots (adapters remain outside the scan). Effects package, sim determinism,
> tripwire (scoped to `packages/protocol/test/**`), ESLint, and dependency-cruiser gates
> are green via `npm run sansio`. **RNS HKDF** and **link key derive** are pure protocol
> cores (`@noble/hashes`); `Link.handshake` performs ECDH at the crypto edge then calls
> `deriveRnsLinkKey`. Handshake sims use RNS HKDF over order-independent shared secrets.
> **Link keygen** accepts injected entropy (`splitInitiatorLinkEntropy` /
> `splitResponderLinkEntropy`). **`Runtime.entropy`** is threaded through
> `LeafTransport` into Link keygen (explicit override still wins). Announce builds prefer
> `transport.entropy` for the random hash. Remaining depth work:
> route Identity/Token/Resource RNG through Runtime entropy, and keep converting
> residual session IO into step machines.

You are refactoring the TwistedPear codebase (TypeScript, React Native + Node hosts; includes TypeScript implementations of Reticulum and LXMF) to enforce one invariant:

**No protocol module ever touches IO, time, or randomness directly.**

Every protocol behavior (Reticulum/LXMF sessions, capability grant lifecycle, discovery, sync, escrow, mini-app runtime brokering) must be expressible as pure transitions: `step(state, event) -> { state, intents }`. Effects enter only as events; effects leave only as declared intents executed by adapters at the edge. The purpose is deterministic simulation testing: an entire multi-node run must be reproducible from `(seed, config)`.

## Definitions

**Protocol module**: any code under the protocol source roots (identify them first; expect `src/protocol/`, the Reticulum/LXMF implementations, broker logic, and state machines — confirm actual paths from the repo layout and record them in the ratchet config).

**Forbidden inside protocol modules** (the deny list — enforce every item):
- Time: `Date.now`, `new Date()`, `performance.now`, `process.hrtime`, `Intl.DateTimeFormat` for current time
- Randomness: `Math.random`, `crypto.getRandomValues`, `crypto.randomBytes`, `crypto.randomUUID`, any uuid/nanoid library
- Scheduling: `setTimeout`, `setInterval`, `setImmediate`, `queueMicrotask`, `requestAnimationFrame`, unawaited floating promises used as timers
- Network: `fetch`, `XMLHttpRequest`, `WebSocket`, `net`, `dgram`, `tls`, `http(s)`, React Native networking, any BLE/LoRa/serial native module
- Storage: `fs`, `AsyncStorage`, SQLite/MMKV/keychain bindings, `localStorage`
- Process/environment: `process.env` reads, `os.*`, locale or timezone queries
- Logging directly to `console` (inject a logger; log calls must not observe time on their own)

**Permitted**: pure computation, injected capability interfaces, and data types. Crypto *algorithms* (hashing, signing, verification) are pure and permitted; crypto *key generation and nonces* must consume injected entropy.

## Target architecture

1. Define an `effects` package with narrow interfaces: `Clock` (returns the current virtual instant it was handed — protocol code never asks the OS), `Entropy` (deterministic stream seeded per node), `Timers` (request/cancel by id; expiry arrives as an event), `Transport` (send intent out; receive as event), `Store` (read/write as intent/event pairs).
2. Protocol cores are state machines: explicit state types, event union types, and a pure `step`. Outputs are `Intent[]` data — never executed inline.
3. Adapters live outside protocol roots and translate intents to real IO (production) or simulated IO (harness). Adapters may import protocol; protocol may never import adapters.
4. Async inside protocol code is suspect: prefer synchronous `step` functions. Where the existing code is promise-shaped, convert to event-driven continuations held in state, not awaited IO.

## Migration procedure

1. **Inventory.** AST-scan the protocol roots for every deny-list usage (use ts-morph or eslint with the rules below in report-only mode). Emit `violations.json`: file, line, API, suggested effect interface. Commit this as the baseline.
2. **Ratchet.** Create `sansio-ratchet.json` listing currently-violating files as temporary exceptions. CI fails if (a) any file NOT on the list violates, or (b) the list grows. Every PR may only shrink it. This makes the migration monotonic and lets it land incrementally.
3. **Effects package.** Implement the interfaces plus two adapter sets: `adapters/real/` and `adapters/sim/` (virtual clock, seeded PRNG such as xoshiro/PCG, in-memory transport with pluggable latency/loss models).
4. **Convert module-by-module**, dependency-leaves first (likely: framing/codec code, then session state machines, then broker, then discovery). For each module: replace direct calls with events/intents, move any residual IO to an adapter, delete the ratchet entry, and add a determinism test (below) covering the module.
5. **Do not change protocol behavior while converting.** Byte-level wire compatibility must hold: run the existing Python-RNS interop/conformance suite after each module conversion.

## Enforcement mechanisms (implement ALL — layered detection)

**Static, compile-time:**
- Split protocol code into its own TypeScript project reference with `"lib": ["ES2022"]`, no `"dom"`, and no `@types/node`. Then `fetch`, `setTimeout`, `WebSocket`, `process`, and `fs` are *type errors* — the compiler itself enforces the boundary. This is the strongest single mechanism; do it even though it requires untangling tsconfigs.
- ESLint scoped to protocol roots: `no-restricted-globals`, `no-restricted-imports`, `no-restricted-syntax` (for `new Date()` and member expressions like `Math.random`), covering the full deny list. Error severity, no inline-disable allowed (`--no-inline-config` in CI, or eslint-comments/no-restricted-disable).
- dependency-cruiser rule: forbid any import path from protocol roots into `adapters/`, native modules, or node builtins. Emit the dependency graph as a CI artifact so violations are visible in review.
- A dedicated `package.json` for the protocol package with zero runtime dependencies except pure libraries (explicitly audited allowlist).

**Runtime tripwires (defense against what static analysis misses — e.g. dynamic access, `globalThis['set'+'Timeout']`):**
- Test bootstrap that, before importing protocol modules, replaces `Date.now`, `Math.random`, `setTimeout`, `fetch`, etc. on `globalThis` with functions that throw `SansIOViolation` including a stack trace. All unit and simulation tests run under this bootstrap.
- In the simulator, adapters are the only holders of real capabilities; the sim kernel asserts that every externally visible action was produced via a declared intent (any observed effect without a matching intent record fails the run).

**Behavioral (the ground-truth check — catches nondeterminism the deny list doesn't name):**
- Determinism test: run every simulation scenario twice from the same seed and assert the full event-trace hashes are byte-identical. Run this in CI on every PR; run cross-platform (linux + macos runners) nightly, since platform divergence exposes hidden environment reads.
- Fuzz the schedule: with the seed fixed, vary only the simulator's event-interleaving salt; state-machine outputs must depend only on event order actually delivered, and replay of a recorded trace must reproduce identical final state hashes.
- Add a canary: deliberately introduce one `Date.now()` in a scratch branch and verify every layer (tsc, eslint, tripwire, determinism diff) reports it. Document which layers caught it. If any layer misses, fix the layer before proceeding. Re-run this canary check whenever the enforcement config changes.

**CI gate summary** (all must pass to merge): tsc project build, eslint, dependency-cruiser, ratchet non-growth, determinism double-run, Python-RNS conformance suite.

## Acceptance criteria

- `sansio-ratchet.json` is empty.
- The protocol package compiles with no DOM/node libs and zero IO-capable dependencies.
- A full multi-node simulation scenario replays byte-identically from `(seed, config)` on two platforms.
- The canary experiment shows at least three independent layers catching a seeded violation.
- Wire compatibility with Python RNS is unchanged (conformance suite green).

Work incrementally: after the inventory and ratchet land, each subsequent PR should convert one module, shrink the ratchet, and keep every CI gate green. Never batch the whole migration into one change.