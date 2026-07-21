# Appendix: feature status

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

Every feature this cookbook marks as incomplete, in one place. This appendix is a reading
aid; the authoritative registers are [STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md),
[STATUS-HARDWARE.md](../STATUS-HARDWARE.md), and [LIMITATIONS.md](../LIMITATIONS.md). Where
those disagree with this page, they win.

Last reviewed against the registers: **2026-07-21**.

Two sibling lists cover the other reader-facing guides:
[guide/appendix-feature-status.md](../guide/appendix-feature-status.md) for people *using*
TwistedPear, and [authors/appendix-feature-status.md](../authors/appendix-feature-status.md)
for people writing apps. This page covers only what affects the recipes here.

## ⏳ Not yet available

You cannot build these recipes as written today.

| Feature | Where it appears | Blocker | Tracked as |
|---|---|---|---|
| Screenshots | everywhere | Supplied in a separate pass; every image is a generated placeholder. | [images/README.md](images/README.md) |
| Background execution, timers, notifications | [2](02-apps-with-no-capabilities.md#breath-pacer), [4](04-apps-that-talk-to-one-peer.md), [9](09-apps-for-a-bad-link.md) | Apps run only in the foreground. Nothing is delivered, queued, drained, or timed while an app is closed. Every recipe that needs "later" makes the user reopen it. | [LIMITATIONS.md §7](../LIMITATIONS.md) |
| Group messaging, attachments, history sync | [4](04-apps-that-talk-to-one-peer.md#roll-call) | Not in v1 scope. Fan-out is N unicast sends, which is why Roll call is written as a sequential loop. | [LIMITATIONS.md §7](../LIMITATIONS.md) |
| Hyperbee replication between devices | [3](03-apps-that-remember.md) | v1 Hyperbee is local-only; cross-device sync topics are future work. Two devices running Field log share nothing. | [docs/miniapp-sdk.md](../docs/miniapp-sdk.md) |
| Mini-app IPC and shared storage | [4](04-apps-that-talk-to-one-peer.md), [6](06-apps-that-move-files.md) | Deliberately deferred. No recipe can share code or state with another; each carries its own copy of the messaging plumbing. | [LIMITATIONS.md §7](../LIMITATIONS.md) |
| Key rotation, revocation, multi-maintainer apps | [4](04-apps-that-talk-to-one-peer.md#dead-drop), [8](08-apps-that-build-apps.md) | Out of scope for v1. Lose the publisher key and the app can never be updated; a signature you accept is accepted forever. | [docs/package-format.md](../docs/package-format.md) §1 |
| Embeddings or any vector search | [7](07-apps-that-use-a-model.md#ask-the-handbook) | Not in the SDK. Ask the handbook uses keyword scoring because it is the only retrieval available. | [docs/miniapp-sdk.md](../docs/miniapp-sdk.md) |
| A published `tp` binary | [1](01-how-to-use-this-cookbook.md) | Nothing is published or notarized; `tp pack` requires a build from source. | H17, [release plan](../RELEASE-PLAN.md) |
| Measured radio throughput and battery figures | [9](09-apps-for-a-bad-link.md) | Real handset and RNode numbers are hardware debt. The orders of magnitude are right; the specific figures are design targets. | H3, H11, H13 |
| React binding for the UI | [1](01-how-to-use-this-cookbook.md) | A custom reconciler is designed but unbuilt and non-blocking for v1. Every recipe re-renders a whole tree by hand. | [STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md) — optional backlog |

## ⚠️ Works, with limits

You can build these, but not the way the surrounding text might suggest.

| Feature | Limit | Where it appears | Tracked as |
|---|---|---|---|
| Publisher-identity backup | Host-owned `tp` and desktop settings flows support encrypted backup and recovery words; mini-apps never receive the private identity material. | [8](08-apps-that-build-apps.md) | [docs/identity-backup.md](../docs/identity-backup.md) |
| Multipart propagation | Host-side recipes can resume/reassemble bounded payloads; the default ceiling is 64 KiB and 32-byte frames are costly on radio. Mini-apps still have no attachment API. | [6](06-apps-that-move-files.md), [9](09-apps-for-a-bad-link.md) | [docs/multipart-propagation.md](../docs/multipart-propagation.md) |
| Single-file bundles | No in-host bundler, so `import` resolves the SDK and nothing else. Every sample is one file because it has to be. | [1](01-how-to-use-this-cookbook.md) | [LIMITATIONS.md §7](../LIMITATIONS.md) |
| Dev side-loading | Localhost/`adb` only, off by default, always badged **DEV**. You cannot side-load to a phone across a network. | [1](01-how-to-use-this-cookbook.md) | [LIMITATIONS.md §7](../LIMITATIONS.md) |
| Dev preview slot | One slot per host. Previewing again replaces the previous preview, so generated apps cannot be compared side by side. | [1](01-how-to-use-this-cookbook.md), [8](08-apps-that-build-apps.md) | [LIMITATIONS.md §7](../LIMITATIONS.md) |
| Resolving a 256t identifier | Resolves only if a locator announce for those bytes was already heard. No re-request, no lookup. A valid identifier can simply be unresolvable. | [6](06-apps-that-move-files.md), [8](08-apps-that-build-apps.md) | [LIMITATIONS.md §7](../LIMITATIONS.md) |
| QR scanning | Mobile only. Desktop renders codes but accepts pasted strings; design the paste path first. | [6](06-apps-that-move-files.md#photo-drop) | [LIMITATIONS.md §7](../LIMITATIONS.md) |
| Workspace files | 256 KiB per file, 4 MiB and 512 files per app. The per-file limit exists because `code-editor` has no delta protocol. | [6](06-apps-that-move-files.md) | [LIMITATIONS.md §7](../LIMITATIONS.md) |
| Hyperbee history | Every `put` is retained and counts against the byte quota. Append-only designs are cheap; update-in-place designs are not. | [3](03-apps-that-remember.md#field-log) | [docs/miniapp-sdk.md](../docs/miniapp-sdk.md) |
| AI chat | `ai.chat` and `ai.chatStream` share one in-flight slot; streams are coalesced rather than token-aligned; ≤ 64 messages, `maxTokens` clamped to 8,192, model allowlisted host-side and variable per host. | [7](07-apps-that-use-a-model.md), [8](08-apps-that-build-apps.md#form-forge) | [LIMITATIONS.md §7](../LIMITATIONS.md) |
| `presence.snapshot()` | Coarse peer and interface state only — no signal strength, no per-link throughput, no battery, and no events to subscribe to. Link weather polls because it must. | [5](05-apps-that-find-each-other.md#link-weather) | [docs/miniapp-sdk.md](../docs/miniapp-sdk.md) |
| `host.info()` | Requires host API `0.3.0`. Hosts between versions throw; degrade rather than die. | [5](05-apps-that-find-each-other.md#link-weather) | [docs/miniapp-sdk.md](../docs/miniapp-sdk.md) |
| Runaway-app watchdog | Thresholds untuned on low-end hardware; may stop an app that is merely slow. Assume you can be killed between any two writes. | [3](03-apps-that-remember.md#split-the-bill) | H11 |
| Memory limit changes | Apply at the app's next launch, not immediately. Rate and quota changes apply live. | [1](01-how-to-use-this-cookbook.md) | [LIMITATIONS.md §7](../LIMITATIONS.md) |
| Browser storage | On the web host, OPFS/IndexedDB under browser quota and evictable by the user agent. Every storage recipe is weaker on that target. | [3](03-apps-that-remember.md), [6](06-apps-that-move-files.md) | [LIMITATIONS.md §8](../LIMITATIONS.md) |
| Browser sandbox | Rests on sandboxed iframes and CSP rather than OS processes — a weaker boundary than desktop or mobile. | [1](01-how-to-use-this-cookbook.md) | [LIMITATIONS.md §8](../LIMITATIONS.md) |
| Hyperswarm bulk distribution | Needs IP connectivity and Holepunch's DHT bootstrap. Does not run over Reticulum or in a browser tab, so it is unavailable on exactly the targets [Chapter 9](09-apps-for-a-bad-link.md) is about. | [6](06-apps-that-move-files.md), [9](09-apps-for-a-bad-link.md) | [LIMITATIONS.md §6](../LIMITATIONS.md) |

## Permanent trade-offs

These are not going to change; they follow from the design and are documented in full in
[LIMITATIONS.md](../LIMITATIONS.md). Several recipes exist mainly to show how to live with
them.

- **One foreground mini-app at a time.** No multitasking, no background work, no cooperating
  pair of apps. [Beacon lite](09-apps-for-a-bad-link.md#beacon-lite) says so on screen.
- **No native modules.** JavaScript through the broker, or nothing.
- **No central registry, so no store, no search, and no moderation.**
  [App relay](08-apps-that-build-apps.md#app-relay) is what curation looks like without one.
- **No anonymity.** Payloads are encrypted; local radio presence is observable.
- **Radio links are slow.** All of [Chapter 9](09-apps-for-a-bad-link.md).
- **Browsers can never be full peers.** No inbound connections means no seeding and no
  relaying on that target, ever.
- **Signatures authenticate the publisher, not the behaviour.**
  [Dead drop](04-apps-that-talk-to-one-peer.md#dead-drop) spends a section on the difference,
  and [Chapter 8](08-apps-that-build-apps.md) is built around it.
