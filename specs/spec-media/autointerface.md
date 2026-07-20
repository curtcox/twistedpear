# SPEC-MEDIA / AutoInterface profile (adopted)

**Group:** A (adopted) · **Status:** normative (profile) · Medium: AutoInterface

Per-medium profile using the five-section template in
[SPEC-WIRE](../spec-wire/spec.md).

## 1. Upstream pin

| Upstream | Version | Role |
|---|---|---|
| Python RNS AutoInterface | 0.9.5 (docker peer) | Live link-local IPv6 + multicast discovery interop |

Framing beneath AutoInterface is Reticulum's ([SPEC-WIRE](spec-wire/spec.md)); this
profile covers only discovery and the datagram carrier.

## 2. Subset

| Feature | TwistedPear use | Pinned by |
|---|---|---|
| Link-local IPv6 scoping (zone-id handling) | Peer/data-plane key matching | `packages/reticulum-interfaces` `auto.test.ts` ("adds an interface scope…", "strips zone ids so data-plane recv keys match discovery peers") |
| Stable multicast group address from group id | Discovery group addressing | `auto.test.ts` ("derives stable multicast addresses from group id") |
| Peer expiry after peering timeout | Presence liveness | `auto.test.ts` ("expires stale peers after the peering timeout") |
| Multicast discovery with Bonjour fallback | LAN peer discovery | `auto-discovery.test.ts` ("prefers multicast…", "falls back to Bonjour…") |
| Bidirectional datagram echo, link echo, LXMF echo | End-to-end carriage | `npm run test:auto-interop` ("bidirectional echo passed", "link echo passed", "LXMF echo passed") |

## 3. Extensions

Bonjour/mDNS discovery fallback for platforms without multicast entitlement
([conformance/bonjour-interop](../../conformance/bonjour-interop/)) — a discovery-plane
addition; the data plane stays plain RNS AutoInterface.

## 4. Deviations

None to the AutoInterface wire behavior.

## 5. Evidence

- `npm run test:auto-interop` — bidirectional/link/LXMF echo (skips peer-expiry slice
  when no link-local IPv6 interface is present).
- `auto.test.ts`, `auto-discovery.test.ts`, `bonjour-mdns.test.ts` in
  [packages/reticulum-interfaces/test](../../packages/reticulum-interfaces/test/)
  (default `vitest` run).
