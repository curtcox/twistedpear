import { requireNativeModule, type EventSubscription } from "expo-modules-core";
import { Platform } from "react-native";

export interface NodeLifecycleChangeEvent {
  readonly state: NodeLifecycleState;
}

interface NodeServiceNative {
  start(): Promise<boolean>;
  stop(): Promise<boolean>;
  isRunning(): boolean;
  getLifecycleState?(): string;
  requestBackgroundRefresh?(): Promise<boolean>;
  addListener(
    event: "onLifecycleChange",
    listener: (event: NodeLifecycleChangeEvent) => void,
  ): EventSubscription;
}

function loadNativeNodeService(): NodeServiceNative | null {
  if (Platform.OS !== "android" && Platform.OS !== "ios") {
    return null;
  }
  try {
    return requireNativeModule<NodeServiceNative>("TwistedPearNodeService");
  } catch {
    return null;
  }
}

const NativeNodeService = loadNativeNodeService();

export type NodeLifecycleState =
  | "unsupported"
  | "stopped"
  | "foreground"
  | "background-grace"
  | "suspended"
  | "background-wake";

/** Start the native node lifecycle helper. Android uses a foreground service; iOS enters foreground lifecycle mode. */
export async function startNodeService(): Promise<boolean> {
  if (NativeNodeService === null) {
    return false;
  }

  return NativeNodeService.start();
}

/** Stop the native node lifecycle helper. */
export async function stopNodeService(): Promise<boolean> {
  if (NativeNodeService === null) {
    return false;
  }

  return NativeNodeService.stop();
}

/** Whether the node lifecycle helper is currently running. */
export function isNodeServiceRunning(): boolean {
  if (NativeNodeService === null) {
    return false;
  }

  return NativeNodeService.isRunning();
}

export function getNodeLifecycleState(): NodeLifecycleState {
  if (NativeNodeService === null) {
    return "unsupported";
  }

  const state =
    NativeNodeService.getLifecycleState?.() ??
    (NativeNodeService.isRunning() ? "foreground" : "stopped");
  if (
    state === "stopped" ||
    state === "foreground" ||
    state === "background-grace" ||
    state === "suspended" ||
    state === "background-wake"
  ) {
    return state;
  }

  return "unsupported";
}

export async function requestNodeBackgroundRefresh(): Promise<boolean> {
  if (NativeNodeService?.requestBackgroundRefresh === undefined) {
    return false;
  }

  return NativeNodeService.requestBackgroundRefresh();
}

/** Subscribe to iOS lifecycle transitions (foreground, grace window, suspended). */
export function addNodeLifecycleListener(
  listener: (event: NodeLifecycleChangeEvent) => void,
): EventSubscription | null {
  if (NativeNodeService === null || Platform.OS !== "ios") {
    return null;
  }

  return NativeNodeService.addListener("onLifecycleChange", listener);
}
