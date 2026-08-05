# Add a device class (runbook)

<!-- tp-doc
lifecycle: reference
audited: 2026-07-23
register: software
-->

Proof that the registry path is the only growth mechanism: a new class adds no SDK
methods and no broker namespace — only a registry entry, generated capabilities, and a
driver.

## Steps

1. Append an entry to [`specs/spec-device/registry/device-classes.json`](../specs/spec-device/registry/device-classes.json)
   with `id`, `role`, `tiers`, `bandwidth`, `consentClass`, `degradationLadder`, and
   `addedInHostApi`.
2. Regenerate:

```sh
npm run generate:device-registry
```

3. Implement a host driver that satisfies `DeviceDriver` (`availability`, optional
   `sense` / `actuate` / `stop`) and register it on the Device Manager.
4. If the class needs host-side derived processing, add a pure function under
   `packages/protocol` and call it from `DeviceManager.materializeSample`.
5. Add focused tests that open/read (or write) the class and assert unknown capability
   strings still fail closed on older hosts via `minHostApi`.
6. Bump `HOST_API_VERSION` only when `addedInHostApi` requires it.

## Smoke proof (scalar class)

`proximity`, `barometer`, `thermometer`, `hygrometer`, and `thermal` landed through this
path in Phase 7 — registry entry → generated `device:*` ids → simulated driver →
`device.open` / `device.read` without new SDK methods.
