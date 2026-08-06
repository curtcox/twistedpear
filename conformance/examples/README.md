# Example mini-apps (Phase 4 M7)

<!-- tp-doc
lifecycle: reference
audited: 2026-07-20
register: none
-->

CI-tier suite exercising the three `apps/examples` apps through the real Phase 3 pack/verify
pipeline and the Phase 4 sandbox runtime.

```sh
npm run test:examples
```

Peer-to-peer docker interop (two hosts exchanging LXMF/Resource traffic) is nightly and
device-gated per [STATUS-HARDWARE.md](../../STATUS-HARDWARE.md) (H9–H10).
