import { Platform } from "react-native";
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
  const {
    appendLog,
    sendToWorklet,
    cameraPermissionGranted,
    ntfyUrl,
    ntfyToken,
    multicastIpcRef,
    bonjourIpcRef,
    bleIpcRef,
    usbIpcRef,
    peerRtcRef,
    pendingWorkspaceReadsRef,
    setStatus,
    setAnnounces,
    setCatalog,
    setInstalled,
    setInstallProgress,
    setGrantCapabilities,
    setMiniappRuntime,
    setMiniappBenchmark,
    setMiniappLogs,
    setPeerModal,
    setPeerQrFrame,
    setPeerCameraActive,
    setHostConfirm,
    setHostReview,
    setTrustedPublishers,
    setHostIdentity256t,
    setSessionInvites,
    setRelayNotice,
    setDeviceState,
    setDevChannelDetail,
  } = deps;

  return (message: WorkletToHostMessage) => {
    if (multicastIpcRef.current?.isMulticastMessage(message)) {
      void multicastIpcRef.current.handleWorkletMessage(message);
      return;
    }

    if (bonjourIpcRef.current?.isBonjourMessage(message)) {
      void bonjourIpcRef.current.handleWorkletMessage(message);
      return;
    }

    if (bleIpcRef.current?.isBleMessage(message)) {
      void bleIpcRef.current.handleWorkletMessage(message);
      return;
    }

    if (usbIpcRef.current?.isSerialMessage(message)) {
      void usbIpcRef.current.handleWorkletMessage(message);
      return;
    }

    if (message.type === "status") {
      setStatus(message.status);
      return;
    }

    if (message.type === "log") {
      appendLog(message.line);
      return;
    }

    if (message.type === "announce") {
      setAnnounces((current) =>
        [message.entry, ...current].slice(0, MAX_ANNOUNCES),
      );
      sendToWorklet({ type: "list-catalog" });
      return;
    }

    if (message.type === "catalog") {
      setCatalog(message.entries);
      return;
    }

    if (message.type === "installed") {
      setInstalled(message.packages);
      return;
    }

    if (message.type === "install-progress") {
      setInstallProgress(message.progress);
      if (message.progress.phase === "complete") {
        sendToWorklet({ type: "list-installed" });
      }
      return;
    }

    if (message.type === "grants") {
      setGrantCapabilities(message.capabilities);
      return;
    }

    if (message.type === "miniapp-runtime") {
      setMiniappRuntime(message.runtime);
      return;
    }

    if (message.type === "miniapp-benchmark") {
      setMiniappBenchmark(message.result);
      return;
    }

    if (message.type === "miniapp-log") {
      setMiniappLogs((current) => [
        ...current.slice(-100),
        `${message.appId}: ${message.line}`,
      ]);
      appendLog(`[miniapp] ${message.line}`);
      return;
    }

    if (
      message.type === "peer-manual-present" ||
      message.type === "peer-manual-enter"
    ) {
      setPeerModal({ kind: "exchange", request: message, input: "" });
      return;
    }

    if (message.type === "peer-qr-availability") {
      sendToWorklet({
        type: "peer-chrome-response",
        token: message.token,
        availability:
          cameraPermissionGranted === true
            ? {
                state: "available",
                reason: "Native QR camera permission is granted",
              }
            : {
                state: "permission-required",
                reason: "Camera starts only after Start camera",
              },
      });
      return;
    }

    if (message.type === "peer-qr-present" || message.type === "peer-qr-scan") {
      setPeerQrFrame(0);
      setPeerCameraActive(false);
      setPeerModal({ kind: "exchange", request: message, input: "" });
      return;
    }

    if (message.type === "peer-audio-availability") {
      sendToWorklet({
        type: "peer-chrome-response",
        token: message.token,
        availability: nativePeerAudioSupported()
          ? {
              state: "permission-required",
              reason:
                "Microphone permission is requested only after starting the audible exchange",
            }
          : {
              state: "unsupported",
              reason: "Native PCM playback/capture module is unavailable",
            },
      });
      return;
    }

    if (
      message.type === "peer-audio-transmit" ||
      message.type === "peer-audio-receive"
    ) {
      setPeerModal({ kind: "exchange", request: message, input: "" });
      return;
    }

    if (
      message.type === "peer-ntfy-present" ||
      message.type === "peer-ntfy-enter"
    ) {
      setPeerModal({ kind: "exchange", request: message, input: "" });
      return;
    }

    if (message.type === "peer-ntfy-http") {
      void (async () => {
        try {
          const configured = new URL(
            ntfyUrl.trim().endsWith("/")
              ? ntfyUrl.trim()
              : `${ntfyUrl.trim()}/`,
          );
          const requested = new URL(message.request.url);
          const localHttp =
            configured.protocol === "http:" &&
            ["localhost", "127.0.0.1", "::1"].includes(configured.hostname);
          const basePath = configured.pathname.endsWith("/")
            ? configured.pathname
            : `${configured.pathname}/`;
          if (
            (configured.protocol !== "https:" && !localHttp) ||
            requested.origin !== configured.origin ||
            !requested.pathname.startsWith(basePath) ||
            requested.username !== "" ||
            requested.password !== "" ||
            requested.hash !== "" ||
            !["GET", "POST"].includes(message.request.method) ||
            (message.request.body?.length ?? 0) > 40_000
          ) {
            throw new Error(
              "ntfy request is outside the configured host policy",
            );
          }
          const headers = new Headers(message.request.headers);
          headers.delete("authorization");
          if (ntfyToken.trim() !== "") {
            headers.set("Authorization", `Bearer ${ntfyToken.trim()}`);
          }
          const response = await fetch(requested.toString(), {
            method: message.request.method,
            headers,
            ...(message.request.body === undefined
              ? {}
              : { body: message.request.body }),
            redirect: "error",
          });
          const declared = Number(
            response.headers.get("content-length") ?? "0",
          );
          if (Number.isFinite(declared) && declared > 256_000) {
            throw new Error("ntfy response exceeds host budget");
          }
          const body = await response.text();
          if (body.length > 256_000) {
            throw new Error("ntfy response exceeds host budget");
          }
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
      })();
      return;
    }

    if (message.type === "peer-confirm-request") {
      setPeerModal({ kind: "confirm", request: message });
      return;
    }

    if (message.type === "confirm-request") {
      setHostConfirm({
        token: message.token,
        kind: message.kind,
        appId: message.appId,
        publisherPublicKey: message.publisherPublicKey,
        summary: message.summary,
      });
      return;
    }

    if (message.type === "launch-review") {
      setHostReview({
        kind: "launch",
        review: message,
        grants: message.capabilities
          .filter((capability) => capability.granted)
          .map((capability) => capability.id),
      });
      return;
    }

    if (message.type === "install-review") {
      setHostReview({ kind: "install", review: message, grants: [] });
      return;
    }

    if (message.type === "install-256t-result") {
      appendLog(
        message.ok
          ? `Installed ${message.appId} v${message.version} (trusted: ${message.trusted ? "yes" : "no"})`
          : `256t install failed: ${message.error ?? "unknown error"}`,
      );
      return;
    }

    if (message.type === "trust") {
      setTrustedPublishers(message.entries);
      return;
    }

    if (message.type === "trust-identity") {
      setHostIdentity256t(message.identity256t);
      return;
    }

    if (message.type === "session-invites") {
      setSessionInvites(message.invites);
      return;
    }

    if (message.type === "relay-attribution") {
      setRelayNotice({
        appId: message.appId,
        method: message.method,
        ...(message.kind === undefined ? {} : { kind: message.kind }),
      });
      return;
    }

    if (message.type === "session-invite") {
      appendLog(
        `Call invitation from ${message.invite.verifiedPeerLabel} for ${message.invite.appId}`,
      );
      return;
    }

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
      return;
    }

    if (message.type === "device-bridge-request") {
      void (async () => {
        try {
          const result =
            message.op === "availability"
              ? await nativeDeviceAvailability(message.classId)
              : message.op === "actuate"
                ? await nativeDeviceActuate(
                    message.classId,
                    message.command ?? {},
                  )
                : await nativeDeviceSense(
                    message.classId,
                    message.options ?? {},
                  );
          sendToWorklet({
            type: "device-bridge-response",
            token: message.token,
            result,
          });
        } catch (error) {
          sendToWorklet({
            type: "device-bridge-response",
            token: message.token,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })();
      return;
    }

    if (message.type === "inbound-media-frame") {
      if (
        message.sink.kind === "speaker" &&
        peerAudioUnhex(message.dataHex)[5] === 5
      ) {
        appendLog(`Inbound derived event received (${message.encoding})`);
      } else if (message.sink.kind === "speaker") {
        void playInboundNativeMedia(message.dataHex, message.encoding)
          .then(() =>
            appendLog(
              `Inbound ${message.encoding} media → speaker (${message.dataHex.length / 2} bytes)`,
            ),
          )
          .catch((error) =>
            appendLog(
              `Inbound media failed: ${error instanceof Error ? error.message : String(error)}`,
            ),
          );
      } else {
        appendLog(
          `Inbound ${message.encoding} media → ${message.sink.kind} (${message.dataHex.length / 2} bytes)`,
        );
      }
      return;
    }

    if (message.type === "media-opus-play-request") {
      void playNativeOpusOrPcm(message.dataHex, message.encoding)
        .then(() => {
          sendToWorklet({
            type: "media-opus-play-response",
            token: message.token,
            played: true,
          });
          appendLog(
            `Opus/PCM harness play → speaker (${message.dataHex.length / 2} bytes)`,
          );
        })
        .catch((error) => {
          sendToWorklet({
            type: "media-opus-play-response",
            token: message.token,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      return;
    }

    if (message.type === "media-opus-duplex-request") {
      void runNativeOpusDuplex()
        .then((result) => {
          sendToWorklet({
            type: "media-opus-duplex-response",
            token: message.token,
            ...result,
          });
          appendLog(
            `Opus duplex host encode/decode/play (${result.opusBytes} opus bytes)`,
          );
        })
        .catch((error) => {
          sendToWorklet({
            type: "media-opus-duplex-response",
            token: message.token,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      return;
    }

    if (
      handleNativePeerWebRtcMessage(
        message,
        peerRtcRef.current,
        sendToWorklet,
        appendLog,
      )
    ) {
      return;
    }

    if (message.type === "peer-chrome-cancel") {
      setPeerCameraActive(false);
      setPeerModal(null);
      return;
    }

    if (message.type === "workspace-file") {
      const pending = pendingWorkspaceReadsRef.current.get(message.token);
      pendingWorkspaceReadsRef.current.delete(message.token);
      if (pending !== undefined) {
        clearTimeout(pending.timer);
        if (message.error !== undefined) {
          pending.reject(new Error(message.error));
        } else {
          pending.resolve(message.content ?? "");
        }
      }
      return;
    }

    if (message.type === "dev-channel") {
      setDevChannelDetail(message.detail ?? message.state);
      appendLog(
        `[dev] ${message.state}${message.detail ? `: ${message.detail}` : ""}`,
      );
    }
  };
}
