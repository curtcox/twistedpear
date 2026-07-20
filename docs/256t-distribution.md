# 256t distribution


<!-- tp-doc
lifecycle: reference
audited: 2026-07-20
register: none
-->

Mini-apps (and publisher identities) can be shared as a single **94-character
string** per the [256t specification](https://256t.org/), suitable for QR
codes, chat messages, or reading aloud. The string is a content-addressed
identifier, not the content itself: the receiving host resolves it over the
existing package fetch chain.

## Identifier format

A 256t id is 94 base64url characters (RFC 4648 §5 alphabet, no padding):

| Chars | Bytes | Meaning |
|---|---|---|
| 0–7 | 6 | Content length, 48-bit big-endian (up to 256 TB) |
| 8–93 | 64 | Content field |

- **Length > 64:** the field is the **SHA-512** hash of the content.
- **Length ≤ 64:** the field is the content itself, zero-padded to 64 bytes
  ("inline"). Decoders reject non-zero padding and non-canonical tail bits.

Implementation: [`packages/cas-256t/src/codec.ts`](../packages/cas-256t/src/codec.ts)
(`encode256t` / `decode256t` / `verify256t`), with vectors in
`packages/cas-256t/test/`. SHA-512 is provided by `CryptoProvider.sha512`
(node/bare/pure providers).

## Publisher identity strings

A Reticulum identity public key is exactly 64 bytes, so a publisher identity
is shared as an **inline** 256t string — the key travels in the string itself
with no fetch step (`encodePublisherIdentity256t` in
[`packages/app-registry/src/trust.ts`](../packages/app-registry/src/trust.ts)).
The desktop host renders it as a QR code under **Trusted publishers → Show my
identity**; `tp trust show` prints it. Importing one
(paste/scan → `tp trust add <string> --label <name>`, or the desktop panel)
adds the publisher to the local trust store. Trust gates acceptance UX only —
first-seen key pinning in the catalog remains the anti-swap check per app.

## Package resolution

For a `.tpkg` archive the 256t id hashes the whole canonical archive
(SHA-512, alongside the existing SHA-256 `packageHash`). Resolution order on
the receiving host:

1. **Local CAS** — a SHA-512-keyed content-addressable store
   (`CasStore`, keys `cas:<sha512hex>`; inline ids never touch storage).
2. **CAS locator announce** — publishers announce a signed, compact locator
   (`TPCL\x01`, ≤ 383 bytes, [`locator.ts`](../packages/cas-256t/src/locator.ts))
   on the Reticulum destination `tp.cas.<first-8-bytes-of-sha512-hex>`. The
   locator carries `{t256, appId, version, driveKey, packageHash, packageSize,
   publisherPublicKey (raw bytes), ed25519 signature}` and maps directly onto a
   `CatalogEntry`, so the **existing fetch chain is reused unchanged**:
   Hyperdrive → LAN mirror → Reticulum Resource.
3. After fetch, the host verifies **both** the SHA-512 of the archive against
   the 256t id and the SHA-256 `packageHash` from the signed locator, then
   runs the normal `verifyPackage` signature/downgrade/host-API checks and the
   capability review before install.

## Surfaces

- `tp publish` prints the 94-char string (also stored in `.tp/publish.json`
  as `t256`) and emits the CAS locator announce.
- The DevStudio mini-app shows the string as a scannable `qr-code` widget
  after **Package & sign**, and accepts pasted strings for install.
- The desktop host accepts pasted strings in **Catalog → Install from 256t
  string** (camera scan is future work; the QR is rendered for the *other*
  device to scan).
- Mini-apps with the `share:cas` capability can `share.put`/`share.get`
  bounded content by 256t id.
