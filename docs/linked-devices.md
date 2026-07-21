# Linked devices and logical identity

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

## Decision

A linked account has one long-lived **account identity** and one deterministic, distinct
**network identity per device**. The account identity is the existing encrypted publisher
identity and remains the trust root for packages and device certificates. It is never
registered as a live Reticulum destination after linked mode is enabled. This avoids the
ambiguous paths caused by two hosts announcing the same private identity.

Linked mode is optional. Unlinked installations keep their existing single-identity
behavior and wire formats.

## Device identity and certificate

Each installation creates a random 16-byte device id. Its 64-byte Reticulum private key is
derived with HKDF-SHA256 from the account private key, the fixed salt
`TwistedPear linked device identity v1`, and the device id. The id is not secret; account
private material remains encrypted by the identity vault.

The account signs a compact `TPDV\x01` certificate containing:

- account public key;
- device id and derived device public key;
- creation time and a user-visible label;
- Ed25519 account signature over all preceding fields.

Certificates fit Reticulum announce `app_data`. Peers accept a device as part of an account
only after validating the account signature; a transport or bootstrap operator cannot add
a device.

## Pairing

Pairing deliberately reuses the encrypted `.tpidentity` container rather than inventing a
second root-key envelope:

1. On an existing device, choose **Link another device** and export a newly encrypted,
   short-lived account backup. Transfer it by native share or a host-owned QR sequence.
2. The new host imports it through **Join linked account**, verifies the account hash, and
   creates its own device id and certificate.
3. Both devices announce certificates under
   `tp.linked-device.<first-8-bytes-of-account-key-hash>`. Valid certificates are merged into
   the local roster.

The transfer passphrase goes through a separate channel. A link backup is equivalent to the
account recovery words: anyone who obtains it and its passphrase can become the account.

## Package and network separation

Package manifests, app announce summaries, and CAS locators remain signed by the account
identity so publisher trust is stable across devices. Reachable app and Resource
destinations use the serving device identity. Locator format v2 carries the serving public
key separately from the publisher public key; v1 locators imply both are the same.

## Message and state synchronization

There is no magical shared filesystem. Linked hosts exchange an encrypted, append-only
account journal over certified device destinations. Journal records are content-addressed,
signed by the emitting device certificate, deduplicated by record hash, and bounded by the
same propagation and multipart limits as ordinary host traffic.

The first journal record types are:

- received/sent LXMF envelope metadata and ciphertext reference;
- trust, block, mute, and local-report changes;
- installed-app and active-version changes.

Mini-app KV, Hyperbee, workspace files, grants, and arbitrary app state do not sync. Those
remain device-local unless the app explicitly exchanges them. A device removed from the
local roster stops receiving new journal fan-out, but v1 has no global revocation service;
other offline devices learn the removal only when they next sync.

## Compatibility and migration

Enabling linked mode is a one-way network-address migration for that installation: the
account/publisher hash remains stable, while host and app serving destinations move to the
device identity. The UI shows both hashes before confirmation. Disabling linked mode is
not offered because returning the account key to live destination use could recreate a
multi-host collision.

Existing backups and recovery words remain valid. Importing them does not automatically
enable linked mode; the user explicitly chooses **Join linked account** so a normal disaster
recovery does not silently change network identity behavior.

## Security boundaries

- Root keys never enter mini-app IPC, widgets, URLs, logs, or ordinary clipboard actions.
- Device labels are untrusted display text and normalized/bounded before signing.
- Certificates are verified before roster persistence or network use.
- Split-brain does not exist at the Reticulum address layer because devices never share a
  live destination key.
- Account-root compromise still compromises every linked device and publisher signature;
  key rotation and global device revocation remain separate future protocols.
