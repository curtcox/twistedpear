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
    React.SetStateAction<
      | "unsupported"
      | "foreground"
      | "background-grace"
      | "background-wake"
      | "suspended"
    >
  >;
  readonly setUsbDevices: React.Dispatch<
    React.SetStateAction<ReadonlyArray<UsbSerialDeviceInfo>>
  >;
};

export function useNativeWorkletLifecycle(deps: NativeWorkletLifecycleDeps) {
  const {
    workletRef,
    ipcBufferRef,
    multicastIpcRef,
    bonjourIpcRef,
    bleIpcRef,
    usbIpcRef,
    workletReadyRef,
    interfacesWantedWorkletRef,
    appendLog,
    sendToWorklet,
    handleWorkletMessage,
    tcpEnabled,
    autoEnabled,
    bleEnabled,
    rnodeEnabled,
    selectedUsbDeviceId,
    ntfyUrl,
    status,
    setStatus,
    setServiceRunning,
    setLifecycleState,
    setUsbDevices,
  } = deps;

  const pushInterfaceConfig = useCallback(
    (next: {
      tcp: boolean;
      auto: boolean;
      ble: boolean;
      rnode: boolean;
      rnodeDeviceId?: number | null;
    }) => {
      sendToWorklet({
        type: "set-interfaces",
        ...next,
        rnode: Platform.OS === "ios" ? false : next.rnode,
      });
    },
    [sendToWorklet],
  );

  const stopWorklet = useCallback(() => {
    sendToWorklet({ type: "stop" });
    void multicastIpcRef.current?.stop();
    void bleIpcRef.current?.stop();
    void usbIpcRef.current?.stop();
    void workletRef.current?.terminate();
    workletRef.current = null;
    workletReadyRef.current = null;
    setStatus((current) => ({
      ...current,
      running: false,
      linkOnline: false,
    }));
  }, [sendToWorklet, setStatus]);

  const startWorklet = useCallback((): Promise<boolean> => {
    if (workletReadyRef.current !== null) {
      return workletReadyRef.current;
    }

    if (workletRef.current !== null) {
      return Promise.resolve(true);
    }

    const worklet = new Worklet();
    multicastIpcRef.current = new HostMulticastIpc(sendToWorklet);
    bonjourIpcRef.current =
      Platform.OS === "ios" ? new HostBonjourIpc(sendToWorklet) : null;
    bleIpcRef.current = new HostBleIpc(sendToWorklet);
    usbIpcRef.current = getUsbSerialCapability().supported
      ? new HostUsbIpc(sendToWorklet)
      : null;

    ipcBufferRef.current = "";
    worklet.IPC.on("data", (data) => {
      const bytes =
        data instanceof Uint8Array
          ? data
          : new Uint8Array(data as ArrayLike<number>);
      const decoded = decodeMessages(
        `${ipcBufferRef.current}${new TextDecoder().decode(bytes)}`,
      );
      ipcBufferRef.current = decoded.remainder;
      for (const message of decoded.messages) {
        handleWorkletMessage(message);
      }
    });

    workletRef.current = worklet;
    const targetHost =
      Platform.OS === "android" ? ANDROID_EMULATOR_HOST : LOCAL_HOST;

    // Worklet.start and everything after it are synchronous, so this body has
    // nothing to await; the ref is still a Promise<boolean> for its callers.
    workletReadyRef.current = Promise.resolve(
      ((): boolean => {
        try {
          worklet.start("/app.bundle", bundle);
        } catch (error) {
          workletRef.current = null;
          workletReadyRef.current = null;
          appendLog(
            `Worklet start failed: ${error instanceof Error ? error.message : String(error)}`,
          );
          setStatus((current) => ({
            ...current,
            running: false,
            linkOnline: false,
          }));
          return false;
        }

        if (workletRef.current !== worklet) {
          return false;
        }

        sendToWorklet({
          type: "start",
          targetHost,
          targetPort: DEFAULT_DOCKER_PORT,
          multicastEntitled: Platform.OS !== "ios",
          bonjourEnabled: true,
          ...(ntfyUrl.trim() === "" ? {} : { ntfyUrl: ntfyUrl.trim() }),
        });
        pushInterfaceConfig({
          tcp: tcpEnabled,
          auto: autoEnabled,
          ble: bleEnabled,
          rnode: rnodeEnabled,
          rnodeDeviceId: selectedUsbDeviceId,
        });
        sendToWorklet({ type: "device-list" });
        appendLog(
          `Worklet started (target ${targetHost}:${DEFAULT_DOCKER_PORT})`,
        );
        return true;
      })(),
    );

    return workletReadyRef.current;
  }, [
    appendLog,
    autoEnabled,
    bleEnabled,
    handleWorkletMessage,
    ntfyUrl,
    pushInterfaceConfig,
    rnodeEnabled,
    selectedUsbDeviceId,
    sendToWorklet,
    setStatus,
    tcpEnabled,
  ]);

  useEffect(() => {
    const shouldRun = tcpEnabled || autoEnabled || bleEnabled || rnodeEnabled;
    if (shouldRun) {
      const ensure = async () => {
        if (bleEnabled) {
          await requestBlePermissions();
        }
        const ready = await startWorklet();
        if (!ready || workletRef.current === null) {
          return;
        }
        sendToWorklet({
          type: "start",
          targetHost:
            Platform.OS === "android" ? ANDROID_EMULATOR_HOST : LOCAL_HOST,
          targetPort: DEFAULT_DOCKER_PORT,
          multicastEntitled: Platform.OS !== "ios",
          bonjourEnabled: true,
          ...(ntfyUrl.trim() === "" ? {} : { ntfyUrl: ntfyUrl.trim() }),
        });
        pushInterfaceConfig({
          tcp: tcpEnabled,
          auto: autoEnabled,
          ble: bleEnabled,
          rnode: rnodeEnabled,
          rnodeDeviceId: selectedUsbDeviceId,
        });
      };
      void ensure();
      interfacesWantedWorkletRef.current = true;
      return;
    }

    if (interfacesWantedWorkletRef.current) {
      stopWorklet();
    }
    interfacesWantedWorkletRef.current = false;
  }, [
    tcpEnabled,
    autoEnabled,
    bleEnabled,
    rnodeEnabled,
    selectedUsbDeviceId,
    ntfyUrl,
    startWorklet,
    stopWorklet,
    sendToWorklet,
    pushInterfaceConfig,
  ]);

  useEffect(() => {
    if (workletRef.current === null) {
      return;
    }

    pushInterfaceConfig({
      tcp: tcpEnabled,
      auto: autoEnabled,
      ble: bleEnabled,
      rnode: rnodeEnabled,
      rnodeDeviceId: selectedUsbDeviceId,
    });
  }, [
    tcpEnabled,
    autoEnabled,
    bleEnabled,
    rnodeEnabled,
    selectedUsbDeviceId,
    pushInterfaceConfig,
  ]);

  useEffect(() => {
    if (!getUsbSerialCapability().supported) {
      return;
    }

    const refreshDevices = () => {
      setUsbDevices(listUsbSerialDevices());
    };

    refreshDevices();
    const timer = setInterval(refreshDevices, 2_000);
    return () => clearInterval(timer);
  }, [setUsbDevices]);

  useEffect(() => {
    if (Platform.OS !== "android" && Platform.OS !== "ios") {
      return;
    }

    const nodeActive =
      status.running &&
      (tcpEnabled || autoEnabled || bleEnabled || rnodeEnabled);
    if (!nodeActive) {
      void stopNodeService().then(() => {
        setServiceRunning(isNodeServiceRunning());
        setLifecycleState(getNodeLifecycleState());
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
      setServiceRunning(isNodeServiceRunning());
      setLifecycleState(getNodeLifecycleState());
    })();
  }, [
    status.running,
    tcpEnabled,
    autoEnabled,
    bleEnabled,
    rnodeEnabled,
    setLifecycleState,
    setServiceRunning,
  ]);

  useEffect(() => {
    if (Platform.OS !== "ios") {
      return;
    }

    const subscription = addNodeLifecycleListener((event) => {
      setLifecycleState(event.state);
      if (
        (event.state === "background-grace" || event.state === "suspended") &&
        status.running
      ) {
        sendToWorklet({ type: "suspend-node" });
      } else if (
        (event.state === "foreground" || event.state === "background-wake") &&
        status.running
      ) {
        sendToWorklet({ type: "resume-node" });
      }
    });

    return () => subscription?.remove();
  }, [sendToWorklet, setLifecycleState, status.running]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        if (status.miniappRunning) {
          sendToWorklet({ type: "suspend-miniapp" });
        }

        if (Platform.OS === "ios" && status.running) {
          sendToWorklet({ type: "suspend-node" });
        }
        return;
      }

      if (nextState === "active") {
        if (status.miniappRunning) {
          sendToWorklet({ type: "resume-miniapp" });
        }

        if (Platform.OS === "ios" && status.running) {
          sendToWorklet({ type: "resume-node" });
        }
      }
    });

    return () => subscription.remove();
  }, [sendToWorklet, status.miniappRunning, status.running]);

  useEffect(
    () => () => {
      stopWorklet();
      if (Platform.OS === "android" || Platform.OS === "ios") {
        void stopNodeService();
      }
    },
    [stopWorklet],
  );

  return {
    pushInterfaceConfig,
    stopWorklet,
    startWorklet,
  };
}
