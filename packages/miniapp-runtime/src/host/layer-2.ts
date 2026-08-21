import {
  type BrokerContext,
  type BrokerRequest,
  type BrokerResponse,
} from "../broker.js";
import { MiniappLifecycle } from "../lifecycle.js";
import { shouldKeepRunningOnHostSuspend } from "../background-execution.js";
import { findWidgetNode } from "./shared.js";
import type {
  LaunchManifest,
  LimitOverrides,
  MiniappHostOptions,
  MiniappHostSnapshot,
  ResourceLimitUpdate,
  ResourceLimitsSnapshot,
} from "./shared.js";
import { MiniappHostLayer1 } from "./layer-1.js";
import type { ActiveApp } from "./shared.js";
import { pickFallbackForeground } from "./running-apps.js";

function applyNullableLimit(
  overrides: LimitOverrides,
  key: "kvQuotaBytes" | "memoryBytes",
  value: number | null | undefined,
  minimum: number,
  label: string,
): void {
  if (value === undefined) return;
  if (value === null) {
    delete overrides[key];
    return;
  }
  if (!Number.isFinite(value) || value < minimum) {
    throw new RangeError(`Invalid ${label}: ${value}`);
  }
  overrides[key] = Math.floor(value);
}

export abstract class MiniappHostLayer2 extends MiniappHostLayer1 {
  setResourceLimits(
    appId: string,
    update: ResourceLimitUpdate,
  ): ResourceLimitsSnapshot {
    if (update.maxMessagesPerSecond !== undefined) {
      this.broker.setRateLimit(appId, update.maxMessagesPerSecond);
    }

    const overrides = this.limitOverrides.get(appId) ?? {};
    applyNullableLimit(
      overrides,
      "kvQuotaBytes",
      update.kvQuotaBytes,
      0,
      "kv quota",
    );
    applyNullableLimit(
      overrides,
      "memoryBytes",
      update.memoryBytes,
      1,
      "memory limit",
    );

    if (Object.keys(overrides).length === 0) {
      this.limitOverrides.delete(appId);
    } else {
      this.limitOverrides.set(appId, overrides);
    }

    this.logActive(appId, "resource limits updated");
    return this.getResourceLimits(appId);
  }

  getResourceLimits(appId: string): ResourceLimitsSnapshot {
    const overrides = this.limitOverrides.get(appId) ?? {};
    const memoryBytes = overrides.memoryBytes ?? null;
    const app = this.appById(appId);
    return {
      appId,
      maxMessagesPerSecond: this.broker.getRateLimit(appId),
      kvQuotaBytes: overrides.kvQuotaBytes ?? this.options.kvQuotaBytes ?? null,
      memoryBytes,
      memoryPendingRestart:
        app !== undefined &&
        memoryBytes !== null &&
        memoryBytes !== app.launchedMemoryBytes,
    };
  }

  async launch(
    manifest: LaunchManifest,
    bundle: Uint8Array,
  ): Promise<MiniappHostSnapshot> {
    const existing = this.appByIdentity(
      manifest.name,
      manifest.publisherPublicKey,
    );
    if (existing !== undefined) {
      await this.stopInstance(existing, "superseded");
    }

    const grants = await this.options.grantStore.get(
      manifest.name,
      manifest.publisherPublicKey,
    );
    const grantedCapabilities = grants?.granted ?? [];
    const memoryBytes =
      this.limitOverrides.get(manifest.name)?.memoryBytes ?? null;

    const lifecycle = new MiniappLifecycle(
      this.options.backend,
      {
        appId: manifest.name,
        version: manifest.version,
        entryPath: manifest.entry,
        bundle,
        ...(memoryBytes !== null ? { limits: { memoryBytes } } : {}),
        brokerEndpoint: {
          request: (request: BrokerRequest) =>
            this.dispatch(request, manifest, grantedCapabilities),
        },
      },
      {
        now: () => this.now(),
        delay: (ms) => this.delay(ms),
      },
    );

    const app: ActiveApp = {
      runtimeId: `runtime-${this.nextRuntimeId++}`,
      manifest,
      grants: grants ?? {
        appId: manifest.name,
        publisherPublicKey: manifest.publisherPublicKey,
        granted: [],
        updatedAt: 0,
      },
      lifecycle,
      launchedMemoryBytes: memoryBytes,
      widgetTree: null,
      logs: [],
    };
    const key = this.instanceKey(manifest.name, manifest.publisherPublicKey);
    this.apps.set(key, app);
    this.foregroundKey = key;

    const launched = await lifecycle.launch();
    this.logActive(manifest.name, `launched v${manifest.version}`);
    this.options.callbacks?.onLifecycle?.(launched);
    return this.snapshot();
  }

  switchForeground(
    appId: string,
    publisherPublicKey?: string,
  ): MiniappHostSnapshot {
    const app =
      publisherPublicKey === undefined
        ? this.appById(appId)
        : this.appByIdentity(appId, publisherPublicKey);
    if (app === undefined) {
      throw new Error(`Mini-app is not running: ${appId}`);
    }
    this.foregroundKey = this.instanceKey(
      app.manifest.name,
      app.manifest.publisherPublicKey,
    );
    return this.snapshot();
  }

  async suspend(reason = "host-suspended"): Promise<MiniappHostSnapshot> {
    const platform = this.options.hostPlatform ?? "node";
    for (const app of [...this.apps.values()]) {
      if (await this.shouldSkipSuspend(app, platform)) continue;
      this.deviceService?.closeApp(app.manifest.name);
      await this.inboundMedia?.closeApp(app.manifest.name);
      const snapshot = await app.lifecycle.suspend(reason);
      this.options.callbacks?.onLifecycle?.(snapshot);
    }
    return this.snapshot();
  }

  private async shouldSkipSuspend(
    app: ActiveApp,
    platform: MiniappHostOptions["hostPlatform"],
  ): Promise<boolean> {
    const record = await this.options.grantStore.get(
      app.manifest.name,
      app.manifest.publisherPublicKey,
    );
    return shouldKeepRunningOnHostSuspend({
      platform: platform ?? "node",
      granted: record?.granted ?? app.grants.granted,
    });
  }

  async resume(): Promise<MiniappHostSnapshot> {
    for (const app of [...this.apps.values()]) {
      const snapshot = await app.lifecycle.resume();
      this.options.callbacks?.onLifecycle?.(snapshot);
    }
    return this.snapshot();
  }

  async stop(reason = "stopped"): Promise<MiniappHostSnapshot> {
    const foreground = this.foregroundApp();
    if (foreground === null) {
      return this.snapshot();
    }
    return this.stopInstance(foreground, reason);
  }

  async stopApp(
    appId: string,
    publisherPublicKey: string,
    reason = "stopped",
  ): Promise<MiniappHostSnapshot> {
    const app = this.appByIdentity(appId, publisherPublicKey);
    if (app === undefined) {
      return this.snapshot();
    }
    return this.stopInstance(app, reason);
  }

  async stopAll(reason = "stopped"): Promise<MiniappHostSnapshot> {
    for (const app of [...this.apps.values()]) {
      await this.stopInstance(app, reason);
    }
    return this.snapshot();
  }

  async watchdogPing(): Promise<MiniappHostSnapshot> {
    for (const app of [...this.apps.values()]) {
      const snapshot = await app.lifecycle.watchdogPing();
      if (snapshot.state === "crashed") {
        await this.cleanupCrashed(app, snapshot);
      }
    }
    return this.snapshot();
  }

  async handleUiEvent(
    nodeId: string,
    event: string,
    value?: unknown,
  ): Promise<void> {
    const foreground = this.foregroundApp();
    if (foreground === null) {
      throw new Error("No mini-app is running");
    }

    const tree = foreground.widgetTree;
    if (tree === null || findWidgetNode(tree.root, nodeId) === null) {
      throw new Error(`Unknown widget node: ${nodeId}`);
    }

    this.options.callbacks?.onEvent?.({ nodeId, event, value });
    await this.dispatch(
      {
        id: `ui-event-${this.now()}`,
        namespace: "ui",
        method: "event",
        payload: { nodeId, event, value },
      },
      foreground.manifest,
      foreground.grants.granted,
    );
  }

  async dispatchRaw(
    request: BrokerRequest,
    manifest: LaunchManifest,
    granted: ReadonlyArray<string>,
  ): Promise<BrokerResponse> {
    return this.dispatch(request, manifest, granted);
  }

  protected async dispatch(
    request: BrokerRequest,
    manifest: LaunchManifest,
    granted: ReadonlyArray<string>,
  ): Promise<BrokerResponse> {
    const required = this.broker.capabilityFor(
      request.namespace,
      request.method,
    );
    const freshGrants =
      required === undefined || required === null
        ? await this.options.grantStore.get(
            manifest.name,
            manifest.publisherPublicKey,
          )
        : await this.options.grantStore.use(
            manifest.name,
            manifest.publisherPublicKey,
            required,
            this.now(),
          );
    const context: BrokerContext = {
      appId: manifest.name,
      publisherPublicKey: manifest.publisherPublicKey,
      declaredCapabilities: manifest.capabilities,
      grantedCapabilities: freshGrants?.granted ?? granted,
    };

    return this.broker.dispatch(request, context);
  }

  protected async cancelAiStreams(appId: string): Promise<void> {
    const sessions = [...this.aiStreams.entries()].filter(
      ([, session]) => session.appId === appId,
    );
    for (const [streamId, session] of sessions) {
      this.aiStreams.delete(streamId);
      await session.iterator.return?.();
    }
  }

  private async stopInstance(
    app: ActiveApp,
    reason: string,
  ): Promise<MiniappHostSnapshot> {
    const appId = app.manifest.name;
    const key = this.instanceKey(appId, app.manifest.publisherPublicKey);
    await this.peerService?.closeRuntime(appId, app.runtimeId);
    this.deviceService?.closeApp(appId);
    await this.inboundMedia?.closeApp(appId);
    await this.cancelAiStreams(appId);
    this.channelService.dropInbox({
      appId,
      publisherPublicKey: app.manifest.publisherPublicKey,
    });
    const snapshot = await app.lifecycle.stop(reason);
    this.logActive(appId, `stopped (${reason})`);
    this.options.callbacks?.onLifecycle?.(snapshot);
    this.apps.delete(key);
    if (this.foregroundKey === key) {
      this.foregroundKey = pickFallbackForeground(this.apps);
    }
    return this.snapshot();
  }

  private async cleanupCrashed(
    app: ActiveApp,
    snapshot: ReturnType<ActiveApp["lifecycle"]["snapshot"]>,
  ): Promise<void> {
    const key = this.instanceKey(
      app.manifest.name,
      app.manifest.publisherPublicKey,
    );
    await this.cancelAiStreams(snapshot.appId);
    await this.peerService?.closeRuntime(snapshot.appId, app.runtimeId);
    this.deviceService?.closeApp(snapshot.appId);
    await this.inboundMedia?.closeApp(snapshot.appId);
    this.channelService.dropInbox({
      appId: snapshot.appId,
      publisherPublicKey: app.manifest.publisherPublicKey,
    });
    this.logActive(
      snapshot.appId,
      `crashed (${snapshot.reason ?? "watchdog"})`,
    );
    this.apps.delete(key);
    if (this.foregroundKey === key) {
      this.foregroundKey = pickFallbackForeground(this.apps);
    }
    this.options.callbacks?.onLifecycle?.(snapshot);
  }
}
