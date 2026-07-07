export const HOST_API_VERSION = "0.2.0";

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
    version: HOST_API_VERSION,
    note: "Dev-environment capabilities (workspace, ai:chat, apps:*, share:cas), host confirmation channel, dynamic resource limits, pre-launch capability review, code-editor and qr-code widgets."
  }
];
