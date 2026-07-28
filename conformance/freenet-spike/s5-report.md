# S5 — Freenet binary bundling cost

<!-- tp-doc
lifecycle: reference
audited: 2026-07-28
register: none
-->

The installed Freenet 0.2.112 macOS application supplies a read-only first
measurement for the bundling spike. Exact evidence is recorded in
[s5-bundling-matrix.json](s5-bundling-matrix.json).

- Its universal `freenet-bin` contains both x86_64 and arm64 and is 97,085,632
  bytes. The installed application bundle occupies 95,032 KiB, so embedding
  this distribution would add roughly 93 MiB before installer compression.
- Signature metadata declares the hardened-runtime flag, a team identifier,
  and a stapled notarization ticket.
- Strict verification of the installed copy fails with “invalid signature
  (code or signature have been modified),” and Gatekeeper returns an internal
  code-signing error. This may reflect the installed updater state; it is not
  evidence that a fresh upstream artifact is invalid. It does mean this copy
  cannot clear TwistedPear's embedding gate.

S5 remains **partial**. Linux and Windows sizes, a fresh-distribution signature
check, and an actual signed/notarized TwistedPear package containing the pinned
binary are still required. F4 must not bundle the running installed copy.
