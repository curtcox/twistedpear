import type {
  DeviceCommand,
  DeviceAvailability,
  DeviceDriver,
} from "../device-manager.js";

/**
 * Effect boundary for OS/browser device I/O. Protocol DeviceManager stays Sans-IO;
 * hosts inject this bridge so sense/actuate run where permissions and hardware live
 * (renderer, Expo modules, web page).
 */
export interface DeviceHostBridge {
  availability(
    classId: string,
  ): Promise<DeviceAvailability> | DeviceAvailability;
  sense(
    classId: string,
    options?: Readonly<Record<string, unknown>>,
  ): Promise<unknown>;
  actuate?(classId: string, command: DeviceCommand): Promise<void>;
  stop?(classId: string): Promise<void>;
}

export function createHostBridgedDriver(
  classId: string,
  bridge: DeviceHostBridge,
): DeviceDriver {
  const driver: DeviceDriver = {
    classId,
    availability: () => bridge.availability(classId),
    sense: (options) => bridge.sense(classId, options),
  };
  if (bridge.actuate !== undefined) {
    return {
      ...driver,
      actuate: (command) => bridge.actuate!(classId, command),
      ...(bridge.stop !== undefined
        ? { stop: () => bridge.stop!(classId) }
        : {}),
    };
  }
  if (bridge.stop !== undefined) {
    return { ...driver, stop: () => bridge.stop!(classId) };
  }
  return driver;
}

export function createHostBridgedDrivers(
  classIds: ReadonlyArray<string>,
  bridge: DeviceHostBridge,
): ReadonlyArray<DeviceDriver> {
  return classIds.map((classId) => createHostBridgedDriver(classId, bridge));
}
