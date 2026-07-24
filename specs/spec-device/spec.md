# SPEC-DEVICE — device-class registry and session lifecycle


<!-- tp-doc
lifecycle: live
audited: 2026-07-23
register: software
-->

## Scope

Defines the versioned device-class registry, tier semantics, capability id generation
rule (`device:<class>` / `device:<class>:<tier>`), consent classes, and the Sans-IO
device-session lifecycle machine used by the Device Manager.

Companion: [Device I/O plan](../../docs/device-io-plan.md). Cross-cutting streaming
admission lives in protocol `device-admission` (SPEC-STREAM planned). Capability consent
policy extensions live in SPEC-CAP. Growth path: [add a device class runbook](../../docs/device-class-runbook.md).

## Normative artifacts

| Artifact | Path |
|---|---|
| Registry schema | [`schema/device-registry.schema.json`](schema/device-registry.schema.json) |
| Registry data | [`registry/device-classes.json`](registry/device-classes.json) |
| Generated TypeScript table | [`packages/protocol/src/device-registry.gen.ts`](../../packages/protocol/src/device-registry.gen.ts) |
| Generated capability ids | [`packages/miniapp-runtime/src/device-capabilities.gen.ts`](../../packages/miniapp-runtime/src/device-capabilities.gen.ts) |
| Session machine | [`packages/protocol/src/device-session.ts`](../../packages/protocol/src/device-session.ts) |
| Quantization / processors / admission / remote grants / NFC AID blocklist | `packages/protocol/src/device-*.ts` |

Regenerate generated tables with:

```sh
npm run generate:device-registry
```

## Status

**live** — Phases 1–7 of the Device I/O plan are implemented in executable form
(registry through remote acquisition and Phase 7 hardening). Remaining formal work:
TLA+ session model, Layer-3 vectors, and SPEC-STREAM / SPEC-CHROME / SPEC-WIDGET
extensions. Hardware-gated conformance stays in STATUS-HARDWARE.
