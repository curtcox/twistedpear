# Host API


<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

Current `HOST_API_VERSION`: **`0.21.0`**.
Manifests pin `minHostApi`; hosts reject packages that require a newer API.

## Changelog

- **`0.1.0`** — Initial mini-app host API: capabilities, broker, lifecycle, widget tree UI, and SDK v1 namespaces.
- **`0.2.0`** — Dev-environment capabilities (workspace, ai:chat, apps:*, share:cas), host confirmation channel, dynamic resource limits, pre-launch capability review, code-editor and qr-code widgets.
- **`0.3.0`** — host.info() — platform id, host version, HOST_API_VERSION, enabled roles, interface types, and quota snapshot for Handbook diagnostics.
- **`0.4.0`** — host.info() includes grantedCapabilities for the calling mini-app (Handbook grant intro and diagnostics).
- **`0.5.0`** — ai.chatStream() adds cancellable, coalesced streaming while preserving ai.chat().
- **`0.6.0`** — ai.embed() and ai.search() add host-proxied embeddings and bounded cosine vector search.
- **`0.7.0`** — workspace.patch() and delta code-editor events add conflict-safe incremental editing.
- **`0.8.0`** — peer:connect and the peers SDK add host-owned, app-scoped peer pairing and opaque handles.
- **`0.9.0`** — relay:configure and relay:read add host-owned control of relay mode, interface direction, and per-interface telemetry.
- **`0.10.0`** — device:* capabilities, device inventory/diagnostics/open/close/read, and host.info() device inventory (location:coarse and ambient-light end-to-end).
- **`0.11.0`** — freenet:contract adds brokered Freenet get/put/update with irreversible-update confirmation for put/update.
- **`0.12.0`** — Per-peer link observation and budgeted probes, media-readiness types, outbound share-policy visibility, and raw-inbound stream gating.
- **`0.13.0`** — Brokered app-to-app channels: apps:channel, destination-named confirmation on both sides, no shared storage.
- **`0.14.0`** — runtime:background (Android foreground-service execution) and runtime:wake (rationed periodic wake).
- **`0.15.0`** — code-editor language elm, and apps.compile for on-device Guida builds behind apps:package confirmation.
- **`0.16.0`** — apps.format and apps.diagnostics for on-device Guida editing (no confirmation); DevStudio multi-file projects.
- **`0.17.0`** — lxmf.onMessage, announce.onEvent, and apps.channel.onMessage push delivery; receive() remains a destructive drain.
- **`0.18.0`** — notify:post — host-rendered, app-attributed notifications with per-host rate ceiling.
- **`0.19.0`** — Brokered crypto.randomBytes, crypto.hash, crypto.hmac, and crypto.timingSafeEqual (no capability; no seal/open).
- **`0.20.0`** — Widget vocabulary: text-input multiline/secure/keyboard, plus select, slider, and date.
- **`0.21.0`** — Named controls (switch, slider, select, date) require accessibilityLabel when minHostApi is 0.21.0 or newer.

## host.info()

Returns platform id, host version, API version, roles, interface types, and quota
snapshot — used by the [live difference matrix](chapter:difference-matrix).

## Workspace quotas

- 262144 bytes/file
- 4194304 bytes total per app
- 512 files per app
