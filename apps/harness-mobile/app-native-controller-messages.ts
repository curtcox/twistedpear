import { nativePeerAudioSupported } from "@twistedpear/peer-audio";
import {
  nativeDeviceActuate,
  nativeDeviceAvailability,
  nativeDeviceSense,
} from "./host/native-device-bridge";
import {
  handleNativePeerWebRtcMessage,
  type NativePeerRtcStore,
} from "./host/native-peer-webrtc";
import type { HostMulticastIpc } from "./host/multicast-ipc";
import type { HostBonjourIpc } from "./host/bonjour-ipc";
import type { HostBleIpc } from "./host/ble-ipc";
import type { HostUsbIpc } from "./host/usb-ipc";
import {
  MAX_ANNOUNCES,
  playInboundNativeMedia,
  playNativeOpusOrPcm,
  runNativeOpusDuplex,
} from "./app-native-shared.js";
import { peerAudioUnhex } from "./app-native-shared.js";
import type {
  AnnounceEntry,
  CapabilityGrantView,
  CatalogEntryView,
  DeviceStateView,
  HostConfirmationRequestView,
  HostToWorkletMessage,
  InstallProgress,
  InstalledPackageView,
  InstallReviewRequestView,
  LaunchReviewRequestView,
  MiniappBenchmarkResult,
  MiniappRuntimeView,
  SessionInviteView,
  TrustedPublisherView,
  WorkletStatus,
  WorkletToHostMessage,
} from "./worklet/protocol";
import { tryHandleNativeDeviceAndMedia } from "./app-native-controller-device-media.js";

export type NativeWorkletMessageHandlerDeps = {
  readonly appendLog: (line: string) => void;
  readonly sendToWorklet: (message: HostToWorkletMessage) => void;
  readonly cameraPermissionGranted: boolean | undefined;
  readonly ntfyUrl: string;
  readonly ntfyToken: string;
  readonly multicastIpcRef: React.MutableRefObject<HostMulticastIpc | null>;
  readonly bonjourIpcRef: React.MutableRefObject<HostBonjourIpc | null>;
  readonly bleIpcRef: React.MutableRefObject<HostBleIpc | null>;
  readonly usbIpcRef: React.MutableRefObject<HostUsbIpc | null>;
  readonly peerRtcRef: React.MutableRefObject<NativePeerRtcStore>;
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
  readonly setCatalog: React.Dispatch<
    React.SetStateAction<ReadonlyArray<CatalogEntryView>>
  >;
  readonly setInstalled: React.Dispatch<
    React.SetStateAction<ReadonlyArray<InstalledPackageView>>
  >;
  readonly setInstallProgress: React.Dispatch<
    React.SetStateAction<InstallProgress | null>
  >;
  readonly setGrantCapabilities: React.Dispatch<
    React.SetStateAction<ReadonlyArray<CapabilityGrantView>>
  >;
  readonly setMiniappRuntime: React.Dispatch<
    React.SetStateAction<MiniappRuntimeView | null>
  >;
  readonly setMiniappBenchmark: React.Dispatch<
    React.SetStateAction<MiniappBenchmarkResult | null>
  >;
  readonly setMiniappLogs: React.Dispatch<
    React.SetStateAction<ReadonlyArray<string>>
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
  readonly setPeerQrFrame: React.Dispatch<React.SetStateAction<number>>;
  readonly setPeerCameraActive: React.Dispatch<React.SetStateAction<boolean>>;
  readonly setHostConfirm: React.Dispatch<
    React.SetStateAction<HostConfirmationRequestView | null>
  >;
  readonly setHostReview: React.Dispatch<
    React.SetStateAction<
      | {
          readonly kind: "install";
          readonly review: InstallReviewRequestView;
          readonly grants: ReadonlyArray<string>;
        }
      | {
          readonly kind: "launch";
          readonly review: LaunchReviewRequestView;
          readonly grants: ReadonlyArray<string>;
        }
      | null
    >
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
  readonly setRelayNotice: React.Dispatch<
    React.SetStateAction<{
      appId: string;
      method: string;
      kind?: string;
    } | null>
  >;
  readonly setDeviceState: React.Dispatch<
    React.SetStateAction<DeviceStateView | null>
  >;
  readonly setDevChannelDetail: React.Dispatch<
    React.SetStateAction<string | null>
  >;
};

export function createNativeWorkletMessageHandler(
  deps: NativeWorkletMessageHandlerDeps,
): (message: WorkletToHostMessage) => void {
  return (message: WorkletToHostMessage) => {
    handleNativeWorkletMessage(message, deps);
  };
}

function handleNativeWorkletMessage(
  message: WorkletToHostMessage,
  deps: NativeWorkletMessageHandlerDeps,
): void {
  if (tryHandleNativeIpc(message, deps)) return;
  if (tryHandleNativeCatalog(message, deps)) return;
  if (tryHandleNativePeerChrome(message, deps)) return;
  if (tryHandleNativeReviews(message, deps)) return;
  if (tryHandleNativeDeviceAndMedia(message, deps)) return;
}

function tryHandleNativeIpc(
  message: WorkletToHostMessage,
  deps: NativeWorkletMessageHandlerDeps,
): boolean {
  const { multicastIpcRef, bonjourIpcRef, bleIpcRef, usbIpcRef } = deps;
  if (multicastIpcRef.current?.isMulticastMessage(message)) {
    void multicastIpcRef.current.handleWorkletMessage(message);
    return true;
  }
  if (bonjourIpcRef.current?.isBonjourMessage(message)) {
    void bonjourIpcRef.current.handleWorkletMessage(message);
    return true;
  }
  if (bleIpcRef.current?.isBleMessage(message)) {
    void bleIpcRef.current.handleWorkletMessage(message);
    return true;
  }
  if (usbIpcRef.current?.isSerialMessage(message)) {
    void usbIpcRef.current.handleWorkletMessage(message);
    return true;
  }
  return false;
}

function tryHandleNativeCatalog(
  message: WorkletToHostMessage,
  deps: NativeWorkletMessageHandlerDeps,
): boolean {
  return (
    tryHandleNativeStatusLogAnnounce(message, deps) ||
    tryHandleNativeCatalogLists(message, deps) ||
    tryHandleNativeMiniappRuntimeMsgs(message, deps)
  );
}

function tryHandleNativeStatusLogAnnounce(
  message: WorkletToHostMessage,
  deps: NativeWorkletMessageHandlerDeps,
): boolean {
  const { appendLog, sendToWorklet, setStatus, setAnnounces } = deps;
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
    sendToWorklet({ type: "list-catalog" });
    return true;
  }
  return false;
}

function tryHandleNativeCatalogLists(
  message: WorkletToHostMessage,
  deps: NativeWorkletMessageHandlerDeps,
): boolean {
  const {
    sendToWorklet,
    setCatalog,
    setInstalled,
    setInstallProgress,
    setGrantCapabilities,
  } = deps;
  if (message.type === "catalog") {
    setCatalog(message.entries);
    return true;
  }
  if (message.type === "installed") {
    setInstalled(message.packages);
    return true;
  }
  if (message.type === "install-progress") {
    setInstallProgress(message.progress);
    if (message.progress.phase === "complete") {
      sendToWorklet({ type: "list-installed" });
    }
    return true;
  }
  if (message.type === "grants") {
    setGrantCapabilities(message.capabilities);
    return true;
  }
  return false;
}

function tryHandleNativeMiniappRuntimeMsgs(
  message: WorkletToHostMessage,
  deps: NativeWorkletMessageHandlerDeps,
): boolean {
  const { appendLog, setMiniappRuntime, setMiniappBenchmark, setMiniappLogs } =
    deps;
  if (message.type === "miniapp-runtime") {
    setMiniappRuntime(message.runtime);
    return true;
  }
  if (message.type === "miniapp-benchmark") {
    setMiniappBenchmark(message.result);
    return true;
  }
  if (message.type === "miniapp-log") {
    setMiniappLogs((current) => [
      ...current.slice(-100),
      `${message.appId}: ${message.line}`,
    ]);
    appendLog(`[miniapp] ${message.line}`);
    return true;
  }
  return false;
}

function tryHandleNativePeerChrome(
  message: WorkletToHostMessage,
  deps: NativeWorkletMessageHandlerDeps,
): boolean {
  return (
    tryHandleNativePeerExchangeOpen(message, deps) ||
    tryHandleNativePeerAvailability(message, deps) ||
    tryHandleNativePeerConfirmAndNtfy(message, deps)
  );
}

function isNativePeerExchangeType(type: string): boolean {
  return (
    type === "peer-manual-present" ||
    type === "peer-manual-enter" ||
    type === "peer-qr-present" ||
    type === "peer-qr-scan" ||
    type === "peer-audio-transmit" ||
    type === "peer-audio-receive" ||
    type === "peer-ntfy-present" ||
    type === "peer-ntfy-enter"
  );
}

function tryHandleNativePeerExchangeOpen(
  message: WorkletToHostMessage,
  deps: NativeWorkletMessageHandlerDeps,
): boolean {
  const { setPeerModal, setPeerQrFrame, setPeerCameraActive } = deps;
  if (!isNativePeerExchangeType(message.type)) {
    return false;
  }
  if (message.type === "peer-qr-present" || message.type === "peer-qr-scan") {
    setPeerQrFrame(0);
    setPeerCameraActive(false);
  }
  setPeerModal({
    kind: "exchange",
    request: message as Extract<
      WorkletToHostMessage,
      { type: "peer-manual-present" }
    >,
    input: "",
  });
  return true;
}

function tryHandleNativePeerAvailability(
  message: WorkletToHostMessage,
  deps: NativeWorkletMessageHandlerDeps,
): boolean {
  const { sendToWorklet, cameraPermissionGranted } = deps;
  if (message.type === "peer-qr-availability") {
    sendToWorklet({
      type: "peer-chrome-response",
      token: message.token,
      availability: nativePeerQrAvailability(cameraPermissionGranted === true),
    });
    return true;
  }
  if (message.type === "peer-audio-availability") {
    sendToWorklet({
      type: "peer-chrome-response",
      token: message.token,
      availability: nativePeerAudioAvailability(),
    });
    return true;
  }
  return false;
}

function nativePeerQrAvailability(granted: boolean): {
  readonly state: "available" | "permission-required";
  readonly reason: string;
} {
  if (granted) {
    return {
      state: "available",
      reason: "Native QR camera permission is granted",
    };
  }
  return {
    state: "permission-required",
    reason: "Camera starts only after Start camera",
  };
}

function nativePeerAudioAvailability(): {
  readonly state: "permission-required" | "unsupported";
  readonly reason: string;
} {
  if (nativePeerAudioSupported()) {
    return {
      state: "permission-required",
      reason:
        "Microphone permission is requested only after starting the audible exchange",
    };
  }
  return {
    state: "unsupported",
    reason: "Native PCM playback/capture module is unavailable",
  };
}

function tryHandleNativePeerConfirmAndNtfy(
  message: WorkletToHostMessage,
  deps: NativeWorkletMessageHandlerDeps,
): boolean {
  const { setPeerModal } = deps;
  if (message.type === "peer-ntfy-http") {
    void handleNativeNtfyHttp(message, deps);
    return true;
  }
  if (message.type === "peer-confirm-request") {
    setPeerModal({ kind: "confirm", request: message });
    return true;
  }
  return false;
}

async function handleNativeNtfyHttp(
  message: Extract<WorkletToHostMessage, { type: "peer-ntfy-http" }>,
  deps: NativeWorkletMessageHandlerDeps,
): Promise<void> {
  const { ntfyUrl, ntfyToken, sendToWorklet } = deps;
  try {
    const configured = new URL(
      ntfyUrl.trim().endsWith("/") ? ntfyUrl.trim() : `${ntfyUrl.trim()}/`,
    );
    const requested = new URL(message.request.url);
    if (!nativeNtfyRequestAllowed(configured, requested, message)) {
      throw new Error("ntfy request is outside the configured host policy");
    }
    const response = await fetchNativeNtfy(requested, message, ntfyToken);
    const body = await readNativeNtfyBody(response);
    sendToWorklet({
      type: "peer-chrome-response",
      token: message.token,
      http: {
        status: response.status,
        body,
        contentLength: response.headers.get("content-length"),
      },
    });
  } catch (error) {
    sendToWorklet({
      type: "peer-chrome-response",
      token: message.token,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function nativeNtfyRequestAllowed(
  configured: URL,
  requested: URL,
  message: Extract<WorkletToHostMessage, { type: "peer-ntfy-http" }>,
): boolean {
  const localHttp =
    configured.protocol === "http:" &&
    ["localhost", "127.0.0.1", "::1"].includes(configured.hostname);
  const basePath = configured.pathname.endsWith("/")
    ? configured.pathname
    : `${configured.pathname}/`;
  return nativeNtfyUrlAllowed(configured, requested, localHttp, basePath) &&
    nativeNtfyPayloadAllowed(message);
}

function nativeNtfyUrlAllowed(
  configured: URL,
  requested: URL,
  localHttp: boolean,
  basePath: string,
): boolean {
  return (
    (configured.protocol === "https:" || localHttp) &&
    requested.origin === configured.origin &&
    requested.pathname.startsWith(basePath) &&
    requested.username === "" &&
    requested.password === "" &&
    requested.hash === ""
  );
}

function nativeNtfyPayloadAllowed(
  message: Extract<WorkletToHostMessage, { type: "peer-ntfy-http" }>,
): boolean {
  return (
    ["GET", "POST"].includes(message.request.method) &&
    (message.request.body?.length ?? 0) <= 40_000
  );
}

async function fetchNativeNtfy(
  requested: URL,
  message: Extract<WorkletToHostMessage, { type: "peer-ntfy-http" }>,
  ntfyToken: string,
): Promise<Response> {
  const headers = new Headers(message.request.headers);
  headers.delete("authorization");
  if (ntfyToken.trim() !== "") {
    headers.set("Authorization", `Bearer ${ntfyToken.trim()}`);
  }
  return fetch(requested.toString(), {
    method: message.request.method,
    headers,
    ...(message.request.body === undefined
      ? {}
      : { body: message.request.body }),
    redirect: "error",
  });
}

async function readNativeNtfyBody(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > 256_000) {
    throw new Error("ntfy response exceeds host budget");
  }
  const body = await response.text();
  if (body.length > 256_000) {
    throw new Error("ntfy response exceeds host budget");
  }
  return body;
}

function tryHandleNativeReviews(
  message: WorkletToHostMessage,
  deps: NativeWorkletMessageHandlerDeps,
): boolean {
  return (
    tryHandleNativeHostReviews(message, deps) ||
    tryHandleNativeTrustAndSessions(message, deps)
  );
}

function tryHandleNativeHostReviews(
  message: WorkletToHostMessage,
  deps: NativeWorkletMessageHandlerDeps,
): boolean {
  const { appendLog, setHostConfirm, setHostReview } = deps;
  if (message.type === "confirm-request") {
    setHostConfirm({
      token: message.token,
      kind: message.kind,
      appId: message.appId,
      publisherPublicKey: message.publisherPublicKey,
      summary: message.summary,
    });
    return true;
  }
  if (message.type === "launch-review") {
    setHostReview({
      kind: "launch",
      review: message,
      grants: message.capabilities
        .filter((capability) => capability.granted)
        .map((capability) => capability.id),
    });
    return true;
  }
  if (message.type === "install-review") {
    setHostReview({ kind: "install", review: message, grants: [] });
    return true;
  }
  if (message.type === "install-256t-result") {
    appendLog(nativeInstall256tLog(message));
    return true;
  }
  return false;
}

function nativeInstall256tLog(
  message: Extract<WorkletToHostMessage, { type: "install-256t-result" }>,
): string {
  if (message.ok) {
    return `Installed ${message.appId} v${message.version} (trusted: ${message.trusted ? "yes" : "no"})`;
  }
  return `256t install failed: ${message.error ?? "unknown error"}`;
}

function tryHandleNativeTrustAndSessions(
  message: WorkletToHostMessage,
  deps: NativeWorkletMessageHandlerDeps,
): boolean {
  const {
    appendLog,
    setTrustedPublishers,
    setHostIdentity256t,
    setSessionInvites,
    setRelayNotice,
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
  if (message.type === "relay-attribution") {
    setRelayNotice({
      appId: message.appId,
      method: message.method,
      ...(message.kind === undefined ? {} : { kind: message.kind }),
    });
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

