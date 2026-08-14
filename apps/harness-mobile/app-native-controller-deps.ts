import { type NativePeerRtcStore } from "./host/native-peer-webrtc";
import type { HostMulticastIpc } from "./host/multicast-ipc";
import type { HostBonjourIpc } from "./host/bonjour-ipc";
import type { HostBleIpc } from "./host/ble-ipc";
import type { HostUsbIpc } from "./host/usb-ipc";
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
