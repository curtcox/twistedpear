import { grantStoreKey } from "../capabilities.js";
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

export function pickFallbackForeground(
  apps: ReadonlyMap<string, ActiveApp>,
): string | null {
  let last: string | null = null;
  for (const key of apps.keys()) last = key;
  return last;
}
