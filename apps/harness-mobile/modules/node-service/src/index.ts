import { requireNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

interface NodeServiceNative {
  start(): Promise<boolean>;
  stop(): Promise<boolean>;
  isRunning(): boolean;
}

const NativeNodeService = Platform.OS === "android"
  ? requireNativeModule<NodeServiceNative>("TwistedPearNodeService")
  : null;

/** Start the Android foreground service that keeps the Reticulum worklet alive. */
export async function startNodeService(): Promise<boolean> {
  if (NativeNodeService === null) {
    return false;
  }

  return NativeNodeService.start();
}

/** Stop the Android foreground service. */
export async function stopNodeService(): Promise<boolean> {
  if (NativeNodeService === null) {
    return false;
  }

  return NativeNodeService.stop();
}

/** Whether the foreground service is currently running. */
export function isNodeServiceRunning(): boolean {
  if (NativeNodeService === null) {
    return false;
  }

  return NativeNodeService.isRunning();
}
