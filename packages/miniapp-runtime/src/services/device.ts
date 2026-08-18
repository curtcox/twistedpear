import {
  DeviceError,
  DeviceManager,
  type DeviceDescriptor,
  type DeviceDiagnostic,
  type DeviceOpenRequest,
  type DeviceSample,
  type DeviceSession,
  type DeviceSessionHandle,
} from "../device-manager.js";

function redactDeviceDiagnostics(
  entries: ReadonlyArray<DeviceDiagnostic>,
  granted: ReadonlyArray<string>,
): ReadonlyArray<DeviceDiagnostic> {
  if (granted.some((capability) => capability.startsWith("device:"))) {
    return entries;
  }
  return entries.map(({ holder: _holder, reason, ...rest }) => {
    const hostReason =
      reason !== undefined && !reason.startsWith("held by ") ? reason : undefined;
    return hostReason === undefined ? rest : { ...rest, reason: hostReason };
  });
}

export class DeviceBrokerServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
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

  diagnostics(
    _appId: string,
    granted: ReadonlyArray<string>,
  ): Promise<ReadonlyArray<DeviceDiagnostic>> {
    return this.manager.diagnostics().then((entries) =>
      redactDeviceDiagnostics(entries, granted),
    );
  }

  open(
    appId: string,
    publisherPublicKey: string,
    declared: ReadonlyArray<string>,
    granted: ReadonlyArray<string>,
    payload: DeviceOpenRequest,
  ): Promise<DeviceSession> {
    return this.manager.open(
      appId,
      publisherPublicKey,
      declared,
      granted,
      payload,
    );
  }

  async close(
    appId: string,
    payload: { handle: DeviceSessionHandle },
  ): Promise<{ closed: true }> {
    if (typeof payload.handle !== "string" || payload.handle.length === 0) {
      throw new DeviceBrokerServiceError(
        "DEVICE_BAD_REQUEST",
        "Device session handle is required.",
      );
    }
    await this.manager.close(appId, payload.handle);
    return { closed: true };
  }

  read(
    appId: string,
    payload: { handle: DeviceSessionHandle },
  ): Promise<DeviceSample> {
    if (typeof payload.handle !== "string" || payload.handle.length === 0) {
      throw new DeviceBrokerServiceError(
        "DEVICE_BAD_REQUEST",
        "Device session handle is required.",
      );
    }
    return this.manager.read(appId, payload.handle);
  }

  write(
    appId: string,
    publisherPublicKey: string,
    payload: {
      handle: DeviceSessionHandle;
      command: import("@twistedpear/protocol").DeviceCommand;
    },
  ): Promise<void> {
    if (typeof payload.handle !== "string" || payload.handle.length === 0) {
      throw new DeviceBrokerServiceError(
        "DEVICE_BAD_REQUEST",
        "Device session handle is required.",
      );
    }
    const command: unknown = payload.command;
    if (typeof command !== "object" || command === null) {
      throw new DeviceBrokerServiceError(
        "DEVICE_BAD_REQUEST",
        "Device command is required.",
      );
    }
    return this.manager.write(
      appId,
      publisherPublicKey,
      payload.handle,
      payload.command,
    );
  }

  stream(
    appId: string,
    declared: ReadonlyArray<string>,
    granted: ReadonlyArray<string>,
    payload: {
      handle: DeviceSessionHandle;
      peer: string;
      constraints?: import("../device-manager.js").DeviceStreamConstraints;
    },
  ): Promise<import("../device-manager.js").DeviceStreamSession> {
    if (typeof payload.handle !== "string" || payload.handle.length === 0) {
      throw new DeviceBrokerServiceError(
        "DEVICE_BAD_REQUEST",
        "Device session handle is required.",
      );
    }
    return this.manager.stream({
      appId,
      declared,
      granted,
      sessionHandle: payload.handle,
      peer: payload.peer,
      constraints: payload.constraints,
    });
  }

  async closeStream(
    appId: string,
    payload: { handle: string },
  ): Promise<{ closed: true }> {
    if (typeof payload.handle !== "string" || payload.handle.length === 0) {
      throw new DeviceBrokerServiceError(
        "DEVICE_BAD_REQUEST",
        "Stream handle is required.",
      );
    }
    await this.manager.closeStream(appId, payload.handle);
    return { closed: true };
  }

  streams(
    appId: string,
  ): ReadonlyArray<import("../device-manager.js").DeviceStreamSession> {
    return this.manager.activeStreamsForApp(appId);
  }

  closeApp(appId: string): void {
    this.manager.closeApp(appId);
  }

  shareOffers(
    appId: string,
  ): ReadonlyArray<import("@twistedpear/protocol").ShareOffer> {
    return this.manager.listShareOffers(appId);
  }

  requestShareOffer(
    appId: string,
    payload: { purpose: string },
  ): Promise<import("@twistedpear/protocol").ShareOffer | null> {
    return this.manager.requestShareOfferFromChrome(appId, payload.purpose);
  }

  async revokeShareOffer(
    appId: string,
    payload: { id: string },
  ): Promise<{ revoked: boolean }> {
    return {
      revoked: await this.manager.requestShareOfferRevoke(appId, payload.id),
    };
  }
}

export { DeviceError, DeviceManager };
export type {
  DeviceDescriptor,
  DeviceDiagnostic,
  DeviceOpenRequest,
  DeviceSample,
  DeviceSession,
  DeviceSessionHandle,
};
