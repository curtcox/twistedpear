import { requireNativeModule, type EventSubscription } from "expo-modules-core";
import { Platform } from "react-native";
import {
  BONJOUR_RETICULUM_SERVICE,
  type BonjourBridge,
  type BonjourBridgeEvents,
  type BonjourServiceRecord
} from "@twistedpear/reticulum-interfaces";

interface BonjourNative {
  start(serviceType: string): Promise<boolean>;
  stop(): Promise<boolean>;
  getInterfaces(): ReadonlyArray<{ readonly name: string; readonly linkLocalAddress: string }>;
  advertise(record: BonjourServiceRecord): Promise<boolean>;
  addListener(event: "onServiceFound", listener: (event: BonjourServiceRecord) => void): EventSubscription;
  addListener(event: "onServiceLost", listener: (event: { readonly message: string }) => void): EventSubscription;
  addListener(event: "onNetworkChange", listener: (event: { readonly interfaces: ReadonlyArray<{ readonly name: string; readonly linkLocalAddress: string }> }) => void): EventSubscription;
}

const NativeBonjour = Platform.OS === "ios"
  ? requireNativeModule<BonjourNative>("TwistedPearBonjour")
  : null;

export function getBonjourCapability(): { readonly supported: boolean; readonly reason: string | null } {
  if (NativeBonjour === null) {
    return { supported: false, reason: "native Bonjour bridge unavailable" };
  }

  return { supported: true, reason: null };
}

export function createNativeBonjourBridge(): BonjourBridge {
  if (NativeBonjour === null) {
    throw new Error("Bonjour bridge is only available in native Android and iOS builds");
  }

  let events: BonjourBridgeEvents = {};
  let interfaces: ReadonlyArray<{ readonly name: string; readonly linkLocalAddress: string }> = [];
  let foundSubscription: EventSubscription | null = null;
  let networkSubscription: EventSubscription | null = null;
  let lostSubscription: EventSubscription | null = null;

  return {
    get interfaces() {
      return interfaces;
    },

    setEvents(next) {
      events = next;
    },

    async start(serviceType = BONJOUR_RETICULUM_SERVICE) {
      foundSubscription?.remove();
      networkSubscription?.remove();
      lostSubscription?.remove();

      foundSubscription = NativeBonjour.addListener("onServiceFound", (record) => {
        events.onServiceFound?.(record);
      });

      networkSubscription = NativeBonjour.addListener("onNetworkChange", (event) => {
        interfaces = event.interfaces;
        events.onNetworkChange?.(event.interfaces);
      });

      lostSubscription = NativeBonjour.addListener("onServiceLost", (event) => {
        events.onError?.(event.message);
      });

      await NativeBonjour.start(serviceType);
      interfaces = NativeBonjour.getInterfaces();
      events.onNetworkChange?.(interfaces);
    },

    async stop() {
      foundSubscription?.remove();
      networkSubscription?.remove();
      lostSubscription?.remove();
      foundSubscription = null;
      networkSubscription = null;
      lostSubscription = null;
      await NativeBonjour.stop();
      interfaces = [];
    },

    async advertise(record) {
      await NativeBonjour.advertise(record);
    }
  };
}

export async function stopNativeBonjourBridge(bridge: BonjourBridge): Promise<void> {
  await bridge.stop();
}
