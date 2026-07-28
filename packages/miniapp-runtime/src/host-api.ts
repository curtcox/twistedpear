export const HOST_API_VERSION = "0.11.0";

export interface HostApiChangelogEntry {
  readonly version: string;
  readonly note: string;
}

export const HOST_API_CHANGELOG: ReadonlyArray<HostApiChangelogEntry> = [
  {
    version: "0.1.0",
    note: "Initial mini-app host API: capabilities, broker, lifecycle, widget tree UI, and SDK v1 namespaces."
  },
  {
    version: "0.2.0",
    note: "Dev-environment capabilities (workspace, ai:chat, apps:*, share:cas), host confirmation channel, dynamic resource limits, pre-launch capability review, code-editor and qr-code widgets."
  },
  {
    version: "0.3.0",
    note: "host.info() — platform id, host version, HOST_API_VERSION, enabled roles, interface types, and quota snapshot for Handbook diagnostics."
  },
  {
    version: "0.4.0",
    note: "host.info() includes grantedCapabilities for the calling mini-app (Handbook grant intro and diagnostics)."
  },
  {
    version: "0.5.0",
    note: "ai.chatStream() adds cancellable, coalesced streaming while preserving ai.chat()."
  },
  {
    version: "0.6.0",
    note: "ai.embed() and ai.search() add host-proxied embeddings and bounded cosine vector search."
  },
  {
    version: "0.7.0",
    note: "workspace.patch() and delta code-editor events add conflict-safe incremental editing."
  },
  {
    version: "0.8.0",
    note: "peer:connect and the peers SDK add host-owned, app-scoped peer pairing and opaque handles."
  },
  {
    version: "0.9.0",
    note: "relay:configure and relay:read add host-owned control of relay mode, interface direction, and per-interface telemetry."
  },
  {
    version: "0.10.0",
    note: "device:* capabilities, device inventory/diagnostics/open/close/read, and host.info() device inventory (location:coarse and ambient-light end-to-end)."
  },
  {
    version: HOST_API_VERSION,
    note: "freenet:contract adds brokered Freenet get/put/update with irreversible-update confirmation for put/update."
  }
];
