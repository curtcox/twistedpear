# Dev Loop

<!-- tp-doc
lifecycle: reference
audited: 2026-07-20
register: none
-->

The scripted Phase 4 path is:

1. `tp create hello`
2. `tp dev hello-miniapp`
3. edit source
4. observe host hot reload in under 5 seconds

The CLI scaffold and TCP dev server are checked in. The harness worklet exposes a dev
channel client (developer mode only) that connects to `tp dev` and side-loads pushed
bundles.

Run the CI gate with:

```bash
npm run test:dev-loop
```

On the emulator, enable **Developer mode**, run `tp dev` on the host machine, then tap
**Connect tp dev** (defaults to `10.0.2.2:34987` on Android emulator).
