import { grantStoreKey } from "../capabilities.js";
import type { AppChannelResolveResult } from "../services/app-channel.js";
import type { ActiveApp, MiniappHostSnapshot } from "./shared.js";

export class ForegroundRequiredError extends Error {
  readonly code = "FOREGROUND_REQUIRED";

  constructor(
    message = "This operation requires the mini-app to be in the foreground.",
  ) {
    super(message);
    this.name = "ForegroundRequiredError";
  }
}

export function appInstanceKey(
  appId: string,
  publisherPublicKey: string,
): string {
  return grantStoreKey(appId, publisherPublicKey);
}

export function emptyHostSnapshot(): MiniappHostSnapshot {
  return {
    appId: null,
    publisherPublicKey: null,
    version: null,
    state: "stopped",
    widgetTree: null,
    logs: [],
    lastAppError: null,
    diagnostics: { entries: [], dropped: 0 },
  };
}

export function snapshotFromApp(app: ActiveApp): MiniappHostSnapshot {
  const lifecycle = app.lifecycle.snapshot();
  return {
    appId: lifecycle.appId,
    publisherPublicKey: app.manifest.publisherPublicKey,
    version: lifecycle.version,
    state: lifecycle.state,
    widgetTree: app.widgetTree,
    logs: [...app.logs],
    lastAppError: app.lastAppError,
    diagnostics: app.diagnostics.snapshot(),
  };
}

export function findAppById(
  apps: ReadonlyMap<string, ActiveApp>,
  appId: string,
): ActiveApp | undefined {
  for (const app of apps.values()) {
    if (app.manifest.name === appId) return app;
  }
  return undefined;
}

export function resolveChannelPeer(
  apps: ReadonlyMap<string, ActiveApp>,
  appId: string,
  publisherPublicKey?: string,
): AppChannelResolveResult {
  if (publisherPublicKey !== undefined) {
    const app = apps.get(appInstanceKey(appId, publisherPublicKey));
    return app === undefined ? null : { appId, publisherPublicKey };
  }
  const matches: Array<{ appId: string; publisherPublicKey: string }> = [];
  for (const app of apps.values()) {
    if (app.manifest.name === appId) {
      matches.push({
        appId,
        publisherPublicKey: app.manifest.publisherPublicKey,
      });
    }
  }
  if (matches.length === 0) return null;
  if (matches.length > 1) return "ambiguous";
  return matches[0] ?? null;
}

export function pickFallbackForeground(
  apps: ReadonlyMap<string, ActiveApp>,
): string | null {
  let last: string | null = null;
  for (const key of apps.keys()) last = key;
  return last;
}
