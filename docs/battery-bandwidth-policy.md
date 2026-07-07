# Battery and Bandwidth Policy (Draft)

Status: Phase 7 policy draft — desktop/simulator numbers below; device measurements remain
hardware debt ([STATUS-HARDWARE.md](../STATUS-HARDWARE.md) H3, H11, H13).

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

Enforcement: `packages/bridge-hyper` fetch strategy and `test:budgets` conformance.

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
