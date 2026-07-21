# Identity backup and recovery

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

## Status

Approved and implemented for `host-core`, `tp`, and the desktop host. Mobile and browser
hosts retain their existing identity stores until the same host-owned settings flow is wired;
the portable container and recovery representation are shared implementation, not a proposal.

## Goals

- Encrypt every newly persisted host or publisher identity with a user passphrase.
- Migrate the legacy raw 64-byte identity file without changing the identity.
- Export and import a portable, versioned encrypted backup.
- Offer an offline recovery phrase that reconstructs the same Reticulum identity without
  requiring the backup file.
- Put the same operations behind `tp` and host settings without exposing private-key bytes
  to mini-apps.
- Make overwrite, loss, and concurrent-use hazards explicit.

This does not link devices, synchronize messages, rotate keys, revoke publishers, or make
simultaneous use of one identity on two hosts supported.

## Standards and dependencies

The implementation uses established formats and primitives rather than defining new
cryptography:

- [RFC 7914 scrypt](https://www.rfc-editor.org/rfc/rfc7914) for passphrase derivation,
  with `N=32768`, `r=8`, `p=3`, a 16-byte random salt, and a 32-byte result. This is the
  32 MiB-memory OWASP profile with additional parallel work, chosen so current phones can
  unlock it.
- AES-256-GCM with a fresh 12-byte nonce and 16-byte authentication tag, as specified by
  [NIST SP 800-38D](https://csrc.nist.gov/pubs/sp/800/38/d/final).
- [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) English
  entropy-to-mnemonic encoding for recovery words. A Reticulum identity contains two
  independent 32-byte private seeds, so recovery is represented as two labelled, standard
  24-word BIP-39 sentences rather than extending BIP-39 beyond its 256-bit limit.

`@noble/hashes` supplies scrypt, `@noble/ciphers` supplies AES-GCM, and `@scure/bip39`
supplies the audited English word list and checksum implementation. These work in Node,
Bare, React Native, and browser builds; `host-core` will depend on them directly rather than
relying on transitive packages.

Passphrases are normalized with Unicode NFKC and encoded as UTF-8 before scrypt. UI flows
require at least 12 Unicode code points, reject an empty confirmation, and never persist or
log the passphrase. The core decoder accepts any non-empty passphrase so an identity cannot
be stranded if policy changes later.

## Encrypted identity container

The `.tpidentity` backup and the on-disk identity vault use the same fixed binary container:

| Bytes | Field |
|---:|---|
| 8 | ASCII magic `TPIDBK01` |
| 1 | flags; must be zero in v1 |
| 1 | scrypt `log2(N)`; `15` in v1 |
| 2 | unsigned big-endian `r`; `8` in v1 |
| 2 | unsigned big-endian `p`; `3` in v1 |
| 16 | random scrypt salt |
| 12 | random AES-GCM nonce |
| 16 | Reticulum identity hash, for confirmation after import |
| 80 | AES-GCM output: encrypted 64-byte private identity plus 16-byte tag |

The first 58 bytes are AES-GCM associated data, binding the format, KDF parameters, nonce,
and expected identity hash to the ciphertext. Decoders reject unknown flags, unsupported or
out-of-policy KDF parameters, truncation, trailing bytes, authentication failure, a private
key that `Identity.fromBytes` rejects, or a reconstructed identity whose hash differs from
the header. Failures return one generic “wrong passphrase or damaged backup” error so callers
do not build an oracle around authentication details.

Every encryption uses a new salt and nonce, including changing a passphrase and exporting a
second copy. Container bytes are written mode `0600` through a sibling temporary file,
flushed, and atomically renamed. Existing files are never truncated in place.

## Recovery words

`Identity.getPrivateKey()` is exactly 64 bytes: the first and second 32-byte halves are each
encoded as a standard 24-word BIP-39 English mnemonic. UI and text exports label them
`TwistedPear identity 1/2` and `TwistedPear identity 2/2`. Import requires both groups in
order, validates each BIP-39 checksum, concatenates their entropy, constructs the identity,
and shows the resulting short identity hash before replacement.

Recovery words are an unencrypted copy of the identity. The UI must require a reveal action,
prevent screenshots where the platform offers that control, avoid clipboard use by default,
and display: “Anyone with these words is you. Store them offline. TwistedPear cannot reset
or revoke them.” The phrase is never written into logs, settings, analytics, crash reports,
or the encrypted backup.

## Storage and migration

- A new identity is persisted only as `TPIDBK01`; creating one requires a passphrase.
- An existing 64-byte legacy file is recognized but not silently reused. The CLI or host
  unlock flow loads it once, asks the user to set and confirm a passphrase, atomically rewrites
  it as `TPIDBK01`, and verifies that the identity hash did not change.
- Browser IndexedDB records using the existing PBKDF2/AES-GCM development format migrate
  after their current passphrase unlock succeeds.
- A failed migration leaves the original bytes intact.
- The unlocked identity exists in memory only for the host process lifetime. JavaScript
  cannot promise complete secret-memory erasure; temporary byte arrays are overwritten on a
  best-effort basis and that limitation is documented.

Headless automation injects the passphrase into `host-core`; the library does not read the
environment. The `tp` executable accepts `TP_IDENTITY_PASSPHRASE` for unattended operation
or uses a hidden TTY prompt. There is deliberately no `--passphrase` argument because process
arguments are observable. Desktop and mobile hosts provide the passphrase through their
private host/worklet IPC channel and keep it out of persisted configuration.

## CLI surface

```text
tp identity export [--out identity.tpidentity]
tp identity import <identity.tpidentity> [--force]
tp identity recovery show
tp identity recovery import [--force]
tp identity change-passphrase
```

- Export asks for the current vault passphrase, then asks for and confirms the backup
  passphrase; reusing the current passphrase is allowed but not implicit.
- Import authenticates and validates the candidate before showing old and new short hashes.
  Replacing an existing identity requires `--force` plus an interactive confirmation. In
  non-interactive mode `--force` is necessary and the candidate must already be valid.
- Recovery import reads the two mnemonic groups from hidden TTY input. For automation it may
  read a caller-supplied stream, never command-line arguments or an environment variable.
- Every command returns non-zero without modifying storage on cancellation or failure.

Existing `tp init`, pack, sign, publish, and update commands unlock the vault through the
same secret-reader abstraction. Tests inject a deterministic secret reader and never weaken
the executable’s prompt rules.

## Host UI

Settings gains an **Identity backup** panel on desktop, mobile, and web:

1. **Export encrypted backup** — current passphrase, new backup passphrase twice, then native
   save/share UI for a `.tpidentity` file.
2. **Show recovery words** — current passphrase, explicit reveal warning, the two numbered
   groups, and a confirmation that the user recorded both.
3. **Import backup** — file picker, backup passphrase, candidate hash, destructive replacement
   confirmation, atomic persist, and host restart.
4. **Recover from words** — two inputs, live checksum validation, candidate hash, destructive
   replacement confirmation, atomic persist, and host restart.
5. **Change passphrase** — current passphrase and the new passphrase twice; identity hash must
   remain unchanged.

Private material crosses only host-owned UI IPC. It is never placed in a widget tree, mini-app
workspace, app broker message, URL, QR code, or ordinary clipboard action. Export/import is
disabled while a replacement or passphrase change is in progress.

## Tests and evidence

- Fixed vectors for container encode/decode, scrypt parameters, AES-GCM associated data,
  wrong-passphrase/tamper rejection, and BIP-39 round trips.
- Property tests over random 64-byte identities, passphrases, salts, and nonces.
- Filesystem tests for mode `0600`, atomic replacement, legacy migration, and failure safety.
- CLI conformance for every command, cancellation, overwrite protection, TTY/environment
  secret sources, and preservation of the identity hash.
- Desktop, mobile-worklet, and web-host tests for export/import/recovery IPC and restart.
- Documentation tests proving the incomplete rows are removed consistently.

The acceptance invariant is: exporting by either representation and importing into an empty
host yields exactly the original private bytes and identity hash; no failure path changes the
currently active identity.
