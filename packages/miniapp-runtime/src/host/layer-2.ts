import { GrantStore } from "../capabilities.js";
import {
  MiniappBroker,
  type BrokerContext,
  type BrokerRequest,
  type BrokerResponse,
} from "../broker.js";
import type { HostConfirmationChannel } from "../confirm.js";
import { MiniappLifecycle } from "../lifecycle.js";
import { AnnounceService, type AnnounceBackend } from "../services/announce.js";
import {
  AppIdentityService,
  type IdentityBackend,
} from "../services/identity.js";
import { NamespacedLxmfService } from "../services/lxmf.js";
import { PresenceService, type PresenceBackend } from "../services/presence.js";
import {
  LinkQualityService,
  LinkServiceError,
  PeerRouteLinkObservatory,
  type LinkObservatoryBackend,
  type LinkProbeOptions,
  type LinkQualityServiceOptions,
} from "../services/links.js";
import {
  HostInfoService,
  defaultHostInfo,
  type HostInfo,
  type HostInfoBackend,
} from "../services/host-info.js";
import {
  ResourceService,
  type ResourceFetchBackend,
} from "../services/resource.js";
import { HOST_API_VERSION } from "../host-api.js";
import {
  AiService,
  AiServiceError,
  type AiChatBackend,
  type AiChatRequest,
  type AiChatStreamEvent,
  type AiEmbedRequest,
  type AiVectorSearchRequest,
} from "../services/ai.js";
import {
  AppsService,
  AppsServiceError,
  type AppsBackend,
} from "../services/apps.js";
import {
  WorkspaceService,
  type WorkspaceLimits,
} from "../services/workspace.js";
import type { StorageBeeBackend } from "../services/storage-bee.js";
import {
  NamespacedKvService,
  type MiniappKvStoreBackend,
} from "../services/storage-kv.js";
import type { GrantRecord } from "../capabilities.js";
import type { SandboxBackend } from "../sandbox/backend.js";
import type { WidgetNode, WidgetTree } from "../ui/schema.js";
import { diffWidgetTrees, type WidgetPatch } from "../ui/diff.js";
import { validateWidgetTree } from "../ui/validate.js";
import {
  PeerBrokerService,
  PeerServiceError,
  type PeerRequestPayload,
} from "../services/peers.js";
import type {
  PeerHandle,
  PeerSessionManager,
} from "@twistedpear/peer-discovery";
import type { PeerMediaReadiness } from "@twistedpear/protocol";
import {
  RelayBrokerService,
  RelayBrokerServiceError,
  type RelayService,
} from "../services/relay.js";
import {
  FreenetBrokerService,
  FreenetBrokerServiceError,
  type FreenetContractBackend,
} from "../services/freenet.js";
import {
  DeviceBrokerService,
  DeviceBrokerServiceError,
  type DeviceOpenRequest,
  type DeviceSessionHandle,
} from "../services/device.js";
import type { DeviceManager } from "../device-manager.js";
import {
  InboundMediaRouter,
  type InboundMediaBackend,
  type StreamSink,
} from "../media-stream.js";
import { findWidgetNode } from "./shared.js";
import type {
  ActiveApp,
  AiStreamSession,
  CasShareBackend,
  LaunchManifest,
  LimitOverrides,
  MiniappHostCallbacks,
  MiniappHostLogEntry,
  MiniappHostOptions,
  MiniappHostSnapshot,
  ResourceLimitUpdate,
  ResourceLimitsSnapshot,
} from "./shared.js";
import { MiniappHostLayer1 } from "./layer-1.js";

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
    const running = this.active !== null && this.active.manifest.name === appId;
    return {
      appId,
      maxMessagesPerSecond: this.broker.getRateLimit(appId),
      kvQuotaBytes: overrides.kvQuotaBytes ?? this.options.kvQuotaBytes ?? null,
      memoryBytes,
      memoryPendingRestart:
        running &&
        memoryBytes !== null &&
        memoryBytes !== this.active?.launchedMemoryBytes,
    };
  }

  async launch(
    manifest: LaunchManifest,
    bundle: Uint8Array,
  ): Promise<MiniappHostSnapshot> {
    if (this.active !== null) {
      await this.stop("superseded");
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

    this.active = {
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

    const launched = await lifecycle.launch();
    this.logActive(manifest.name, `launched v${manifest.version}`);
    this.options.callbacks?.onLifecycle?.(launched);
    return this.snapshot();
  }

  async suspend(reason = "host-suspended"): Promise<MiniappHostSnapshot> {
    if (this.active === null) {
      return this.snapshot();
    }

    this.deviceService?.closeApp(this.active.manifest.name);
    await this.inboundMedia?.closeApp(this.active.manifest.name);
    const snapshot = await this.active.lifecycle.suspend(reason);
    this.options.callbacks?.onLifecycle?.(snapshot);
    return this.snapshot();
  }

  async resume(): Promise<MiniappHostSnapshot> {
    if (this.active === null) {
      return this.snapshot();
    }

    const snapshot = await this.active.lifecycle.resume();
    this.options.callbacks?.onLifecycle?.(snapshot);
    return this.snapshot();
  }

  async stop(reason = "stopped"): Promise<MiniappHostSnapshot> {
    if (this.active === null) {
      return this.snapshot();
    }

    const appId = this.active.manifest.name;
    await this.peerService?.closeRuntime(appId, this.active.runtimeId);
    this.deviceService?.closeApp(appId);
    await this.inboundMedia?.closeApp(appId);
    await this.cancelAiStreams(appId);
    const snapshot = await this.active.lifecycle.stop(reason);
    this.logActive(appId, `stopped (${reason})`);
    this.options.callbacks?.onLifecycle?.(snapshot);
    this.active = null;
    return this.snapshot();
  }

  async watchdogPing(): Promise<MiniappHostSnapshot> {
    if (this.active === null) {
      return this.snapshot();
    }

    const snapshot = await this.active.lifecycle.watchdogPing();
    if (snapshot.state === "crashed") {
      await this.cancelAiStreams(snapshot.appId);
      await this.peerService?.closeRuntime(
        snapshot.appId,
        this.active.runtimeId,
      );
      this.deviceService?.closeApp(snapshot.appId);
      await this.inboundMedia?.closeApp(snapshot.appId);
      this.logActive(
        snapshot.appId,
        `crashed (${snapshot.reason ?? "watchdog"})`,
      );
      this.active = null;
      this.options.callbacks?.onLifecycle?.(snapshot);
    }

    return this.snapshot();
  }

  async handleUiEvent(
    nodeId: string,
    event: string,
    value?: unknown,
  ): Promise<void> {
    if (this.active === null) {
      throw new Error("No mini-app is running");
    }

    const tree = this.active.widgetTree;
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
      this.active.manifest,
      this.active.grants.granted,
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
}
