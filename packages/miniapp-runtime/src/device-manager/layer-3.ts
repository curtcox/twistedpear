import {
  deviceClassById,
  isDeviceSessionLive,
  stepDeviceSession,
  type DeviceSessionState,
} from "@twistedpear/protocol";
import { CapabilityError } from "../capabilities.js";
import { DeviceError, assertDeviceCapabilityAllowed } from "./shared.js";
import type {
  DeviceActiveIndicator,
  DeviceChromeSession,
  DeviceSession,
  DeviceSessionHandle,
  RemoteOpenRequest,
} from "./shared.js";
import type { DeviceManager } from "../device-manager.js";
import { DeviceManagerLayer2 } from "./layer-2.js";
export class DeviceManagerLayer3 extends DeviceManagerLayer2 {
  /**
   * Requesting host: assert `device:remote`, then ask a serving manager to open.
   * Models the two-host path without wire protocol.
   */
  async requestRemoteDevice(
    _appId: string,
    declared: ReadonlyArray<string>,
    granted: ReadonlyArray<string>,
    serving: DeviceManager,
    request: RemoteOpenRequest,
  ): Promise<DeviceSession> {
    try {
      assertDeviceCapabilityAllowed({
        capability: "device:remote",
        declared,
        granted,
      });
    } catch (error) {
      if (error instanceof CapabilityError) {
        throw new DeviceError("DEVICE_DENIED", error.message);
      }
      throw error;
    }
    return serving.openForRemotePeer(request);
  }

  activeSessions(): ReadonlyArray<DeviceSessionState> {
    return [...this.sessions.values()]
      .filter((session) => isDeviceSessionLive(session.state.phase))
      .map((session) => session.state);
  }

  /** Host-chrome session list with opaque handles for kill switches. */
  chromeSessions(): ReadonlyArray<DeviceChromeSession> {
    return [...this.sessions.values()]
      .filter((session) => isDeviceSessionLive(session.state.phase))
      .map((session) => {
        const stream = [...this.streams.values()].find(
          (entry) => entry.session === session.handle,
        );
        return {
          handle: session.handle,
          phase: session.state.phase,
          classId: session.state.classId,
          tierId: session.state.tierId,
          appId: session.state.appId,
          purpose: session.purpose,
          consentClass: session.consentClass,
          openedAt: session.state.openedAt,
          expiresAt: session.state.expiresAt,
          destination:
            session.remotePeerId !== null
              ? `remote:${session.remotePeerId}`
              : (stream?.peer ?? ("local" as const)),
          remotePeerId: session.remotePeerId,
        };
      });
  }

  /** Host-chrome active-use indicators for elevated/sensitive sessions. */
  activeIndicators(): ReadonlyArray<DeviceActiveIndicator> {
    return [...this.sessions.values()]
      .filter(
        (session) =>
          isDeviceSessionLive(session.state.phase) &&
          (session.consentClass === "elevated" ||
            session.consentClass === "sensitive"),
      )
      .map((session) => {
        const stream = [...this.streams.values()].find(
          (entry) => entry.session === session.handle,
        );
        return {
          handle: session.handle,
          appId: session.state.appId,
          class: session.state.classId,
          tier: session.state.tierId,
          consentClass: session.consentClass,
          purpose: session.purpose,
          destination:
            session.remotePeerId !== null
              ? `remote:${session.remotePeerId}`
              : (stream?.peer ?? ("local" as const)),
        };
      });
  }

  /** Host chrome: disable/enable a device class. Disabling kills live sessions of that class. */
  setClassDisabled(classId: string, disabled: boolean): void {
    if (deviceClassById(classId) === undefined) {
      throw new DeviceError(
        "DEVICE_UNSUPPORTED",
        `Unknown device class "${classId}".`,
      );
    }
    const wasDisabled = this.policyDisabled.has(classId);
    if (disabled) {
      this.policyDisabled.add(classId);
      for (const [handle, session] of this.sessions) {
        if (
          session.state.classId !== classId ||
          !isDeviceSessionLive(session.state.phase)
        )
          continue;
        void this.stopDriver(session.state.classId);
        this.sidecar.close(handle);
        const at = this.now();
        const next = stepDeviceSession(session.state, {
          kind: "device/revoke",
          at,
        }).state;
        this.sessions.set(handle, { ...session, state: next });
        if (this.locks.get(session.state.classId) === session.state.holder) {
          this.locks.delete(session.state.classId);
        }
      }
    } else {
      this.policyDisabled.delete(classId);
    }
    if (wasDisabled !== disabled) this.notifyChrome();
  }

  disabledClasses(): ReadonlyArray<string> {
    return [...this.policyDisabled].sort();
  }

  isClassDisabled(classId: string): boolean {
    return this.policyDisabled.has(classId);
  }

  /**
   * Host chrome kill switch — closes by opaque handle without an app-scoped check.
   * Mini-apps must continue to use {@link close}.
   */
  async forceClose(handle: DeviceSessionHandle): Promise<void> {
    const session = this.sessions.get(handle);
    if (session === undefined || !isDeviceSessionLive(session.state.phase)) {
      throw new DeviceError(
        "DEVICE_SESSION_EXPIRED",
        `Unknown or inactive device session "${handle}".`,
      );
    }
    await this.stopDriver(session.state.classId);
    this.sidecar.close(handle);
    const at = this.now();
    const next = stepDeviceSession(session.state, {
      kind: "device/revoke",
      at,
    }).state;
    this.sessions.set(handle, { ...session, state: next });
    if (this.locks.get(session.state.classId) === session.state.holder) {
      this.locks.delete(session.state.classId);
    }
    for (const [streamHandle, stream] of this.streams) {
      if (stream.session === handle) {
        this.streams.delete(streamHandle);
        this.streamShareOfferIds.delete(streamHandle);
        this.streamAdaptation.delete(streamHandle);
        const egress = this.egresses.get(streamHandle);
        this.egresses.delete(streamHandle);
        void egress?.close();
      }
    }
    this.notifyChrome();
  }
}
