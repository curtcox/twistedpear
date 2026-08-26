export const HOST_API_VERSION = "0.21.0";

/** Named controls must carry accessibilityLabel at this minHostApi and above. */
export const ACCESSIBLE_NAME_MIN_HOST_API = "0.21.0";

export function hostApiAtLeast(
  version: string | undefined,
  minimum: string,
): boolean {
  if (version === undefined) return false;
  const parse = (value: string): number[] =>
    value.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const left = parse(version);
  const right = parse(minimum);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const a = left[i] ?? 0;
    const b = right[i] ?? 0;
    if (a !== b) return a > b;
  }
  return true;
}

export interface HostApiChangelogEntry {
  readonly version: string;
  readonly note: string;
}

export const HOST_API_CHANGELOG: ReadonlyArray<HostApiChangelogEntry> = [
  {
    version: "0.1.0",
    note: "Initial mini-app host API: capabilities, broker, lifecycle, widget tree UI, and SDK v1 namespaces.",
  },
  {
    version: "0.2.0",
    note: "Dev-environment capabilities (workspace, ai:chat, apps:*, share:cas), host confirmation channel, dynamic resource limits, pre-launch capability review, code-editor and qr-code widgets.",
  },
  {
    version: "0.3.0",
    note: "host.info() — platform id, host version, HOST_API_VERSION, enabled roles, interface types, and quota snapshot for Handbook diagnostics.",
  },
  {
    version: "0.4.0",
    note: "host.info() includes grantedCapabilities for the calling mini-app (Handbook grant intro and diagnostics).",
  },
  {
    version: "0.5.0",
    note: "ai.chatStream() adds cancellable, coalesced streaming while preserving ai.chat().",
  },
  {
    version: "0.6.0",
    note: "ai.embed() and ai.search() add host-proxied embeddings and bounded cosine vector search.",
  },
  {
    version: "0.7.0",
    note: "workspace.patch() and delta code-editor events add conflict-safe incremental editing.",
  },
  {
    version: "0.8.0",
    note: "peer:connect and the peers SDK add host-owned, app-scoped peer pairing and opaque handles.",
  },
  {
    version: "0.9.0",
    note: "relay:configure and relay:read add host-owned control of relay mode, interface direction, and per-interface telemetry.",
  },
  {
    version: "0.10.0",
    note: "device:* capabilities, device inventory/diagnostics/open/close/read, and host.info() device inventory (location:coarse and ambient-light end-to-end).",
  },
  {
    version: "0.11.0",
    note: "freenet:contract adds brokered Freenet get/put/update with irreversible-update confirmation for put/update.",
  },
  {
    version: "0.12.0",
    note: "Per-peer link observation and budgeted probes, media-readiness types, outbound share-policy visibility, and raw-inbound stream gating.",
  },
  {
    version: "0.13.0",
    note: "Brokered app-to-app channels: apps:channel, destination-named confirmation on both sides, no shared storage.",
  },
  {
    version: "0.14.0",
    note: "runtime:background (Android foreground-service execution) and runtime:wake (rationed periodic wake).",
  },
  {
    version: "0.15.0",
    note: "code-editor language elm, and apps.compile for on-device Guida builds behind apps:package confirmation.",
  },
  {
    version: "0.16.0",
    note: "apps.format and apps.diagnostics for on-device Guida editing (no confirmation); DevStudio multi-file projects.",
  },
  {
    version: "0.17.0",
    note: "lxmf.onMessage, announce.onEvent, and apps.channel.onMessage push delivery; receive() remains a destructive drain.",
  },
  {
    version: "0.18.0",
    note: "notify:post — host-rendered, app-attributed notifications with per-host rate ceiling.",
  },
  {
    version: "0.19.0",
    note: "Brokered crypto.randomBytes, crypto.hash, crypto.hmac, and crypto.timingSafeEqual (no capability; no seal/open).",
  },
  {
    version: "0.20.0",
    note: "Widget vocabulary: text-input multiline/secure/keyboard, plus select, slider, and date.",
  },
  {
    version: HOST_API_VERSION,
    note: "Named controls (switch, slider, select, date) require accessibilityLabel when minHostApi is 0.21.0 or newer.",
  },
];
