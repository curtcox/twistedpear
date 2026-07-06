export const HOST_API_VERSION = "0.1.0";

export interface HostApiChangelogEntry {
  readonly version: string;
  readonly note: string;
}

export const HOST_API_CHANGELOG: ReadonlyArray<HostApiChangelogEntry> = [
  {
    version: HOST_API_VERSION,
    note: "Initial mini-app host API: capabilities, broker, lifecycle, widget tree UI, and SDK v1 namespaces."
  }
];
