import { useCallback, useEffect, useMemo } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import qrcodeModule from "qrcode-generator";
import { requestNativePeerAudioPermission } from "@twistedpear/peer-audio";
import {
  probeFreenetRemoteNode,
  reduceFreenetRemoteSession,
  idleFreenetRemoteSession,
  freenetRemoteSessionLogSafe,
} from "./src/freenet-remote-session";
import type { FreenetRemoteGrant } from "./src/freenet-remote-grant";
import {
  encodeMessage,
  type HostToWorkletMessage,
  type WorkletToHostMessage,
  type DeviceStateView,
} from "./worklet/protocol";
import {
  playNativePeerFrames,
  recordNativePeerFrames,
} from "./app-native-shared.js";
import { createNativeWorkletMessageHandler } from "./app-native-controller-messages.js";
import type { NativeWorkletMessageHandlerDeps } from "./app-native-controller-messages.js";
import { useNativeWorkletLifecycle } from "./app-native-controller-worklet.js";
import type { NativeWorkletLifecycleDeps } from "./app-native-controller-worklet.js";
import {
  useNativeHarnessCoreState,
  useNativeHarnessRefs,
  useNativeHarnessUiState,
} from "./app-native-controller-state.js";

export function useNativeHarnessController() {
  const core = useNativeHarnessCoreState();
  const ui = useNativeHarnessUiState();
  const refs = useNativeHarnessRefs();
  useEffect(
    () => startPeerQrRotation(ui.peerModal, ui.setPeerQrFrame),
    [ui.peerModal],
  );
  const appendLog = useCallback(
    (line: string) => {
      core.setLogLines((current) => [...current.slice(-200), line]);
    },
    [core.setLogLines],
  );
  const sendToWorklet = useCallback(
    (message: HostToWorkletMessage) => {
      refs.workletRef.current?.IPC.write(
        new TextEncoder().encode(encodeMessage(message)),
      );
    },
    [refs.workletRef],
  );
  const handleWorkletMessage = useMemo(
    () =>
      createNativeWorkletMessageHandler(
        nativeMessageHandlerDeps(core, ui, refs, appendLog, sendToWorklet),
      ),
    [
      appendLog,
      ui.cameraPermission?.granted,
      core.ntfyToken,
      core.ntfyUrl,
      sendToWorklet,
    ],
  );
  const { pushInterfaceConfig, stopWorklet, startWorklet } =
    useNativeWorkletLifecycle(
      nativeWorkletLifecycleDeps(
        core,
        refs,
        appendLog,
        sendToWorklet,
        handleWorkletMessage,
      ),
    );
  const seedShareOfferChrome = useCallback(
    (options: SeedShareOptions) =>
      seedShareOffer(options, ui.setDeviceState, sendToWorklet),
    [sendToWorklet, ui.setDeviceState],
  );
  const revokeShareOfferChrome = useCallback(
    (appId: string, id: string) =>
      revokeShareOffer(appId, id, ui.setDeviceState, sendToWorklet),
    [sendToWorklet, ui.setDeviceState],
  );
  const applyFreenetGrantToWorklet = useCallback(
    (grant: FreenetRemoteGrant | null) =>
      applyFreenetGrant(grant, sendToWorklet),
    [sendToWorklet],
  );
  const activateFreenetGrant = useCallback(
    async (enabled: FreenetRemoteGrant) => {
      await activateFreenet(
        enabled,
        applyFreenetGrantToWorklet,
        ui.setFreenetSession,
        appendLog,
      );
    },
    [appendLog, applyFreenetGrantToWorklet, ui.setFreenetSession],
  );
  const readWorkspaceDocument = useCallback(
    (documentId: string) =>
      readNativeWorkspaceDocument(documentId, refs, sendToWorklet),
    [sendToWorklet],
  );
  const performPeerAudio = useCallback(
    (
      request: Extract<
        WorkletToHostMessage,
        { type: "peer-audio-transmit" | "peer-audio-receive" }
      >,
    ) => performNativePeerAudio(request, appendLog, sendToWorklet),
    [appendLog, sendToWorklet],
  );
  return {
    ...core,
    ...ui,
    ...refs,
    appendLog,
    sendToWorklet,
    seedShareOfferChrome,
    revokeShareOfferChrome,
    applyFreenetGrantToWorklet,
    activateFreenetGrant,
    readWorkspaceDocument,
    handleWorkletMessage,
    performPeerAudio,
    pushInterfaceConfig,
    stopWorklet,
    startWorklet,
    peerQrUri: nativePeerQrUri(ui.peerModal, ui.peerQrFrame),
  };
}

type SeedShareOptions = {
  readonly appId: string;
  readonly displayLabel: string;
  readonly classId: "camera" | "microphone";
  readonly ttlMs: number;
};

function nativeMessageHandlerDeps(
  core: ReturnType<typeof useNativeHarnessCoreState>,
  ui: ReturnType<typeof useNativeHarnessUiState>,
  refs: ReturnType<typeof useNativeHarnessRefs>,
  appendLog: (line: string) => void,
  sendToWorklet: (message: HostToWorkletMessage) => void,
): NativeWorkletMessageHandlerDeps {
  return {
    appendLog,
    sendToWorklet,
    cameraPermissionGranted: ui.cameraPermission?.granted,
    ntfyUrl: core.ntfyUrl,
    ntfyToken: core.ntfyToken,
    multicastIpcRef: refs.multicastIpcRef,
    bonjourIpcRef: refs.bonjourIpcRef,
    bleIpcRef: refs.bleIpcRef,
    usbIpcRef: refs.usbIpcRef,
    peerRtcRef: refs.peerRtcRef,
    pendingWorkspaceReadsRef: refs.pendingWorkspaceReadsRef,
    setStatus: core.setStatus,
    setAnnounces: core.setAnnounces,
    setCatalog: core.setCatalog,
    setInstalled: core.setInstalled,
    setInstallProgress: core.setInstallProgress,
    setGrantCapabilities: core.setGrantCapabilities,
    setMiniappRuntime: core.setMiniappRuntime,
    setMiniappBenchmark: core.setMiniappBenchmark,
    setMiniappLogs: core.setMiniappLogs,
    setPeerModal: ui.setPeerModal,
    setPeerQrFrame: ui.setPeerQrFrame,
    setPeerCameraActive: ui.setPeerCameraActive,
    setHostConfirm: ui.setHostConfirm,
    setHostReview: ui.setHostReview,
    setTrustedPublishers: ui.setTrustedPublishers,
    setHostIdentity256t: ui.setHostIdentity256t,
    setSessionInvites: ui.setSessionInvites,
    setRelayNotice: core.setRelayNotice,
    setDeviceState: ui.setDeviceState,
    setDevChannelDetail: core.setDevChannelDetail,
  };
}

function nativeWorkletLifecycleDeps(
  core: ReturnType<typeof useNativeHarnessCoreState>,
  refs: ReturnType<typeof useNativeHarnessRefs>,
  appendLog: (line: string) => void,
  sendToWorklet: (message: HostToWorkletMessage) => void,
  handleWorkletMessage: (message: WorkletToHostMessage) => void,
): NativeWorkletLifecycleDeps {
  return {
    workletRef: refs.workletRef,
    ipcBufferRef: refs.ipcBufferRef,
    multicastIpcRef: refs.multicastIpcRef,
    bonjourIpcRef: refs.bonjourIpcRef,
    bleIpcRef: refs.bleIpcRef,
    usbIpcRef: refs.usbIpcRef,
    workletReadyRef: refs.workletReadyRef,
    interfacesWantedWorkletRef: refs.interfacesWantedWorkletRef,
    appendLog,
    sendToWorklet,
    handleWorkletMessage,
    tcpEnabled: core.tcpEnabled,
    autoEnabled: core.autoEnabled,
    bleEnabled: core.bleEnabled,
    rnodeEnabled: core.rnodeEnabled,
    selectedUsbDeviceId: core.selectedUsbDeviceId,
    ntfyUrl: core.ntfyUrl,
    status: core.status,
    setStatus: core.setStatus,
    setServiceRunning: core.setServiceRunning,
    setLifecycleState: core.setLifecycleState,
    setUsbDevices: core.setUsbDevices,
  };
}

function startPeerQrRotation(
  peerModal: ReturnType<typeof useNativeHarnessUiState>["peerModal"],
  setPeerQrFrame: ReturnType<typeof useNativeHarnessUiState>["setPeerQrFrame"],
): (() => void) | undefined {
  if (
    peerModal?.kind !== "exchange" ||
    peerModal.request.type !== "peer-qr-present" ||
    peerModal.request.codes.length < 2
  ) {
    return undefined;
  }
  const codes = peerModal.request.codes;
  const timer = setInterval(
    () => setPeerQrFrame((current) => (current + 1) % codes.length),
    750,
  );
  return () => clearInterval(timer);
}

function withoutShareOfferId(
  offers: DeviceStateView["shareOffers"],
  id: string,
): DeviceStateView["shareOffers"] {
  return offers.filter((entry) => entry.id !== id);
}

function emptyDeviceStateView(): DeviceStateView {
  return {
    inventory: [],
    diagnostics: [],
    sessions: [],
    indicators: [],
    disabledClasses: [],
    remoteAcquisitionEnabled: false,
    shareOffers: [],
  };
}

function deviceStateWithShareOffer(
  current: DeviceStateView | null,
  offer: DeviceStateView["shareOffers"][number],
  id: string,
): DeviceStateView {
  const base = current ?? emptyDeviceStateView();
  return {
    ...base,
    shareOffers: [...withoutShareOfferId(base.shareOffers, id), offer],
  };
}

function expireShareOfferFromState(
  current: DeviceStateView | null,
  id: string,
): DeviceStateView | null {
  if (current === null) {
    return current;
  }
  return {
    ...current,
    shareOffers: current.shareOffers.filter(
      (entry) => entry.id !== id && entry.expiresAt > Date.now(),
    ),
  };
}

function seedShareOffer(
  options: SeedShareOptions,
  setDeviceState: React.Dispatch<React.SetStateAction<DeviceStateView | null>>,
  sendToWorklet: (message: HostToWorkletMessage) => void,
): void {
  const id = `host-seed-${Date.now()}`;
  const expiresAt = Date.now() + options.ttlMs;
  const offer = {
    id,
    appId: options.appId,
    displayLabel: options.displayLabel,
    classId: options.classId,
    tierId: "pcm",
    maxRung: "16k-opus",
    expiresAt,
  };
  setDeviceState((current) => deviceStateWithShareOffer(current, offer, id));
  sendToWorklet({
    type: "device-test-seed-share",
    appId: options.appId,
    displayLabel: options.displayLabel,
    classId: options.classId,
    ttlMs: options.ttlMs,
  });
  if (options.ttlMs <= 10_000) {
    setTimeout(
      () => {
        setDeviceState((current) => expireShareOfferFromState(current, id));
      },
      Math.max(50, options.ttlMs + 50),
    );
  }
}

function revokeShareOffer(
  appId: string,
  id: string,
  setDeviceState: React.Dispatch<React.SetStateAction<DeviceStateView | null>>,
  sendToWorklet: (message: HostToWorkletMessage) => void,
): void {
  setDeviceState((current) => {
    if (current === null) return current;
    return {
      ...current,
      shareOffers: current.shareOffers.filter((entry) => entry.id !== id),
    };
  });
  sendToWorklet({ type: "device-revoke-share", appId, id });
}

function applyFreenetGrant(
  grant: FreenetRemoteGrant | null,
  sendToWorklet: (message: HostToWorkletMessage) => void,
): void {
  if (grant === null || !grant.enabled) {
    sendToWorklet({ type: "set-freenet-config", enabled: false });
    return;
  }
  sendToWorklet({
    type: "set-freenet-config",
    enabled: true,
    url: grant.nodeUrl,
    ...(grant.authToken !== undefined && grant.authToken.length > 0
      ? { authToken: grant.authToken }
      : {}),
    ...(grant.rendezvousHex !== undefined && grant.rendezvousHex.length > 0
      ? { rendezvousHex: grant.rendezvousHex }
      : {}),
    localDirection: grant.localDirection === 1 ? 1 : 0,
    capabilities: grant.capabilities,
  });
}

async function activateFreenet(
  enabled: FreenetRemoteGrant,
  applyFreenetGrantToWorklet: (grant: FreenetRemoteGrant | null) => void,
  setFreenetSession: ReturnType<
    typeof useNativeHarnessUiState
  >["setFreenetSession"],
  appendLog: (line: string) => void,
): Promise<void> {
  applyFreenetGrantToWorklet(enabled);
  let next = reduceFreenetRemoteSession(idleFreenetRemoteSession(), {
    type: "enable",
    grant: enabled,
  });
  setFreenetSession(next);
  const probe = await probeFreenetRemoteNode(enabled);
  next = reduceFreenetRemoteSession(next, {
    type: "probe-result",
    result: probe,
  });
  setFreenetSession(next);
  appendLog(
    `Freenet remote session: ${JSON.stringify(freenetRemoteSessionLogSafe(next))}`,
  );
}

function readNativeWorkspaceDocument(
  documentId: string,
  refs: ReturnType<typeof useNativeHarnessRefs>,
  sendToWorklet: (message: HostToWorkletMessage) => void,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const token = `ws-${refs.workspaceReadCounterRef.current++}`;
    const timer = setTimeout(() => {
      refs.pendingWorkspaceReadsRef.current.delete(token);
      reject(new Error("Workspace read timed out"));
    }, 10_000);
    refs.pendingWorkspaceReadsRef.current.set(token, {
      resolve,
      reject,
      timer,
    });
    sendToWorklet({ type: "workspace-read", token, documentId });
  });
}

async function performNativePeerAudio(
  request: Extract<
    WorkletToHostMessage,
    { type: "peer-audio-transmit" | "peer-audio-receive" }
  >,
  appendLog: (line: string) => void,
  sendToWorklet: (message: HostToWorkletMessage) => void,
): Promise<void> {
  try {
    const granted =
      Platform.OS === "android"
        ? (await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          )) === PermissionsAndroid.RESULTS.GRANTED
        : await requestNativePeerAudioPermission();
    if (!granted) throw new Error("Microphone permission was denied");
    appendLog(
      request.type === "peer-audio-transmit"
        ? "Playing audible peer frames…"
        : "Listening for audible peer frames…",
    );
    if (request.type === "peer-audio-transmit") {
      await playNativePeerFrames(request.framesHex);
      const framesHex = request.expectsResponse
        ? await recordNativePeerFrames()
        : [];
      sendToWorklet({
        type: "peer-chrome-response",
        token: request.token,
        accepted: true,
        framesHex,
      });
    } else {
      sendToWorklet({
        type: "peer-chrome-response",
        token: request.token,
        accepted: true,
        sessionId: request.sessionId,
        framesHex: await recordNativePeerFrames(),
      });
    }
    appendLog("Audible peer exchange completed.");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    appendLog(`Audible peer exchange failed: ${detail}`);
    sendToWorklet({
      type: "peer-chrome-response",
      token: request.token,
      accepted: false,
      error: detail,
    });
  }
}

function nativePeerQrUri(
  peerModal: ReturnType<typeof useNativeHarnessUiState>["peerModal"],
  peerQrFrame: number,
): string | null {
  if (
    peerModal?.kind !== "exchange" ||
    peerModal.request.type !== "peer-qr-present"
  ) {
    return null;
  }
  const value: unknown =
    peerModal.request.codes[peerQrFrame % peerModal.request.codes.length];
  if (typeof value !== "string") return null;
  const image = qrcodeModule(0, "M");
  image.addData(value);
  image.make();
  return image.createDataURL(4, 8);
}
