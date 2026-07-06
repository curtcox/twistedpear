import { requireNativeModule, type EventSubscription } from "expo-modules-core";
import { Platform } from "react-native";
import type { MulticastBridge, MulticastBridgeEvents, MulticastNetworkInfo } from "@twistedpear/reticulum-interfaces";

interface MulticastNative {
  start(): Promise<boolean>;
  stop(): Promise<boolean>;
  getInterfaces(): ReadonlyArray<MulticastNetworkInfo>;
  joinGroup(ifname: string, groupAddress: string, port: number): Promise<boolean>;
  bindPort(ifname: string, port: number): Promise<boolean>;
  send(ifname: string, groupAddress: string, port: number, data: Uint8Array): Promise<boolean>;
  sendUnicast(ifname: string, targetAddress: string, port: number, data: Uint8Array): Promise<boolean>;
  addListener(event: "onPacket", listener: (event: MulticastPacketEvent) => void): EventSubscription;
  addListener(event: "onNetworkChange", listener: (event: MulticastNetworkChangeEvent) => void): EventSubscription;
}

export interface MulticastPacketEvent {
  readonly ifname: string;
  readonly data: Uint8Array;
  readonly sourceAddress: string;
  readonly port: number;
}

export interface MulticastNetworkChangeEvent {
  readonly interfaces: ReadonlyArray<MulticastNetworkInfo>;
}

const NativeMulticast = Platform.OS === "android" || Platform.OS === "ios"
  ? requireNativeModule<MulticastNative>("TwistedPearMulticast")
  : null;

export function getMulticastCapability(): { readonly supported: boolean; readonly reason: string | null; readonly entitlementRequired: boolean } {
  if (NativeMulticast === null) {
    return { supported: false, reason: "native multicast bridge unavailable", entitlementRequired: false };
  }

  return {
    supported: true,
    reason: null,
    entitlementRequired: Platform.OS === "ios"
  };
}

/** Wrap the Android native multicast bridge as a MulticastBridge for AutoInterfaceBridge. */
export function createNativeMulticastBridge(): MulticastBridge {
  if (NativeMulticast === null) {
    throw new Error("Multicast bridge is only available in native Android and iOS builds");
  }

  let events: MulticastBridgeEvents = {};
  let interfaces: ReadonlyArray<MulticastNetworkInfo> = [];
  let packetSubscription: EventSubscription | null = null;
  let networkSubscription: EventSubscription | null = null;

  return {
    get interfaces() {
      return interfaces;
    },

    setEvents(next: MulticastBridgeEvents) {
      events = next;
    },

    async start() {
      packetSubscription?.remove();
      networkSubscription?.remove();

      packetSubscription = NativeMulticast.addListener("onPacket", (event) => {
        const data = event.data instanceof Uint8Array
          ? event.data
          : Uint8Array.from(event.data as ArrayLike<number>);
        events.onPacket?.(event.ifname, data, event.sourceAddress, event.port);
      });

      networkSubscription = NativeMulticast.addListener("onNetworkChange", (event) => {
        interfaces = event.interfaces;
        events.onNetworkChange?.(interfaces);
      });

      await NativeMulticast.start();
      interfaces = NativeMulticast.getInterfaces();
      events.onNetworkChange?.(interfaces);
    },

    async stop() {
      packetSubscription?.remove();
      networkSubscription?.remove();
      packetSubscription = null;
      networkSubscription = null;
      await NativeMulticast.stop();
      interfaces = [];
    },

    async joinGroup(ifname, groupAddress, port) {
      await NativeMulticast.joinGroup(ifname, groupAddress, port);
    },

    async bindPort(ifname, port) {
      await NativeMulticast.bindPort(ifname, port);
    },

    async send(ifname, groupAddress, port, data) {
      await NativeMulticast.send(ifname, groupAddress, port, data);
    },

    async sendUnicast(ifname, targetAddress, port, data) {
      await NativeMulticast.sendUnicast(ifname, targetAddress, port, data);
    }
  };
}

export async function startNativeMulticastBridge(): Promise<MulticastBridge> {
  const bridge = createNativeMulticastBridge();
  await bridge.start();
  return bridge;
}

export async function stopNativeMulticastBridge(bridge: MulticastBridge): Promise<void> {
  await bridge.stop();
}
