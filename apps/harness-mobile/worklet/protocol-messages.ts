/** Worklet IPC message types and codecs. */

export type HostToWorkletMessage =
  | {
      readonly type: "start";
      readonly targetHost: string;
      readonly targetPort: number;
      readonly gatewayUrl?: string;
      readonly sharedToken?: string;
      readonly identityPassphrase?: string;
      readonly ntfyUrl?: string;
      readonly ntfyToken?: string;
      readonly multicastEntitled?: boolean;
      readonly bonjourEnabled?: boolean;
      /** Playwright/Handbook only: stub ai.chat without a real endpoint. */
      readonly mockAiChat?: boolean;
      /** Playwright/Handbook only: apps.publish from local CAS without gateway. */
      readonly mockLocalPublish?: boolean;
    }
  | { readonly type: "stop" }
  | { readonly type: "suspend-node" }
  | { readonly type: "resume-node" }
  | { readonly type: "join-community-network" }
  | { readonly type: "create-identity" }
  | { readonly type: "import-identity"; readonly privateKeyHex: string }
  | { readonly type: "reset-identity" }
  | {
      readonly type: "set-interfaces";
      readonly tcp: boolean;
      readonly auto: boolean;
      readonly ble: boolean;
      readonly rnode: boolean;
      readonly rnodeDeviceId?: number | null;
      readonly rnodeBaudRate?: number;
    }
  | {
      readonly type: "set-relay-config";
      readonly mode?: "off" | "bridge" | "transport-node";
      readonly directions?: Readonly<
        Partial<
          Record<"tcp" | "auto" | "bluetooth" | "rnode", "tx" | "rx" | "both">
        >
      >;
    }
  | {
      readonly type: "set-freenet-config";
      readonly enabled: boolean;
      readonly url?: string | null;
      readonly authToken?: string;
      readonly rendezvousHex?: string | null;
      readonly localDirection?: 0 | 1;
      readonly capabilities?: {
        readonly contractReads: boolean;
        readonly contractWrites: boolean;
        readonly packetTunnel: boolean;
        readonly propagation: boolean;
      };
    }
  | { readonly type: "set-developer-mode"; readonly enabled: boolean }
  | { readonly type: "list-catalog" }
  | { readonly type: "list-installed" }
  | { readonly type: "refresh-storage" }
  | {
      readonly type: "sandbox-spawned";
      readonly requestId: string;
      readonly instanceId: string;
    }
  | {
      readonly type: "sandbox-spawn-failed";
      readonly requestId: string;
      readonly message: string;
    }
  | {
      readonly type: "sandbox-ping-result";
      readonly requestId: string;
      readonly alive: boolean;
    }
  | {
      readonly type: "sandbox-broker-request";
      readonly requestId: string;
      readonly instanceId: string;
      readonly request: unknown;
    }
  | {
      readonly type: "confirm-response";
      readonly token: string;
      readonly approved: boolean;
      readonly detail?: unknown;
    }
  | {
      readonly type: "launch-confirm";
      readonly token: string;
      readonly accept: boolean;
      readonly grants?: ReadonlyArray<string>;
    }
  | {
      readonly type: "install-confirm";
      readonly token: string;
      readonly accept: boolean;
      readonly grants?: ReadonlyArray<string>;
    }
  | {
      readonly type: "peer-chrome-response";
      readonly token: string;
      readonly accepted?: boolean;
      readonly approved?: boolean;
      readonly code?: string;
      readonly signal?: string;
      readonly opened?: boolean;
      readonly attached?: boolean;
      readonly sent?: boolean;
      readonly played?: boolean;
      readonly sessionId?: string;
      readonly framesHex?: ReadonlyArray<string>;
      readonly error?: string;
      readonly bytesSent?: number;
      readonly trackCount?: number;
      readonly connectionState?: string;
      readonly voiceProcessing?: {
        readonly echoCancellation: boolean;
        readonly noiseSuppression: boolean;
        readonly autoGainControl: boolean;
        readonly voiceDuplex: boolean;
      } | null;
      readonly http?: {
        readonly status: number;
        readonly body: string;
        readonly contentLength: string | null;
      };
      readonly availability?: {
        readonly state:
          | "available"
          | "permission-required"
          | "unsupported"
          | "offline"
          | "policy-disabled";
        readonly reason?: string;
      };
    }
  | {
      readonly type: "media-opus-play-response";
      readonly token: string;
      readonly played?: boolean;
      readonly error?: string;
    }
  | {
      readonly type: "media-opus-duplex-response";
      readonly token: string;
      readonly ok?: boolean;
      readonly implementation?: string;
      readonly voiceDuplex?: boolean;
      readonly encoding?: string;
      readonly pcmBytes?: number;
      readonly opusBytes?: number;
      readonly decodedBytes?: number;
      readonly frameBytes?: number;
      readonly frameHex?: string;
      readonly played?: boolean;
      readonly error?: string;
    }
  | {
      readonly type: "media-codec-response";
      readonly token: string;
      readonly dataHex?: string;
      readonly error?: string;
    }
  | { readonly type: "install-from-256t"; readonly t256: string }
  | { readonly type: "trust-list" }
  | {
      readonly type: "trust-add";
      readonly identityString: string;
      readonly label?: string;
      readonly source?: "qr" | "paste" | "manual";
    }
  | { readonly type: "trust-remove"; readonly publisherPublicKey: string }
  | { readonly type: "trust-show" }
  | {
      readonly type: "cross-device-command";
      readonly token: string;
      readonly command: Readonly<Record<string, unknown>>;
    }
  | {
      readonly type: "install-app";
      readonly appId: string;
      readonly forcePath?: "hyperdrive" | "lan-mirror" | "freenet" | "resource";
      readonly archiveHex?: string;
    }
  | {
      readonly type: "seed-miniapp-kv";
      readonly key: string;
      readonly valueHex: string;
    }
  | {
      readonly type: "delete-package";
      readonly appId: string;
      readonly version: string;
    }
  | { readonly type: "rollback-package"; readonly appId: string }
  | {
      readonly type: "get-grants";
      readonly appId: string;
      readonly publisherPublicKey: string;
      readonly declaredCapabilities: ReadonlyArray<string>;
    }
  | {
      readonly type: "set-grants";
      readonly appId: string;
      readonly publisherPublicKey: string;
      readonly declaredCapabilities: ReadonlyArray<string>;
      readonly grantedCapabilities: ReadonlyArray<string>;
    }
  | {
      readonly type: "revoke-grant";
      readonly appId: string;
      readonly publisherPublicKey: string;
      readonly capability: string;
      readonly declaredCapabilities: ReadonlyArray<string>;
    }
  | { readonly type: "device-list" }
  | {
      readonly type: "device-set-class-disabled";
      readonly classId: string;
      readonly disabled: boolean;
    }
  | { readonly type: "device-set-remote"; readonly enabled: boolean }
  | { readonly type: "device-kill-session"; readonly handle: string }
  | {
      readonly type: "device-revoke-share";
      readonly appId: string;
      readonly id: string;
    }
  | {
      readonly type: "device-test-seed-share";
      readonly appId?: string;
      readonly displayLabel?: string;
      readonly classId?: "camera" | "microphone";
      readonly ttlMs?: number;
    }
  | { readonly type: "session-invite-accept"; readonly id: string }
  | { readonly type: "session-invite-decline"; readonly id: string }
  | {
      readonly type: "peer-webrtc-data";
      readonly sessionId: string;
      readonly dataHex: string;
    }
  | {
      readonly type: "device-bridge-response";
      readonly token: string;
      readonly result?: unknown;
      readonly error?: string;
    }
  | { readonly type: "launch-miniapp"; readonly appId: string }
  | { readonly type: "benchmark-miniapp" }
  | { readonly type: "stop-miniapp" }
  | { readonly type: "suspend-miniapp" }
  | { readonly type: "resume-miniapp" }
  | {
      readonly type: "miniapp-ui-event";
      readonly nodeId: string;
      readonly event: string;
      readonly value?: unknown;
    }
  | {
      readonly type: "workspace-read";
      readonly token: string;
      readonly documentId: string;
    }
  | {
      readonly type: "dev-side-load";
      readonly manifest: Record<string, unknown>;
      readonly bundleHex: string;
    }
  | { readonly type: "dev-side-load-hello" }
  | {
      readonly type: "connect-dev-channel";
      readonly host: string;
      readonly port: number;
    }
  | { readonly type: "disconnect-dev-channel" }
  /** Test-only: mounts the peer control agent for `conformance/local-multipeer`. */
  | {
      readonly type: "connect-test-agent";
      readonly host: string;
      readonly port: number;
      readonly label: string;
      readonly platform?: string;
    }
  | {
      readonly type: "multicast-packet";
      readonly ifname: string;
      readonly dataHex: string;
      readonly sourceAddress: string;
      readonly port: number;
    }
  | {
      readonly type: "multicast-interfaces";
      readonly interfaces: ReadonlyArray<MulticastNetworkInfo>;
    }
  | {
      readonly type: "bonjour-peer";
      readonly ifname: string;
      readonly address: string;
      readonly port: number;
    }
  | {
      readonly type: "bonjour-interfaces";
      readonly interfaces: ReadonlyArray<MulticastNetworkInfo>;
    }
  | { readonly type: "ble-data"; readonly dataHex: string }
  | { readonly type: "ble-connect"; readonly mtu: number }
  | { readonly type: "ble-disconnect" }
  | { readonly type: "ble-error"; readonly message: string }
  | { readonly type: "peer-bluetooth-frame"; readonly frameHex: string }
  | { readonly type: "serial-data"; readonly dataHex: string }
  | { readonly type: "serial-connect"; readonly deviceName: string }
  | { readonly type: "serial-disconnect" }
  | { readonly type: "serial-error"; readonly message: string };

export type WorkletToHostMessage =
  | { readonly type: "status"; readonly status: WorkletStatus }
  | {
      readonly type: "relay-attribution";
      readonly appId: string;
      readonly method: string;
      readonly kind?: string;
    }
  | { readonly type: "log"; readonly line: string }
  | { readonly type: "announce"; readonly entry: AnnounceEntry }
  | {
      readonly type: "catalog";
      readonly entries: ReadonlyArray<CatalogEntryView>;
    }
  | {
      readonly type: "installed";
      readonly packages: ReadonlyArray<InstalledPackageView>;
    }
  | { readonly type: "storage-quota"; readonly quota: WebStorageQuotaView }
  | {
      readonly type: "sandbox-spawn";
      readonly requestId: string;
      readonly instanceId: string;
      readonly appId: string;
      readonly version: string;
      readonly entryPath: string;
      readonly bundleHex: string;
    }
  | {
      readonly type: "sandbox-post";
      readonly instanceId: string;
      readonly payload: unknown;
    }
  | {
      readonly type: "sandbox-ping";
      readonly requestId: string;
      readonly instanceId: string;
      readonly timeoutMs: number;
    }
  | {
      readonly type: "sandbox-kill";
      readonly instanceId: string;
      readonly reason: string;
    }
  | {
      readonly type: "sandbox-broker-response";
      readonly requestId: string;
      readonly response: unknown;
    }
  | { readonly type: "install-progress"; readonly progress: InstallProgress }
  | {
      readonly type: "grants";
      readonly appId: string;
      readonly capabilities: ReadonlyArray<CapabilityGrantView>;
    }
  | {
      readonly type: "device-state";
      readonly inventory: ReadonlyArray<DeviceDescriptorView>;
      readonly diagnostics: ReadonlyArray<DeviceDiagnosticView>;
      readonly sessions: ReadonlyArray<DeviceChromeSessionView>;
      readonly indicators: ReadonlyArray<DeviceActiveIndicatorView>;
      readonly disabledClasses: ReadonlyArray<string>;
      readonly remoteAcquisitionEnabled: boolean;
      readonly shareOffers: DeviceStateView["shareOffers"];
    }
  | { readonly type: "session-invite"; readonly invite: SessionInviteView }
  | {
      readonly type: "session-invites";
      readonly invites: ReadonlyArray<SessionInviteView>;
    }
  | {
      readonly type: "device-bridge-request";
      readonly token: string;
      readonly op: "availability" | "sense" | "actuate";
      readonly classId: string;
      readonly options?: Readonly<Record<string, unknown>>;
      readonly command?: Readonly<Record<string, unknown>>;
    }
  | {
      readonly type: "miniapp-runtime";
      readonly slot?: "main" | "preview";
      readonly runtime: MiniappRuntimeView | null;
    }
  | {
      readonly type: "miniapp-benchmark";
      readonly result: MiniappBenchmarkResult;
    }
  | {
      readonly type: "miniapp-log";
      readonly appId: string;
      readonly line: string;
    }
  | {
      readonly type: "workspace-file";
      readonly token: string;
      readonly documentId: string;
      readonly content?: string;
      readonly error?: string;
    }
  | {
      readonly type: "confirm-request";
      readonly token: string;
      readonly kind: ConfirmationKind;
      readonly appId: string;
      readonly publisherPublicKey: string;
      readonly summary: Readonly<Record<string, string>>;
    }
  | {
      readonly type: "launch-review";
      readonly token: string;
      readonly appId: string;
      readonly publisherPublicKey: string;
      readonly version: string;
      readonly capabilities: ReadonlyArray<LaunchReviewCapabilityView>;
    }
  | {
      readonly type: "install-review";
      readonly token: string;
      readonly appId: string;
      readonly version: string;
      readonly publisherPublicKey: string;
      readonly trusted: boolean;
      readonly trustedLabel: string | null;
      readonly capabilities: ReadonlyArray<LaunchReviewCapabilityView>;
    }
  | {
      readonly type: "install-256t-result";
      readonly ok: boolean;
      readonly appId?: string;
      readonly version?: string;
      readonly trusted?: boolean;
      readonly error?: string;
    }
  | {
      readonly type: "trust";
      readonly entries: ReadonlyArray<TrustedPublisherView>;
    }
  | { readonly type: "trust-identity"; readonly identity256t: string | null }
  | {
      readonly type: "cross-device-result";
      readonly token: string;
      readonly ok: boolean;
      readonly result?: Readonly<Record<string, unknown>>;
      readonly error?: string;
    }
  | {
      readonly type: "dev-channel";
      readonly state: "connected" | "disconnected" | "loaded" | "error";
      readonly detail?: string;
    }
  | {
      readonly type: "peer-manual-present";
      readonly token: string;
      readonly sessionId: string;
      readonly code: string;
      readonly expectsResponse: boolean;
    }
  | {
      readonly type: "peer-manual-enter";
      readonly token: string;
      readonly sessionId: string;
      readonly service: string;
    }
  | {
      readonly type: "peer-confirm-request";
      readonly token: string;
      readonly appId: string;
      readonly service: string;
      readonly purpose: string;
      readonly peer: {
        readonly displayLabel: string;
        readonly fingerprint: string;
        readonly matchingWords: ReadonlyArray<string>;
        readonly dataPlane: string;
      };
    }
  | { readonly type: "peer-qr-availability"; readonly token: string }
  | {
      readonly type: "peer-qr-present";
      readonly token: string;
      readonly sessionId: string;
      readonly codes: ReadonlyArray<string>;
      readonly expectsResponse: boolean;
    }
  | {
      readonly type: "peer-qr-scan";
      readonly token: string;
      readonly sessionId: string;
      readonly service: string;
    }
  | {
      readonly type: "peer-ntfy-present";
      readonly token: string;
      readonly sessionId: string;
      readonly code: string;
      readonly server: string;
    }
  | {
      readonly type: "peer-ntfy-enter";
      readonly token: string;
      readonly sessionId: string;
      readonly service: string;
      readonly server: string;
    }
  | {
      readonly type: "peer-ntfy-http";
      readonly token: string;
      readonly request: {
        readonly url: string;
        readonly method: string;
        readonly headers: Readonly<Record<string, string>>;
        readonly body?: string;
      };
    }
  | { readonly type: "peer-audio-availability"; readonly token: string }
  | {
      readonly type: "peer-audio-transmit";
      readonly token: string;
      readonly sessionId: string;
      readonly framesHex: ReadonlyArray<string>;
      readonly expectsResponse: boolean;
    }
  | {
      readonly type: "peer-audio-receive";
      readonly token: string;
      readonly sessionId: string;
      readonly service: string;
    }
  | {
      readonly type: "peer-webrtc-signal";
      readonly token: string;
      readonly sessionId: string;
      readonly role: "offer" | "answer";
      readonly remoteSignal?: string;
    }
  | {
      readonly type: "peer-webrtc-establish";
      readonly token: string;
      readonly sessionId: string;
      readonly remoteSignal?: string;
    }
  | { readonly type: "peer-webrtc-close"; readonly sessionId: string }
  | {
      readonly type: "peer-webrtc-data-send";
      readonly token: string;
      readonly sessionId: string;
      readonly dataHex: string;
    }
  | {
      readonly type: "peer-webrtc-media-attach";
      readonly token: string;
      readonly sessionId: string;
      readonly classId: string;
      readonly tierId: string;
    }
  | {
      readonly type: "peer-webrtc-media-stats";
      readonly token: string;
      readonly sessionId: string;
    }
  | {
      readonly type: "peer-webrtc-media-detach";
      readonly token: string;
      readonly sessionId: string;
      readonly classId: string;
    }
  | {
      readonly type: "media-opus-play-request";
      readonly token: string;
      readonly encoding: string;
      readonly dataHex: string;
    }
  | { readonly type: "media-opus-duplex-request"; readonly token: string }
  | {
      readonly type: "media-codec-request";
      readonly token: string;
      readonly op: "encode" | "decode";
      readonly configuration: {
        readonly codec: string;
        readonly sampleKind: string;
        readonly bitrateBps: number;
        readonly sampleRate?: number;
        readonly channels?: number;
        readonly voiceDuplex?: boolean;
      };
      readonly captureAtUs: number;
      readonly dataHex: string;
    }
  | {
      readonly type: "inbound-media-frame";
      readonly appId: string;
      readonly handle: string;
      readonly sink: { readonly kind: string; readonly widgetId?: string };
      readonly encoding: string;
      readonly dataHex: string;
    }
  | { readonly type: "peer-chrome-cancel"; readonly sessionId: string }
  | { readonly type: "multicast-start" }
  | { readonly type: "multicast-stop" }
  | {
      readonly type: "multicast-join";
      readonly ifname: string;
      readonly groupAddress: string;
      readonly port: number;
    }
  | {
      readonly type: "multicast-bind";
      readonly ifname: string;
      readonly port: number;
    }
  | {
      readonly type: "multicast-send";
      readonly ifname: string;
      readonly groupAddress: string;
      readonly port: number;
      readonly dataHex: string;
    }
  | {
      readonly type: "multicast-unicast";
      readonly ifname: string;
      readonly targetAddress: string;
      readonly port: number;
      readonly dataHex: string;
    }
  | { readonly type: "bonjour-start" }
  | { readonly type: "bonjour-stop" }
  | {
      readonly type: "bonjour-advertise";
      readonly ifname: string;
      readonly address: string;
      readonly port: number;
    }
  | { readonly type: "ble-start"; readonly identityHashHex: string }
  | { readonly type: "ble-stop" }
  | { readonly type: "ble-write"; readonly dataHex: string }
  | {
      readonly type: "peer-bluetooth-send";
      readonly framesHex: ReadonlyArray<string>;
    }
  | {
      readonly type: "serial-start";
      readonly deviceId: number;
      readonly baudRate: number;
    }
  | { readonly type: "serial-web-start"; readonly baudRate: number }
  | { readonly type: "serial-stop" }
  | { readonly type: "serial-write"; readonly dataHex: string };

export function encodeMessage(
  message: HostToWorkletMessage | WorkletToHostMessage,
): string {
  return `${JSON.stringify(message)}\n`;
}

export function decodeMessages(buffer: string): {
  readonly messages: ReadonlyArray<WorkletToHostMessage>;
  readonly remainder: string;
} {
  const messages: WorkletToHostMessage[] = [];
  let remainder = buffer;

  while (true) {
    const newline = remainder.indexOf("\n");
    if (newline < 0) {
      break;
    }

    const line = remainder.slice(0, newline).trim();
    remainder = remainder.slice(newline + 1);
    if (line.length === 0) {
      continue;
    }

    try {
      messages.push(JSON.parse(line) as WorkletToHostMessage);
    } catch {
      // Ignore malformed lines; the worklet may log raw text during development.
    }
  }

  return { messages, remainder };
}
