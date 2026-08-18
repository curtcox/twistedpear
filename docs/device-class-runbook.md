# Add a device class (runbook)

<!-- tp-doc
lifecycle: reference
audited: 2026-08-18
register: software
-->

Proof that the registry path is the only growth mechanism: a new class adds no SDK
methods and no broker namespace — only a registry entry, generated capabilities, and a
driver.

## Steps

1. Append an entry to [`specs/spec-device/registry/device-classes.json`](../specs/spec-device/registry/device-classes.json)
   with `id`, `role`, `tiers`, `bandwidth`, `consentClass`, `degradationLadder`, and
   `addedInHostApi`.
2. Add a matching row to [`specs/spec-cap/registry/capability-risk.json`](../specs/spec-cap/registry/capability-risk.json)
   (`low` consent → `elevated` risk, `elevated`/`sensitive` consent → `sensitive` risk,
   unless the class is read-only observation like `device:share-policy:read`).
3. Regenerate:

```sh
npm run generate:device-registry
npm run generate:capability-risk
```

4. Implement a host driver that satisfies `DeviceDriver` (`availability`, optional
   `sense` / `actuate` / `stop`) and register it on the Device Manager.
5. If the class needs host-side derived processing, add a pure function under
   `packages/protocol` and call it from `DeviceManager.materializeSample`.
6. Add focused tests that open/read (or write) the class and assert unknown capability
   strings still fail closed on older hosts via `minHostApi`.
7. Bump `HOST_API_VERSION` only when `addedInHostApi` requires it.

## Smoke proof (scalar class)

`proximity`, `barometer`, `thermometer`, `hygrometer`, and `thermal` landed through this
path in Phase 7 — registry entry → generated `device:*` ids → simulated driver →
`device.open` / `device.read` without new SDK methods.
