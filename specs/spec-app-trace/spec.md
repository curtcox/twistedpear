# SPEC-APP-TRACE — Mini-app session trace

<!-- tp-doc
lifecycle: live
audited: 2026-08-25
register: none
-->

**Group:** C (platform) · **Status:** normative · **Migration phase:** 3

## Scope

The interoperable unit for a recorded mini-app session. Hosts, the CLI, and tests
exchange the same document. Format 1 is **shape-only**: it records causal input
kinds, names, capabilities, and outcomes, never broker payloads, results, or user
content. Kernel-level protocol traces remain [SPEC-TRACE](../spec-trace/spec.md).

Recording, replay, shrinking, and sealed payload traces are out of scope here;
they are later phases of the
[record-and-replay plan](../../docs/miniapp-record-replay-plan.md).

## Document

A session is one JSON object:

| Field            | Meaning                                                           |
| ---------------- | ----------------------------------------------------------------- |
| `format`         | `1`                                                               |
| `kind`           | `miniapp-session`                                                 |
| `mode`           | `shape` (the only legal value in format 1)                        |
| `hostApiVersion` | Host API the session ran against                                  |
| `identity`       | `appId`, `version`, 32-byte `publisherKey`, 32-byte `packageHash` |
| `host`           | `platform`, `hostVersion`, `hostApiVersion`                       |
| `grants`         | Capability names held at session start                            |
| `entries`        | Ordered causal tape                                               |

Entry tags: `clock`, `entropy` (`byteCount` only), `grant`, `broker`, `inbound`,
`assert`. `assert` records output checks (widget node counts, call shapes), not
inputs. A `broker` row carries `namespace`, `method`, `capability`, and `outcome`
and must not carry `payload` or `result`.

## Canonical form and hash

The canonical form and 64-bit FNV-1a hash are the same rules as
[SPEC-TRACE](../spec-trace/spec.md): JSON with sorted keys, no whitespace, UTF-16
FNV-1a, 16 lowercase hex digits. `parseAppTrace` / `serializeAppTrace` /
`hashAppTrace` in
[trace-format.ts](../../packages/miniapp-runtime/src/trace-format.ts)
implement them. Key order on disk is not significant.

## Normative artifacts

- Schema: [schema/app-session.schema.json](schema/app-session.schema.json)
- Known-answer vectors: `app-session.json` → `dice-table-shape`,
  `pocket-notes-shape`, `unit-converter-shape`
  ([vectors/app-session.json](vectors/app-session.json))
- Round-trip and rejection tests:
  `trace-format.test.ts` ("round-trips the three Cookbook shape traces")
