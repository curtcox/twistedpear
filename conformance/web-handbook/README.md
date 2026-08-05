# Web Handbook conformance (Phase D)

<!-- tp-doc
lifecycle: reference
audited: 2026-07-20
register: none
-->

Playwright: install Handbook → TOC + every chapter → software-tier applets →
diagnostics report export (`share.put` + QR) on the browser web host.

```bash
npm run test:web-handbook
```

Uses `mockAiChat` / `mockLocalPublish` flags on the web core worker so AI and
local-CAS publish/install probes pass without a live gateway or OpenRouter key.
See [docs/handbook.md](../../docs/handbook.md).
