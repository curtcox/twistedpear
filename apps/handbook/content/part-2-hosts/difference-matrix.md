# Live difference matrix


<!-- tp-doc
lifecycle: live
audited: 2026-07-10
register: none
-->

Hosts share one SDK and widget protocol, but platform sandboxes and entitlements
shape what is actually available. Per-host chapters describe architecture and
lifecycle; `host.info()` returns the facts for **this** host — platform id, host /
API versions, enabled roles, interface types, and quota snapshot — instead of
asserting differences in stale prose.

- [Android host](chapter:host-android) · [iOS host](chapter:host-ios) ·
  [Desktop host](chapter:host-desktop) · [Web host](chapter:host-web) ·
  [Headless node & seeder](chapter:host-headless)

## Probe

{{applet:host-info}}

## How to read differences

| Signal | Typical cause | See also |
|---|---|---|
| `platform=web` + no `auto`/`ble` | Browser leaf: WebSocket gateway only | [Web host](chapter:host-web), [Known limitations](chapter:ref-limitations) §8 |
| `platform=ios` + missing multicast | Multicast entitlement / Bonjour path | [iOS host](chapter:host-ios), [Known limitations](chapter:ref-limitations) §4 |
| `transport=false` on phones | Leaf role; desktops default transport + seeder | [Android](chapter:host-android) / [Desktop](chapter:host-desktop) |
| Interface listed but offline | Feature present; peer/hardware not connected | Part IV diagnostics |
| `not-granted` applet cards | User withheld a manifest capability | [Capability model](chapter:sdk-capabilities) |
| BLE / RNode / camera `device-gated` | Hardware or second device required | [Device-gated probes](chapter:device-gated-probes) |
| Large install over BLE slow | Bulk plane vs Resource fallback | [Budgets & quotas](chapter:sdk-budgets) |

Cross-check with presence (`presence.snapshot`) and Part IV diagnostics: run all
applets, export a report via `share:cas`, then paste another device's 256t id to
diff results side-by-side.
