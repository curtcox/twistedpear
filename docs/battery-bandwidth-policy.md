# Battery and Bandwidth Policy (Draft)


<!-- tp-doc
lifecycle: reference
audited: 2026-07-21
register: none
-->

Status: enforced software policy — device energy measurements remain hardware debt
([STATUS-HARDWARE.md](../STATUS-HARDWARE.md) H3, H11, H13).

## Principles

1. **User control:** always-on mesh participation is opt-in with visible cost (notification
   on Android; explicit interface toggles on all hosts).
2. **Budget before fetch:** package and Resource transfers consult size budgets before
   starting; LoRa/RNode paths block bulk installs (&gt; 64 KiB default).
3. **Foreground preference:** mini-apps run one at a time in foreground; no background
   mini-app execution on any host.
4. **Measure then tune:** policy defaults are conservative; device soaks replace estimates.

## Interface bandwidth tiers

| Interface | Typical throughput | Install suitability | Default when |
|---|---|---|---|
| TCP / AutoInterface (LAN) | Mbps+ | full packages | WiFi/Ethernet available |
| Hyperswarm / Hyperdrive | variable (DHT) | full packages | seeder reachable |
| BLE phone pipe | tens of kbps | tiny packages only | user-enabled, foreground |
| RNode LoRa | hundreds of bps | LXMF + tiny Resource | user-enabled, budget gate |

Enforcement: each host uses one zero-burst limiter per direction. Reticulum ingress,
egress, and forwarded traffic share it across all registered interfaces; Hyperdrive
replication and the gateway bulk-fetch response use the same host limiter. Package-path
selection still applies the stricter transfer budgets before a fetch begins. The default
is 524,288 bytes/s independently for ingress and egress.

Realtime media uses named `realtime`, `bulk`, and `control` reservations on that same
limiter. Realtime reservations are admitted only when free, are capped at 60% of host
capacity in aggregate, and are released when a stream closes. Active link probes are
explicit user actions, limited to 8 KiB and one probe per app/peer/minute; costly links
may require host confirmation, and the host aborts rather than growing the shared queue.
These rules do not relax principle 3: signaling can wake trusted host chrome, but it does
not start a mini-app in the background.

## Battery budgets (targets — verify on device)

| Mode | Android target | iOS target |
|---|---|---|
| Foreground mesh (TCP + BLE) | &lt; 15% / hr on mid-tier phone | N/A (foreground only) |
| Foreground service + TCP idle | &lt; 5% / hr | — |
| Background grace (iOS) | — | quiesce within 30 s; no always-on promise |
| 8 h background TCP (exempt OEM) | link held or reconnect &lt; 2 min | not promised |

Simulator lifecycle tests (`test:ios-soak:required`) validate quiesce/reconnect logic only,
not absolute drain rates.

## Package size guidance

| Class | Size | Path |
|---|---|---|
| `tiny` | &lt; 64 KiB | any interface |
| `standard` | &lt; 4 MiB | LAN / Hyperdrive preferred |
| `large` | &gt; 4 MiB | LAN / Hyperdrive only; warn on metered |

Default harness quota: 64 MiB installed (`InstalledPackageStore`).

## Propagation and LXMF sync

- Desktop propagation node: cron-friendly; no mobile always-on requirement.
- Host session-invite delivery: desktop re-announces its `lxmf.delivery` destination
  about once a minute; mobile and web announce once when the destination comes up and
  again on foreground/resume — never on a background timer. Signaling still wakes only
  trusted host chrome (principle 3 unchanged).
- iOS background fetch/processing: opportunistic sync only (`docs/ios-host.md`).
- Rate limits: broker 60 msg/s per app; Reticulum interface policy ranks outgoing paths.

## Open items (device data required)

| Measurement | Source |
|---|---|
| BLE sustained kbps screen on/off | H2-B |
| OEM kill time without battery exempt | H3 |
| iOS background LXMF delivery window | H13 |
| Weak-phone watchdog false-positive rate | H11 |
| LoRa LXMF latency | H4-C |

Update LIMITATIONS §§3, §5, and §6 when measurements land.
