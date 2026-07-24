import { describe, expect, it } from "vitest";
import {
  DEVICE_STREAM_KIND,
  decodeDeviceStreamFrame,
  encodeDeviceStreamFrame,
  frameDeviceStreamPayload,
  sanitizeCameraFrame,
  sanitizeMotionSamples,
  sanitizePcmSample
} from "../src/index.js";

describe("device stream framing", () => {
  it("round-trips a sample frame", () => {
    const payload = new Uint8Array([9, 8, 7, 6]);
    const encoded = encodeDeviceStreamFrame({
      version: 1,
      sampleKind: DEVICE_STREAM_KIND.pcm,
      sessionToken: 42,
      sequence: 3,
      payload
    });
    expect(decodeDeviceStreamFrame(encoded)).toEqual({
      version: 1,
      sampleKind: 2,
      sessionToken: 42,
      sequence: 3,
      payload
    });
  });

  it("chunks large payloads", () => {
    const payload = new Uint8Array(200);
    payload.fill(7);
    const frames = frameDeviceStreamPayload(1, DEVICE_STREAM_KIND.cameraFrame, payload, 64);
    expect(frames.length).toBe(4);
    expect(decodeDeviceStreamFrame(frames[0]!).payload.length).toBe(64);
  });

  it("refuses control kinds", () => {
    expect(() =>
      encodeDeviceStreamFrame({
        version: 1,
        sampleKind: 0 as never,
        sessionToken: 1,
        sequence: 0,
        payload: new Uint8Array([1])
      })
    ).toThrow(/control/i);
  });
});

describe("fingerprint sanitization", () => {
  it("strips camera calibration metadata", () => {
    const frame = sanitizeCameraFrame({
      width: 4,
      height: 4,
      format: "rgba8",
      bytes: new Uint8Array(64),
      deviceModel: "Pixel",
      sensorCalibration: { fx: 1 }
    });
    expect(frame).toEqual({
      width: 4,
      height: 4,
      format: "rgba8",
      bytes: new Uint8Array(64)
    });
    expect(frame).not.toHaveProperty("deviceModel");
  });

  it("strips pcm device identity and quantizes motion", () => {
    expect(
      sanitizePcmSample({
        sampleRate: 16_000,
        channels: 1,
        samples: [1.5, -2],
        deviceId: "bad"
      })
    ).toEqual({ sampleRate: 16_000, channels: 1, samples: [1, -1] });

    expect(
      sanitizeMotionSamples({
        accel: [0.12345, 0, 0],
        gyro: [0, 0, 0],
        deviceSerial: "x"
      }).accel[0]
    ).toBe(0.123);
  });
});
