import {
  nativeDeviceActuate,
  nativeDeviceAvailability,
  nativeDeviceSense,
} from "./host/native-device-bridge";
import { handleNativePeerWebRtcMessage } from "./host/native-peer-webrtc";
import {
  playInboundNativeMedia,
  playNativeOpusOrPcm,
  runNativeOpusDuplex,
} from "./app-native-shared.js";
import { peerAudioUnhex } from "./app-native-shared.js";
import type { NativeWorkletMessageHandlerDeps } from "./app-native-controller-messages.js";
import type { WorkletToHostMessage } from "./worklet/protocol";

export function tryHandleNativeDeviceAndMedia(
  message: WorkletToHostMessage,
  deps: NativeWorkletMessageHandlerDeps,
): boolean {
  return (
    tryHandleNativeDeviceBridgeMsgs(message, deps) ||
    tryHandleNativeWorkspaceAndDev(message, deps)
  );
}

function tryHandleNativeDeviceBridgeMsgs(
  message: WorkletToHostMessage,
  deps: NativeWorkletMessageHandlerDeps,
): boolean {
  const { appendLog, sendToWorklet, peerRtcRef, setDeviceState } = deps;
  if (message.type === "device-state") {
    setDeviceState({
      inventory: message.inventory,
      diagnostics: message.diagnostics,
      sessions: message.sessions,
      indicators: message.indicators,
      disabledClasses: message.disabledClasses,
      remoteAcquisitionEnabled: message.remoteAcquisitionEnabled,
      shareOffers: message.shareOffers,
    });
    return true;
  }
  if (message.type === "device-bridge-request") {
    void handleNativeDeviceBridge(message, deps);
    return true;
  }
  if (message.type === "inbound-media-frame") {
    handleNativeInboundMedia(message, deps);
    return true;
  }
  if (message.type === "media-opus-play-request") {
    void handleNativeOpusPlay(message, deps);
    return true;
  }
  if (message.type === "media-opus-duplex-request") {
    void handleNativeOpusDuplex(message, deps);
    return true;
  }
  return handleNativePeerWebRtcMessage(
    message,
    peerRtcRef.current,
    sendToWorklet,
    appendLog,
  );
}

function tryHandleNativeWorkspaceAndDev(
  message: WorkletToHostMessage,
  deps: NativeWorkletMessageHandlerDeps,
): boolean {
  const {
    appendLog,
    pendingWorkspaceReadsRef,
    setPeerCameraActive,
    setPeerModal,
    setDevChannelDetail,
  } = deps;
  if (message.type === "peer-chrome-cancel") {
    setPeerCameraActive(false);
    setPeerModal(null);
    return true;
  }
  if (message.type === "workspace-file") {
    settleNativeWorkspaceRead(message, pendingWorkspaceReadsRef);
    return true;
  }
  if (message.type === "dev-channel") {
    setDevChannelDetail(message.detail ?? message.state);
    appendLog(
      `[dev] ${message.state}${message.detail ? `: ${message.detail}` : ""}`,
    );
    return true;
  }
  return false;
}

function settleNativeWorkspaceRead(
  message: Extract<WorkletToHostMessage, { type: "workspace-file" }>,
  pendingWorkspaceReadsRef: NativeWorkletMessageHandlerDeps["pendingWorkspaceReadsRef"],
): void {
  const pending = pendingWorkspaceReadsRef.current.get(message.token);
  pendingWorkspaceReadsRef.current.delete(message.token);
  if (pending === undefined) {
    return;
  }
  clearTimeout(pending.timer);
  if (message.error !== undefined) {
    pending.reject(new Error(message.error));
    return;
  }
  pending.resolve(message.content ?? "");
}

async function handleNativeDeviceBridge(
  message: Extract<WorkletToHostMessage, { type: "device-bridge-request" }>,
  deps: NativeWorkletMessageHandlerDeps,
): Promise<void> {
  const { sendToWorklet } = deps;
  try {
    const result =
      message.op === "availability"
        ? await nativeDeviceAvailability(message.classId)
        : message.op === "actuate"
          ? await nativeDeviceActuate(message.classId, message.command ?? {})
          : await nativeDeviceSense(message.classId, message.options ?? {});
    sendToWorklet({
      type: "device-bridge-response",
      token: message.token,
      result,
    });
  } catch (error) {
    sendToWorklet({
      type: "device-bridge-response",
      token: message.token,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function handleNativeInboundMedia(
  message: Extract<WorkletToHostMessage, { type: "inbound-media-frame" }>,
  deps: NativeWorkletMessageHandlerDeps,
): void {
  const { appendLog } = deps;
  if (
    message.sink.kind === "speaker" &&
    peerAudioUnhex(message.dataHex)[5] === 5
  ) {
    appendLog(`Inbound derived event received (${message.encoding})`);
  } else if (message.sink.kind === "speaker") {
    void playInboundNativeMedia(message.dataHex, message.encoding)
      .then(() =>
        appendLog(
          `Inbound ${message.encoding} media → speaker (${message.dataHex.length / 2} bytes)`,
        ),
      )
      .catch((error) =>
        appendLog(
          `Inbound media failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
  } else {
    appendLog(
      `Inbound ${message.encoding} media → ${message.sink.kind} (${message.dataHex.length / 2} bytes)`,
    );
  }
}

async function handleNativeOpusPlay(
  message: Extract<WorkletToHostMessage, { type: "media-opus-play-request" }>,
  deps: NativeWorkletMessageHandlerDeps,
): Promise<void> {
  const { sendToWorklet, appendLog } = deps;
  try {
    await playNativeOpusOrPcm(message.dataHex, message.encoding);
    sendToWorklet({
      type: "media-opus-play-response",
      token: message.token,
      played: true,
    });
    appendLog(
      `Opus/PCM harness play → speaker (${message.dataHex.length / 2} bytes)`,
    );
  } catch (error) {
    sendToWorklet({
      type: "media-opus-play-response",
      token: message.token,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function handleNativeOpusDuplex(
  message: Extract<WorkletToHostMessage, { type: "media-opus-duplex-request" }>,
  deps: NativeWorkletMessageHandlerDeps,
): Promise<void> {
  const { sendToWorklet, appendLog } = deps;
  try {
    const result = await runNativeOpusDuplex();
    sendToWorklet({
      type: "media-opus-duplex-response",
      token: message.token,
      ...result,
    });
    appendLog(
      `Opus duplex host encode/decode/play (${result.opusBytes} opus bytes)`,
    );
  } catch (error) {
    sendToWorklet({
      type: "media-opus-duplex-response",
      token: message.token,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
