# Reticulum ntfy interface

<!-- tp-doc
lifecycle: reference
audited: 2026-08-05
register: none
-->

`NtfyPacketInterface` carries one encrypted Reticulum wire packet per ntfy message. It is
a transport interface, separate from the ntfy peer-discovery rendezvous adapter.

## Wire envelope

The plaintext Reticulum packet is sealed with XChaCha20-Poly1305. The envelope is version
byte `0x01`, a random 24-byte nonce, ciphertext, and a 16-byte authentication tag. The
32-byte key is SHA-256 of the configured shared secret and the version/nonce header is
authenticated associated data. The binary envelope is base64url text for ntfy.

Outgoing uses HTTP `POST`. Incoming polls `?poll=1` as NDJSON, ignores malformed or
unauthenticated messages, and feeds valid packet bytes into `Packet.decode`. A `tx`-only
interface does not start a poll loop. HTTP failure sets the interface offline; a later
successful publish or poll restores it.

## Configuration and privacy

`baseUrl` defaults to `https://ntfy.sh`; self-hosted servers are supported. Configuration
also includes topic, shared secret, optional bearer token, poll interval, direction,
relay participation, and bitrate hint. Enabling through the manager generates and persists
a stable random topic and secret when they were omitted.

The server cannot read Reticulum packets but still observes IP addresses, topic, timing,
and ciphertext size. The interface is disabled by default.

## Verification

`packages/host-core/test/ntfy-interface.test.ts` uses a mock server for encrypted
round-trip, authentication failure, direction behavior, and HTTP errors. The envelope's
golden vector is in `specs/spec-media/vectors/relay-interfaces.json`.

A live third-party or self-hosted ntfy trial remains hardware/network-gated in
[STATUS-HARDWARE.md](../STATUS-HARDWARE.md).
