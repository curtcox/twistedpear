import { requireNativeModule, type EventSubscription } from "expo-modules-core";
import { Platform } from "react-native";
import type { SerialPipe, SerialPipeEvents } from "@twistedpear/reticulum-interfaces";

export interface UsbSerialDeviceInfo {
  readonly deviceId: number;
  readonly vendorId: number;
  readonly productId: number;
  readonly deviceName: string | null;
  readonly hasPermission: boolean;
  readonly isCdcAcm: boolean;
}

export interface UsbSerialConnectEvent {
  readonly deviceName: string;
}

export interface UsbSerialErrorEvent {
  readonly message: string;
}

export interface UsbSerialPermissionEvent {
  readonly deviceId: number;
  readonly granted: boolean;
}

export interface UsbSerialDataEvent {
  readonly data: Uint8Array;
}

interface UsbSerialNative {
  listDevices(): ReadonlyArray<UsbSerialDeviceInfo>;
  hasPermission(deviceId: number): boolean;
  requestPermission(deviceId: number): Promise<boolean>;
  open(deviceId: number, baudRate: number): Promise<boolean>;
  close(): Promise<boolean>;
  write(data: Uint8Array): Promise<boolean>;
  isConnected(): boolean;
  getOpenDeviceId(): number | null;
  addListener(event: "onData", listener: (event: UsbSerialDataEvent) => void): EventSubscription;
  addListener(event: "onConnect", listener: (event: UsbSerialConnectEvent) => void): EventSubscription;
  addListener(event: "onDisconnect", listener: () => void): EventSubscription;
  addListener(event: "onError", listener: (event: UsbSerialErrorEvent) => void): EventSubscription;
  addListener(event: "onDeviceAttached", listener: (event: UsbSerialDeviceInfo) => void): EventSubscription;
  addListener(event: "onDeviceDetached", listener: (event: { readonly deviceId: number }) => void): EventSubscription;
  addListener(event: "onPermissionResult", listener: (event: UsbSerialPermissionEvent) => void): EventSubscription;
}

const NativeUsbSerial = Platform.OS === "android"
  ? requireNativeModule<UsbSerialNative>("TwistedPearUsbSerial")
  : null;

export type UsbSerialCapability =
  | { readonly supported: true; readonly reason: null }
  | { readonly supported: false; readonly reason: "unsupported-on-ios" | "native-module-unavailable" };

export function getUsbSerialCapability(): UsbSerialCapability {
  if (Platform.OS === "ios") {
    return { supported: false, reason: "unsupported-on-ios" };
  }

  if (NativeUsbSerial === null) {
    return { supported: false, reason: "native-module-unavailable" };
  }

  return { supported: true, reason: null };
}

/** Wrap the Android USB-serial bridge as a SerialPipe for RNodeInterface. */
export function createNativeSerialPipe(deviceId: number, baudRate = 115_200): SerialPipe {
  if (NativeUsbSerial === null) {
    throw new Error(Platform.OS === "ios" ? "USB serial is unsupported on iOS; use BLE RNode instead" : "USB serial bridge is only available in native Android builds");
  }

  let events: SerialPipeEvents = {};
  let connected = false;
  let bytesIn = 0;
  let bytesOut = 0;
  let dataSubscription: EventSubscription | null = null;
  let connectSubscription: EventSubscription | null = null;
  let disconnectSubscription: EventSubscription | null = null;
  let errorSubscription: EventSubscription | null = null;

  const pipe: SerialPipe = {
    get connected() {
      return connected;
    },

    get stats() {
      return { bytesIn, bytesOut, connected };
    },

    setEvents(next: SerialPipeEvents) {
      events = next;
    },

    async open() {
      dataSubscription?.remove();
      connectSubscription?.remove();
      disconnectSubscription?.remove();
      errorSubscription?.remove();

      dataSubscription = NativeUsbSerial.addListener("onData", (event) => {
        const data = event.data instanceof Uint8Array
          ? event.data
          : Uint8Array.from(event.data as ArrayLike<number>);
        bytesIn += data.length;
        events.onData?.(data);
      });

      connectSubscription = NativeUsbSerial.addListener("onConnect", () => {
        connected = true;
        events.onConnect?.();
      });

      disconnectSubscription = NativeUsbSerial.addListener("onDisconnect", () => {
        connected = false;
        events.onDisconnect?.();
      });

      errorSubscription = NativeUsbSerial.addListener("onError", (event) => {
        events.onError?.(new Error(event.message));
      });

      const opened = await NativeUsbSerial.open(deviceId, baudRate);
      if (!opened) {
        throw new Error(`Failed to open USB serial device ${deviceId}`);
      }

      connected = NativeUsbSerial.isConnected();
      if (connected) {
        events.onConnect?.();
      }
    },

    async close() {
      dataSubscription?.remove();
      connectSubscription?.remove();
      disconnectSubscription?.remove();
      errorSubscription?.remove();
      dataSubscription = null;
      connectSubscription = null;
      disconnectSubscription = null;
      errorSubscription = null;

      await NativeUsbSerial.close();
      connected = false;
    },

    async write(data: Uint8Array) {
      await NativeUsbSerial.write(data);
      bytesOut += data.length;
    }
  };

  return pipe;
}

export function listUsbSerialDevices(): ReadonlyArray<UsbSerialDeviceInfo> {
  if (NativeUsbSerial === null) {
    return [];
  }

  return NativeUsbSerial.listDevices();
}

export async function requestUsbSerialPermission(deviceId: number): Promise<boolean> {
  if (NativeUsbSerial === null) {
    throw new Error(Platform.OS === "ios" ? "USB serial is unsupported on iOS; use BLE RNode instead" : "USB serial bridge is only available in native Android builds");
  }

  return NativeUsbSerial.requestPermission(deviceId);
}

export function hasUsbSerialPermission(deviceId: number): boolean {
  if (NativeUsbSerial === null) {
    return false;
  }

  return NativeUsbSerial.hasPermission(deviceId);
}

export async function openNativeSerialPipe(deviceId: number, baudRate = 115_200): Promise<SerialPipe> {
  const pipe = createNativeSerialPipe(deviceId, baudRate);
  await pipe.open();
  return pipe;
}

export async function closeNativeSerialPipe(pipe: SerialPipe): Promise<void> {
  await pipe.close();
}
