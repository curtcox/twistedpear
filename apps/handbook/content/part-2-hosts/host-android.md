# Android host

The Android host is a React Native shell around the same **Bare worklet** used on
iOS and desktop. Reticulum, LXMF, catalog install, and the mini-app runtime all
run in the worklet; the JVM layer supplies lifecycle, BLE, multicast bridges, and
a foreground service so the node can stay reachable in the background.

## Architecture

- **Expo / RN shell** — settings, grants, confirmations, widget renderer.
- **Bare worklet child** — `reticulum-ts`, `host-core` leaf roles, broker, sandboxes.
- **Native bridges** — TCP, AutoInterface multicast, Bonjour, BLE central/peripheral,
  RNode serial-over-BLE, camera (QR install).

## Roles

Android phones default to **leaf** peers: transport routing and package seeding are
off unless the operator enables them on a dedicated device. Most users run a leaf
that dials LAN peers or a desktop gateway.

## Lifecycle

- **Foreground** — full interface set, mini-app execution, BLE active.
- **Background** — `NodeForegroundService` keeps the worklet alive; interfaces
  quiesce on a grace timer then reconnect on resume (see
  [LIMITATIONS.md](../../../LIMITATIONS.md) §6).
- **Suspended** — no mini-app execution; LXMF store-and-forward only.

## Storage

App data lives under the host's private app storage. Identity keys and package
archives are worklet-managed; clearing app data resets the peer.

## What to expect on this host

Use the [live difference matrix](chapter:difference-matrix) on a real device or
emulator — `host.info()` reports `platform=android`, interface types, and roles
for **this** install. BLE pair, RNode, multicast, and camera probes are
[device-gated](chapter:device-gated-probes) in CI.
