# Handbook conformance (Phase D)

Headless install → TOC/chapter render → applet execution on
`NodeWorkerSandboxBackend`, plus diagnostic report round-trip / diff
(export via `share.put`, seeded cross-host status matrix).

```bash
npm run test:handbook
npm run test:handbook-report   # same suite (D2 checklist entry point)
npm run test:handbook-mobile   # iOS + Android worklet path (D3), incl. reader UX
npm run test:web-handbook      # Playwright browser web host
```

Rebuild content without the full package test:

```bash
npm run build:handbook         # bundle.js + generated/part-packages/ + audit gate
npm run audit:handbook         # dead links, thin chapters, applet expectations
npm run test:handbook-parts    # pack + launch each part package (also runs in test:handbook)
npm run pack:handbook-parts    # .tpkg for each part (BLE-friendly slices)
npm run capture:handbook-web-ui  # docs/images/handbook-web-handbook.png
```

Shared UI harness helpers live in `ui-helpers.mjs` (TOC search, prev/next,
scroll persistence) and are exercised by `test:handbook`, `test:handbook-mobile`,
and `test:web-handbook`.

See [docs/handbook.md](../../docs/handbook.md).
