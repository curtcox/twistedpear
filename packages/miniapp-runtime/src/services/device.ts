import {
  DeviceError,
  DeviceManager,
  type DeviceDescriptor,
  type DeviceDiagnostic,
  type DeviceOpenRequest,
  type DeviceSample,
  type DeviceSession,
  type DeviceSessionHandle
} from "../device-manager.js";

export class DeviceBrokerServiceError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "DeviceBrokerServiceError";
  }
}

export class DeviceBrokerService {
  constructor(private readonly manager: DeviceManager) {}

  inventory(_appId: string): Promise<ReadonlyArray<DeviceDescriptor>> {
    return this.manager.inventory();
  }

  diagnostics(_appId: string): Promise<ReadonlyArray<DeviceDiagnostic>> {
    return this.manager.diagnostics();
  }

  open(
    appId: string,
    publisherPublicKey: string,
    declared: ReadonlyArray<string>,
    granted: ReadonlyArray<string>,
    payload: DeviceOpenRequest
  ): Promise<DeviceSession> {
    return this.manager.open(appId, publisherPublicKey, declared, granted, payload);
  }

  async close(appId: string, payload: { handle: DeviceSessionHandle }): Promise<{ closed: true }> {
    if (typeof payload?.handle !== "string" || payload.handle.length === 0) {
      throw new DeviceBrokerServiceError("DEVICE_BAD_REQUEST", "Device session handle is required.");
    }
    await this.manager.close(appId, payload.handle);
    return { closed: true };
  }

  read(appId: string, payload: { handle: DeviceSessionHandle }): Promise<DeviceSample> {
    if (typeof payload?.handle !== "string" || payload.handle.length === 0) {
      throw new DeviceBrokerServiceError("DEVICE_BAD_REQUEST", "Device session handle is required.");
    }
    return this.manager.read(appId, payload.handle);
  }

  write(
    appId: string,
    publisherPublicKey: string,
    payload: { handle: DeviceSessionHandle; command: import("@twistedpear/protocol").DeviceCommand }
  ): Promise<void> {
    if (typeof payload?.handle !== "string" || payload.handle.length === 0) {
      throw new DeviceBrokerServiceError("DEVICE_BAD_REQUEST", "Device session handle is required.");
    }
    if (typeof payload.command !== "object" || payload.command === null) {
      throw new DeviceBrokerServiceError("DEVICE_BAD_REQUEST", "Device command is required.");
    }
    return this.manager.write(appId, publisherPublicKey, payload.handle, payload.command);
  }

  stream(
    appId: string,
    declared: ReadonlyArray<string>,
    granted: ReadonlyArray<string>,
    payload: {
      handle: DeviceSessionHandle;
      peer: string;
      constraints?: import("../device-manager.js").DeviceStreamConstraints;
    }
  ): Promise<import("../device-manager.js").DeviceStreamSession> {
    if (typeof payload?.handle !== "string" || payload.handle.length === 0) {
      throw new DeviceBrokerServiceError("DEVICE_BAD_REQUEST", "Device session handle is required.");
    }
    return this.manager.stream(
      appId,
      declared,
      granted,
      payload.handle,
      payload.peer,
      payload.constraints ?? {}
    );
  }

  async closeStream(appId: string, payload: { handle: string }): Promise<{ closed: true }> {
    if (typeof payload?.handle !== "string" || payload.handle.length === 0) {
      throw new DeviceBrokerServiceError("DEVICE_BAD_REQUEST", "Stream handle is required.");
    }
    await this.manager.closeStream(appId, payload.handle);
    return { closed: true };
  }

  closeApp(appId: string): void {
    this.manager.closeApp(appId);
  }
}

export { DeviceError, DeviceManager };
export type {
  DeviceDescriptor,
  DeviceDiagnostic,
  DeviceOpenRequest,
  DeviceSample,
  DeviceSession,
  DeviceSessionHandle
};
