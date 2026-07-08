# Live difference matrix

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

| Signal | Typical cause |
|---|---|
| `platform=web` + no `auto`/`ble` | Browser leaf: WebSocket gateway only ([LIMITATIONS.md](../../../LIMITATIONS.md)) |
| `platform=ios` + missing multicast | Multicast entitlement / Bonjour path |
| `transport=false` on phones | Leaf role; desktops default transport + seeder |
| Interface listed but offline | Feature present; peer/hardware not connected |

Cross-check with presence (`presence.snapshot`) and Part IV diagnostics: run all
applets, export a report via `share:cas`, then paste another device's 256t id to
diff results side-by-side.
