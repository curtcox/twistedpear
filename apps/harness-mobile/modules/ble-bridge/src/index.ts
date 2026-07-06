import { requireNativeModule, type EventSubscription } from "expo-modules-core";
import { Platform } from "react-native";
import type { BlePipe, BlePipeEvents } from "@twistedpear/reticulum-interfaces";

interface BleBridgeNative {
  start(identityHash: Uint8Array): Promise<boolean>;
  stop(): Promise<boolean>;
  write(data: Uint8Array): Promise<boolean>;
  isConnected(): boolean;
  getMtu(): number;
  shouldActAsCentral(localHash: Uint8Array, peerHash: Uint8Array): boolean;
  addListener(event: "onData", listener: (event: BleDataEvent) => void): EventSubscription;
  addListener(event: "onConnect", listener: (event: BleConnectEvent) => void): EventSubscription;
  addListener(event: "onDisconnect", listener: () => void): EventSubscription;
  addListener(event: "onError", listener: (event: BleErrorEvent) => void): EventSubscription;
  addListener(event: "onPeerDiscovered", listener: (event: BlePeerDiscoveredEvent) => void): EventSubscription;
}

export interface BleDataEvent {
  readonly data: Uint8Array;
}

export interface BleConnectEvent {
  readonly mtu: number;
}

export interface BleErrorEvent {
  readonly message: string;
}

export interface BlePeerDiscoveredEvent {
  readonly peerIdentityHash: Uint8Array;
  readonly deviceAddress: string;
}

const NativeBleBridge = Platform.OS === "android"
  ? requireNativeModule<BleBridgeNative>("TwistedPearBleBridge")
  : null;

/** Wrap the Android BLE bridge as a BlePipe for BleInterface. */
export function createNativeBlePipe(identityHash: Uint8Array): BlePipe {
  if (NativeBleBridge === null) {
    throw new Error("BLE bridge is only available on Android");
  }

  if (identityHash.length !== 16) {
    throw new Error("Identity hash must be 16 bytes for the BLE control beacon");
  }

  let events: BlePipeEvents = {};
  let connected = false;
  let mtu = NativeBleBridge.getMtu();
  let bytesIn = 0;
  let bytesOut = 0;
  let dataSubscription: EventSubscription | null = null;
  let connectSubscription: EventSubscription | null = null;
  let disconnectSubscription: EventSubscription | null = null;
  let errorSubscription: EventSubscription | null = null;

  const pipe: BlePipe = {
    get mtu() {
      return mtu;
    },

    get connected() {
      return connected;
    },

    get stats() {
      return { bytesIn, bytesOut, connected };
    },

    setEvents(next: BlePipeEvents) {
      events = next;
    },

    async start() {
      dataSubscription?.remove();
      connectSubscription?.remove();
      disconnectSubscription?.remove();
      errorSubscription?.remove();

      dataSubscription = NativeBleBridge.addListener("onData", (event) => {
        const data = event.data instanceof Uint8Array
          ? event.data
          : Uint8Array.from(event.data as ArrayLike<number>);
        bytesIn += data.length;
        events.onData?.(data);
      });

      connectSubscription = NativeBleBridge.addListener("onConnect", (event) => {
        connected = true;
        mtu = event.mtu;
        events.onConnect?.();
      });

      disconnectSubscription = NativeBleBridge.addListener("onDisconnect", () => {
        connected = false;
        events.onDisconnect?.();
      });

      errorSubscription = NativeBleBridge.addListener("onError", (event) => {
        events.onError?.(new Error(event.message));
      });

      await NativeBleBridge.start(identityHash);
      connected = NativeBleBridge.isConnected();
      mtu = NativeBleBridge.getMtu();
    },

    async stop() {
      dataSubscription?.remove();
      connectSubscription?.remove();
      disconnectSubscription?.remove();
      errorSubscription?.remove();
      dataSubscription = null;
      connectSubscription = null;
      disconnectSubscription = null;
      errorSubscription = null;

      await NativeBleBridge.stop();
      connected = false;
    },

    async write(data: Uint8Array) {
      await NativeBleBridge.write(data);
      bytesOut += data.length;
    }
  };

  return pipe;
}

export function shouldActAsCentral(localHash: Uint8Array, peerHash: Uint8Array): boolean {
  if (NativeBleBridge === null) {
    throw new Error("BLE bridge is only available on Android");
  }

  return NativeBleBridge.shouldActAsCentral(localHash, peerHash);
}

export async function startNativeBlePipe(identityHash: Uint8Array): Promise<BlePipe> {
  const pipe = createNativeBlePipe(identityHash);
  await pipe.start();
  return pipe;
}

export async function stopNativeBlePipe(pipe: BlePipe): Promise<void> {
  await pipe.stop();
}
