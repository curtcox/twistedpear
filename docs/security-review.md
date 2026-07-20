# Mini-app Sandbox Security Review (Phase 7)


<!-- tp-doc
lifecycle: reference
audited: 2026-07-20
register: none
-->

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

### F8 — Dev-environment surface (host API 0.2.0, reviewed at design time)

The `workspace`, `ai:chat`, `apps:*`, and `share:cas` capabilities widen what a granted
mini-app can ask the host to do. Posture:

- **Consent double-gate.** `apps:package/publish/install/preview` and trust imports
  require a `HostConfirmationChannel` approval per operation in addition to the grant.
  Tokens are host-generated and never transit the broker; the dialog lives in host
  chrome outside the widget surface, and identity fields come from the broker context.
  No channel configured ⇒ auto-deny; timeout ⇒ deny.
- **AI output is untrusted text.** Completions are written to the app's workspace and
  only ever execute inside a sandbox after an explicit preview/package + capability
  review, so the existing hostile-bytecode posture covers AI-authored code. The API
  key lives host-side; sandboxes see only sanitized request/response. Prompt content
  necessarily flows to the configured endpoint — reflected in the `ai:chat` grant
  wording.
- **Preview is not an escalation.** Preview grants must be a subset of the previewed
  manifest's declared capabilities (validated before the confirmation), and the
  preview app runs in its own `MiniappHost` with an isolated grant store.
- **Limits are host-only.** No broker method exists to change resource limits.
- **256t installs verify twice** (SHA-512 of the archive against the id, SHA-256
  against the signed locator) before the standard `verifyPackage` + capability review.

Exercised end-to-end by `npm run test:devstudio-loop` (two-instance loop, including a
confirmation-count audit and a subset-grant denial check).

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
