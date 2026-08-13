export * from "./device-manager/shared.js";
export type * from "./device-manager/shared.js";
import {
  createSimulatedDeviceDrivers,
  type DeviceDriver,
  type DeviceManagerOptions,
} from "./device-manager/shared.js";
import { DeviceManagerLayer3 } from "./device-manager/layer-3.js";
export class DeviceManager extends DeviceManagerLayer3 {}

export function createSimulatedDeviceManager(
  options: Omit<DeviceManagerOptions, "drivers"> & {
    readonly drivers?: ReadonlyArray<DeviceDriver>;
  } = {},
): DeviceManager {
  return new DeviceManager({
    ...options,
    drivers: options.drivers ?? createSimulatedDeviceDrivers(),
  });
}
