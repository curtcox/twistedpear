# Budgets & quotas

Hosts enforce limits at several layers so constrained links (BLE, LoRa) and
shared devices stay predictable. Budgets are not optional hints — exceeding them
returns typed errors or truncated transfers.

## Resource fetch (per call)

`resource:fetch` takes an explicit `budgetBytes` cap. The host pulls through
its link strategy without exposing sockets to the sandbox.

```javascript
import { resource } from "@twistedpear/miniapp-sdk";

const bytes = await resource.fetch({
  resourceId: "offer:demo",
  budgetBytes: 4096
});
```

{{applet:resource-fetch}}

## Package install (per transport)

`conformance/budgets/measured.json` records install time at measured bitrates.
The BLE guidance target is ~180 KiB for under-one-minute installs; this full
Handbook is ~165 KiB (~55 s at measured BLE rates) — intentionally above the
tiny-app example budget.

| Package | Size | LAN | BLE | RNode |
|---|---|---|---|---|
| tiny hello | < 1 KiB | ~1 s | ~1 s | ~6 s |
| handbook (full) | ~165 KiB | ~1 s | ~55 s | ~19 min |

Split per-part Handbook packages if BLE install of the full catalog matters.

## Host & workspace quotas

Node seeding, propagation store, bandwidth caps, workspace file limits, widget
tree size, and AI message caps are listed in [Quotas & limits](chapter:ref-quotas).
Override desktop/node defaults in `<data-dir>/config.json` — see
[Host configuration](chapter:ref-host-config).
