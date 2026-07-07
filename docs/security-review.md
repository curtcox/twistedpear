# Mini-app Sandbox Security Review (Phase 7)

Adversarial review of the Phase 4 broker chokepoint, capability grants, and sandbox
backends. Companion to [miniapp-runtime.md](miniapp-runtime.md) and
[LIMITATIONS.md](../LIMITATIONS.md) §7.

**Status:** completed 2026-07-07 (software tier). Device Bare Worker measurements remain
hardware debt ([STATUS-HARDWARE.md](../STATUS-HARDWARE.md) H11).

## Scope

| Surface | Code | Conformance |
|---|---|---|
| Broker dispatch + rate/size limits | `packages/miniapp-runtime/src/broker.ts` | `broker.test.ts`, `hostile-apps` |
| Capability grants | `capabilities.ts`, `GrantStore` | `host.test.ts` grant matrix |
| Host handlers | `host.ts` | `hostile-apps`, `test:examples` |
| Widget tree validation | `ui/validate.ts` | `hostile-apps` UI abuse cases |
| Sandbox backends | `sandbox/node-worker.ts`, `sandbox/worker.ts` | `hostile-apps` escape probes |
| Reticulum wire parsers | `reticulum-ts`, `lxmf-ts` | `npm run test:fuzz` |

Out of scope: host OS hardening, Electron renderer XSS, package signature cryptography
(covered by `app-registry` tests), and physical side channels.

## Threat model

- Mini-app bytecode is **hostile**; publisher signature authenticates identity only.
- Users grant capabilities at install; revocation applies on the next broker call.
- One foreground mini-app; no background execution or ambient APIs.
- Host owns rendering; mini-apps submit data-only widget trees.

## Findings

### F1 — Capability substitution (fixed)

**Risk:** A mini-app could pass `capability: "identity"` on a `storage.kv.get` broker
request and bypass the `storage:kv` grant check because the broker previously honored
`request.capability` over the registered handler capability.

**Fix:** `MiniappBroker.dispatch` now always enforces `registered.capability` and rejects
requests whose `capability` field does not match (`CAPABILITY_MISMATCH`).

**Evidence:** `broker.test.ts` substitution case; `hostile-apps` capability-swap probe.

### F2 — UI event forgery via broker (fixed)

**Risk:** `ui.event` broker handler delivered events to the sandbox without validating
`nodeId` against the active widget tree, while `handleUiEvent` (host tap path) did
validate. A mini-app could synthesize taps on non-rendered nodes.

**Fix:** `ui.event` handler now mirrors `handleUiEvent` tree validation.

**Evidence:** `hostile-apps` broker `ui.event` forgery probe.

### F3 — Residual: JS isolation strength (accepted)

Worker/compartment isolation depends on the host JS engine. Determined escape via engine
bugs is not ruled out. Watchdog + kill semantics contain runaway apps but may false-positive
on weak hardware (H11).

**Mitigation:** deny-by-default broker, no ambient imports in sandbox bootstrap, hostile
conformance + continuous fuzzing. Revisit after Bare Worker device measurements.

### F4 — Residual: publisher trust (accepted by design)

A granted capability allows full use of that host service for the app namespace. Malicious
but signed packages are a social/trust problem, not a sandbox bypass.

### F5 — Residual: cross-app storage (verified)

`NamespacedKvService` prefixes keys with `miniapp-kv:{appId}:` and rejects `..` in user
keys. No cross-app read/write path found in broker handlers.

### F6 — Residual: widget tree DoS (mitigated)

Depth, node count, and serialized byte limits enforced in `validateWidgetTree`. Host
rejects unknown types, props, and styles before render.

### F7 — Residual: broker flood (mitigated)

Per-app rate limit (default 128 msg/s, policy doc cites 60 msg/s target) and 256 KiB
message ceiling. `hostile-apps` exercises both.

## Recommendations (future)

1. **Bare Worker parity:** run `hostile-apps` against `BareWorkerSandboxBackend` on
   emulator (E5) and device (H11).
2. **Audit log export:** optional host export of broker deny audit entries for forensics.
3. **Capability downgrade:** reject broker calls when manifest `minHostApi` exceeds host.
4. **Periodic re-review** when adding broker namespaces or capabilities.

## Verification

```bash
npm run build
npm test -- packages/miniapp-runtime/test/broker.test.ts packages/miniapp-runtime/test/host.test.ts
npm run test:hostile-apps
npm run test:fuzz
```

Record this review in phase exit checklists; update LIMITATIONS §7 when device Bare
measurements land.
