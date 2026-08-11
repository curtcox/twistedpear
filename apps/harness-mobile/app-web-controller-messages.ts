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
  const {
    appendLog,
    sendToWorker,
    peerRtcRef,
    pendingCrossDeviceRef,
    pendingWorkspaceReadsRef,
    setStatus,
    setAnnounces,
    setStorageQuota,
    setInstalled,
    setGrantCapabilities,
    setMiniappRuntime,
    setPeerModal,
    setHostModal,
    setInstallProgress,
    setTrustedPublishers,
    setHostIdentity256t,
    setSessionInvites,
    setDeviceState,
  } = deps;

  const webrtcDeps = { appendLog, sendToWorker, peerRtcRef };

  return (message: WorkletToHostMessage) => {
    if (message.type === "cross-device-result") {
      const pending = pendingCrossDeviceRef.current.get(message.token);
      pendingCrossDeviceRef.current.delete(message.token);
      if (pending !== undefined) {
        clearTimeout(pending.timer);
        if (message.ok) {
          pending.resolve(message.result ?? {});
        } else {
          pending.reject(
            new Error(message.error ?? "Cross-device command failed"),
          );
        }
      }
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
      return;
    }

    if (message.type === "storage-quota") {
      setStorageQuota(message.quota);
      return;
    }

    if (message.type === "installed") {
      setInstalled(message.packages);
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

    if (message.type === "miniapp-log") {
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
      const navigatorLike = (
        globalThis as {
          navigator?: { mediaDevices?: { getUserMedia?: unknown } };
        }
      ).navigator;
      sendToWorker({
        type: "peer-chrome-response",
        token: message.token,
        availability:
          typeof navigatorLike?.mediaDevices?.getUserMedia === "function"
            ? {
                state: "permission-required",
                reason: "Camera starts only after Start camera",
              }
            : {
                state: "unsupported",
                reason: "Camera capture is unavailable; use manual full code",
              },
      });
      return;
    }

    if (message.type === "peer-qr-present" || message.type === "peer-qr-scan") {
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

    if (message.type === "peer-audio-availability") {
      const browser = globalThis as unknown as {
        navigator?: { mediaDevices?: { getUserMedia?: unknown } };
        AudioContext?: unknown;
        webkitAudioContext?: unknown;
      };
      const available =
        typeof browser.navigator?.mediaDevices?.getUserMedia === "function" &&
        (browser.AudioContext !== undefined ||
          browser.webkitAudioContext !== undefined);
      sendToWorker({
        type: "peer-chrome-response",
        token: message.token,
        availability: available
          ? {
              state: "permission-required",
              reason:
                "Microphone permission is requested only after starting the audible exchange",
            }
          : {
              state: "unsupported",
              reason: "Web Audio microphone/playback is unavailable",
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

    if (handleWebRtcWorkerMessage(message, webrtcDeps)) {
      return;
    }

    if (message.type === "media-opus-play-request") {
      void playInboundAudioFrame(message.dataHex, message.encoding)
        .then(() => {
          sendToWorker({
            type: "media-opus-play-response",
            token: message.token,
            played: true,
          });
          appendLog(
            `Opus duplex play ok (${message.dataHex.length / 2} bytes)`,
          );
        })
        .catch((error) => {
          sendToWorker({
            type: "media-opus-play-response",
            token: message.token,
            played: false,
            error: error instanceof Error ? error.message : String(error),
          });
          appendLog(
            `Opus duplex play failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
      return;
    }

    if (message.type === "media-codec-request") {
      void handleWebMediaCodecRequest(message, sendToWorker);
      return;
    }

    if (message.type === "peer-confirm-request") {
      setPeerModal({ kind: "confirm", request: message });
      return;
    }

    if (message.type === "peer-chrome-cancel") {
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
      return;
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
      return;
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
      return;
    }

    if (message.type === "install-progress") {
      setInstallProgress(message.progress);
      return;
    }

    if (message.type === "install-256t-result") {
      const result = message as Install256tResultView;
      if (result.ok) {
        appendLog(
          `Installed ${result.appId} v${result.version} (trusted: ${result.trusted ? "yes" : "no"})`,
        );
      } else {
        appendLog(`256t install failed: ${result.error ?? "unknown error"}`);
      }
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
          const {
            browserDeviceAvailability,
            browserDeviceSense,
            browserDeviceActuate,
          } =
            await import("../../packages/miniapp-runtime/dist/drivers/browser-effects.js");
          const result =
            message.op === "availability"
              ? await browserDeviceAvailability(message.classId)
              : message.op === "actuate"
                ? await browserDeviceActuate(
                    message.classId,
                    message.command ?? {},
                  )
                : await browserDeviceSense(
                    message.classId,
                    message.options ?? {},
                  );
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
      })();
      return;
    }

    if (message.type === "inbound-media-frame") {
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
  };
}
