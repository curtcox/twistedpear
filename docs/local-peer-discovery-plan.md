# Local peer discovery — remaining delivery plan

<!-- tp-doc
lifecycle: planned
audited: 2026-08-05
register: software
counterpart: docs/local-peer-discovery.md
-->

**This document contains only work that is not yet verified.** The implemented platform,
security boundary, adapters, host bindings, Peer Link app, and automated evidence are
recorded in [Local peer discovery — current implementation](local-peer-discovery.md).
Required external trials are tracked individually in the
[evidence register](local-peer-discovery-evidence.md). Those live documents override this
plan if they disagree.

The software implementation is complete for mechanisms available to current production
runtimes. The plan remains open because physical-device, browser/network, service, and soak
evidence cannot be inferred from simulators or unit tests, and because the proposed browser
Local Peer-to-Peer API does not yet have a testable production implementation.

## Remaining evidence campaigns

Run and retain sanitized results for each gate in the evidence register:

1. Pair Android and iOS hosts over the native Bluetooth invitation path, covering
   foreground/background transitions, permission denial, negotiated MTU variation,
   disconnect, recovery, and a signed application-message exchange.
2. Transfer audible FSK invitations between physical devices at 44.1 and 48 kHz in quiet
   and ordinary-room conditions. Record retries and FEC recovery without retaining PCM.
3. Exercise static and animated QR with the camera/device matrix, including denied camera
   permission, paste, keyboard, screen-reader, spoken-code, and Morse alternatives.
4. Run WebRTC pairing on current stable Chromium, Firefox, and WebKit across LAN,
   ICE-failure, and TURN-required networks. Retain classifications, never SDP or credentials.
5. Test a disposable self-hosted ntfy server with and without authentication, covering
   `TPN2` short codes, legacy `TPN1` decoding, ciphertext-only storage/logs, CORS failure,
   reconnect, replay rejection, and deletion after the run. Routine CI must never use the
   public service.
6. Pair two reachable Reticulum hosts and verify automatic discovery, identity
   confirmation, presence, LXMF, Resource, and transport-backed announce use through the
   same confirmed route.
7. Run the long-duration battery, bandwidth, reconnect, hostile-input, accessibility, and
   mixed-version campaign before changing any mechanism from implemented to verified.

Each campaign updates `docs/local-peer-discovery-evidence.md`. Hardware-gated results also
belong in `STATUS-HARDWARE.md`; do not change a pending row on simulated evidence alone.

## Future browser Local Peer-to-Peer API

`LP2PRequest` and `LP2PReceiver` remain feature-detected and reported as unsupported (or
experimental and policy-disabled) today. Implement the adapter only after an ordinary
production browser ships a version that can be exercised in conformance. The adapter must:

- translate browser events into the existing `PeerDiscoveryAdapter` contract;
- use the canonical signed, expiring, single-use invitation and trusted confirmation flow;
- expose no browser connection object, address, or credential to a mini-app;
- obey the common payload, timeout, abort, cancellation, and replay budgets; and
- degrade to another adapter with an actionable diagnostic when unavailable.

## Closure

Archive this plan only when every mechanism advertised as available has automated evidence
plus its required external evidence, Peer Link and the unchanged chapter-5 cookbook apps
exchange a signed message across two real hosts, and unavailable browser capabilities have
tested actionable fallbacks. Add the archive entry to `archive/README.md` at that time.
