# What TwistedPear is

<!-- tp-doc
lifecycle: live
audited: 2026-07-10
register: none
-->

TwistedPear is a peer-to-peer app platform. A **host** on each device is a full
Reticulum peer; **mini-apps** are sandboxed JavaScript bundles that talk to the
host only through the SDK.

## Two planes

- **Control plane** — Reticulum handles identity, announces, links, LXMF, and
  off-grid Resource transfer.
- **Bulk plane** — Hypercore / Hyperdrive / Hyperswarm carry large package
  syncs when IP connectivity exists. [Pears bulk plane](chapter:pears-bulk-plane).

## Trust model

Publisher identity **is** network identity. Packages are Ed25519-signed with the
developer's Reticulum key, so discovering an app and trusting its author use the
same root.

## This Handbook

This document is itself a mini-app. If it installed and rendered on _this_ host,
you have already exercised packaging, install, sandbox, broker, and the widget
renderer. Chapters later add interactive applets that probe live capabilities.

Open **Diagnostics** from the table of contents to run every probe, export a
report, or compare against another device. Reference pages in Part V are
generated from the same runtime sources the host uses. Host-specific behavior:
[Part II — The hosts](chapter:host-desktop).
