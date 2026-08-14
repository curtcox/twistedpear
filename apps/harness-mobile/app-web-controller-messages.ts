import {
  handleWebMediaCodecRequest,
  playInboundAudioFrame,
  webHexToBytes,
} from "./app-web-shared-audio.js";
import { MAX_ANNOUNCES } from "./app-web-shared.js";
import {
  handleWebRtcWorkerMessage,
  type WebPeerRtcState,
} from "./app-web-controller-webrtc.js";
import type {
  AnnounceEntry,
  CapabilityGrantView,
  DeviceStateView,
  HostConfirmationRequestView,
  HostToWorkletMessage,
  Install256tResultView,
  InstallProgress,
  InstalledPackageView,
  InstallReviewRequestView,
  LaunchReviewRequestView,
  MiniappRuntimeView,
  SessionInviteView,
  TrustedPublisherView,
  WebStorageQuotaView,
  WorkletStatus,
  WorkletToHostMessage,
} from "./worklet/protocol";

export type WebWorkerMessageHandlerDeps = {
  readonly appendLog: (line: string) => void;
  readonly sendToWorker: (message: HostToWorkletMessage) => void;
  readonly peerRtcRef: React.MutableRefObject<Map<string, WebPeerRtcState>>;
  readonly pendingCrossDeviceRef: React.MutableRefObject<
    Map<
      string,
      {
        readonly resolve: (result: Readonly<Record<string, unknown>>) => void;
        readonly reject: (error: Error) => void;
        readonly timer: ReturnType<typeof setTimeout>;
      }
    >
  >;
  readonly pendingWorkspaceReadsRef: React.MutableRefObject<
    Map<
      string,
      {
        readonly resolve: (content: string) => void;
        readonly reject: (error: Error) => void;
        readonly timer: ReturnType<typeof setTimeout>;
      }
    >
  >;
  readonly setStatus: React.Dispatch<React.SetStateAction<WorkletStatus>>;
  readonly setAnnounces: React.Dispatch<
    React.SetStateAction<ReadonlyArray<AnnounceEntry>>
  >;
  readonly setStorageQuota: React.Dispatch<
    React.SetStateAction<WebStorageQuotaView | null>
  >;
  readonly setInstalled: React.Dispatch<
    React.SetStateAction<ReadonlyArray<InstalledPackageView>>
  >;
  readonly setGrantCapabilities: React.Dispatch<
    React.SetStateAction<ReadonlyArray<CapabilityGrantView>>
  >;
  readonly setMiniappRuntime: React.Dispatch<
    React.SetStateAction<MiniappRuntimeView | null>
  >;
  readonly setPeerModal: React.Dispatch<
    React.SetStateAction<
      | {
          readonly kind: "exchange";
          readonly request: Extract<
            WorkletToHostMessage,
            {
              type:
                | "peer-manual-present"
                | "peer-manual-enter"
                | "peer-qr-present"
                | "peer-qr-scan"
                | "peer-ntfy-present"
                | "peer-ntfy-enter"
                | "peer-audio-transmit"
                | "peer-audio-receive";
            }
          >;
          readonly input: string;
        }
      | {
          readonly kind: "confirm";
          readonly request: Extract<
            WorkletToHostMessage,
            { type: "peer-confirm-request" }
          >;
        }
      | null
    >
  >;
  readonly setHostModal: React.Dispatch<
    React.SetStateAction<
      | {
          readonly kind: "confirm";
          readonly request: HostConfirmationRequestView;
        }
      | {
          readonly kind: "launch";
          readonly review: LaunchReviewRequestView;
          readonly grants: ReadonlyArray<string>;
        }
      | {
          readonly kind: "install";
          readonly review: InstallReviewRequestView;
          readonly grants: ReadonlyArray<string>;
        }
      | null
    >
  >;
  readonly setInstallProgress: React.Dispatch<
    React.SetStateAction<InstallProgress | null>
  >;
  readonly setTrustedPublishers: React.Dispatch<
    React.SetStateAction<ReadonlyArray<TrustedPublisherView>>
  >;
  readonly setHostIdentity256t: React.Dispatch<
    React.SetStateAction<string | null>
  >;
  readonly setSessionInvites: React.Dispatch<
    React.SetStateAction<ReadonlyArray<SessionInviteView>>
  >;
  readonly setDeviceState: React.Dispatch<
    React.SetStateAction<DeviceStateView | null>
  >;
};

export function createWebWorkerMessageHandler(
  deps: WebWorkerMessageHandlerDeps,
): (message: WorkletToHostMessage) => void {
  return (message: WorkletToHostMessage) => {
    handleWebWorkerMessage(message, deps);
  };
}

function handleWebWorkerMessage(
  message: WorkletToHostMessage,
  deps: WebWorkerMessageHandlerDeps,
): void {
  if (tryHandleWebPendingAndCatalog(message, deps)) return;
  if (tryHandleWebPeerChrome(message, deps)) return;
  if (tryHandleWebReviews(message, deps)) return;
  if (tryHandleWebDevice(message, deps)) return;
}

function tryHandleWebPendingAndCatalog(
  message: WorkletToHostMessage,
  deps: WebWorkerMessageHandlerDeps,
): boolean {
  return (
    tryHandleWebPendingAndStatus(message, deps) ||
    tryHandleWebCatalogLists(message, deps)
  );
}

function tryHandleWebPendingAndStatus(
  message: WorkletToHostMessage,
  deps: WebWorkerMessageHandlerDeps,
): boolean {
  const { appendLog, pendingCrossDeviceRef, setStatus, setAnnounces } = deps;
  if (message.type === "cross-device-result") {
    settleWebCrossDeviceResult(message, pendingCrossDeviceRef);
    return true;
  }
  if (message.type === "status") {
    setStatus(message.status);
    return true;
  }
  if (message.type === "log") {
    appendLog(message.line);
    return true;
  }
  if (message.type === "announce") {
    setAnnounces((current) =>
      [message.entry, ...current].slice(0, MAX_ANNOUNCES),
    );
    return true;
  }
  return false;
}

function settleWebCrossDeviceResult(
  message: Extract<WorkletToHostMessage, { type: "cross-device-result" }>,
  pendingCrossDeviceRef: WebWorkerMessageHandlerDeps["pendingCrossDeviceRef"],
): void {
  const pending = pendingCrossDeviceRef.current.get(message.token);
  pendingCrossDeviceRef.current.delete(message.token);
  if (pending === undefined) {
    return;
  }
  clearTimeout(pending.timer);
  if (message.ok) {
    pending.resolve(message.result ?? {});
    return;
  }
  pending.reject(new Error(message.error ?? "Cross-device command failed"));
}

function tryHandleWebCatalogLists(
  message: WorkletToHostMessage,
  deps: WebWorkerMessageHandlerDeps,
): boolean {
  const {
    appendLog,
    setStorageQuota,
    setInstalled,
    setGrantCapabilities,
    setMiniappRuntime,
  } = deps;
  if (message.type === "storage-quota") {
    setStorageQuota(message.quota);
    return true;
  }
  if (message.type === "installed") {
    setInstalled(message.packages);
    return true;
  }
  if (message.type === "grants") {
    setGrantCapabilities(message.capabilities);
    return true;
  }
  if (message.type === "miniapp-runtime") {
    setMiniappRuntime(message.runtime);
    return true;
  }
  if (message.type === "miniapp-log") {
    appendLog(`[miniapp] ${message.line}`);
    return true;
  }
  return false;
}

function tryHandleWebPeerChrome(
  message: WorkletToHostMessage,
  deps: WebWorkerMessageHandlerDeps,
): boolean {
  return (
    tryHandleWebPeerExchangeOpen(message, deps) ||
    tryHandleWebPeerAvailability(message, deps) ||
    tryHandleWebPeerMediaAndConfirm(message, deps)
  );
}

function isWebPeerExchangeType(type: string): boolean {
  return (
    type === "peer-manual-present" ||
    type === "peer-manual-enter" ||
    type === "peer-qr-present" ||
    type === "peer-qr-scan" ||
    type === "peer-ntfy-present" ||
    type === "peer-ntfy-enter" ||
    type === "peer-audio-transmit" ||
    type === "peer-audio-receive"
  );
}

function tryHandleWebPeerExchangeOpen(
  message: WorkletToHostMessage,
  deps: WebWorkerMessageHandlerDeps,
): boolean {
  if (!isWebPeerExchangeType(message.type)) {
    return false;
  }
  deps.setPeerModal({
    kind: "exchange",
    request: message as Extract<
      WorkletToHostMessage,
      { type: "peer-manual-present" }
    >,
    input: "",
  });
  return true;
}

function tryHandleWebPeerAvailability(
  message: WorkletToHostMessage,
  deps: WebWorkerMessageHandlerDeps,
): boolean {
  const { sendToWorker } = deps;
  if (message.type === "peer-qr-availability") {
    sendToWorker({
      type: "peer-chrome-response",
      token: message.token,
      availability: webPeerQrAvailability(),
    });
    return true;
  }
  if (message.type === "peer-audio-availability") {
    sendToWorker({
      type: "peer-chrome-response",
      token: message.token,
      availability: webPeerAudioAvailability(),
    });
    return true;
  }
  return false;
}

function webHasGetUserMedia(): boolean {
  const navigatorLike = (
    globalThis as {
      navigator?: { mediaDevices?: { getUserMedia?: unknown } };
    }
  ).navigator;
  return typeof navigatorLike?.mediaDevices?.getUserMedia === "function";
}

function webPeerQrAvailability(): {
  readonly state: "permission-required" | "unsupported";
  readonly reason: string;
} {
  if (webHasGetUserMedia()) {
    return {
      state: "permission-required",
      reason: "Camera starts only after Start camera",
    };
  }
  return {
    state: "unsupported",
    reason: "Camera capture is unavailable; use manual full code",
  };
}

function webPeerAudioAvailability(): {
  readonly state: "permission-required" | "unsupported";
  readonly reason: string;
} {
  const browser = globalThis as unknown as {
    AudioContext?: unknown;
    webkitAudioContext?: unknown;
  };
  const available =
    webHasGetUserMedia() &&
    (browser.AudioContext !== undefined ||
      browser.webkitAudioContext !== undefined);
  if (available) {
    return {
      state: "permission-required",
      reason:
        "Microphone permission is requested only after starting the audible exchange",
    };
  }
  return {
    state: "unsupported",
    reason: "Web Audio microphone/playback is unavailable",
  };
}

function tryHandleWebPeerMediaAndConfirm(
  message: WorkletToHostMessage,
  deps: WebWorkerMessageHandlerDeps,
): boolean {
  const { appendLog, sendToWorker, peerRtcRef, setPeerModal } = deps;
  if (handleWebRtcWorkerMessage(message, { appendLog, sendToWorker, peerRtcRef })) {
    return true;
  }
  if (message.type === "media-opus-play-request") {
    void handleWebOpusPlay(message, deps);
    return true;
  }
  if (message.type === "media-codec-request") {
    void handleWebMediaCodecRequest(message, sendToWorker);
    return true;
  }
  if (message.type === "peer-confirm-request") {
    setPeerModal({ kind: "confirm", request: message });
    return true;
  }
  if (message.type === "peer-chrome-cancel") {
    setPeerModal(null);
    return true;
  }
  return false;
}

async function handleWebOpusPlay(
  message: Extract<WorkletToHostMessage, { type: "media-opus-play-request" }>,
  deps: WebWorkerMessageHandlerDeps,
): Promise<void> {
  const { sendToWorker, appendLog } = deps;
  try {
    await playInboundAudioFrame(message.dataHex, message.encoding);
    sendToWorker({
      type: "media-opus-play-response",
      token: message.token,
      played: true,
    });
    appendLog(`Opus duplex play ok (${message.dataHex.length / 2} bytes)`);
  } catch (error) {
    sendToWorker({
      type: "media-opus-play-response",
      token: message.token,
      played: false,
      error: error instanceof Error ? error.message : String(error),
    });
    appendLog(
      `Opus duplex play failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function tryHandleWebReviews(
  message: WorkletToHostMessage,
  deps: WebWorkerMessageHandlerDeps,
): boolean {
  return (
    tryHandleWebHostReviews(message, deps) ||
    tryHandleWebTrustAndSessions(message, deps)
  );
}

function tryHandleWebHostReviews(
  message: WorkletToHostMessage,
  deps: WebWorkerMessageHandlerDeps,
): boolean {
  const { appendLog, pendingWorkspaceReadsRef, setHostModal, setInstallProgress } =
    deps;
  if (message.type === "workspace-file") {
    settleWebWorkspaceRead(message, pendingWorkspaceReadsRef);
    return true;
  }
  if (message.type === "confirm-request") {
    setHostModal({
      kind: "confirm",
      request: {
        token: message.token,
        kind: message.kind,
        appId: message.appId,
        publisherPublicKey: message.publisherPublicKey,
        summary: message.summary,
      },
    });
    return true;
  }
  if (message.type === "launch-review") {
    setHostModal({
      kind: "launch",
      review: {
        token: message.token,
        appId: message.appId,
        publisherPublicKey: message.publisherPublicKey,
        version: message.version,
        capabilities: message.capabilities,
      },
      grants: message.capabilities
        .filter((capability) => capability.granted)
        .map((capability) => capability.id),
    });
    return true;
  }
  if (message.type === "install-review") {
    setHostModal({
      kind: "install",
      review: {
        token: message.token,
        appId: message.appId,
        version: message.version,
        publisherPublicKey: message.publisherPublicKey,
        trusted: message.trusted,
        trustedLabel: message.trustedLabel,
        capabilities: message.capabilities,
      },
      grants: [],
    });
    return true;
  }
  if (message.type === "install-progress") {
    setInstallProgress(message.progress);
    return true;
  }
  if (message.type === "install-256t-result") {
    appendLog(webInstall256tLog(message as Install256tResultView));
    return true;
  }
  return false;
}

function settleWebWorkspaceRead(
  message: Extract<WorkletToHostMessage, { type: "workspace-file" }>,
  pendingWorkspaceReadsRef: WebWorkerMessageHandlerDeps["pendingWorkspaceReadsRef"],
): void {
  const pending = pendingWorkspaceReadsRef.current.get(message.token);
  pendingWorkspaceReadsRef.current.delete(message.token);
  if (pending === undefined) {
    return;
  }
  clearTimeout(pending.timer);
  if (message.error !== undefined) {
    pending.reject(new Error(message.error));
    return;
  }
  pending.resolve(message.content ?? "");
}

function webInstall256tLog(result: Install256tResultView): string {
  if (result.ok) {
    return `Installed ${result.appId} v${result.version} (trusted: ${result.trusted ? "yes" : "no"})`;
  }
  return `256t install failed: ${result.error ?? "unknown error"}`;
}

function tryHandleWebTrustAndSessions(
  message: WorkletToHostMessage,
  deps: WebWorkerMessageHandlerDeps,
): boolean {
  const {
    appendLog,
    setTrustedPublishers,
    setHostIdentity256t,
    setSessionInvites,
  } = deps;
  if (message.type === "trust") {
    setTrustedPublishers(message.entries);
    return true;
  }
  if (message.type === "trust-identity") {
    setHostIdentity256t(message.identity256t);
    return true;
  }
  if (message.type === "session-invites") {
    setSessionInvites(message.invites);
    return true;
  }
  if (message.type === "session-invite") {
    appendLog(
      `Call invitation from ${message.invite.verifiedPeerLabel} for ${message.invite.appId}`,
    );
    return true;
  }
  return false;
}

function tryHandleWebDevice(
  message: WorkletToHostMessage,
  deps: WebWorkerMessageHandlerDeps,
): boolean {
  const { appendLog, sendToWorker, setDeviceState } = deps;
  if (message.type === "device-state") {
    setDeviceState({
      inventory: message.inventory,
      diagnostics: message.diagnostics,
      sessions: message.sessions,
      indicators: message.indicators,
      disabledClasses: message.disabledClasses,
      remoteAcquisitionEnabled: message.remoteAcquisitionEnabled,
      shareOffers: message.shareOffers,
    });
    return true;
  }
  if (message.type === "device-bridge-request") {
    void handleWebDeviceBridge(message, sendToWorker);
    return true;
  }
  if (message.type === "inbound-media-frame") {
    handleWebInboundMedia(message, appendLog);
    return true;
  }
  return false;
}

async function handleWebDeviceBridge(
  message: Extract<WorkletToHostMessage, { type: "device-bridge-request" }>,
  sendToWorker: (message: HostToWorkletMessage) => void,
): Promise<void> {
  try {
    const {
      browserDeviceAvailability,
      browserDeviceSense,
      browserDeviceActuate,
    } = await import(
      "../../packages/miniapp-runtime/dist/drivers/browser-effects.js"
    );
    const result =
      message.op === "availability"
        ? await browserDeviceAvailability(message.classId)
        : message.op === "actuate"
          ? await browserDeviceActuate(message.classId, message.command ?? {})
          : await browserDeviceSense(message.classId, message.options ?? {});
    sendToWorker({
      type: "device-bridge-response",
      token: message.token,
      result,
    });
  } catch (error) {
    sendToWorker({
      type: "device-bridge-response",
      token: message.token,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function handleWebInboundMedia(
  message: Extract<WorkletToHostMessage, { type: "inbound-media-frame" }>,
  appendLog: (line: string) => void,
): void {
  if (
    message.sink.kind === "speaker" &&
    webHexToBytes(message.dataHex)[5] === 5
  ) {
    appendLog(`Inbound derived event received (${message.encoding})`);
  } else if (message.sink.kind === "speaker") {
    void playInboundAudioFrame(message.dataHex, message.encoding).catch(
      (error) =>
        appendLog(
          `Inbound audio failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
    );
  } else {
    appendLog(
      `Inbound ${message.encoding} video frame received for ${message.sink.widgetId ?? "remote-video"}`,
    );
  }
}
