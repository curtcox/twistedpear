# Mini-app data export, backup, restore, and migration — plan

<!-- tp-doc
lifecycle: planned
audited: 2026-08-25
register: software
counterpart: docs/app-data-portability.md
-->

**This document describes proposed work, not current behaviour.** Export and restore
already ship; see [Mini-app data export and restore](app-data-portability.md). What remains
is host chrome, signed `dataVersion` migrations, and recovery-word presentation of the
archive key. The installation-scoped boundary this plan must not cross is in
[Device identity and user identity](linked-devices.md).

The proposal: let a user carry **their own data** off a device onto a new one, and let
version two of an app open version one's bytes on purpose rather than by luck. The user's
data and the publisher's app are different things with different owners; the point of the
feature is that the first outlives the second. This extends §3 of
[the platform facilities survey](platform-facilities-plan.md), which argued the gap — here
is the shape, plus three corrections to that survey's assumptions about what exists.

## 1. What ships today — verified, with corrections

**What holds.** Content addressing is complete: `encode256t`/`decode256t` in
[codec.ts](../packages/cas-256t/src/codec.ts) and the SHA-512-keyed `CasStore` at
[store.ts:31](../packages/cas-256t/src/store.ts), specified by
[SPEC-NAME](../specs/spec-name/spec.md). Signed archives are real: `PACKAGE_MAGIC`
(`TPKG\x01`) and the `TRUNCATED` / `FILE_HASH_MISMATCH` / `SIGNATURE_INVALID` reject
vocabulary at [package.ts:15](../packages/app-registry/src/package.ts), signed over a
canonical manifest payload at [signing.ts:15](../packages/app-registry/src/signing.ts), with
a golden-plus-hostile vector suite pinned by [SPEC-PKG](../specs/spec-pkg/spec.md). The
encrypted-export flow is real and reusable: `tp identity export`, `recovery show`, and
`import` at [identity-commands.ts:87](../packages/cli/src/commands/identity-commands.ts),
over the `TPIDBK01` container at
[identity-backup.ts:93](../packages/host-core/src/identity-backup.ts) — scrypt (N=32768,
r=8, p=3) to a 32-byte key, AES-256-GCM with the header as associated data — plus the two
labelled 24-word BIP-39 groups at
[identity-backup.ts:202](../packages/host-core/src/identity-backup.ts).

**Correction 1 — Hyperbee history is not a question yet.** The backend wired into both
worklet hosts is `KvStorageBeeBackend`
([storage-bee-kv.ts:30](../packages/miniapp-runtime/src/services/storage-bee-kv.ts)), a
flat-KV emulation whose `seq` is a per-key counter incremented on `put`
([storage-bee-kv.ts:43](../packages/miniapp-runtime/src/services/storage-bee-kv.ts)), not a
log position. The real Hyperbee backend, `CorestoreBeeBackend`, is exported but constructed
nowhere outside
[services.test.ts:171](../packages/miniapp-runtime/test/services.test.ts). There is no
history to compact away today: a snapshot is the current key/value set plus each key's
counter. The format should say so, so that adopting Corestore later is a deliberate decision
rather than a silent change of meaning.

**Correction 2 — the migration precedent is a canonicalisation, not a schema migration.**
`migrateLegacyGrantRecord`
([grant-storage-migration.ts:4](../packages/protocol/src/grant-storage-migration.ts))
re-serialises a grant record into canonical field order; it carries no version field and
handles no shape change. But the plumbing around it is the right shape: migrate on read at
[grants.ts:257](../packages/protocol/src/grants.ts), then write the migrated bytes back
lazily only when the original failed strict decode
([grants.ts:306](../packages/protocol/src/grants.ts)). The contrasting precedent is
`FileMultipartCheckpointStore`
([multipart-checkpoint-store.ts:11](../packages/host-core/src/multipart-checkpoint-store.ts)),
which stamps `version: 1` and throws on anything else. Two stored-record policies already
coexist — migrate-on-read and refuse — and a data version must pick one per case.

**Correction 3 — escrow and recovery quorum are bookkeeping, not secret sharing.**
[SPEC-AUTHORITY](../specs/spec-authority/spec.md) puts "the cryptography of shares and
signatures" out of scope, and `collectShare`
([escrow-recovery.ts:232](../packages/host-core/src/escrow-recovery.ts)) records _which
designated guardian_ contributed, by identity hash. There is no share material. So
"encrypt the archive to a recovery quorum" is new cryptography, not assembly.
`npm run formal:escrow` and `npm run formal:recovery` do run and would model the ceremony —
they do not supply keys.

## 2. What a complete per-app snapshot is

Every per-app record lives under a prefix in the one host KV. The verified inventory, and
who owns each row:

| Prefix                                             | Cited at               | Owner        | In a snapshot |
| -------------------------------------------------- | ---------------------- | ------------ | ------------- |
| `miniapp-kv:{appId}:`                              | `storage-kv.ts:63`     | user         | yes           |
| `miniapp-bee:{appId}:`, `miniapp-bee-seq:{appId}:` | `storage-bee-kv.ts:9`  | user         | yes           |
| `miniapp-workspace:{appId}:`                       | `workspace.ts:198`     | user         | yes           |
| `miniapp-lxmf-inbox:{appId}`, `-outbox:`           | `lxmf.ts:89`           | user         | opt-in        |
| `miniapp-grants:{publisherKey}:{appId}`            | `grants.ts:87`         | installation | **no**        |
| `installed:{appId}:{version}`                      | `catalog.ts:311`       | publisher    | **no**        |
| `cas:` blobs                                       | `cas-256t/store.ts:29` | host, shared | by reference  |

Two surfaces are deliberately absent. The suspend checkpoint blob lives in a private field
cleared on every launch
([lifecycle.ts:43](../packages/miniapp-runtime/src/lifecycle.ts) and `:75`) — never
persisted, so never in a snapshot. The LXMF inbox is a destructive read: `receive` deletes
the key it returned ([lxmf.ts:80](../packages/miniapp-runtime/src/services/lxmf.ts)), so
snapshotting it captures only undelivered mail — transport backlog, not app state. Both
mailboxes are excluded by default, behind an explicit `--include-pending`.

## 3. Grants and identity do not travel — and that is the feature

**Grants stay behind.** The grant key carries no account dimension
([grants.ts:87](../packages/protocol/src/grants.ts), pinned by
[grant-installation-scope.test.ts](../packages/miniapp-runtime/test/grant-installation-scope.test.ts)
and recorded in [linked-devices.md](linked-devices.md)). An archive carrying grants would, on
opening, silently re-authorise `lxmf:send` and `device:*` on a machine whose user never saw a
grant screen — the synthetic acknowledgement [SPEC-CHROME](../specs/spec-chrome/spec.md) R4
forbids. Re-granting on the new device _is_ the capability review, and the review is the
product. Restore lands the app ungranted and the user walks the normal screens. The archive
may name which capabilities the app had, as review material under CHROME-R6; naming is not
granting.

**The app's address changes.** `deriveAppScopedIdentity`
([app-scoped-identity.ts:58](../packages/host-core/src/app-scoped-identity.ts)) derives the
app's Reticulum identity by HKDF from the **installation** private key. Restore the same data
onto a different installation and the app keeps every byte but answers at a different
destination hash; peers who knew the old address do not follow. Restore chrome must say this
plainly: _your data moves; your app's address does not._ Fixing it means binding app-scoped
identity to the account rather than the installation — linked-device work, not this plan's.

## 4. Host chrome, never a capability

Export must not become a quieter exfiltration path than the ones apps already have. No
`data:export` capability, no broker namespace, no app-reachable trigger — an app must not be
able to request, detect, or induce an export, for the same reason CHROME-R4 lets no
app-reachable API accept its own confirmation. The host already holds every byte
([miniapp-host.mjs:209](../packages/worklet-core/src/miniapp-host.mjs)); it needs nothing
from the sandbox to write an archive.

- **Desktop.** A per-app **Export data** control in the Runtime controls panel that already
  carries the lifecycle chip and **Force quit**
  ([Testing and debugging](../authors/11-testing-and-debugging.md)), plus
  `tp app export <appId> --out <file>` and `tp app restore <file>` beside `tp identity`.
- **Mobile.** The same control in app settings, writing through the platform share sheet so
  the destination is the OS's decision and the user's, not the host's.
- **Web.** A user-gesture download, encrypted first, because on web it lands somewhere the
  host cannot reason about at all.
- **Headless.** No chrome, no export: CHROME-R5 already requires a host with no confirmation
  channel to refuse rather than proceed silently. `tp app export` on a node host is the
  CLI's own confirmation, not a bypass.

Restore needs the heavier screen: it names the app, the publisher key the archive was taken
under, the byte count, the capabilities the app previously held, and — if data already
exists — what will happen to it (§7).

## 5. What the archive is encrypted to

Default: **a passphrase**, using the KDF and AEAD already proven at
[identity-backup.ts:93](../packages/host-core/src/identity-backup.ts) — scrypt to a 32-byte
key, AES-256-GCM, header as associated data. What does not transfer is the container: that
one is a fixed 138 bytes for a 64-byte private key
([identity-backup.ts:15](../packages/host-core/src/identity-backup.ts)). A state archive is
unbounded and needs framing — chunked, each chunk independently authenticated, so truncation
fails at a known offset instead of decrypting into a plausible prefix.

Two rejected alternatives. _Encrypting to the user's identity key_ needs no new secret, but
[key rotation and revocation do not exist](../authors/03-hello-world-with-the-cli.md), so an
archive encrypted to a key the user later loses is an archive nobody can read — and a backup
whose job is outliving the device cannot depend on that device's key. A passphrase can be
written down. _Encrypting to a guardian quorum_ is out per Correction 3.

The recovery-words ritual is worth reusing for the passphrase rather than the data: the
archive key can be shown as two labelled 24-word groups in the format
`tp identity recovery show` already prints, with the same warning that TwistedPear cannot
reset them. One learned ritual, two uses.

## 6. The migration hook

**The manifest field.** Add `dataVersion` — a non-negative integer, default `0` — to
`AppManifest` and to `MANIFEST_SIGNING_FIELDS`
([manifest.ts:10](../packages/app-registry/src/manifest.ts), which today signs
`formatVersion`, `name`, `version`, `entry`, `capabilities`, `icon`, `minHostApi`, `files`,
`driveKey`, and `publisherPublicKey`). It must be signed: an unsigned data version is one an
attacker retunes to make old bytes look new. Adding it requires a `formatVersion` bump and
new SPEC-PKG vectors.

**Where it runs.** The lifecycle is
`installed → launching → running → suspended → stopped`, with `crashed` reachable from
several of those ([lifecycle.ts:12](../packages/miniapp-runtime/src/lifecycle.ts)) — six
states, not five. There is no general `onSuspend` ([Mini-app SDK](miniapp-sdk.md)), and
suspend is the wrong end of the machine anyway. The seam is the two lines between
`transition("launching")` at
[lifecycle.ts:74](../packages/miniapp-runtime/src/lifecycle.ts) and `backend.spawn` at
`:79`: the host knows the version it is about to run, the app is not yet executing, and
nothing has read a byte of storage. The host compares the stored data version against the
manifest's and, when they differ, runs the app's migration entry in a sandbox holding
**storage capabilities only** — no `lxmf`, no `device`, no `peer`. Failure transitions to
`crashed` with reason `migration-failed`, a state the machine and host UI already
understand.

**Direction.** Forward only. Stored data newer than the manifest refuses to launch rather
than guessing, matching the `DOWNGRADE` reject the package path already takes
([package.ts:424](../packages/app-registry/src/package.ts)) and the rollback discipline in
[Updates and trust](../authors/10-updates-and-trust.md).

## 7. Failure modes, each with a defined answer

| Case                                  | Answer                                                                                                                                                     |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host API version differs              | Allowed. The archive stamps `HOST_API_VERSION` (`host-api.ts:1`) as review material; the data is not API-shaped.                                           |
| App not installed                     | Restore the bytes, park them, prompt to install. Data outliving its app is the feature; the archive names `appId`, version, and publisher key.             |
| Archive `dataVersion` above the app's | **Refuse**, naming the version needed. Same rule as §6.                                                                                                    |
| Data already exists                   | **Refuse by default.** `--replace` deletes the app's prefixes first and says so on the screen. No merge — merge is app semantics the host cannot invent.   |
| Truncated or tampered                 | **Fail at the first bad chunk, write nothing.** Restore stages to a scratch prefix and renames on success; a half-restored app is worse than no restore.   |
| Quota smaller than the archive        | **Refuse before writing**, reporting both numbers. `MiniappKvQuotaError` and `WorkspaceError("WORKSPACE_FULL")` exist; restore must not meet them halfway. |

## 8. Does this need a spec unit?

Not yet, and not by extending SPEC-PKG. That spec's scope is the unit of content a host
agrees to run ([SPEC-PKG](../specs/spec-pkg/spec.md)) — signed by a publisher, verified by a
host, rejected in a publisher-facing vocabulary. A state archive inverts all of that: written
by a host, read by the same user's other host, failing over quota and collision rather than
signatures and downgrades. Folding it in makes one spec answer to two trust relations.

The recommendation is staged. Phases 1–2 need a **vector suite in the SPEC-PKG style** —
golden archives that must restore to a pinned key set, hostile archives that must be rejected
with a pinned error code — beside the implementation. A Group C spec unit (`SPEC-DATA`) earns
its place when restore must interoperate across hosts written by different people, which is
phase 3. Writing the spec before the vectors would invert the order
[specs/README.md](../specs/README.md) sets out, where vectors are normative and prose is
informative.

## 9. Sequencing — each phase is useful shipped alone

| Phase | Deliverable                                                                         | Gate                                                                    |
| ----- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1     | Archive format, chunked AEAD framing, `tp app export`; nothing reads an archive yet | Golden and hostile vectors; a cookbook app round-trips to bytes         |
| 2     | `tp app restore` and the restore flow, including the §3 address warning             | Every §7 row has a test; hostile archives reject with the pinned code   |
| 3     | Desktop, mobile, and web export/restore chrome                                      | Chrome rules per [SPEC-CHROME](../specs/spec-chrome/spec.md) R4/R5/R6   |
| 4     | `dataVersion` in the signed manifest and the pre-launch migration seam              | An app ships v1→v2 with a real shape change; failure lands in `crashed` |
| 5     | Recovery-word presentation of the archive key                                       | The same two-group format `tp identity recovery show` prints            |

Phases 1 and 2 ship today, described in
[Mini-app data export and restore](app-data-portability.md). Phase 4 is independent of
chrome and can slip without stranding them.

The remaining work is `DATA-3-CHROME`, `DATA-4-MIGRATION`, and `DATA-5-RECOVERY` in the
[software backlog](../STATUS-SOFTWARE.md). `DATA-4-MIGRATION` remains independent as the
table requires, while recovery-word presentation waits only for the archive format.

## 10. What this deliberately does not do

- **It is not sync.** No replication, no conflict resolution, no continuous backup. A user
  presses a control and gets a file. Replicated shared state is a separate, larger proposal
  ([platform facilities](platform-facilities-plan.md) §1).
- **It is not cloud storage.** Nothing is uploaded; the archive is a file the user moves.
- **It does not carry authority.** No grants, no publisher trust, no identity — §3.
- **It does not weaken app isolation.** Export reads the host's own KV on the host side of
  the broker, where the host already sees every byte. Restore checks the archive's `appId`
  against the target and refuses a mismatch, preserving the cross-app isolation verified as
  F5 in [security-review.md](security-review.md).
