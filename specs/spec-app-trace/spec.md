# SPEC-APP-TRACE — Mini-app session trace

<!-- tp-doc
lifecycle: live
audited: 2026-08-25
register: none
-->

**Group:** C (platform) · **Status:** normative · **Migration phase:** 3

## Scope

The interoperable unit for a recorded mini-app session. Hosts, the CLI, and tests
exchange the same document. Format 1 has three modes:

- **`shape`** (default): causal input kinds, names, capabilities, and outcomes.
  Never broker payloads, results, or user content. `parseAppTrace` accepts only
  this mode.
- **`payload`**: the same tape, with optional JSON `payload` / `result` on
  `broker` rows. Hosts write this only when the operator opts in.
  `parsePayloadAppTrace` / `redactAppTrace` convert to `shape`.
- **`sealed`**: an X25519-ChaCha20-Poly1305 envelope around a shape or payload
  document, addressed to a 32-byte recipient key (typically the publisher's
  encryption key). Identity stays public; the tape is ciphertext.

Kernel-level protocol traces remain [SPEC-TRACE](../spec-trace/spec.md).
This document specifies the exchanged format only. Replay consumes it but adds
nothing to it — see [mini-app record and replay](../../docs/miniapp-record-replay.md).
Shrinking and host chrome remain later phases of the
[record-and-replay plan](../../docs/miniapp-record-replay-plan.md).

## Document

A session is one JSON object:

| Field            | Meaning                                                           |
| ---------------- | ----------------------------------------------------------------- |
| `format`         | `1`                                                               |
| `kind`           | `miniapp-session`                                                 |
| `mode`           | `shape` (default). `payload` and `sealed` are additional modes.   |
| `hostApiVersion` | Host API the session ran against                                  |
| `identity`       | `appId`, `version`, 32-byte `publisherKey`, 32-byte `packageHash` |
| `host`           | `platform`, `hostVersion`, `hostApiVersion`                       |
| `grants`         | Capability names held at session start                            |
| `entries`        | Ordered causal tape                                               |

Entry tags: `clock`, `entropy` (`byteCount` only), `grant`, `broker`, `inbound`,
`assert`. `assert` records output checks (widget node counts, call shapes), not
inputs. A `broker` row carries `namespace`, `method`, `capability`, and `outcome`
and must not carry `payload` or `result`. Payload-mode broker rows may add
`payload` and `result` as JSON values. Sealed documents replace `entries` with
`recipientKey`, `alg` (`x25519-chacha20poly1305-v1`), `eph`, `nonce`, and `ct`.

## Canonical form and hash

The canonical form and 64-bit FNV-1a hash are the same rules as
[SPEC-TRACE](../spec-trace/spec.md): JSON with sorted keys, no whitespace, UTF-16
FNV-1a, 16 lowercase hex digits. `parseAppTrace` / `serializeAppTrace` /
`hashAppTrace` in
[trace-format.ts](../../packages/miniapp-runtime/src/trace-format.ts)
implement them. Key order on disk is not significant.

## Normative artifacts

- Schema: [schema/app-session.schema.json](schema/app-session.schema.json),
  [schema/app-session-payload.schema.json](schema/app-session-payload.schema.json),
  [schema/app-session-sealed.schema.json](schema/app-session-sealed.schema.json)
- Known-answer vectors: `app-session.json` → `dice-table-shape`,
  `pocket-notes-shape`, `unit-converter-shape`
  ([vectors/app-session.json](vectors/app-session.json));
  `app-session-payload.json` → `dice-table-payload`
- Round-trip and rejection tests:
  `trace-format.test.ts` ("round-trips the three Cookbook shape traces"),
  `trace-security.test.ts` ("TRACE-4 payload, redaction, and sealed traces")
