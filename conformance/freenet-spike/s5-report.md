# S5 — Freenet binary bundling cost

<!-- tp-doc
lifecycle: reference
audited: 2026-07-28
register: none
-->

Evidence for Freenet 0.2.112 bundling cost is recorded in
[s5-bundling-matrix.json](s5-bundling-matrix.json).

## macOS (installed app)

- The installed Freenet 0.2.112 macOS application supplies a read-only first
  measurement. Its universal `freenet-bin` contains both x86_64 and arm64 and is
  97,085,632 bytes. The installed application bundle occupies 95,032 KiB, so
  embedding this distribution would add roughly 93 MiB before installer
  compression.
- Signature metadata declares the hardened-runtime flag, a team identifier,
  and a stapled notarization ticket.
- Strict verification of the installed copy fails with “invalid signature
  (code or signature have been modified),” and Gatekeeper returns an internal
  code-signing error. This may reflect the installed updater state; it is not
  evidence that a fresh upstream artifact is invalid. It does mean this copy
  cannot clear TwistedPear's embedding gate.

## Linux / Windows (release archives)

Sizes below are **compressed GitHub release assets** from
[v0.2.112](https://github.com/freenet/freenet-core/releases/tag/v0.2.112)
(sha256 digests from the release API). Unpacked binary size and a signed
TwistedPear embedding are still open.

| Asset                                       |                  Bytes |
| ------------------------------------------- | ---------------------: |
| `freenet-x86_64-unknown-linux-musl.tar.gz`  | 19,194,733 (~18.3 MiB) |
| `freenet-aarch64-unknown-linux-musl.tar.gz` | 18,063,482 (~17.2 MiB) |
| `freenet-x86_64-pc-windows-msvc.zip`        | 16,335,490 (~15.6 MiB) |
| `freenet.exe` (standalone)                  | 47,792,128 (~45.6 MiB) |
| `Freenet-0.2.112.dmg`                       | 35,892,355 (~34.2 MiB) |

Compressed Linux/Windows node archives are far smaller than the installed macOS
app bundle; the Windows standalone `freenet.exe` is closer to half that size.
Installer/notarization overhead for embedding into TwistedPear is still unknown.

## Status

S5 remains **partial**. Fresh-distribution signature checks and an actual
signed/notarized TwistedPear package containing the pinned binary are still
required. F4 must not bundle the running installed macOS copy.
