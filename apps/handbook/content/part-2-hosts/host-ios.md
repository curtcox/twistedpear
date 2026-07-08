# iOS host

The iOS host mirrors Android: a React Native shell supervising a **Bare worklet**
with the same protocol stack. Platform entitlements and background rules shape
which interfaces stay online when the app is not in the foreground.

## Architecture

- **Expo / RN shell** — peer browser, grants, confirmations, widget renderer.
- **Bare worklet child** — identical broker and sandbox model to Android/desktop.
- **Native bridges** — TCP client, Bonjour, BLE (central/peripheral), RNode
  over BLE only (no USB serial on iOS).

## Lifecycle (no foreground-service equivalent)

iOS has no Android-style foreground service. Backgrounding is a **state
transition**:

- **Foreground** — interfaces and the active mini-app run normally.
- **Background grace** — native lifecycle sends `suspend-node`; worklet quiesces
  TCP/multicast timers; existing BLE links may survive briefly.
- **Suspended** — no mini-app execution; pending LXMF is persisted for later sync.

Store-posture builds refuse catalog install and dev side-load; development builds
keep parity with Android for `tp dev` and Handbook installs.

## Entitlements

Local network, Bonjour (`_reticulum._udp`), Bluetooth, and multicast require
usage strings and (for multicast) the networking multicast entitlement. Until
entitlement filing completes, multicast may report unavailable even though the
code path exists — check `host.info()` on **this** device.

## Simulator vs device

The simulator validates worklet boot, TCP/localhost, store-posture refusal, and
Handbook software-tier slices. BLE, real background timing, and LAN multicast
need hardware — see [Device-gated probes](chapter:device-gated-probes).

Compare live signals: [Live difference matrix](chapter:difference-matrix).
