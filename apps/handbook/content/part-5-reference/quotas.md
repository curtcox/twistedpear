# Quotas & limits


<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

Generated from `DEFAULT_QUOTAS` (`host-core`) and miniapp-runtime defaults.
`host.info()` includes a quota snapshot for diagnostics.

## Host node quotas (desktop / `tp node`)

- Seed storage: 2147483648 bytes
- Propagation store: 268435456 bytes
- Propagation messages: 10000
- Bandwidth cap: 524288 bytes/s

Override in `<data-dir>/config.json` — see [Host configuration](chapter:ref-host-config).

## Mini-app workspace (`workspace` capability)

- 262144 bytes per file
- 4194304 bytes total per app
- 512 files per app

## Widget & AI limits

- Widget tree JSON: 256 KiB (default validator)
- AI chat: 64 messages, 8192 max tokens cap

## Transport budgets

BLE install budgets (~180 KiB at measured rates) and Resource fetch caps are
enforced per link type. See [Resource fetch](chapter:sdk-resource-fetch) and
`conformance/budgets/measured.json`.
