# Pears bulk plane

<!-- tp-doc
lifecycle: live
audited: 2026-07-10
register: none
-->

Reticulum is the **control plane** — identity, announces, links, LXMF, and
off-grid Resource transfer. When IP connectivity exists, large package syncs
prefer the **Pears bulk plane**: Hypercore, Hyperdrive, and Hyperswarm.

## Why two planes

Reticulum links are optimized for constrained carriers (BLE, LoRa) with small
MTUs and high latency. Shipping a multi-megabyte `.tpkg` over those links works
but is slow. Hyperswarm discovery plus Hyperdrive replication uses TCP where
available and falls back to Reticulum Resources when it is not.

## Building blocks

- **Hypercore** — append-only signed logs. Each app package is a deterministic
  archive keyed by the publisher's feed.
- **Hyperdrive** — a filesystem view over one or more Hypercores. `tp publish`
  seeds the signed `.tpkg`; peers replicate blocks from seeders on the LAN or
  DHT.
- **Hyperswarm** — topic-based peer discovery for Hyperdrive replication. Desktop
  and headless hosts run seeders by default; phones are usually leaf consumers.

## In practice

| Operation                                | Typical plane                  |
| ---------------------------------------- | ------------------------------ |
| Discover an app announce                 | Reticulum control plane        |
| Install over LAN / internet              | Hyperdrive bulk fetch          |
| Install with no IP path                  | Reticulum Resource transfer    |
| LXMF chat message                        | Reticulum only                 |
| Handbook diagnostic report (`share.put`) | CAS + optional Hyperdrive seed |

Headless seeding: [Headless node & seeder](chapter:host-headless). Distribution
tutorial: [Publish & install](chapter:sdk-apps-publish).
