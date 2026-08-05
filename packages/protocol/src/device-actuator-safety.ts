/**
 * Driver-boundary actuator safety caps (Sans-IO). Hosts enforce these before
 * any hardware write so apps cannot reach unsafe strobe/duty/volume settings.
 */

import { assertAidAllowed, NfcPaymentAidError } from "./device-nfc-apdu.js";

/** Photosensitive-epilepsy guidance: forbid controllable flashing in 3–60 Hz. */
export const TORCH_MIN_STROBE_INTERVAL_MS = 334; // < 3 Hz
export const TORCH_MAX_DUTY_CYCLE = 0.5;
export const HAPTICS_MAX_DUTY_CYCLE = 0.25;
export const HAPTICS_MAX_PATTERN_MS = 2_000;
export const TTS_MAX_TEXT_LENGTH = 500;
export const TTS_MAX_RATE = 1.5;
export const TTS_MIN_RATE = 0.5;
export const SPEAKER_MAX_VOLUME = 1;
/** Play tier must stay in the audible band — ultrasonic carriers need speaker:pcm. */
export const SPEAKER_PLAY_MAX_HZ = 18_000;
export const NFC_MAX_NDEF_BYTES = 4_096;

export type ActuatorSafetyCode =
  | "TORCH_STROBE_RATE"
  | "TORCH_DUTY_CYCLE"
  | "HAPTICS_DUTY_CYCLE"
  | "HAPTICS_PATTERN"
  | "TTS_TEXT"
  | "TTS_RATE"
  | "SPEAKER_VOLUME"
  | "SPEAKER_ULTRASONIC"
  | "NFC_PAYLOAD"
  | "COMMAND_INVALID";

export class ActuatorSafetyError extends Error {
  constructor(
    readonly code: ActuatorSafetyCode,
    message: string,
  ) {
    super(message);
    this.name = "ActuatorSafetyError";
  }
}

export type DeviceCommand =
  | {
      readonly kind: "torch";
      readonly on: boolean;
      readonly strobeIntervalMs?: number;
    }
  | {
      readonly kind: "speaker";
      readonly assetId?: string;
      readonly volume?: number;
      readonly frequencyHz?: number;
    }
  | { readonly kind: "tts"; readonly text: string; readonly rate?: number }
  | {
      readonly kind: "haptics";
      readonly patternMs: ReadonlyArray<number>;
      readonly intensity?: number;
    }
  | { readonly kind: "nfc"; readonly action: "write"; readonly ndef: string }
  | {
      readonly kind: "nfc";
      readonly action: "apdu";
      readonly aid: string;
      readonly apdu: string;
    };

export interface ActuatorCommandResult {
  readonly kind: DeviceCommand["kind"];
  readonly accepted: true;
  readonly normalized: DeviceCommand;
}

export function validateActuatorCommand(
  command: DeviceCommand,
): ActuatorCommandResult {
  switch (command.kind) {
    case "torch":
      return {
        kind: "torch",
        accepted: true,
        normalized: validateTorch(command),
      };
    case "speaker":
      return {
        kind: "speaker",
        accepted: true,
        normalized: validateSpeaker(command),
      };
    case "tts":
      return { kind: "tts", accepted: true, normalized: validateTts(command) };
    case "haptics":
      return {
        kind: "haptics",
        accepted: true,
        normalized: validateHaptics(command),
      };
    case "nfc":
      return { kind: "nfc", accepted: true, normalized: validateNfc(command) };
    default: {
      const _exhaustive: never = command;
      throw new ActuatorSafetyError(
        "COMMAND_INVALID",
        `Unknown actuator command: ${JSON.stringify(_exhaustive)}`,
      );
    }
  }
}

function validateTorch(
  command: Extract<DeviceCommand, { kind: "torch" }>,
): Extract<DeviceCommand, { kind: "torch" }> {
  if (typeof command.on !== "boolean") {
    throw new ActuatorSafetyError(
      "COMMAND_INVALID",
      "torch.on must be a boolean.",
    );
  }
  if (command.strobeIntervalMs === undefined) {
    return { kind: "torch", on: command.on };
  }
  if (
    !Number.isFinite(command.strobeIntervalMs) ||
    command.strobeIntervalMs < TORCH_MIN_STROBE_INTERVAL_MS
  ) {
    throw new ActuatorSafetyError(
      "TORCH_STROBE_RATE",
      `Torch strobe interval must be ≥ ${TORCH_MIN_STROBE_INTERVAL_MS} ms (< 3 Hz).`,
    );
  }
  // Fixed host pulse width; apps cannot request a longer on-time than the duty cap.
  const pulseMs = Math.min(
    50,
    Math.floor(command.strobeIntervalMs * TORCH_MAX_DUTY_CYCLE),
  );
  if (pulseMs / command.strobeIntervalMs > TORCH_MAX_DUTY_CYCLE) {
    throw new ActuatorSafetyError(
      "TORCH_DUTY_CYCLE",
      `Torch duty cycle exceeds ${TORCH_MAX_DUTY_CYCLE}.`,
    );
  }
  return {
    kind: "torch",
    on: command.on,
    strobeIntervalMs: Math.floor(command.strobeIntervalMs),
  };
}

function validateSpeaker(
  command: Extract<DeviceCommand, { kind: "speaker" }>,
): Extract<DeviceCommand, { kind: "speaker" }> {
  const assetId = command.assetId;
  if (
    assetId !== undefined &&
    (typeof assetId !== "string" || assetId.length < 1 || assetId.length > 128)
  ) {
    throw new ActuatorSafetyError(
      "COMMAND_INVALID",
      "speaker.assetId must be 1-128 characters.",
    );
  }
  const volume = command.volume ?? 1;
  if (!Number.isFinite(volume) || volume < 0 || volume > SPEAKER_MAX_VOLUME) {
    throw new ActuatorSafetyError(
      "SPEAKER_VOLUME",
      `speaker.volume must be in [0, ${SPEAKER_MAX_VOLUME}].`,
    );
  }
  if (command.frequencyHz !== undefined) {
    if (!Number.isFinite(command.frequencyHz) || command.frequencyHz <= 0) {
      throw new ActuatorSafetyError(
        "COMMAND_INVALID",
        "speaker.frequencyHz must be positive.",
      );
    }
    if (command.frequencyHz > SPEAKER_PLAY_MAX_HZ) {
      throw new ActuatorSafetyError(
        "SPEAKER_ULTRASONIC",
        `Play-tier speaker rejects frequencies above ${SPEAKER_PLAY_MAX_HZ} Hz; use speaker:pcm.`,
      );
    }
  }
  if (assetId === undefined && command.frequencyHz === undefined) {
    throw new ActuatorSafetyError(
      "COMMAND_INVALID",
      "speaker requires assetId or frequencyHz.",
    );
  }
  return {
    kind: "speaker",
    ...(assetId !== undefined ? { assetId } : {}),
    volume,
    ...(command.frequencyHz !== undefined
      ? { frequencyHz: command.frequencyHz }
      : {}),
  };
}

function validateTts(
  command: Extract<DeviceCommand, { kind: "tts" }>,
): Extract<DeviceCommand, { kind: "tts" }> {
  if (
    typeof command.text !== "string" ||
    command.text.length < 1 ||
    command.text.length > TTS_MAX_TEXT_LENGTH
  ) {
    throw new ActuatorSafetyError(
      "TTS_TEXT",
      `tts.text must be 1-${TTS_MAX_TEXT_LENGTH} characters.`,
    );
  }
  if (
    [...command.text].some((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code < 9 || (code > 13 && code < 32) || code === 127;
    })
  ) {
    throw new ActuatorSafetyError(
      "TTS_TEXT",
      "tts.text contains disallowed control characters.",
    );
  }
  const rate = command.rate ?? 1;
  if (!Number.isFinite(rate) || rate < TTS_MIN_RATE || rate > TTS_MAX_RATE) {
    throw new ActuatorSafetyError(
      "TTS_RATE",
      `tts.rate must be in [${TTS_MIN_RATE}, ${TTS_MAX_RATE}].`,
    );
  }
  return { kind: "tts", text: command.text, rate };
}

function validateHaptics(
  command: Extract<DeviceCommand, { kind: "haptics" }>,
): Extract<DeviceCommand, { kind: "haptics" }> {
  if (
    !Array.isArray(command.patternMs) ||
    command.patternMs.length < 1 ||
    command.patternMs.length > 32
  ) {
    throw new ActuatorSafetyError(
      "HAPTICS_PATTERN",
      "haptics.patternMs must have 1-32 entries.",
    );
  }
  let totalOn = 0;
  let total = 0;
  const pattern: number[] = [];
  for (let i = 0; i < command.patternMs.length; i += 1) {
    const ms = command.patternMs[i];
    if (!Number.isFinite(ms) || ms < 0 || ms > HAPTICS_MAX_PATTERN_MS) {
      throw new ActuatorSafetyError(
        "HAPTICS_PATTERN",
        `haptics pattern entry must be in [0, ${HAPTICS_MAX_PATTERN_MS}] ms.`,
      );
    }
    const floored = Math.floor(ms);
    pattern.push(floored);
    total += floored;
    if (i % 2 === 0) totalOn += floored;
  }
  if (total === 0) {
    throw new ActuatorSafetyError(
      "HAPTICS_PATTERN",
      "haptics pattern must have non-zero duration.",
    );
  }
  if (totalOn / total > HAPTICS_MAX_DUTY_CYCLE) {
    throw new ActuatorSafetyError(
      "HAPTICS_DUTY_CYCLE",
      `haptics duty cycle exceeds ${HAPTICS_MAX_DUTY_CYCLE}.`,
    );
  }
  const intensity = command.intensity ?? 1;
  if (!Number.isFinite(intensity) || intensity < 0 || intensity > 1) {
    throw new ActuatorSafetyError(
      "COMMAND_INVALID",
      "haptics.intensity must be in [0, 1].",
    );
  }
  return { kind: "haptics", patternMs: pattern, intensity };
}

function validateNfc(
  command: Extract<DeviceCommand, { kind: "nfc" }>,
): Extract<DeviceCommand, { kind: "nfc" }> {
  if (command.action === "apdu") {
    try {
      const aid = assertAidAllowed(command.aid);
      if (
        typeof command.apdu !== "string" ||
        command.apdu.length < 2 ||
        command.apdu.length > 1024
      ) {
        throw new ActuatorSafetyError(
          "NFC_PAYLOAD",
          "nfc.apdu payload length is invalid.",
        );
      }
      return { kind: "nfc", action: "apdu", aid, apdu: command.apdu };
    } catch (error) {
      if (error instanceof NfcPaymentAidError) {
        throw new ActuatorSafetyError("NFC_PAYLOAD", error.message);
      }
      throw error;
    }
  }
  if (command.action !== "write") {
    throw new ActuatorSafetyError(
      "COMMAND_INVALID",
      "nfc action must be write or apdu.",
    );
  }
  if (typeof command.ndef !== "string" || command.ndef.length < 1) {
    throw new ActuatorSafetyError(
      "NFC_PAYLOAD",
      "nfc.ndef payload is required.",
    );
  }
  const bytes = utf8ByteLength(command.ndef);
  if (bytes > NFC_MAX_NDEF_BYTES) {
    throw new ActuatorSafetyError(
      "NFC_PAYLOAD",
      `nfc.ndef exceeds ${NFC_MAX_NDEF_BYTES} bytes.`,
    );
  }
  return { kind: "nfc", action: "write", ndef: command.ndef };
}

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}
