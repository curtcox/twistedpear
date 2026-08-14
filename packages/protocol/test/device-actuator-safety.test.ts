import { describe, expect, it } from "vitest";
import {
  ActuatorSafetyError,
  TORCH_MIN_STROBE_INTERVAL_MS,
  validateActuatorCommand,
} from "../src/index.js";

describe("actuator safety caps", () => {
  it("rejects photosensitive torch strobe rates", () => {
    expect(() =>
      validateActuatorCommand({
        kind: "torch",
        on: true,
        strobeIntervalMs: 50,
      }),
    ).toThrow(ActuatorSafetyError);
    expect(() =>
      validateActuatorCommand({
        kind: "torch",
        on: true,
        strobeIntervalMs: TORCH_MIN_STROBE_INTERVAL_MS,
      }),
    ).not.toThrow();
  });

  it("rejects ultrasonic play-tier speaker tones", () => {
    expect(() =>
      validateActuatorCommand({
        kind: "speaker",
        frequencyHz: 22_000,
        volume: 0.5,
      }),
    ).toThrow(/ultrasonic|pcm/i);
    expect(
      validateActuatorCommand({
        kind: "speaker",
        assetId: "chime",
        volume: 0.8,
      }).normalized,
    ).toMatchObject({ kind: "speaker", assetId: "chime", volume: 0.8 });
  });

  it("bounds TTS text and rate", () => {
    expect(() => validateActuatorCommand({ kind: "tts", text: "" })).toThrow(
      /text/,
    );
    expect(() =>
      validateActuatorCommand({ kind: "tts", text: "hi", rate: 3 }),
    ).toThrow(/rate/);
    expect(
      validateActuatorCommand({ kind: "tts", text: "hello" }).normalized,
    ).toMatchObject({
      kind: "tts",
      text: "hello",
      rate: 1,
    });
  });

  it("enforces haptics duty cycle", () => {
    expect(() =>
      validateActuatorCommand({ kind: "haptics", patternMs: [900, 100] }),
    ).toThrow(/duty/i);
    expect(
      validateActuatorCommand({ kind: "haptics", patternMs: [100, 400] })
        .normalized,
    ).toMatchObject({ kind: "haptics", patternMs: [100, 400] });
  });

  it("bounds NFC NDEF payloads", () => {
    expect(() =>
      validateActuatorCommand({
        kind: "nfc",
        action: "write",
        ndef: "x".repeat(10_000),
      }),
    ).toThrow(/ndef/i);
    expect(
      validateActuatorCommand({
        kind: "nfc",
        action: "write",
        ndef: "ok",
      }).normalized,
    ).toMatchObject({ action: "write", ndef: "ok" });
    expect(() =>
      validateActuatorCommand({
        kind: "nfc",
        action: "write",
        ndef: "",
      }),
    ).toThrow(/required/);
    expect(() =>
      validateActuatorCommand({
        kind: "nfc",
        action: "apdu",
        aid: "A0000000031010",
        apdu: "00A40400",
      }),
    ).toThrow(/Payment applet|NFC_PAYLOAD|blocked/i);
    expect(() =>
      validateActuatorCommand({
        kind: "nfc",
        action: "apdu",
        aid: "F000000001",
        apdu: "0",
      }),
    ).toThrow(/apdu payload length/);
  });

  it("accepts torch without strobe and rejects invalid speaker/haptics extras", () => {
    expect(
      validateActuatorCommand({ kind: "torch", on: false }).normalized,
    ).toEqual({ kind: "torch", on: false });
    expect(() =>
      validateActuatorCommand({ kind: "speaker", volume: 2, assetId: "a" }),
    ).toThrow(/volume/);
    expect(() =>
      validateActuatorCommand({ kind: "speaker", frequencyHz: 0 }),
    ).toThrow(/positive/);
    expect(() => validateActuatorCommand({ kind: "speaker" })).toThrow(
      /assetId or frequencyHz/,
    );
    expect(() =>
      validateActuatorCommand({ kind: "tts", text: "\u0001" }),
    ).toThrow(/control/);
    expect(() =>
      validateActuatorCommand({ kind: "haptics", patternMs: [] }),
    ).toThrow(/1-32/);
    expect(() =>
      validateActuatorCommand({ kind: "haptics", patternMs: [0] }),
    ).toThrow(/non-zero/);
    expect(() =>
      validateActuatorCommand({
        kind: "haptics",
        patternMs: [100, 400],
        intensity: 2,
      }),
    ).toThrow(/intensity/);
    expect(() =>
      validateActuatorCommand({ kind: "haptics", patternMs: [3000] }),
    ).toThrow(/\[0, 2000\]/);
  });
});
