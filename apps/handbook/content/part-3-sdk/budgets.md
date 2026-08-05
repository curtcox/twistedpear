# Budgets & quotas


<!-- tp-doc
lifecycle: live
audited: 2026-07-10
register: none
-->

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
The BLE guidance target is ~180 KiB for under-one-minute installs; the **full**
Handbook is ~295 KiB (~100 s at measured BLE rates) — intentionally above the
tiny-app example budget.

| Package | Size | LAN | BLE | RNode |
|---|---|---|---|---|
| tiny hello | < 1 KiB | ~1 s | ~1 s | ~6 s |
| handbook (full) | ~304 KiB | ~1 s | ~100 s | ~34 min |
| handbook-part-1-concepts | ~62 KiB | ~1 s | ~21 s | ~7 min |
| handbook-part-2-hosts | ~76 KiB | ~1 s | ~26 s | ~9 min |
| handbook-part-3-sdk | ~147 KiB | ~1 s | ~49 s | ~17 min |
| handbook-part-4-diagnostics | ~61 KiB | ~1 s | ~21 s | ~7 min |
| handbook-part-5-reference | ~114 KiB | ~1 s | ~38 s | ~13 min |

**Per-part packages** (`handbook-part-1-concepts`, …) are built alongside the
full Handbook (`npm run build:handbook` → `generated/part-packages/`). Install
one part at a time when BLE bandwidth is tight.

## Host & workspace quotas

Node seeding, propagation store, bandwidth caps, workspace file limits, widget
tree size, and AI message caps are listed in [Quotas & limits](chapter:ref-quotas).
Override desktop/node defaults in `<data-dir>/config.json` — see
[Host configuration](chapter:ref-host-config).
