# 9. Packaging and publishing

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

This chapter is what actually happens when you press **Publish** or run `tp publish`. You do
not need most of it to ship, but you do need it the first time something refuses to install.

The normative reference is [docs/package-format.md](../docs/package-format.md). Where it and
this chapter differ, it wins.

## The manifest

```json
{
  "formatVersion": 1,
  "name": "com.example.hello",
  "version": "1.0.0",
  "entry": "bundle.js",
  "capabilities": ["lxmf:send", "storage:kv"],
  "icon": "icon.png",
  "minHostApi": "0.1.0",
  "files": [{ "path": "bundle.js", "sha256": "<hex>", "size": 1234 }],
  "driveKey": "<64-hex Hyperdrive public key>",
  "publisherPublicKey": "<128-hex Reticulum identity public key>",
  "signature": "<128-hex Ed25519 signature>"
}
```

You write the top half. The tooling fills in `files`, `driveKey`, `publisherPublicKey`, and
`signature`.

`name` deserves a moment's thought: **app identity is publisher key + name**. A host pins that
pair the first time it sees your package, so the name you publish under is the name you are
stuck with. Reverse-DNS style keeps you from colliding with someone else's `chat` in a user's
catalog.

## The archive

`.tpkg` is a deterministic binary layout — **no timestamps**, files in lexicographic order:

```
TPKG\x01
u32be manifest_json_length
manifest_json_bytes
for each file path in lexicographic order:
  u32be path_utf8_length
  path_utf8_bytes
  u32be content_length
  content_bytes
```

Determinism is the point: the same inputs produce byte-identical output, on any machine, at
any time. That is what makes a content hash a meaningful identity and lets anyone verify you
published what you said you published.

## Signing

The signature is Ed25519 over the canonical JSON of every manifest field **except**
`signature` — keys sorted recursively, no insignificant whitespace.

Per-file SHA-256 hashes live inside that signed manifest, so a tampered file is caught after
unpack even though the signature only covers the manifest.

| Threat                   | What stops it                                                  |
| ------------------------ | -------------------------------------------------------------- |
| Tampered file            | Per-file SHA-256 in the signed manifest, verified after unpack |
| Tampered manifest        | Ed25519 signature over canonical manifest JSON                 |
| Substitute publisher     | First-seen key pinning per app; a key swap is rejected         |
| Downgrade                | Semver monotonicity at catalog ingest and at install           |
| Replay of an old version | The catalog keeps the latest version; a downgrade is rejected  |

Note what is **not** on that list: the signature authenticates the _publisher_, not the
_behaviour_. A signed package is a package you know came from a particular key. It is not a
package anyone has reviewed. The user's defence against a malicious app is the capability
grant, not your signature.

## The 256t identifier

The 94-character string is a fingerprint of the archive bytes. It is not a URL, not a
location, and not a lookup key you could poison.

```
256t: <94 characters>
```

It fits in a chat message, an email, and a QR code, which is the entire distribution story:
you hand it to someone, their host resolves it, verifies the bytes hash to it, and refuses if
they do not.

![The publish result: identifier, QR code, and size](/authors/images/09-publish-result.png)

**Screenshot 9.1 — What publishing gives you.** A result panel from the desktop host. Top row:
app name and version, package size ("2.6 KiB"), and a "Signed" badge with the publisher
fingerprint truncated to eight characters. Middle: a large QR code. Below it, the full
94-character 256t string in monospace across two wrapped lines with a **Copy** button. Bottom:
a line reading "Seeded on 2 interfaces · announced 12 s ago" and a **Re-announce** button.

## What publishing actually does

`tp publish` (and DevStudio's **Publish**) performs five steps:

1. Packs the deterministic archive and signs the manifest.
2. Creates or opens the app's Hyperdrive and publishes the version to it.
3. Computes the 256t identifier from the archive bytes.
4. Signs a **content locator** binding the identifier to the drive key, package hash, version,
   and size.
5. Announces the app plus that locator on your interfaces.

Step 5 is why the identifier alone is not enough for the recipient: their host resolves an
identifier by matching it against a locator announce it has already heard.

> **⚠️ Works, with limits — the locator must arrive before the install can.** A host can only
> resolve a 256t identifier for which it has already received an announce. There is no locator
> re-request, so a host cannot go and ask for one on demand. If you hand someone a string and
> nobody near them carries the app, the install fails and waiting is the only remedy. See
> [LIMITATIONS.md §7](../LIMITATIONS.md).

## Keeping the bytes available

An announce says where the bytes live. Something has to still be there.

```sh
tp node --data-dir ~/.local/share/twistedpear/host   # full host: transport + seeding
tp seed --transport --state-dir .tp/seeder           # headless seeder only
```

If you publish from a laptop that then closes, your app is reachable only from peers who
already cached it. For anything you expect people to install, seed it from something that
stays on. See [docs/desktop-host.md](../docs/desktop-host.md).

Seeders enforce a storage quota and evict over it — `tp publish` reports how many archives
were evicted when it registers a drive.

## The bulk path, and why it might not apply

Hyperswarm and Hyperdrive need IP connectivity. They do not run over Reticulum, and they do
not run in a browser tab.

| Situation                   | How the bytes move                                       |
| --------------------------- | -------------------------------------------------------- |
| LAN or internet peer        | Hyperdrive over Hyperswarm — fast                        |
| Browser host                | The gateway node's `/bulk-fetch` HTTP proxy              |
| Radio-only peer (BLE, LoRa) | Reticulum Resource transfer — orders of magnitude slower |

That last row is why bundle size is a design constraint and not a micro-optimisation. See
[Chapter 12](12-limits-and-budgets.md) for the measured numbers.

> **⚠️ Works, with limits — DHT bootstrap is an external dependency.** Hyperswarm's bootstrap
> nodes are run by Holepunch. A fully sovereign deployment needs self-hosted bootstrap or
> LAN-only swarm mode. See [LIMITATIONS.md §6](../LIMITATIONS.md).

## Icons and extra files

`icon` names a file in your package. Everything you reference must appear in `files` with its
hash — the tooling handles that, but it also means every asset you add is bytes someone may
be pulling over a radio.

For most apps, no icon and one `bundle.js` is the right answer.

## Verifying before you hand out the string

```sh
tp pack my-app --out check.tpkg
```

Pack twice and compare the bytes; they must be identical. Then install it on a second device
from the identifier and run the capability review yourself. [Chapter 13](13-shipping-checklist.md)
is the full list.
