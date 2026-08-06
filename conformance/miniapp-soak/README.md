# Mini-app soak

<!-- tp-doc
lifecycle: reference
audited: 2026-07-20
register: none
-->

Phase 4 M8 CI-tier soak: cycles launch, suspend, resume, and stop across the three
`apps/examples` apps under simulated interface flapping.

```sh
npm run test:miniapp-soak
```

Nightly runs use a longer window via `SOAK_DURATION_MS`. Full 24 h device soak with
interface flapping is hardware-gated per [STATUS-HARDWARE.md](../../STATUS-HARDWARE.md).
