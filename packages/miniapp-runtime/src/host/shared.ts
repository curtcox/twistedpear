import { GrantStore } from "../capabilities.js";
import type { ConsentTranscript } from "../consent-record.js";
import type { HostConfirmationChannel } from "../confirm.js";
import { MiniappLifecycle } from "../lifecycle.js";
import { type AnnounceBackend } from "../services/announce.js";
import { type IdentityBackend } from "../services/identity.js";
import { type PresenceBackend } from "../services/presence.js";
import {
  type LinkObservatoryBackend,
  type LinkQualityServiceOptions,
} from "../services/links.js";
import { type HostInfoBackend } from "../services/host-info.js";
import { type ResourceFetchBackend } from "../services/resource.js";
import { type AiChatBackend, type AiChatStreamEvent } from "../services/ai.js";
import { type AppsBackend } from "../services/apps.js";
import { type WorkspaceLimits } from "../services/workspace.js";
import type { StorageBeeBackend } from "../services/storage-bee.js";
import { type MiniappKvStoreBackend } from "../services/storage-kv.js";
import type { GrantRecord } from "../capabilities.js";
import type { SandboxBackend } from "../sandbox/backend.js";
import type { WidgetNode, WidgetTree } from "../ui/schema.js";
import { type WidgetPatch } from "../ui/diff.js";
import type {
  PeerHandle,
  PeerSessionManager,
} from "@twistedpear/peer-discovery";
import type { PeerMediaReadiness } from "@twistedpear/protocol";
import {
  type RelayMutationNotice,
  type RelayService,
} from "../services/relay.js";
import { type FreenetContractBackend } from "../services/freenet.js";
import type { DeviceManager } from "../device-manager.js";
import type { HostPlatformId } from "../services/host-info.js";
import { type InboundMediaBackend } from "../media-stream.js";
import type {
  AppErrorReport,
  DiagnosticsLogEntry,
  DiagnosticsRing,
  DiagnosticsRingSnapshot,
} from "../diagnostics.js";
export interface LaunchManifest {
  readonly name: string;
  readonly version: string;
  readonly entry: string;
  readonly capabilities: ReadonlyArray<string>;
  readonly publisherPublicKey: string;
}

export interface MiniappHostLogEntry {
  readonly appId: string;
  readonly line: string;
  readonly at: number;
}

export interface MiniappHostSnapshot {
  readonly appId: string | null;
  readonly publisherPublicKey: string | null;
  readonly version: string | null;
  readonly state: string;
  readonly widgetTree: WidgetTree | null;
  readonly logs: ReadonlyArray<MiniappHostLogEntry>;
  readonly lastAppError: AppErrorReport | null;
  readonly diagnostics: DiagnosticsRingSnapshot;
}

export interface MiniappHostCallbacks {
  readonly onWidgetTree?: (
    tree: WidgetTree,
    patches: ReadonlyArray<WidgetPatch>,
  ) => void;
  readonly onEvent?: (event: {
    readonly nodeId: string;
    readonly event: string;
    readonly value?: unknown;
  }) => void;
  readonly onLog?: (entry: MiniappHostLogEntry) => void;
  readonly onLifecycle?: (
    snapshot: ReturnType<MiniappLifecycle["snapshot"]>,
  ) => void;
  readonly onAppError?: (
    report: AppErrorReport & { readonly appId: string },
  ) => void;
  readonly onDiagnostics?: (entry: DiagnosticsLogEntry) => void;
  readonly onNotification?: (
    notification: import("../services/notify.js").HostNotification,
  ) => void;
}

export interface MiniappHostOptions {
  readonly backend: SandboxBackend;
  readonly grantStore: GrantStore;
  readonly kvBackend: MiniappKvStoreBackend;
  readonly beeBackend?: StorageBeeBackend;
  readonly identityBackend?: IdentityBackend;
  readonly lxmfBackend?: MiniappKvStoreBackend;
  readonly announceService?: AnnounceBackend;
  readonly resourceBackend?: ResourceFetchBackend;
  readonly presenceBackend?: PresenceBackend;
  /** Host-owned, app-scoped peer roster and link measurement backend. */
  readonly linkObservatoryBackend?: LinkObservatoryBackend;
  readonly confirmCostlyLinkProbe?: LinkQualityServiceOptions["confirmCostlyProbe"];
  readonly localMediaReadiness?: (
    appId: string,
    peer: PeerHandle,
  ) => PeerMediaReadiness | null;
  readonly controlReservations?: import("../services/links.js").PeerRouteLinkObservatoryOptions["controlReservations"];
  readonly hostInfoBackend?: HostInfoBackend;
  readonly callbacks?: MiniappHostCallbacks;
  readonly deriveDestinationHash?: (
    appId: string,
    publisherPublicKey: string,
  ) => Promise<string>;
  readonly kvQuotaBytes?: number;
  readonly confirmationChannel?: HostConfirmationChannel;
  /** Host-owned log of consent moments. Fixtures and chrome both read this. */
  readonly consentTranscript?: ConsentTranscript;
  readonly aiBackend?: AiChatBackend;
  readonly workspaceLimits?: Partial<WorkspaceLimits>;
  readonly appsBackend?: AppsBackend;
  readonly casBackend?: CasShareBackend;
  /** Host-owned discovery, confirmation, and authenticated route service. */
  readonly peerSessionManager?: PeerSessionManager;
  /** Host-owned relay/interface configuration service. */
  readonly relayService?: RelayService;
  /** Host chrome notice after a granted app successfully changes relay configuration. */
  readonly relayMutation?: (notice: RelayMutationNotice) => void;
  /** Optional Freenet contract-state backend (desktop/headless when a node is configured). */
  readonly freenetBackend?: FreenetContractBackend;
  /** Host-authored contract keys this app may read without having published them. */
  readonly freenetReadAllowlist?: ReadonlyArray<string>;
  /** Host-owned device manager (inventory, sessions, drivers). */
  readonly deviceManager?: DeviceManager;
  readonly inboundMediaBackend?: InboundMediaBackend;
  /** Deterministic clock used by simulation and replay adapters. */
  readonly now?: () => number;
  /** Injected entropy for the brokered random-bytes call (Sans-IO adapter). */
  readonly cryptoEntropy?: { randomBytes(n: number): Uint8Array };
  /** Host process platform; gates whether runtime:background actually runs. */
  readonly hostPlatform?: HostPlatformId;
  /** Independent audit sink used by production-backed simulation projections. */
  readonly brokerAudit?: (
    entry: import("../broker.js").BrokerAuditEntry,
  ) => void;
  /** Negative-control hook used to prove campaign sensitivity to broker policy drift. */
  readonly enforceBrokerCapabilities?: boolean;
  /** Broker RPC payload cap. Handbook trees exceed the 256 KiB default. */
  readonly maxMessageBytes?: number;
}

export interface CasShareBackend {
  put(
    appId: string,
    content: Uint8Array,
  ): Promise<{ t256: string; size: number }>;
  get(appId: string, t256: string): Promise<Uint8Array | null>;
}

export interface ResourceLimitUpdate {
  readonly maxMessagesPerSecond?: number | null;
  readonly kvQuotaBytes?: number | null;
  readonly memoryBytes?: number | null;
}

export interface ResourceLimitsSnapshot {
  readonly appId: string;
  readonly maxMessagesPerSecond: number;
  readonly kvQuotaBytes: number | null;
  readonly memoryBytes: number | null;
  readonly memoryPendingRestart: boolean;
}

export interface LimitOverrides {
  kvQuotaBytes?: number;
  memoryBytes?: number;
}

export interface ActiveApp {
  readonly runtimeId: string;
  readonly manifest: LaunchManifest;
  readonly grants: GrantRecord;
  readonly lifecycle: MiniappLifecycle;
  readonly launchedMemoryBytes: number | null;
  widgetTree: WidgetTree | null;
  lastAppError: AppErrorReport | null;
  readonly logs: MiniappHostLogEntry[];
  readonly diagnostics: DiagnosticsRing;
  pushUnsub: (() => void) | null;
}

export interface AiStreamSession {
  readonly appId: string;
  readonly iterator: AsyncIterator<AiChatStreamEvent>;
}

export function findWidgetNode(
  root: WidgetNode,
  nodeId: string,
): WidgetNode | null {
  if (root.id === nodeId) {
    return root;
  }

  for (const child of root.children ?? []) {
    const found = findWidgetNode(child, nodeId);
    if (found !== null) {
      return found;
    }
  }

  return null;
}
