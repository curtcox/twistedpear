# Handbook conformance (Phase D)

Headless install → TOC/chapter render → applet execution on
`NodeWorkerSandboxBackend`, plus diagnostic report round-trip / diff
(export via `share.put`, seeded cross-host status matrix).

```bash
npm run test:handbook
npm run test:handbook-report   # same suite (D2 checklist entry point)
npm run test:handbook-mobile   # iOS + Android worklet path (D3)
npm run test:web-handbook      # Playwright browser web host
```

Rebuild content without the full package test:

```bash
npm run build:handbook
```

See [docs/handbook.md](../../docs/handbook.md).
