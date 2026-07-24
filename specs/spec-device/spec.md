# SPEC-DEVICE — device-class registry and session lifecycle


<!-- tp-doc
lifecycle: stub
audited: 2026-07-23
register: software
-->

## Scope

Defines the versioned device-class registry, tier semantics, capability id generation
rule (`device:<class>` / `device:<class>:<tier>`), consent classes, and the Sans-IO
device-session lifecycle machine used by the Device Manager.

Companion: [Device I/O plan](../../docs/device-io-plan.md). Cross-cutting streaming
admission lives in SPEC-STREAM (planned). Capability consent policy extensions live in
SPEC-CAP.

## Normative artifacts

| Artifact | Path |
|---|---|
| Registry schema | [`schema/device-registry.schema.json`](schema/device-registry.schema.json) |
| Registry data | [`registry/device-classes.json`](registry/device-classes.json) |
| Generated TypeScript table | [`packages/protocol/src/device-registry.gen.ts`](../../packages/protocol/src/device-registry.gen.ts) |
| Generated capability ids | [`packages/miniapp-runtime/src/device-capabilities.gen.ts`](../../packages/miniapp-runtime/src/device-capabilities.gen.ts) |
| Session machine | [`packages/protocol/src/device-session.ts`](../../packages/protocol/src/device-session.ts) |
| Quantization helpers | [`packages/protocol/src/device-quantize.ts`](../../packages/protocol/src/device-quantize.ts) |

Regenerate generated tables with:

```sh
npm run generate:device-registry
```

## Status

**stub** — Phase 1–2: registry + session machine + Device Manager for
`location` (coarse/precise), `ambient-light`, and derived `camera` /
`microphone` / `motion`, plus preview surface widget kinds and recorded
processor tapes. Remaining classes are registry entries awaiting drivers.
TLA+ model and Layer-3 vectors are planned.
