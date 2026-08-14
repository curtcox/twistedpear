import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { type WidgetTree } from "@twistedpear/miniapp-runtime";
import { createWebCoreBridge } from "./host/web-core-bridge";
import {
  createPwaInstallController,
  type PwaInstallAvailability,
} from "./host/web-pwa-install";
import { webSerialSupported } from "./host/web-serial-relay";
import type {
  AnnounceEntry,
  CapabilityGrantView,
  DeviceStateView,
  HostConfirmationRequestView,
  HostToWorkletMessage,
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
import {
  DEFAULT_PASSPHRASE,
  chatWidgetTree,
  defaultGatewayUrl,
  helloWidgetTree,
  initialStatus,
  playPeerAudio,
  recordPeerAudio,
} from "./app-web-shared.js";
import { createWebWorkerMessageHandler } from "./app-web-controller-messages.js";
import type { WebPeerRtcState } from "./app-web-controller-webrtc.js";

export function useWebHarnessController() {
  const st = useWebHarnessState();
  const appendLog = useCallback((line: string) => {
    st.setLogLines((current) => [...current.slice(-200), line]);
  }, [st.setLogLines]);
  const sendToWorker = useCallback((message: HostToWorkletMessage) => {
    st.bridgeRef.current?.send(message);
  }, [st.bridgeRef]);

  const handleWorkerMessage = useWebWorkerMessageHandler(st, appendLog, sendToWorker);

  const readWorkspaceDocument = useCallback(
    (documentId: string) =>
      new Promise<string>((resolve, reject) => {
        const token = `ws-${st.workspaceReadCounterRef.current++}`;
        const timer = setTimeout(() => {
          st.pendingWorkspaceReadsRef.current.delete(token);
          reject(new Error("Workspace read timed out"));
        }, 10_000);
        st.pendingWorkspaceReadsRef.current.set(token, { resolve, reject, timer });
        sendToWorker({ type: "workspace-read", token, documentId });
      }),
    [sendToWorker],
  );

  const ensureBridge = useCallback(() => {
    if (st.bridgeRef.current !== null) {
      return st.bridgeRef.current;
    }

    const bridge = createWebCoreBridge();
    bridge.setMessageHandler(handleWorkerMessage);
    bridge.worklet.start("/web-core.worker.js");
    st.bridgeRef.current = bridge;
    return bridge;
  }, [handleWorkerMessage]);

  const pushGatewayConfig = useCallback(() => {
    ensureBridge();
    sendToWorker({
      type: "start",
      targetHost: "127.0.0.1",
      targetPort: 9480,
      gatewayUrl: st.gatewayUrl,
      identityPassphrase: DEFAULT_PASSPHRASE,
      ...(st.sharedToken.trim().length === 0
        ? {}
        : { sharedToken: st.sharedToken.trim() }),
      ...(st.ntfyUrl.trim().length === 0 ? {} : { ntfyUrl: st.ntfyUrl.trim() }),
      ...(st.ntfyToken.trim().length === 0 ? {} : { ntfyToken: st.ntfyToken.trim() }),
    });
  }, [ensureBridge, st.gatewayUrl, st.ntfyToken, st.ntfyUrl, sendToWorker, st.sharedToken]);

  useWebHarnessEffects({
    ensureBridge,
    pushGatewayConfig,
    sendToWorker,
    developerMode: st.developerMode,
    wsEnabled: st.wsEnabled,
    rnodeEnabled: st.rnodeEnabled,
    bridgeRef: st.bridgeRef,
    crossDeviceCounterRef: st.crossDeviceCounterRef,
    pendingCrossDeviceRef: st.pendingCrossDeviceRef,
    setPwaInstallAvailability: st.setPwaInstallAvailability,
    pwaInstallRef: st.pwaInstallRef,
  });

  const performPeerAudio = useCallback(
    (
      request: Extract<
        WorkletToHostMessage,
        { type: "peer-audio-transmit" | "peer-audio-receive" }
      >,
    ) => performWebPeerAudio(request, appendLog, sendToWorker),
    [appendLog, sendToWorker],
  );

  const connectWebSerialRnode = useCallback(async () => {
    try {
      const bridge = ensureBridge();
      await bridge.requestWebSerialPort();
      st.setRnodeEnabled(true);
      appendLog(
        "Web Serial port opened; enable RNode to bring the interface online.",
      );
    } catch (error) {
      appendLog(
        `Web Serial connect failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }, [appendLog, ensureBridge]);

  const promptPwaInstall = useCallback(async () => {
    const outcome = await st.pwaInstallRef.current?.promptInstall();
    if (outcome === null || outcome === undefined) {
      appendLog("Install prompt unavailable in this browser session.");
      return;
    }

    appendLog(
      outcome === "accepted"
        ? "PWA install accepted."
        : "PWA install dismissed.",
    );
  }, [appendLog]);

  return {
    ...st,
    appendLog,
    sendToWorker,
    readWorkspaceDocument,
    handleWorkerMessage,
    ensureBridge,
    pushGatewayConfig,
    performPeerAudio,
    connectWebSerialRnode,
    promptPwaInstall,
  };
}

function useWebWorkerMessageHandler(
  st: ReturnType<typeof useWebHarnessState>,
  appendLog: (line: string) => void,
  sendToWorker: (message: HostToWorkletMessage) => void,
) {
  return useMemo(
    () =>
      createWebWorkerMessageHandler({
        appendLog,
        sendToWorker,
        peerRtcRef: st.peerRtcRef,
        pendingCrossDeviceRef: st.pendingCrossDeviceRef,
        pendingWorkspaceReadsRef: st.pendingWorkspaceReadsRef,
        setStatus: st.setStatus,
        setAnnounces: st.setAnnounces,
        setStorageQuota: st.setStorageQuota,
        setInstalled: st.setInstalled,
        setGrantCapabilities: st.setGrantCapabilities,
        setMiniappRuntime: st.setMiniappRuntime,
        setPeerModal: st.setPeerModal,
        setHostModal: st.setHostModal,
        setInstallProgress: st.setInstallProgress,
        setTrustedPublishers: st.setTrustedPublishers,
        setHostIdentity256t: st.setHostIdentity256t,
        setSessionInvites: st.setSessionInvites,
        setDeviceState: st.setDeviceState,
      }),
    [appendLog, sendToWorker],
  );
}

async function performWebPeerAudio(
  request: Extract<
    WorkletToHostMessage,
    { type: "peer-audio-transmit" | "peer-audio-receive" }
  >,
  appendLog: (line: string) => void,
  sendToWorker: (message: HostToWorkletMessage) => void,
): Promise<void> {
  try {
    appendLog(
      request.type === "peer-audio-transmit"
        ? "Playing audible peer frames…"
        : "Listening for audible peer frames…",
    );
    if (request.type === "peer-audio-transmit") {
      await playPeerAudio(request.framesHex);
      const framesHex = request.expectsResponse
        ? await recordPeerAudio()
        : [];
      sendToWorker({
        type: "peer-chrome-response",
        token: request.token,
        accepted: true,
        framesHex,
      });
    } else {
      const framesHex = await recordPeerAudio();
      sendToWorker({
        type: "peer-chrome-response",
        token: request.token,
        accepted: true,
        sessionId: request.sessionId,
        framesHex,
      });
    }
    appendLog("Audible peer exchange completed.");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    appendLog(`Audible peer exchange failed: ${detail}`);
    sendToWorker({
      type: "peer-chrome-response",
      token: request.token,
      accepted: false,
      error: detail,
    });
  }
}
type WebHostModal =
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
  | null;

type WebPeerModal =
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
  | null;

function useWebHarnessState() {
  const [status, setStatus] = useState<WorkletStatus>(initialStatus);
  const [announces, setAnnounces] = useState<ReadonlyArray<AnnounceEntry>>([]);
  const [logLines, setLogLines] = useState<ReadonlyArray<string>>([
    "Web leaf host ready. Configure the gateway URL, create an identity, then enable the WS gateway.",
  ]);
  const [gatewayUrl, setGatewayUrl] = useState(defaultGatewayUrl());
  const [sharedToken, setSharedToken] = useState("");
  const [ntfyUrl, setNtfyUrl] = useState("");
  const [ntfyToken, setNtfyToken] = useState("");
  const [wsEnabled, setWsEnabled] = useState(false);
  const [rnodeEnabled, setRnodeEnabled] = useState(false);
  const [webSerialAvailable] = useState(() => webSerialSupported());
  const [previewTree, setPreviewTree] = useState<WidgetTree>(helloWidgetTree);
  const [lastWidgetEvent, setLastWidgetEvent] = useState<string | null>(null);
  const [storageQuota, setStorageQuota] = useState<WebStorageQuotaView | null>(
    null,
  );
  const [installed, setInstalled] = useState<
    ReadonlyArray<InstalledPackageView>
  >([]);
  const [selectedInstalledAppId, setSelectedInstalledAppId] = useState<
    string | null
  >(null);
  const [grantCapabilities, setGrantCapabilities] = useState<
    ReadonlyArray<CapabilityGrantView>
  >([]);
  const [miniappRuntime, setMiniappRuntime] =
    useState<MiniappRuntimeView | null>(null);
  const [developerMode, setDeveloperMode] = useState(false);
  const [hostModal, setHostModal] = useState<WebHostModal>(null);
  const [peerModal, setPeerModal] = useState<WebPeerModal>(null);
  const [install256tInput, setInstall256tInput] = useState("");
  const [installProgress, setInstallProgress] =
    useState<InstallProgress | null>(null);
  const [trustedPublishers, setTrustedPublishers] = useState<
    ReadonlyArray<TrustedPublisherView>
  >([]);
  const [trustIdentityInput, setTrustIdentityInput] = useState("");
  const [trustLabelInput, setTrustLabelInput] = useState("");
  const [hostIdentity256t, setHostIdentity256t] = useState<string | null>(null);
  const [deviceState, setDeviceState] = useState<DeviceStateView | null>(null);
  const [sessionInvites, setSessionInvites] = useState<
    ReadonlyArray<SessionInviteView>
  >([]);
  const [pwaInstallAvailability, setPwaInstallAvailability] =
    useState<PwaInstallAvailability>("unavailable");
  const pwaInstallRef = useRef<ReturnType<
    typeof createPwaInstallController
  > | null>(null);
  const peerRtcRef = useRef(new Map<string, WebPeerRtcState>());

  const previewOptions = useMemo(
    () =>
      [
        { id: "hello", label: "Hello", tree: helloWidgetTree },
        { id: "chat", label: "Chat panel", tree: chatWidgetTree },
      ] as const,
    [],
  );

  const bridgeRef = useRef<ReturnType<typeof createWebCoreBridge> | null>(null);
  const workspaceReadCounterRef = useRef(0);
  const crossDeviceCounterRef = useRef(0);
  const pendingCrossDeviceRef = useRef(
    new Map<
      string,
      {
        readonly resolve: (result: Readonly<Record<string, unknown>>) => void;
        readonly reject: (error: Error) => void;
        readonly timer: ReturnType<typeof setTimeout>;
      }
    >(),
  );
  const pendingWorkspaceReadsRef = useRef(
    new Map<
      string,
      {
        readonly resolve: (content: string) => void;
        readonly reject: (error: Error) => void;
        readonly timer: ReturnType<typeof setTimeout>;
      }
    >(),
  );
  return {
    status, setStatus, announces, setAnnounces, logLines, setLogLines,
    gatewayUrl, setGatewayUrl, sharedToken, setSharedToken, ntfyUrl, setNtfyUrl,
    ntfyToken, setNtfyToken, wsEnabled, setWsEnabled, rnodeEnabled, setRnodeEnabled,
    webSerialAvailable, previewTree, setPreviewTree, lastWidgetEvent, setLastWidgetEvent,
    storageQuota, setStorageQuota, installed, setInstalled, selectedInstalledAppId, setSelectedInstalledAppId,
    grantCapabilities, setGrantCapabilities, miniappRuntime, setMiniappRuntime,
    developerMode, setDeveloperMode, hostModal, setHostModal, peerModal, setPeerModal,
    install256tInput, setInstall256tInput, installProgress, setInstallProgress,
    trustedPublishers, setTrustedPublishers, trustIdentityInput, setTrustIdentityInput,
    trustLabelInput, setTrustLabelInput, hostIdentity256t, setHostIdentity256t,
    deviceState, setDeviceState, sessionInvites, setSessionInvites,
    pwaInstallAvailability, setPwaInstallAvailability, pwaInstallRef, peerRtcRef,
    previewOptions, bridgeRef, workspaceReadCounterRef, crossDeviceCounterRef,
    pendingCrossDeviceRef, pendingWorkspaceReadsRef,
  };
}


function useWebHarnessEffects(args: {
  ensureBridge: () => ReturnType<typeof createWebCoreBridge>;
  pushGatewayConfig: () => void;
  sendToWorker: (message: HostToWorkletMessage) => void;
  developerMode: boolean;
  wsEnabled: boolean;
  rnodeEnabled: boolean;
  bridgeRef: React.MutableRefObject<ReturnType<typeof createWebCoreBridge> | null>;
  crossDeviceCounterRef: React.MutableRefObject<number>;
  pendingCrossDeviceRef: React.MutableRefObject<
    Map<
      string,
      {
        readonly resolve: (result: Readonly<Record<string, unknown>>) => void;
        readonly reject: (error: Error) => void;
        readonly timer: ReturnType<typeof setTimeout>;
      }
    >
  >;
  setPwaInstallAvailability: React.Dispatch<
    React.SetStateAction<PwaInstallAvailability>
  >;
  pwaInstallRef: React.MutableRefObject<ReturnType<
    typeof createPwaInstallController
  > | null>;
}): void {
  const {
    ensureBridge,
    pushGatewayConfig,
    sendToWorker,
    developerMode,
    wsEnabled,
    rnodeEnabled,
    bridgeRef,
    crossDeviceCounterRef,
    pendingCrossDeviceRef,
    setPwaInstallAvailability,
    pwaInstallRef,
  } = args;
  useEffect(() => {
    ensureBridge();
    pushGatewayConfig();
  }, [ensureBridge, pushGatewayConfig]);
  useEffect(
    () =>
      installWebCrossDeviceControl({
        ensureBridge,
        sendToWorker,
        crossDeviceCounterRef,
        pendingCrossDeviceRef,
      }),
    [ensureBridge, sendToWorker],
  );
  useEffect(() => {
    ensureBridge();
    sendToWorker({ type: "refresh-storage" });
    sendToWorker({ type: "list-installed" });
    sendToWorker({ type: "trust-list" });
    sendToWorker({ type: "device-list" });
  }, [ensureBridge, sendToWorker]);
  useEffect(() => {
    ensureBridge();
    sendToWorker({ type: "set-developer-mode", enabled: developerMode });
  }, [developerMode, ensureBridge, sendToWorker]);
  useEffect(() => {
    ensureBridge();
    sendToWorker({
      type: "set-interfaces",
      tcp: wsEnabled,
      auto: false,
      ble: false,
      rnode: rnodeEnabled,
    });
  }, [ensureBridge, sendToWorker, wsEnabled, rnodeEnabled]);
  useEffect(
    () => () => {
      bridgeRef.current?.stop();
      bridgeRef.current = null;
    },
    [],
  );
  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }
    const controller = createPwaInstallController();
    pwaInstallRef.current = controller;
    const unsubscribe = controller.subscribe(setPwaInstallAvailability);
    return () => {
      unsubscribe();
      controller.dispose();
      pwaInstallRef.current = null;
    };
  }, [setPwaInstallAvailability]);
}

function installWebCrossDeviceControl(args: {
  ensureBridge: () => ReturnType<typeof createWebCoreBridge>;
  sendToWorker: (message: HostToWorkletMessage) => void;
  crossDeviceCounterRef: React.MutableRefObject<number>;
  pendingCrossDeviceRef: React.MutableRefObject<
    Map<
      string,
      {
        readonly resolve: (result: Readonly<Record<string, unknown>>) => void;
        readonly reject: (error: Error) => void;
        readonly timer: ReturnType<typeof setTimeout>;
      }
    >
  >;
}): (() => void) | undefined {
  const {
    ensureBridge,
    sendToWorker,
    crossDeviceCounterRef,
    pendingCrossDeviceRef,
  } = args;
  const location = globalThis.location;
  if (
    new URLSearchParams(location.search).get("cross-device-control") !== "1"
  ) {
    return undefined;
  }
  const target = globalThis as unknown as {
    __TP_CROSS_DEVICE__?: {
      command(
        command: string,
        payload?: Readonly<Record<string, unknown>>,
      ): Promise<Readonly<Record<string, unknown>>>;
    };
  };
  target.__TP_CROSS_DEVICE__ = {
    command(command, payload = {}) {
      ensureBridge();
      return new Promise((resolve, reject) => {
        const token = `cross-device-${crossDeviceCounterRef.current++}`;
        const timer = setTimeout(() => {
          pendingCrossDeviceRef.current.delete(token);
          reject(new Error(`Cross-device command timed out: ${command}`));
        }, 120_000);
        pendingCrossDeviceRef.current.set(token, { resolve, reject, timer });
        sendToWorker({
          type: "cross-device-command",
          token,
          command: { ...payload, cmd: command },
        });
      });
    },
  };
  return () => {
    delete target.__TP_CROSS_DEVICE__;
  };
}
