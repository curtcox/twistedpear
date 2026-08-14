import { useCallback, useEffect, useRef } from "react";
import { AppState, PermissionsAndroid, Platform } from "react-native";
import { Worklet } from "react-native-bare-kit";
import bundle from "./worklet/worklet.bundle.mjs";
import {
  getNodeLifecycleState,
  isNodeServiceRunning,
  startNodeService,
  stopNodeService,
  addNodeLifecycleListener,
  type NodeLifecycleState,
} from "@twistedpear/node-service";
import { HostMulticastIpc } from "./host/multicast-ipc";
import { HostBonjourIpc } from "./host/bonjour-ipc";
import { HostBleIpc } from "./host/ble-ipc";
import { HostUsbIpc } from "./host/usb-ipc";
import {
  getUsbSerialCapability,
  listUsbSerialDevices,
  type UsbSerialDeviceInfo,
} from "@twistedpear/usb-serial";
import { decodeMessages } from "./worklet/protocol";
import type {
  HostToWorkletMessage,
  WorkletStatus,
  WorkletToHostMessage,
} from "./worklet/protocol";
import {
  ANDROID_EMULATOR_HOST,
  DEFAULT_DOCKER_PORT,
  LOCAL_HOST,
  requestBlePermissions,
} from "./app-native-shared.js";

export type NativeWorkletRefs = {
  readonly workletRef: React.MutableRefObject<Worklet | null>;
  readonly ipcBufferRef: React.MutableRefObject<string>;
  readonly multicastIpcRef: React.MutableRefObject<HostMulticastIpc | null>;
  readonly bonjourIpcRef: React.MutableRefObject<HostBonjourIpc | null>;
  readonly bleIpcRef: React.MutableRefObject<HostBleIpc | null>;
  readonly usbIpcRef: React.MutableRefObject<HostUsbIpc | null>;
  readonly workletReadyRef: React.MutableRefObject<Promise<boolean> | null>;
  readonly interfacesWantedWorkletRef: React.MutableRefObject<boolean>;
};

export type NativeWorkletLifecycleDeps = NativeWorkletRefs & {
  readonly appendLog: (line: string) => void;
  readonly sendToWorklet: (message: HostToWorkletMessage) => void;
  readonly handleWorkletMessage: (message: WorkletToHostMessage) => void;
  readonly tcpEnabled: boolean;
  readonly autoEnabled: boolean;
  readonly bleEnabled: boolean;
  readonly rnodeEnabled: boolean;
  readonly selectedUsbDeviceId: number | null;
  readonly ntfyUrl: string;
  readonly status: WorkletStatus;
  readonly setStatus: React.Dispatch<React.SetStateAction<WorkletStatus>>;
  readonly setServiceRunning: React.Dispatch<React.SetStateAction<boolean>>;
  readonly setLifecycleState: React.Dispatch<
    React.SetStateAction<NodeLifecycleState>
  >;
  readonly setUsbDevices: React.Dispatch<
    React.SetStateAction<ReadonlyArray<UsbSerialDeviceInfo>>
  >;
};

type InterfaceConfig = {
  tcp: boolean;
  auto: boolean;
  ble: boolean;
  rnode: boolean;
  rnodeDeviceId?: number | null;
};

export function useNativeWorkletLifecycle(deps: NativeWorkletLifecycleDeps) {
  const pushInterfaceConfig = useCallback(
    (next: InterfaceConfig) => sendNativeInterfaceConfig(deps.sendToWorklet, next),
    [deps.sendToWorklet],
  );
  const stopWorklet = useCallback(
    () => stopNativeWorklet(deps),
    [deps.sendToWorklet, deps.setStatus],
  );
  const startWorklet = useCallback(
    () => startNativeWorklet(deps, pushInterfaceConfig),
    [
      deps.appendLog,
      deps.autoEnabled,
      deps.bleEnabled,
      deps.handleWorkletMessage,
      deps.ntfyUrl,
      deps.rnodeEnabled,
      deps.selectedUsbDeviceId,
      deps.sendToWorklet,
      deps.setStatus,
      deps.tcpEnabled,
      pushInterfaceConfig,
    ],
  );
  useEffect(
    () =>
      syncNativeWorkletInterfaces(deps, startWorklet, stopWorklet, pushInterfaceConfig),
    [
      deps.tcpEnabled,
      deps.autoEnabled,
      deps.bleEnabled,
      deps.rnodeEnabled,
      deps.selectedUsbDeviceId,
      deps.ntfyUrl,
      startWorklet,
      stopWorklet,
      pushInterfaceConfig,
    ],
  );
  useEffect(() => {
    if (deps.workletRef.current === null) return;
    pushInterfaceConfig({
      tcp: deps.tcpEnabled,
      auto: deps.autoEnabled,
      ble: deps.bleEnabled,
      rnode: deps.rnodeEnabled,
      rnodeDeviceId: deps.selectedUsbDeviceId,
    });
  }, [
    deps.tcpEnabled,
    deps.autoEnabled,
    deps.bleEnabled,
    deps.rnodeEnabled,
    deps.selectedUsbDeviceId,
    pushInterfaceConfig,
  ]);
  useEffect(() => watchUsbSerialDevices(deps.setUsbDevices), [deps.setUsbDevices]);
  useEffect(
    () => syncNativeNodeService(deps),
    [
      deps.status.running,
      deps.tcpEnabled,
      deps.autoEnabled,
      deps.bleEnabled,
      deps.rnodeEnabled,
      deps.setLifecycleState,
      deps.setServiceRunning,
    ],
  );
  useEffect(() => subscribeIosNodeLifecycle(deps), [deps.sendToWorklet, deps.setLifecycleState, deps.status.running]);
  useEffect(
    () => subscribeNativeAppState(deps),
    [deps.sendToWorklet, deps.status.miniappRunning, deps.status.running],
  );
  useEffect(() => () => teardownNativeWorklet(stopWorklet), [stopWorklet]);
  return { pushInterfaceConfig, stopWorklet, startWorklet };
}

function sendNativeInterfaceConfig(
  sendToWorklet: (message: HostToWorkletMessage) => void,
  next: InterfaceConfig,
): void {
  sendToWorklet({
    type: "set-interfaces",
    ...next,
    rnode: Platform.OS === "ios" ? false : next.rnode,
  });
}

function stopNativeWorklet(deps: NativeWorkletLifecycleDeps): void {
  deps.sendToWorklet({ type: "stop" });
  void deps.multicastIpcRef.current?.stop();
  void deps.bleIpcRef.current?.stop();
  void deps.usbIpcRef.current?.stop();
  void deps.workletRef.current?.terminate();
  deps.workletRef.current = null;
  deps.workletReadyRef.current = null;
  deps.setStatus((current) => ({
    ...current,
    running: false,
    linkOnline: false,
  }));
}

function startNativeWorklet(
  deps: NativeWorkletLifecycleDeps,
  pushInterfaceConfig: (next: InterfaceConfig) => void,
): Promise<boolean> {
  if (deps.workletReadyRef.current !== null) {
    return deps.workletReadyRef.current;
  }
  if (deps.workletRef.current !== null) {
    return Promise.resolve(true);
  }
  const worklet = new Worklet();
  deps.multicastIpcRef.current = new HostMulticastIpc(deps.sendToWorklet);
  deps.bonjourIpcRef.current =
    Platform.OS === "ios" ? new HostBonjourIpc(deps.sendToWorklet) : null;
  deps.bleIpcRef.current = new HostBleIpc(deps.sendToWorklet);
  deps.usbIpcRef.current = getUsbSerialCapability().supported
    ? new HostUsbIpc(deps.sendToWorklet)
    : null;
  deps.ipcBufferRef.current = "";
  worklet.IPC.on("data", (data) => {
    const bytes =
      data instanceof Uint8Array
        ? data
        : new Uint8Array(data as ArrayLike<number>);
    const decoded = decodeMessages(
      `${deps.ipcBufferRef.current}${new TextDecoder().decode(bytes)}`,
    );
    deps.ipcBufferRef.current = decoded.remainder;
    for (const message of decoded.messages) {
      deps.handleWorkletMessage(message);
    }
  });
  deps.workletRef.current = worklet;
  const targetHost =
    Platform.OS === "android" ? ANDROID_EMULATOR_HOST : LOCAL_HOST;
  deps.workletReadyRef.current = Promise.resolve(
    bootNativeWorklet(deps, worklet, targetHost, pushInterfaceConfig),
  );
  return deps.workletReadyRef.current;
}

function bootNativeWorklet(
  deps: NativeWorkletLifecycleDeps,
  worklet: Worklet,
  targetHost: string,
  pushInterfaceConfig: (next: InterfaceConfig) => void,
): boolean {
  try {
    worklet.start("/app.bundle", bundle);
  } catch (error) {
    deps.workletRef.current = null;
    deps.workletReadyRef.current = null;
    deps.appendLog(
      `Worklet start failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    deps.setStatus((current) => ({
      ...current,
      running: false,
      linkOnline: false,
    }));
    return false;
  }
  if (deps.workletRef.current !== worklet) {
    return false;
  }
  deps.sendToWorklet({
    type: "start",
    targetHost,
    targetPort: DEFAULT_DOCKER_PORT,
    multicastEntitled: Platform.OS !== "ios",
    bonjourEnabled: true,
    ...(deps.ntfyUrl.trim() === "" ? {} : { ntfyUrl: deps.ntfyUrl.trim() }),
  });
  pushInterfaceConfig({
    tcp: deps.tcpEnabled,
    auto: deps.autoEnabled,
    ble: deps.bleEnabled,
    rnode: deps.rnodeEnabled,
    rnodeDeviceId: deps.selectedUsbDeviceId,
  });
  deps.sendToWorklet({ type: "device-list" });
  deps.appendLog(
    `Worklet started (target ${targetHost}:${DEFAULT_DOCKER_PORT})`,
  );
  return true;
}

function syncNativeWorkletInterfaces(
  deps: NativeWorkletLifecycleDeps,
  startWorklet: () => Promise<boolean>,
  stopWorklet: () => void,
  pushInterfaceConfig: (next: InterfaceConfig) => void,
): void {
  const shouldRun =
    deps.tcpEnabled || deps.autoEnabled || deps.bleEnabled || deps.rnodeEnabled;
  if (shouldRun) {
    void (async () => {
      if (deps.bleEnabled) {
        await requestBlePermissions();
      }
      const ready = await startWorklet();
      if (!ready || deps.workletRef.current === null) {
        return;
      }
      deps.sendToWorklet({
        type: "start",
        targetHost:
          Platform.OS === "android" ? ANDROID_EMULATOR_HOST : LOCAL_HOST,
        targetPort: DEFAULT_DOCKER_PORT,
        multicastEntitled: Platform.OS !== "ios",
        bonjourEnabled: true,
        ...(deps.ntfyUrl.trim() === "" ? {} : { ntfyUrl: deps.ntfyUrl.trim() }),
      });
      pushInterfaceConfig({
        tcp: deps.tcpEnabled,
        auto: deps.autoEnabled,
        ble: deps.bleEnabled,
        rnode: deps.rnodeEnabled,
        rnodeDeviceId: deps.selectedUsbDeviceId,
      });
    })();
    deps.interfacesWantedWorkletRef.current = true;
    return;
  }
  if (deps.interfacesWantedWorkletRef.current) {
    stopWorklet();
  }
  deps.interfacesWantedWorkletRef.current = false;
}

function watchUsbSerialDevices(
  setUsbDevices: NativeWorkletLifecycleDeps["setUsbDevices"],
): (() => void) | undefined {
  if (!getUsbSerialCapability().supported) {
    return undefined;
  }
  const refreshDevices = () => {
    setUsbDevices(listUsbSerialDevices());
  };
  refreshDevices();
  const timer = setInterval(refreshDevices, 2_000);
  return () => clearInterval(timer);
}

function syncNativeNodeService(deps: NativeWorkletLifecycleDeps): void {
  if (Platform.OS !== "android" && Platform.OS !== "ios") {
    return;
  }
  const nodeActive =
    deps.status.running &&
    (deps.tcpEnabled || deps.autoEnabled || deps.bleEnabled || deps.rnodeEnabled);
  if (!nodeActive) {
    void stopNodeService().then(() => {
      deps.setServiceRunning(isNodeServiceRunning());
      deps.setLifecycleState(getNodeLifecycleState());
    });
    return;
  }
  void (async () => {
    if (Platform.OS === "android" && Number(Platform.Version) >= 33) {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
    }
    await startNodeService();
    deps.setServiceRunning(isNodeServiceRunning());
    deps.setLifecycleState(getNodeLifecycleState());
  })();
}

function subscribeIosNodeLifecycle(
  deps: NativeWorkletLifecycleDeps,
): (() => void) | undefined {
  if (Platform.OS !== "ios") {
    return undefined;
  }
  const subscription = addNodeLifecycleListener((event) => {
    deps.setLifecycleState(event.state);
    if (
      (event.state === "background-grace" || event.state === "suspended") &&
      deps.status.running
    ) {
      deps.sendToWorklet({ type: "suspend-node" });
    } else if (
      (event.state === "foreground" || event.state === "background-wake") &&
      deps.status.running
    ) {
      deps.sendToWorklet({ type: "resume-node" });
    }
  });
  return () => subscription?.remove();
}

function subscribeNativeAppState(
  deps: NativeWorkletLifecycleDeps,
): () => void {
  const subscription = AppState.addEventListener("change", (nextState) => {
    if (nextState === "background" || nextState === "inactive") {
      if (deps.status.miniappRunning) {
        deps.sendToWorklet({ type: "suspend-miniapp" });
      }
      if (Platform.OS === "ios" && deps.status.running) {
        deps.sendToWorklet({ type: "suspend-node" });
      }
      return;
    }
    if (nextState === "active") {
      if (deps.status.miniappRunning) {
        deps.sendToWorklet({ type: "resume-miniapp" });
      }
      if (Platform.OS === "ios" && deps.status.running) {
        deps.sendToWorklet({ type: "resume-node" });
      }
    }
  });
  return () => subscription.remove();
}

function teardownNativeWorklet(stopWorklet: () => void): void {
  stopWorklet();
  if (Platform.OS === "android" || Platform.OS === "ios") {
    void stopNodeService();
  }
}
