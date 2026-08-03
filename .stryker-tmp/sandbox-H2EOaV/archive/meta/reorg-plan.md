# TwistedPear documentation reorganization plan


<!-- tp-doc
lifecycle: historical
audited: 2026-07-20
register: none
-->

**Archived 2026-08-02.** This audit work order has been executed; its recommendations
became the `tp-doc` lifecycle headers, the `conformance/doc-audit` suite, and the
`archive/` tree. The rules it proposed are now stated in
[docs/README.md](../../docs/README.md) and [AGENTS.md](../../AGENTS.md); the counts and
findings below are a 2026-07-20 snapshot and are not current.

Audit date: 2026-07-20. Produced per `archive/meta/audit-prompt.md`. This document recommends
how to segregate historical prose, make done-vs-planned unambiguous, and wire
machine-checkable guards — without having applied any moves yet.

## Audit summary

| Check | Result |
|---|---|
| Tracked markdown files | 122 (+ `docs/simulation-architecture.html`) |
| `STATUS-COMPLETE.md` table rows (Item/Evidence/Verify) | 209 |
| Register rows failing **strict** evidence-path check (path must exist literally at cited string) | 35 rows in STATUS-COMPLETE; 1 row in STATUS-SOFTWARE (`0.0.0` misparsed as path — false positive); **0** path failures in STATUS-HARDWARE runbooks when checking known fixture paths |
| Register rows failing **root** `package.json` script check | 1 (`npm run dist` at `STATUS-COMPLETE.md` line 516 — script lives on `apps/host-desktop` workspace only) |
| `RELEASE-PLAN.md` cited scripts missing from root `package.json` | `test:ui-invariants` (gate G7 / stage S3; `RELEASE-PLAN.md:46`, `RELEASE-PLAN.md:136`) — planned, not implemented |
| Relative markdown links broken (file targets; `chapter:` pseudo-links excluded) | **1** — `specs/spec-media/autointerface.md:14` → `spec-wire/spec.md` should be `../spec-wire/spec.md` |
| Status register staleness (declared audit vs last git edit) | `STATUS-COMPLETE.md:10` audited 2026-07-08, git edit 2026-07-19; `STATUS-HARDWARE.md:11` audited 2026-07-06, git edit 2026-07-16; `STATUS-SOFTWARE.md:13` matches git (2026-07-16) |

Most STATUS-COMPLETE “path failures” under strict checking are **shorthand citations**
(basename-only test files, brace globs like `{announce,catalog}.ts`, directory nicknames
like `bridge-hyper/`) that resolve once canonical path rules exist — not missing
artifacts. Representative false alarms vs real gaps are listed in §1 notes and §4.

Documents largely superseded elsewhere:

| Superseded | Superseded by | Evidence |
|---|---|---|
| `PLAN.md` milestone/status sections | `STATUS-COMPLETE.md`, `STATUS-SOFTWARE.md`, `STATUS-HARDWARE.md` | `PLAN.md:3-7` |
| `docs/simulation-implementation-plan.md` phase status | `docs/simulation.md` | `docs/simulation-implementation-plan.md:9-15` |
| `specs/HANDOFF.md` | `specs/README.md` index + per-spec `spec.md` bars | `specs/HANDOFF.md:1-7` (one-shot 2026-07-19) |
| Phase exit checklists in `STATUS-HARDWARE.md` | Same doc’s H1–H22 runbooks + software soaks in `STATUS-SOFTWARE.md` | overlapping open `[ ]` lists `STATUS-HARDWARE.md:433-466` |

---

## 1. Inventory

### Lifecycle classes

- **live** — describes the system as it is now; expected to change as the system does.
- **planned** — describes intended future work; has open items.
- **historical** — records something finished or superseded; consult occasionally, never edit.
- **reference** — stable explanatory material with no done/planned axis (motivation, prior art, limitations, format specs).
- **generated** — produced by tooling; should not be hand-edited and may not belong in version control at all.

### Register citation hygiene (strict audit)

Under a **literal path existence** rule (no basename inference), **35** of **209**
`STATUS-COMPLETE.md` evidence rows fail; under **root `package.json` script** rules,
**1** row fails (`npm run dist`). Failures cluster into fixable classes:

1. **Basename-only paths** (e.g. `golden-vectors.test.ts`, `lifecycle.ts`) — need a
   `repo:` prefix convention or full paths (`packages/reticulum-ts/test/...`).
2. **Brace/glob paths** split by naive parsers (`{announce,catalog}.ts`,
   `resource-{server,client}.ts`) — cite one canonical file or use a directory path.
3. **Workspace-local scripts** — `npm run dist` (`STATUS-COMPLETE.md:516`) must cite
   `npm run dist --workspace=host-desktop` or document workspace scope in the verify column.
4. **Planned-but-not-built commands** — `test:ui-invariants` in `RELEASE-PLAN.md`
   (not a register row, but gates G7).

After normalization, expect **0** register row failures except items explicitly marked
*planned* in the verify column.

### Tracked markdown and HTML

| Path | Purpose | Lifecycle | Git edit | Declared audit | Disposition |
|---|---|---|---|---|---|
| `LIMITATIONS.md` | Limitations, Compromises, and Restrictions | reference | 2026-07-08 | — | leave as is |
| `PLAN.md` | TwistedPear — P2P App Development & Distribution System | historical | 2026-07-16 | — | archive |
| `README.md` | TwistedPear | live | 2026-07-19 | — | leave as is |
| `RELEASE-PLAN.md` | TwistedPear — v1 release plan | planned | 2026-07-18 | — | leave as is; add lifecycle header |
| `STATUS-COMPLETE.md` | TwistedPear — Verified complete work | live | 2026-07-19 | 2026-07-08 | leave as is; add lifecycle header |
| `STATUS-HARDWARE.md` | TwistedPear — Remaining hardware-gated work | live | 2026-07-16 | 2026-07-06 | leave as is; add lifecycle header |
| `STATUS-SOFTWARE.md` | TwistedPear — Remaining software work | live | 2026-07-16 | 2026-07-16 | leave as is; add lifecycle header |
| `apps/examples/README.md` | Example mini-apps | reference | 2026-07-06 | — | leave as is |
| `apps/handbook/README.md` | Handbook | reference | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-1-concepts/concepts-in-practice.md` | Concepts in practice | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-1-concepts/pears-bulk-plane.md` | Pears bulk plane | live | 2026-07-08 | — | leave as is |
| `apps/handbook/content/part-1-concepts/reticulum-fundamentals.md` | Reticulum fundamentals | live | 2026-07-08 | — | leave as is |
| `apps/handbook/content/part-1-concepts/what-is-twistedpear.md` | What TwistedPear is | live | 2026-07-08 | — | leave as is |
| `apps/handbook/content/part-2-hosts/difference-matrix.md` | Live difference matrix | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-2-hosts/host-android.md` | Android host | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-2-hosts/host-desktop.md` | Desktop host | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-2-hosts/host-headless.md` | Headless node & seeder | live | 2026-07-08 | — | leave as is |
| `apps/handbook/content/part-2-hosts/host-ios.md` | iOS host | live | 2026-07-08 | — | leave as is |
| `apps/handbook/content/part-2-hosts/host-web.md` | Web host | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-3-sdk/ai-chat.md` | AI chat | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-3-sdk/announce.md` | Announce & subscribe | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-3-sdk/apps-package.md` | Packaging & preview | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-3-sdk/apps-publish.md` | Publish & install | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-3-sdk/apps-update.md` | Publish, install & update | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-3-sdk/budgets.md` | Budgets & quotas | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-3-sdk/capabilities.md` | Capability model | live | 2026-07-08 | — | leave as is |
| `apps/handbook/content/part-3-sdk/devstudio.md` | DevStudio walkthrough | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-3-sdk/identity.md` | Identity & signing | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-3-sdk/lxmf.md` | LXMF messaging | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-3-sdk/presence.md` | Presence | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-3-sdk/resource-fetch.md` | Resource fetch | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-3-sdk/share-cas.md` | Content-addressed share | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-3-sdk/storage-hyperbee.md` | Hyperbee storage | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-3-sdk/storage-kv.md` | Key/value storage | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-3-sdk/widget-gallery.md` | Widget gallery | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-3-sdk/workspace.md` | Workspace | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-4-diagnostics/device-gated-probes.md` | Device-gated probes | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-4-diagnostics/running-diagnostics.md` | Running diagnostics | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-5-reference/capabilities.md` | Capabilities | live | 2026-07-08 | — | leave as is |
| `apps/handbook/content/part-5-reference/cli.md` | CLI commands | live | 2026-07-08 | — | leave as is |
| `apps/handbook/content/part-5-reference/host-api.md` | Host API | live | 2026-07-08 | — | leave as is |
| `apps/handbook/content/part-5-reference/host-config.md` | Host configuration | live | 2026-07-09 | — | leave as is |
| `apps/handbook/content/part-5-reference/interfaces.md` | Network interfaces | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-5-reference/limitations.md` | Known limitations | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-5-reference/packages.md` | Package format | live | 2026-07-10 | — | leave as is |
| `apps/handbook/content/part-5-reference/quotas.md` | Quotas & limits | live | 2026-07-08 | — | leave as is |
| `apps/handbook/content/part-5-reference/widgets.md` | Widget protocol | live | 2026-07-10 | — | leave as is |
| `apps/harness-mobile/.expo/README.md` | README.md | reference | 2026-07-08 | — | leave as is |
| `apps/harness-mobile/README.md` | TwistedPear Harness (Phase 3–4 dev shell) | reference | 2026-07-06 | — | leave as is |
| `audit-prompt.md` | Prompt: audit TwistedPear and produce a reorganization plan | reference | 2026-07-20 | — | leave as is (meta) |
| `conformance/README.md` | Conformance Harness | reference | 2026-07-07 | — | leave as is |
| `conformance/UPSTREAM.md` | Upstream Pins | reference | 2026-07-06 | — | leave as is |
| `conformance/bare-device/README.md` | Phase 2 hardware-debt register | reference | 2026-07-06 | — | leave as is |
| `conformance/dev-loop/README.md` | Dev Loop | reference | 2026-07-06 | — | leave as is |
| `conformance/devstudio-loop/README.md` | DevStudio two-instance loop | reference | 2026-07-07 | — | leave as is |
| `conformance/examples/README.md` | Example mini-apps (Phase 4 M7) | reference | 2026-07-06 | — | leave as is |
| `conformance/handbook/README.md` | Handbook conformance (Phase D) | reference | 2026-07-10 | — | leave as is |
| `conformance/hostile-apps/README.md` | Hostile Mini-app Fixtures | reference | 2026-07-06 | — | leave as is |
| `conformance/ios-sim/README.md` | iOS simulator conformance | reference | 2026-07-10 | — | leave as is |
| `conformance/miniapp-soak/README.md` | Mini-app soak | reference | 2026-07-06 | — | leave as is |
| `conformance/scenarios/README.md` | Interop Scenarios | reference | 2026-07-06 | — | leave as is |
| `conformance/sdk-interop/README.md` | SDK Interop | reference | 2026-07-06 | — | leave as is |
| `conformance/sim-calibration/README.md` | BLE/LoRa simulation calibration | reference | 2026-07-16 | — | leave as is |
| `conformance/web-handbook/README.md` | Web Handbook conformance (Phase D) | reference | 2026-07-08 | — | leave as is |
| `docs/256t-distribution.md` | 256t distribution | reference | 2026-07-07 | — | leave as is |
| `docs/README.md` | Documentation index | live | 2026-07-19 | — | leave as is; add archive section link |
| `docs/abuse-resistance-loop.md` | Abuse-Resistance Simulation Loop | reference | 2026-07-16 | — | leave as is |
| `docs/android-emulator-lab.md` | Android Emulator Lab | reference | 2026-07-10 | — | leave as is |
| `docs/battery-bandwidth-policy.md` | Battery and Bandwidth Policy (Draft) | reference | 2026-07-06 | — | leave as is |
| `docs/ble-interface.md` | Reticulum BLE Interface Specification | reference | 2026-07-06 | — | leave as is |
| `docs/ci-policy.md` | CI Policy | reference | 2026-07-19 | — | leave as is |
| `docs/desktop-host.md` | TwistedPear Desktop Host | reference | 2026-07-08 | — | leave as is |
| `docs/devstudio.md` | DevStudio: the in-platform development environment | reference | 2026-07-07 | — | leave as is |
| `docs/handbook.md` | Handbook: interactive diagnostic documentation for every host | reference | 2026-07-16 | — | leave as is |
| `docs/ios-host.md` | iOS Host Strategy | reference | 2026-07-10 | — | leave as is |
| `docs/ios-multicast-entitlement.md` | iOS multicast entitlement application (Phase 2 M8) | reference | 2026-07-05 | — | leave as is |
| `docs/ios-submission.md` | iOS Submission Dossier | reference | 2026-07-06 | — | leave as is |
| `docs/mac-validation-screenshots-plan.md` | Mac validation evidence log | historical | 2026-07-16 | — | archive (evidence log) |
| `docs/mac-validation.md` | Single-Mac Automated Validation Plan | reference | 2026-07-09 | — | leave as is |
| `docs/macos-notarization.md` | macOS Notarization Procedure | reference | 2026-07-16 | — | leave as is |
| `docs/miniapp-runtime.md` | Mini-app Runtime | reference | 2026-07-07 | — | leave as is |
| `docs/miniapp-sdk.md` | Mini-app SDK | reference | 2026-07-08 | — | leave as is |
| `docs/motivation.md` | Motivation | reference | 2026-07-18 | — | leave as is |
| `docs/package-format.md` | TwistedPear Package Format (v1) | reference | 2026-07-19 | — | leave as is |
| `docs/prior-art.md` | Prior art and similar projects | reference | 2026-07-18 | — | leave as is |
| `docs/propagation-node.md` | LXMF Propagation Node | reference | 2026-07-06 | — | leave as is |
| `docs/release-automation.md` | Release automation | reference | 2026-07-19 | — | leave as is |
| `docs/sansio.md` | Sans-IO protocol discipline | reference | 2026-07-19 | — | leave as is |
| `docs/security-review.md` | Mini-app Sandbox Security Review (Phase 7) | reference | 2026-07-07 | — | leave as is |
| `docs/simulation-implementation-plan.md` | Deterministic Abuse-Simulation — Implementation Plan | historical | 2026-07-16 | — | archive |
| `docs/simulation.md` | Deterministic Abuse-Simulation — Current Status and Remaining Work | reference | 2026-07-16 | — | leave as is |
| `docs/upstream-publication.md` | Upstream publication | reference | 2026-07-08 | — | leave as is |
| `docs/web-host.md` | Web Host: a full TwistedPear host in the browser | reference | 2026-07-16 | — | leave as is |
| `docs/websocket-interface.md` | Reticulum WebSocket Interface Specification | reference | 2026-07-08 | — | leave as is |
| `docs/simulation-architecture.html` | Simulation architecture (HTML reference) | reference | 2026-07-16 | — | leave as is |
| `formal/README.md` | Authority-machine formal twins | reference | 2026-07-20 | — | leave as is |
| `formal/symbolic/README.md` | Symbolic crypto/authentication twins | reference | 2026-07-15 | — | leave as is |
| `packages/lxmf-ts/README.md` | lxmf-ts | reference | 2026-07-05 | — | leave as is |
| `packages/reticulum-ts/README.md` | reticulum-ts | reference | 2026-07-06 | — | leave as is |
| `specs/HANDOFF.md` | Handoff — implement the spec conformance artifacts | historical | 2026-07-19 | — | archive |
| `specs/README.md` | Specifications | live | 2026-07-20 | — | leave as is |
| `specs/spec-adapter/spec.md` | SPEC-ADAPTER — Effect adapter families and equivalence | live | 2026-07-19 | — | leave as is |
| `specs/spec-authority/spec.md` | SPEC-AUTHORITY — Escrow and recovery-quorum authority machines | live | 2026-07-20 | — | leave as is |
| `specs/spec-bind-loopback/spec.md` | SPEC-BIND-LOOPBACK — In-memory substrate binding | live | 2026-07-19 | — | leave as is |
| `specs/spec-cap/spec.md` | SPEC-CAP — Capability taxonomy and grant lifecycle | live | 2026-07-19 | — | leave as is |
| `specs/spec-chrome/spec.md` | SPEC-CHROME — Host chrome and confirmation conduct | live | 2026-07-20 | — | leave as is |
| `specs/spec-events/spec.md` | SPEC-EVENTS — Event and intent vocabulary | live | 2026-07-19 | — | leave as is |
| `specs/spec-kernel/spec.md` | SPEC-KERNEL — Deterministic scheduler semantics | live | 2026-07-19 | — | leave as is |
| `specs/spec-machine/spec.md` | SPEC-MACHINE — Pure protocol machine contract | live | 2026-07-19 | — | leave as is |
| `specs/spec-media/autointerface.md` | SPEC-MEDIA / AutoInterface profile (adopted) | live | 2026-07-20 | — | leave as is |
| `specs/spec-media/ble.md` | SPEC-MEDIA / BLE profile (TwistedPear-defined) | live | 2026-07-20 | — | leave as is |
| `specs/spec-media/rnode-lora.md` | SPEC-MEDIA / RNode–LoRa profile (adopted) | live | 2026-07-20 | — | leave as is |
| `specs/spec-media/serial.md` | SPEC-MEDIA / Serial profile (adopted) | live | 2026-07-20 | — | leave as is |
| `specs/spec-media/spec.md` | SPEC-MEDIA — Physical/link media profiles (adopted per medium) | live | 2026-07-20 | — | leave as is |
| `specs/spec-media/websocket.md` | SPEC-MEDIA / WebSocket profile (TwistedPear-defined) | live | 2026-07-20 | — | leave as is |
| `specs/spec-msg/spec.md` | SPEC-MSG — LXMF message layer (adopted) | live | 2026-07-20 | — | leave as is |
| `specs/spec-name/spec.md` | SPEC-NAME — 256t identifiers and resolution | live | 2026-07-19 | — | leave as is |
| `specs/spec-pkg/spec.md` | SPEC-PKG — Signed mini-app package format | live | 2026-07-19 | — | leave as is |
| `specs/spec-present/spec.md` | SPEC-PRESENT — Presentation and layout semantics | live | 2026-07-19 | — | leave as is |
| `specs/spec-sdk/spec.md` | SPEC-SDK — Broker API semantics | live | 2026-07-19 | — | leave as is |
| `specs/spec-trace/spec.md` | SPEC-TRACE — Replayable trace format | live | 2026-07-19 | — | leave as is |
| `specs/spec-widget/spec.md` | SPEC-WIDGET — Widget tree vocabulary and update stream | live | 2026-07-19 | — | leave as is |
| `specs/spec-wire/spec.md` | SPEC-WIRE — Reticulum wire protocol (adopted) | live | 2026-07-20 | — | leave as is |
### Directories and non-markdown artifacts

| Path / artifact | Lifecycle | Git / presence | Proposed disposition |
|---|---|---|---|
| `dependency-graph.json` (~546 KB) | generated | Ignored (`.gitignore:28`); present untracked on disk | Leave ignored; add `npm run sansio:depcruise` (or dedicated script) to regenerate on demand; never commit |
| `.tmp/` | generated | Ignored; mac-validation / soak logs | Leave ignored |
| `__pycache__/`, `.venv-rns/` | generated | Ignored; local Python tooling | Leave ignored |
| `.bare-runtime-smoke-store/` and related `.bare-*-store/` | generated | Ignored | Leave ignored |
| `dist/` | generated | Ignored; TypeScript build output | Leave ignored |
| `conformance/sim-campaign/artifacts/` | generated | Ignored | Leave ignored; nightly produces `report.json` locally |
| `release/evidence/`, `release/evidence-logs/` | live evidence | **Tracked**; cited `STATUS-COMPLETE.md:16-17` | Keep tracked; move under `archive/release-evidence/` only if registers stop citing paths — **do not delete** (registers cite logs) |
| `launcher.txt` | unknown | Untracked locally | Add to `.gitignore` if ephemeral; delete if not referenced (not cited in registers) |
| `audit-prompt.md` | reference | Tracked | After reorg lands, move to `archive/meta/audit-prompt.md` |
| `docs/simulation-architecture.html` | reference | Tracked (git 2026-07-16) | Leave as is |
| `packages/reticulum-ts/docs/api/` | generated | Ignored (typedoc) | Leave ignored |
| Bare bundles (`conformance/bare-interop/*.bundle`, etc.) | generated | Ignored | Leave ignored |

---

## 2. Archive scheme

### Options considered

| Option | Pros | Cons |
|---|---|---|
| Top-level `archive/` | Obvious “do not edit”; easy CI rule (`historical` must live here); stable URLs if we add redirects in index | Moves touch many inbound links from README/docs |
| `docs/history/` | Keeps all prose under `docs/` | Competes with live `docs/` in search; blurs “canonical guide” vs “old plan” |
| Per-area `history/` (`specs/history/`, etc.) | Local context | Hard to discover; inconsistent depth; `git log --follow` still works but link targets multiply |
| Git history only; delete files | Zero maintenance | Loses one-click context for handoffs and phase plans; contradicts “consult occasionally” goal |

### Recommendation

Use a **top-level `archive/` tree** with a single `archive/README.md` index (one line
per entry: why archived, what replaced it, date). Keep **live evidence** (`release/evidence/`)
out of `archive/` until registers reference new locations. `git log --follow` survives
renames; update **live** inbound links in the same commit as each move.

Discoverability: add an **Archive** subsection to `docs/README.md` pointing at
`archive/README.md`. Do not link archived docs from the “Start here” table except via
the archive index.

### Files to move (source → destination)

| Source | Destination |
|---|---|
| `PLAN.md` | `archive/design/plan-v0.md` |
| `docs/simulation-implementation-plan.md` | `archive/design/simulation-implementation-plan.md` |
| `specs/HANDOFF.md` | `archive/handoffs/spec-conformance-2026-07-19.md` |
| `docs/mac-validation-screenshots-plan.md` | `archive/evidence/mac-validation-run-log.md` |
| `audit-prompt.md` | `archive/meta/audit-prompt.md` (after this plan merges) |

Leave `RELEASE-PLAN.md` at repo root (active planned doc). Leave `LIMITATIONS.md` and
status registers at root (live).

---

## 3. Done-vs-planned scheme

### Document-level declaration

Add a **required HTML comment block** immediately after the title line (works in markdown
tables and GitHub rendering; machine-checkable):

```markdown
<!-- tp-doc
lifecycle: live | planned | historical | reference
audited: 2026-07-20
register: complete | software | hardware | release | none
-->
```

- **lifecycle** — one of the five classes from §1.
- **audited** — ISO date of last human consolidation; for *historical*, set once at archive time.
- **register** — which canonical register owns open/done items inside this doc (`none` for pure reference).

*historical* documents must live under `archive/` after reorg (enforce in CI).

### In-document items (registers and mixed tables)

For markdown tables that mix status, extend the **leftmost data column** with a fixed
**Status** column (second column, after ID):

| Column | Values | Meaning |
|---|---|---|
| **ID** | `S0`, `H12-B`, `W-S3`, `G7`, … | Stable key used by tests and `release:record` |
| **Status** | `done` \| `open` \| `planned` \| `deferred` | `done` ↔ row in STATUS-COMPLETE; `open` ↔ SOFTWARE or HARDWARE; `planned` ↔ RELEASE-PLAN only; `deferred` ↔ optional backlog |

Use `done` / `open` — not “complete” — to avoid collision with filename STATUS-COMPLETE.

Non-table prose (runbooks): prefix open steps with `[open]`, done evidence with `[done]`.

### Status register decomposition

**Keep the three-register split** (COMPLETE / SOFTWARE / HARDWARE). It already separates
*evidence* from *blocking axis* (software vs device/account/LAN) as `docs/README.md:28-33`
intended. `RELEASE-PLAN.md` stays the **planned** orchestration doc (gates S0–S8, G1–G7);
it must never duplicate row-level status — only cite register IDs.

Optional fourth surface: `docs/simulation.md` for abuse-simulation *live*
status (L2/L3 rungs), linked from RELEASE-PLAN gate G3 — not folded into STATUS-SOFTWARE.

Restructuring not recommended: merging SOFTWARE+HARDWARE would blur CI-closable vs
device-gated work and break `release:status` driver assumptions (`docs/release-automation.md:41-42`).

### Vocabulary alignment

| Surface | Existing vocabulary | Reconciliation |
|---|---|---|
| `specs/README.md` | normative / stub / stub (informative) | **Unchanged** for spec maturity; maps to document lifecycle **live** (normative/stub) vs informative prose inside spec |
| `conformance/README.md` | Phase/milestone tables, suite commands | Treat as **reference** runbooks; suite “M#” labels are not done/planned — point to register IDs for device-deferred rows (`conformance/README.md:61-70`) |
| Root registers | done vs open via document split | Add **ID** + **Status** columns when tables are next edited |

Do not introduce a fourth global status enum; **ID + Status + register ownership** is enough.

---

## 4. Test plan

### Doc-claim verification

| Test | Asserts | Location | npm script | Fails when | Cost |
|---|---|---|---|---|---|
| Register path resolve | Every backtick path in STATUS-* / RELEASE-PLAN evidence columns resolves under rules in `scripts/doc-audit/paths.mjs` | `conformance/doc-audit/paths.test.mjs` | `test:doc-audit` | Missing file after canonicalization rules | <5 s |
| Register script resolve | Every `npm run X` in verify columns exists in root `package.json` or declared workspace map | `conformance/doc-audit/scripts.test.mjs` | `test:doc-audit` | Unknown script name | <1 s |
| Markdown links | All relative `*.md` / `*.html` links resolve (exclude `chapter:`) | `conformance/doc-audit/links.test.mjs` | `test:doc-audit` | Broken target (today: `specs/spec-media/autointerface.md:14`) | <10 s |
| Lifecycle headers | Every tracked `.md` has valid `tp-doc` block; `historical` ⊂ `archive/` | `conformance/doc-audit/lifecycle.test.mjs` | `test:doc-audit` | Missing/invalid header or wrong directory | <5 s |
| Register cross-check | No ID appears `done` in COMPLETE and `open` in SOFTWARE/HARDWARE; no duplicate IDs with conflicting status | `conformance/doc-audit/register-consistency.test.mjs` | `test:doc-audit` | Cross-register conflict | <5 s |
| Staleness | For `lifecycle: live` + `register: *`, git edit date ≤ audited + **14 days** | same | `test:doc-audit` | **Warn** (not fail) beyond 14 days; **fail** beyond 30 days | <5 s |

**CI tier:** `test:doc-audit` in **PR CI** once lifecycle headers exist (step 3 below).
Staleness: warn at 14d, fail at 30d.

Path rules should implement: full repo-relative paths required in registers; optional
`basename` legacy mode warns until row edits land.

### Behavioral gap tests

| Rank | Claim / gap | Current backing | Proposed test |
|---|---|---|---|
| 1 | G7 `test:ui-invariants` | Not in `package.json`; only prose `RELEASE-PLAN.md:136-141` | Add skipped suite `conformance/ui-invariants/run.mjs` with `test:ui-invariants`; `test.skip('register:G7-ui-invariants')` until implemented |
| 2 | L3 abuse rung held | Partial — campaign + oracles; G3 cites escrow semantics still open (`RELEASE-PLAN.md:48-49`) | Extend `test:sim-campaign` gate file asserting L3 cells green in `report.json` |
| 3 | Plan-duration soaks (G1) | Short tiers in CI; open rows `STATUS-SOFTWARE.md:17-27` | Pending tests tagged `register:SOFTWARE-soak-transport` referencing `TRANSPORT_SOAK_DURATION_MS=259200000` |
| 4 | Device rows H1–H22 | Runbooks only | `test.todo('register:H1-A')` in `conformance/device-evidence/manifest.test.mjs` — manifest lists H IDs; device tests stay manual but **pending marker must exist** |
| 5 | “Build dev client” / manual verify rows | No npm script (`STATUS-COMPLETE.md:156-157`, etc.) | Either add `register:manual` exemption list in doc-audit or replace verify cell with nearest automated proxy |

**Pending marker convention** (Vitest):

```typescript
it.todo('register:H7-B — BLE-only package install', () => {});
```

**Sync guard:** `register-consistency.test.mjs` also scans Vitest `todo` titles matching
`register:<ID>`: if STATUS-COMPLETE contains `<ID>` with Status `done`, fail; if
SOFTWARE/HARDWARE row `open` but no `todo`/test reference, warn.

**CI tier:** cross-check + pending guards in **PR CI**; long soak `todo` tests that
actually run when env set → **nightly** only.

---

## 5. Layout and artifact recommendations

| Action | Justification |
|---|---|
| Fix link `specs/spec-media/autointerface.md:14` → `../spec-wire/spec.md` | Only broken relative markdown link found in audit |
| Add `archive/README.md` index when creating `archive/` | Discoverability (`docs/README.md` archive subsection) |
| Add `launcher.txt` to `.gitignore` if not intentional | Untracked stray at repo root |
| Keep `release/evidence/**` tracked | Cited by `STATUS-COMPLETE.md:16-17` and `release:record` (`docs/release-automation.md:41-42`) |
| Do not commit `dependency-graph.json` | Already ignored; regenerate via depcruise |
| Add `conformance/doc-audit/` + `test:doc-audit` | Implements §4 guards |
| Normalize STATUS-COMPLETE verify paths (35 rows) | Strict audit failures; improves machine checkability |
| Document workspace scripts in verify column (`dist`) | `STATUS-COMPLETE.md:516` |
| Consider relocating `audit-prompt.md` post-merge | Meta; not part of product docs |

No deletion of evidence logs without updating registers.

---

## 6. Sequenced execution plan

| Step | Changes | Verify | Size | Owner decision? |
|---|---|---|---|---|
| 1 | Fix `autointerface.md` link | `test:doc-audit` links (once added) or manual link check | XS | No |
| 2 | Add `conformance/doc-audit/` + `test:doc-audit` (links + scripts + paths loose mode) | `npm run test:doc-audit` | M | No |
| 3 | Add `tp-doc` headers to root registers + `docs/README.md`; wire lifecycle test | `test:doc-audit` | M | No |
| 4 | Add `archive/README.md`; move `specs/HANDOFF.md` only | No broken links from live docs (handoff rarely linked) | S | No |
| 5 | Move `docs/simulation-implementation-plan.md`; update links in `docs/abuse-resistance-loop.md`, `docs/README.md` | `test:doc-audit` links | S | No |
| 6 | Move `PLAN.md`; update root README (`README.md:35-37`) and doc index pointers to archive paths | `test:doc-audit` | M | **Yes** — confirm archive filename `plan-v0.md` |
| 7 | Move `docs/mac-validation-screenshots-plan.md`; update `docs/README.md:84` | link audit | S | No |
| 8 | Add register **ID/Status** columns (start with v1 pipeline + release qualification tables) | `register-consistency` | L | **Yes** — ID naming scheme for legacy rows |
| 9 | Tighten path audit to strict mode; fix 35 COMPLETE rows + workspace `dist` | `test:doc-audit` green | L | No |
| 10 | Add `test:ui-invariants` skipped stub + device `todo` manifest | PR CI | M | No |
| 11 | Move `audit-prompt.md` to `archive/meta/` | — | XS | No |

Each step is one commit; steps 4–7 can merge if link updater is automated.

---

## 7. Open questions

1. **Should `RELEASE-PLAN.md` move to `docs/release-plan.md`** for consistency, or stay at root for visibility? (Audit assumes root.)
2. **Evidence retention policy** for `release/evidence-logs/` — grow unbounded vs rotate into `archive/release-evidence/YYYY/` while keeping register pointers updated.
3. **Handbook `chapter:` links** — intentionally non-files; confirm no doc-audit tool should treat them as file paths (current assumption).
4. **Whether `conformance/bare-device/README.md` “hardware-debt register”** should merge into STATUS-HARDWARE or stay a suite-local note (`conformance/bare-device/README.md` title vs centralized H-register).
5. **SPEC-PRESENT stub** (`specs/README.md:84`) — timeline for normative promotion vs keeping presentation informative indefinitely.

