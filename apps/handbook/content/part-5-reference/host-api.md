# Host API


<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

Current `HOST_API_VERSION`: **`0.7.0`**.
Manifests pin `minHostApi`; hosts reject packages that require a newer API.

## Changelog

- **`0.1.0`** — Initial mini-app host API: capabilities, broker, lifecycle, widget tree UI, and SDK v1 namespaces.
- **`0.2.0`** — Dev-environment capabilities (workspace, ai:chat, apps:*, share:cas), host confirmation channel, dynamic resource limits, pre-launch capability review, code-editor and qr-code widgets.
- **`0.3.0`** — host.info() — platform id, host version, HOST_API_VERSION, enabled roles, interface types, and quota snapshot for Handbook diagnostics.
- **`0.4.0`** — host.info() includes grantedCapabilities for the calling mini-app (Handbook grant intro and diagnostics).
- **`0.5.0`** — ai.chatStream() adds cancellable, coalesced streaming while preserving ai.chat().
- **`0.6.0`** — ai.embed() and ai.search() add host-proxied embeddings and bounded cosine vector search.
- **`0.7.0`** — workspace.patch() and delta code-editor events add conflict-safe incremental editing.

## host.info()

Returns platform id, host version, API version, roles, interface types, and quota
snapshot — used by the [live difference matrix](chapter:difference-matrix).

## Workspace quotas

- 262144 bytes/file
- 4194304 bytes total per app
- 512 files per app
