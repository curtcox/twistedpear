# Reticulum fundamentals


<!-- tp-doc
lifecycle: live
audited: 2026-07-10
register: none
-->

Reticulum is a cryptography-based networking stack designed for constrained and
unreliable links. TwistedPear uses it as the only hard networking constraint.

## Building blocks

- **Identity** — an X25519/Ed25519 keypair. Destinations are derived hashes.
- **Announce** — a signed public advertisement that a destination is reachable.
- **Link** — an encrypted channel between two destinations.
- **Resource** — a bulk transfer over a link (used when Hyperswarm is unavailable).
- **LXMF** — store-and-forward messaging on top of Reticulum.

## App-scoped destinations

Mini-apps never hold private keys. The host derives an **app destination** from
the device identity plus the app id. Bulk transfer when IP is available:
[Pears bulk plane](chapter:pears-bulk-plane). See [Concepts in practice](chapter:concepts-in-practice)
for a live identity probe, or [Identity & signing](chapter:sdk-identity).
