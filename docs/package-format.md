# TwistedPear Package Format (v1)

Signed mini-app packages for P2P distribution over Hyperdrive and Reticulum Resources.

## 1. Trust model

- The **publisher's Reticulum identity** (Ed25519 signing key) is the sole trust root.
- App identity = publisher public key + app name (`name` field).
- Updates must be signed by the same key (first-seen key pinning).
- A host-level **trust store** (`packages/app-registry/src/trust.ts`) lists publishers
  the user explicitly trusts, imported via inline 256t identity strings (QR/paste; see
  [256t-distribution.md](256t-distribution.md)). Trust gates acceptance UX only —
  a trusted key gets a one-confirmation install with a "Trusted" badge while untrusted
  keys get the full warning flow; the capability review is always shown, and first-seen
  pinning stays authoritative against key swaps.
- **Out of scope (v1):** key rotation, revocation, multi-maintainer apps.

### Threats addressed

| Threat | Mitigation |
|---|---|
| Tampered file | Per-file SHA-256 in signed manifest; verifier checks after unpack |
| Tampered manifest | Ed25519 signature over canonical manifest JSON |
| Substitute publisher | First-seen key pinning per app; key swap rejected |
| Downgrade | Semver monotonicity at catalog ingest and install |
| Replay of old version | Catalog keeps latest version; downgrade rejected |

## 2. Manifest

```json
{
  "formatVersion": 1,
  "name": "com.example.hello",
  "version": "1.0.0",
  "entry": "bundle.js",
  "capabilities": ["lxmf:send", "storage:kv"],
  "icon": "icon.png",
  "minHostApi": "0.1.0",
  "files": [
    { "path": "bundle.js", "sha256": "<hex>", "size": 1234 }
  ],
  "driveKey": "<64-hex Hyperdrive public key>",
  "publisherPublicKey": "<128-hex Reticulum identity public key>",
  "signature": "<128-hex Ed25519 signature>"
}
```

### Signing payload

Signature covers canonical JSON of all fields **except** `signature`. Keys are sorted recursively; no insignificant whitespace.

## 3. Canonical archive (`.tpkg`)

Deterministic binary layout (no timestamps):

```
TPKG\x01
u32be manifest_json_length
manifest_json_bytes
for each file path in lexicographic order:
  u32be path_utf8_length
  path_utf8_bytes
  u32be content_length
  content_bytes
u32be signature_length
signature_bytes
```

**Package hash** = SHA-256 of the entire archive. Identical inputs produce identical archives and hashes on every transport path.

## 4. App destination & announce `app_data`

Destination name:

```
tp.app.<8-byte-publisher-hash-hex>.<8-byte-name-hash-hex>
```

`app_data` uses a compact binary encoding (`TPAD\x01`, ≤383 bytes):

| Field | Encoding |
|---|---|
| formatVersion | u8 |
| name | u8 length + UTF-8 |
| version | u8 length + UTF-8 |
| packageSize | u32be |
| packageHash | 8-byte prefix |
| driveKey | 32 bytes |
| resourceAvailable | u8 (0/1) |
| publisherKeyHash | 8 bytes |
| signatureHash | 8 bytes |
| announceSignature | 64 bytes (Ed25519 over manifest signing payload) |

Hosts ingest announces into a local catalog with trust rules, expiry, and per-publisher caps. Install is always an explicit user action.

## 5. Fetch paths

1. **Hyperdrive** over Hyperswarm (IP required)
2. **LAN mirror** of the same drive from a nearby peer
3. **Reticulum Resource** (works on any interface; slow on BLE/LoRa)

All paths deliver the same canonical archive; verification is identical.

## 6. Size budgets

See [LIMITATIONS.md](../LIMITATIONS.md) §6. Catalog and CLI warn before large transfers on constrained interfaces.

## 7. 256t identifiers and CAS locator announces

Alongside the SHA-256 package hash, every published archive has a 94-character
**256t id** — the SHA-512 of the canonical archive per [256t.org](https://256t.org/) —
shareable as a QR code or pasted string. A signed compact locator (`TPCL\x01`,
≤ 383-byte `app_data`, announced on `tp.cas.<first-8-bytes-of-sha512-hex>`) maps the id
onto a `CatalogEntry`-shaped record, so resolution reuses the §5 fetch paths
unchanged; receivers verify the SHA-512, the SHA-256, and the manifest signature.
Format and flow: [256t-distribution.md](256t-distribution.md); implementation:
`packages/cas-256t`.

## 8. Future work

- Publisher key rotation with signed succession statements
- Revocation lists (Autobase feeds)
- Delta updates (Hyperdrive dedupe softens IP-path updates today)
