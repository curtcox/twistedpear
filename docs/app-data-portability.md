# Mini-app data export and restore — current

<!-- tp-doc
lifecycle: live
audited: 2026-08-25
register: software
counterpart: docs/app-data-portability-plan.md
-->

**This describes the implementation as it exists now.** Host chrome, signed
`dataVersion` migrations, and recovery-word presentation of the archive key remain
in the [portability plan](app-data-portability-plan.md). Where the two disagree, this
file wins.

A user can carry **their own data** off a device as an encrypted file and land it on
another installation of the same app. Grants, install rows, and the
installation-derived app address do not travel. The publisher's package is a
separate object.

## Archive

`tp app export <app-id>` snapshots `miniapp-kv:`, `miniapp-bee:`,
`miniapp-bee-seq:`, and `miniapp-workspace:` for that app, plus LXMF pending rows
only with `--include-pending`. It refuses `miniapp-grants:` and `installed:` keys.
The file is `TPAPDT01`: scrypt (N=32768, r=8, p=3) to a 32-byte key, then chunked
AES-256-GCM with the header as associated data. `tp app export` is a write with no
reader on the other side of the CLI until restore.

Framing and snapshot selection live in
[`app-data-archive.ts`](../packages/host-core/src/app-data-archive.ts) and
[`app-data-archive-frame.ts`](../packages/host-core/src/app-data-archive-frame.ts).

## Restore

`tp app restore <file>` decrypts that archive and writes the records. It stages to
a scratch prefix and copies onto the live keys only after the archive has fully
decoded, so a truncated or wrong-passphrase file leaves the store unchanged.

- Existing rows for the same app **refuse** unless `--replace` is passed; replace
  deletes the live prefixes first. There is no merge.
- `--quota-bytes` refuses before writing when the landing size would exceed the
  budget.
- A missing install row is allowed: the bytes are **parked** and the CLI says to
  install the app. Data outliving its package is the feature.
- Every successful restore prints that **the data moves; the app's address does
  not.**

`restoreAppData` is in
[`app-data-restore.ts`](../packages/host-core/src/app-data-restore.ts). The CLI
commands are
[`app-data-commands.ts`](../packages/cli/src/commands/app-data-commands.ts).
