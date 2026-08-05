# Line check

<!-- tp-doc
lifecycle: reference
audited: 2026-07-31
register: none
-->

Shows which app-scoped peers can honestly receive realtime media and where the host currently permits camera or microphone sharing.

Recipe and screenshots: [5. Apps that find each other](../../05-apps-that-find-each-other.md). Sample-app index:
[Appendix: app index](../../appendix-app-index.md).

## What it shows

`links.peers`, budgeted `links.probe`, two-sided readiness, and the read-only outbound
share-policy view. Raw media never enters the app: remote video and local previews are
host-rendered surfaces. Declared low-confidence paths are labelled “probably” rather than
presented as measurements.

## Capabilities

| Capability | Note |
|---|---|
| `link:observe` | App-scoped roster and coarse link/readiness state. |
| `link:probe` | User-initiated, host-budgeted active measurement. |
| `device:stream` | Requests host-owned send/receive sessions. |
| `device:share-policy:read` | Reads only this app's live outbound offers. |
| `device:camera*`, `device:microphone*` | Sensitive raw tiers are used only after call consent. |

## Run it

```sh
tp pack cookbook/apps/line-check
tp dev install <packed>.tpkg
```

The cookbook conformance suite validates, packs, launches, renders, and exercises this
sample's documented primary workflow in CI.
