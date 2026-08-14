/**
 * Bare worklet entry (bundled with bare-pack for react-native-bare-kit).
 * Runs reticulum-ts with the Bare runtime adapter and reports status over IPC.
 */
import "../../../conformance/bare-interop/bare-globals.mjs";
import "bare-encoding/global";
import { BleInterface } from "../../../packages/reticulum-interfaces/dist/ble/interface.js";
import { createIpcBleBridge } from "./ipc-ble-bridge.mjs";
import { createIpcSerialBridge } from "../../../packages/worklet-core/src/ipc-serial-bridge.mjs";
import { RNodeInterface } from "../../../packages/reticulum-interfaces/dist/rnode/interface.js";

export async function startBleInterfaceImpl(context) {
  const node = await context.ensureReticulum();
  if (context.bleIface !== null) {
    context.status.bleConnected = context.bleBridge?.connected ?? false;
    context.pushStatus();
    return;
  }
  const identity = await context.resolveIdentity();
  if (identity === null) {
    context.log("BLE requires an identity (create one first)");
    context.status.bleEnabled = false;
    context.pushStatus();
    return;
  }
  context.log("Starting BLE interface (native GATT bridge via IPC)");
  context.bleBridge = createIpcBleBridge(identity.hash);
  context.bleIface = await BleInterface.open(context.provider, {
    name: "harness-ble",
    provider: context.provider,
    pipe: context.bleBridge,
  });
  node.registerInterface(context.bleIface);
  context.status.bleConnected = context.bleBridge.connected;
  if (context.bleIface.online) {
    context.log("BLE interface online");
  } else {
    context.log("BLE interface started; waiting for GATT connection from host");
  }
  context.pushStatus();
}

export async function startRnodeInterfaceImpl(context) {
  const node = await context.ensureReticulum();
  if (context.rnodeIface !== null) {
    context.status.rnodeConnected = context.serialBridge?.connected ?? false;
    context.pushStatus();
    return;
  }
  if (context.pendingRnodeDeviceId === null) {
    context.log("RNode requires a USB device (select one in the harness UI)");
    context.status.rnodeEnabled = false;
    context.pushStatus();
    return;
  }
  context.log(
    `Starting RNode interface over USB device ${context.pendingRnodeDeviceId}`,
  );
  context.serialBridge = createIpcSerialBridge({
    deviceId: context.pendingRnodeDeviceId,
    baudRate: context.pendingRnodeBaudRate,
  });
  context.rnodeIface = await RNodeInterface.open(context.provider, {
    name: "harness-rnode",
    provider: context.provider,
    pipe: context.serialBridge,
  });
  node.registerInterface(context.rnodeIface);
  context.status.rnodeConnected = context.serialBridge.connected;
  context.status.rnodeDeviceName = context.status.rnodeConnected
    ? `usb-${context.pendingRnodeDeviceId}`
    : null;
  if (context.rnodeIface.online) {
    context.log(
      `RNode interface online (firmware: ${context.rnodeIface.rnodeStatus.firmwareVersion ?? "unknown"})`,
    );
  } else {
    context.log(
      "RNode interface started; waiting for USB serial connection from host",
    );
  }
  context.pushStatus();
}

export async function applyInterfaceConfigImpl(context) {
  if (context.nodeSuspended) {
    context.log("Interface restart deferred while node is suspended");
    return;
  }
  if (!context.anyRelayOrFreenetEnabled()) {
    await context.stopNode();
    context.log("All interfaces disabled; node stopped");
    return;
  }
  if (context.status.autoEnabled) {
    await context.startAutoInterface();
  } else {
    await context.stopAutoInterface();
  }
  if (context.status.bleEnabled) {
    await context.startBleInterface();
  } else {
    await context.stopBleInterface();
  }
  if (context.status.rnodeEnabled) {
    await context.startRnodeInterface();
  } else {
    await context.stopRnodeInterface();
  }
  if (
    context.status.freenetEnabled &&
    context.freenetCapabilities.packetTunnel
  ) {
    await context.startFreenetInterface();
  } else {
    await context.stopFreenetInterface();
  }
  if (context.status.tcpEnabled) {
    if (context.pendingTarget === null) {
      context.log("TCP enabled but no target host configured yet");
      return;
    }
    await context.startTcpInterface(
      context.pendingTarget.targetHost,
      context.pendingTarget.targetPort,
    );
    return;
  }
  await context.stopTcpInterface();
}
