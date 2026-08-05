# Reticulum relay and configurable interfaces — remaining validation plan

<!-- tp-doc
lifecycle: planned
audited: 2026-08-05
register: hardware
counterpart: docs/relay-interfaces.md
-->

**This document contains only work that cannot be completed by repository software or
simulation alone.** The Interface Manager, relay modes, policy matrix, adapters, SDK,
capabilities, host controls, specification, vectors, and automated tests from the original
plan are implemented and described in
[the current implementation](relay-interfaces.md). That live document wins if the two
disagree.

## Resolved design choices

- `bridge` remains distinct from `transport-node`; it does not announce transport service.
- Optical v1 uses systematic source frames plus one XOR repair frame. This gives bounded,
  deterministic one-erasure recovery without adding a licensed or heavyweight fountain
  dependency. The framing version leaves room for additional repair symbols later.
- Acoustic v1 uses the existing TPA1 chunk/parity framing, three-way bit-majority FEC, and
  a host-owned FSK/AFSK modem effect. Audible is the safe default; ultrasonic is an
  explicit host option whose usefulness remains device-dependent.
- A granted app's relay configuration persists like a user change. Uninstall does not
  silently rewrite host networking; the persistent app-attribution notice lets the user
  review and disable it. A future provenance-aware config store may offer automatic revoke.
- Web hosts stay leaf-only. Browser media can be used for peer discovery and realtime
  sessions, but forwarding other peers' Reticulum traffic is configured on the gateway.

## Remaining external evidence

These checks require physical media, a real service, or multiple machines. They are also
registered in [STATUS-HARDWARE.md](../STATUS-HARDWARE.md); no software-status claim depends
on treating them as already run.

1. Two-device camera↔screen loopback in both directions. Record decode rate, sustainable
   bitrate, one-frame-erasure recovery, permission/indicator behavior, and failure under
   glare, motion, and display refresh mismatch.
2. Two-device speaker↔microphone loopback in audible and (where supported) ultrasonic
   bands. Record bitrate, error rate, FEC recovery, permission/indicator behavior, and
   behavior under background noise and attenuation.
3. Encrypted packet round-trip through a disposable real ntfy topic and a self-hosted ntfy
   server. Confirm bearer auth, metadata disclosure documentation, reconnect, wrong-secret
   rejection, and cleanup of the disposable topic/token.
4. Mixed-media relay: ntfy→BLE and BLE→optical in `bridge` mode, then a two-hop
   `transport-node` path. Confirm direction gates, policy-denied cells, loop suppression,
   hop exhaustion, per-interface counters, and bandwidth quotas.
5. Host chrome on physical Android and iOS: enable camera/microphone/BLE, exercise an
   authorized mini-app mutation, verify the OS prompt and persistent app-attribution/live
   medium indicator, dismiss the notice, restart, and confirm persisted configuration.

## Evidence handoff

Record device/OS versions, interface configuration, raw counters, failures, and measured
limits in the matching hardware-status row and `LIMITATIONS.md`. If a trial exposes a
software defect, add the defect to `STATUS-SOFTWARE.md`; do not weaken framing,
capability, direction, policy, budget, or attribution checks to make the trial pass.
