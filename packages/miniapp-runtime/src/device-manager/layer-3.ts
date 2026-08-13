import {
  DEVICE_CLASS_REGISTRY,
  DEVICE_STREAM_KIND,
  ActuatorSafetyError,
  assertAidAllowed,
  adaptStreamAdmission,
  decideStreamAdmission,
  degradationLadderFor,
  defaultTierForClass,
  deriveCameraSample,
  deriveMicrophoneSample,
  deriveMotionSample,
  deviceCapabilityId,
  deviceClassById,
  initialDeviceSessionState,
  initialRemoteGrantStore,
  initialShareOfferStore,
  isDeviceSessionLive,
  isRemoteGrantLive,
  isShareOfferLive,
  quantizeAmbientLux,
  quantizeLocationCoarse,
  remoteGrantKey,
  sanitizeCameraFrame,
  sanitizeMotionSamples,
  sanitizePcmSample,
  stepDeviceSession,
  stepRemoteGrantStore,
  stepShareOfferStore,
  validateActuatorCommand,
  type AdmissionDecision,
  type CameraDerivedInput,
  type DeviceClassEntry,
  type DeviceCommand,
  type DeviceConsentClass,
  type DeviceSessionState,
  type LinkSupply,
  type MicrophoneDerivedInput,
  type PreciseLocationFix,
  type RawCameraFrameInput,
  type RawMotionInput,
  type RawMotionSample,
  type RawPcmInput,
  type RemoteDeviceGrant,
  type ShareOffer,
  type StreamDemand,
  type StreamPlane,
} from "@twistedpear/protocol";
import { assertCapabilityAllowed, CapabilityError } from "../capabilities.js";
import {
  requestHostConfirmation,
  type ConfirmationEffects,
  type HostConfirmationChannel,
} from "../confirm.js";
import {
  DeviceStreamSidecar,
  type DeviceSidecarDelivery,
} from "../device-sidecar.js";
import type { StreamEgress, StreamEgressFactory } from "../media-stream.js";
import {
  createHostBridgedDrivers,
  type DeviceHostBridge,
} from "../drivers/host-bridge.js";
import {
  DeviceError,
  MAX_PURPOSE_LENGTH,
  SENSITIVE_DEFAULT_TTL_MS,
  applyAdvisoryCandidateCeilings,
  assertDeviceCapabilityAllowed,
  bytesToHex,
  codecMatchesTier,
  createActuatorDriver,
  createHybridDeviceDrivers,
  createSimulatedAmbientLightDriver,
  createSimulatedBiometricDriver,
  createSimulatedCameraDriver,
  createSimulatedDeviceDrivers,
  createSimulatedHapticsDriver,
  createSimulatedLocationDriver,
  createSimulatedMicrophoneDriver,
  createSimulatedMotionDriver,
  createSimulatedNfcDriver,
  createSimulatedRawCameraDriver,
  createSimulatedRawMicrophoneDriver,
  createSimulatedRawMotionDriver,
  createSimulatedScalarDriver,
  createSimulatedScreenCaptureDriver,
  createSimulatedSpeakerDriver,
  createSimulatedSttDriver,
  createSimulatedTorchDriver,
  createSimulatedTtsDriver,
  encodeDerivedEvent,
  expandDeviceCapabilities,
  floatSamplesToBytes,
} from "./shared.js";
import type {
  DeviceActiveIndicator,
  DeviceAvailability,
  DeviceChromeSession,
  DeviceDescriptor,
  DeviceDiagnostic,
  DeviceDriver,
  DeviceManagerOptions,
  DeviceOpenRequest,
  DevicePeerHandle,
  DeviceSample,
  DeviceSession,
  DeviceSessionHandle,
  DeviceStreamConstraints,
  DeviceStreamHandle,
  DeviceStreamSession,
  LiveSession,
  RemoteOpenRequest,
  SimulatedActuatorLog,
} from "./shared.js";
import type { DeviceManager } from "../device-manager.js";
import { DeviceManagerLayer2 } from "./layer-2.js";
export class DeviceManagerLayer3 extends DeviceManagerLayer2 {
  /**
   * Requesting host: assert `device:remote`, then ask a serving manager to open.
   * Models the two-host path without wire protocol.
   */
  async requestRemoteDevice(
    appId: string,
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
