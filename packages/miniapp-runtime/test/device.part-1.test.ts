import { describe, expect, it } from "vitest";
import {
  CAPABILITY_DEFINITIONS,
  DEVICE_CAPABILITY_DEFINITIONS,
  DeviceManager,
  HOST_API_VERSION,
  assertCapabilityAllowed,
  assertDeviceCapabilityAllowed,
  createSimulatedAmbientLightDriver,
  createSimulatedCameraDriver,
  createSimulatedHapticsDriver,
  createSimulatedLocationDriver,
  createSimulatedMicrophoneDriver,
  createSimulatedMotionDriver,
  createSimulatedNfcDriver,
  createSimulatedRawCameraDriver,
  createSimulatedRawMicrophoneDriver,
  createSimulatedRawMotionDriver,
  createSimulatedScreenCaptureDriver,
  createSimulatedSpeakerDriver,
  createSimulatedTorchDriver,
  createSimulatedTtsDriver,
  DeviceStreamSidecar,
} from "../src/index.js";
import {
  DeviceStreamFrameError,
  decodeDeviceStreamFrame,
  encodeDeviceStreamFrame,
} from "@twistedpear/protocol";
import { codecMatchesTier } from "../src/device-manager/shared.js";

describe("device capabilities", () => {
  it("includes generated device:* ids in the closed set", () => {
    const ids = CAPABILITY_DEFINITIONS.map((entry) => entry.id);
    expect(ids).toContain("device:location");
    expect(ids).toContain("device:location:precise");
    expect(ids).toContain("device:ambient-light");
    expect(ids).toContain("device:stream");
    expect(ids).toContain("device:remote");
    expect(DEVICE_CAPABILITY_DEFINITIONS.length).toBeGreaterThan(10);
  });

  it("lets precise grants satisfy the default location capability", () => {
    expect(() =>
      assertDeviceCapabilityAllowed({
        capability: "device:location",
        declared: ["device:location:precise"],
        granted: ["device:location:precise"],
      }),
    ).not.toThrow();
  });

  it("does not reinterpret cross-cutting capability segments as device classes", () => {
    expect(() =>
      assertDeviceCapabilityAllowed({
        capability: "device:microphone:pcm",
        declared: ["device:microphone:pcm", "device:share-policy:read"],
        granted: ["device:microphone:pcm", "device:share-policy:read"],
      }),
    ).not.toThrow();
  });

  it("does not let default grants satisfy precise", () => {
    expect(() =>
      assertDeviceCapabilityAllowed({
        capability: "device:location:precise",
        declared: ["device:location"],
        granted: ["device:location"],
      }),
    ).toThrow();
  });

  it("still rejects unknown capabilities", () => {
    expect(() =>
      assertCapabilityAllowed({
        capability: "device:telepathy",
        declared: ["device:telepathy"],
        granted: ["device:telepathy"],
      }),
    ).toThrow(/Unknown capability/);
  });

  it("matches codecs only to compatible streaming tiers", () => {
    expect(codecMatchesTier("microphone", "pcm", "opus")).toBe(true);
    expect(codecMatchesTier("speaker", "pcm", "pcm")).toBe(true);
    expect(codecMatchesTier("camera", "frames", "h264")).toBe(true);
    expect(codecMatchesTier("screen-capture", "frames", "jpeg")).toBe(true);
    expect(codecMatchesTier("camera", "frames", "opus")).toBe(false);
    expect(codecMatchesTier("camera", "derived", "h264")).toBe(false);
  });
});

describe("DeviceManager Phase 1", () => {
  it("inventories simulated drivers and reports unsupported otherwise", async () => {
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [
        createSimulatedLocationDriver(),
        createSimulatedAmbientLightDriver(40),
      ],
      now: () => 1_000,
    });
    const inventory = await manager.inventory();
    const location = inventory.find((entry) => entry.class === "location");
    const ambient = inventory.find((entry) => entry.class === "ambient-light");
    const camera = inventory.find((entry) => entry.class === "camera");
    expect(location?.availability).toBe("available");
    expect(ambient?.availability).toBe("available");
    expect(camera?.availability).toBe("unsupported");
  });

  it("opens coarse location and ambient-light sessions end-to-end", async () => {
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [
        createSimulatedLocationDriver({
          latitude: 37.7749,
          longitude: -122.4194,
          accuracyM: 5,
        }),
        createSimulatedAmbientLightDriver(40),
      ],
      now: () => 5_000,
    });

    const location = await manager.open(
      "nav",
      "pub",
      ["device:location"],
      ["device:location"],
      {
        class: "location",
        purpose: "show neighborhood",
      },
    );
    expect(location.tier).toBe("coarse");
    const fix = await manager.read("nav", location.handle);
    expect(fix.kind).toBe("location");
    if (fix.kind === "location") {
      expect(fix.tier).toBe("coarse");
      expect(fix.accuracyM).toBe(1000);
      expect(fix.latitude).not.toBe(37.7749);
    }

    const light = await manager.open(
      "nav",
      "pub",
      ["device:ambient-light"],
      ["device:ambient-light"],
      {
        class: "ambient-light",
        purpose: "adapt theme",
      },
    );
    const sample = await manager.read("nav", light.handle);
    expect(sample).toEqual({
      kind: "ambient-light",
      tier: "quantized",
      at: 5_000,
      luxBucket: "dim",
    });

    await manager.close("nav", location.handle);
    await expect(manager.read("nav", location.handle)).rejects.toMatchObject({
      code: "DEVICE_SESSION_EXPIRED",
    });
  });

  it("enforces arbitration locks between sessions", async () => {
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [createSimulatedLocationDriver()],
      now: () => 1,
    });
    await manager.open("a", "pub", ["device:location"], ["device:location"], {
      class: "location",
      purpose: "first",
    });
    await expect(
      manager.open("b", "pub", ["device:location"], ["device:location"], {
        class: "location",
        purpose: "second",
      }),
    ).rejects.toMatchObject({ code: "DEVICE_BUSY" });
  });

  it("denies open without grant", async () => {
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [createSimulatedLocationDriver()],
      now: () => 1,
    });
    await expect(
      manager.open("a", "pub", ["device:location"], [], {
        class: "location",
        purpose: "no grant",
      }),
    ).rejects.toMatchObject({ code: "DEVICE_DENIED" });
  });
});

describe("host API version", () => {
  it("includes elm code-editor language and apps.compile in 0.15.0", () => {
    expect(HOST_API_VERSION).toBe("0.15.0");
  });
});

describe("DeviceManager Phase 2 derived sensors", () => {
  it("opens precise location and derived camera/mic/motion sessions", async () => {
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [
        createSimulatedLocationDriver({
          latitude: 37.7749,
          longitude: -122.4194,
          accuracyM: 5,
          altitudeM: 10,
          speedMps: 0.5,
          headingDeg: 45,
        }),
        createSimulatedCameraDriver(),
        createSimulatedMicrophoneDriver({ level: 0.25 }),
        createSimulatedMotionDriver({ accel: [3.1, 0, 0.2], gyro: [0, 0, 0] }),
      ],
      now: () => 10_000,
    });

    const precise = await manager.open(
      "app",
      "pub",
      ["device:location:precise"],
      ["device:location:precise"],
      { class: "location", tier: "precise", purpose: "navigate" },
    );
    const fix = await manager.read("app", precise.handle);
    expect(fix).toMatchObject({
      kind: "location",
      tier: "precise",
      latitude: 37.7749,
      longitude: -122.4194,
      altitudeM: 10,
    });
    expect(manager.activeIndicators()).toEqual([
      expect.objectContaining({
        class: "location",
        tier: "precise",
        consentClass: "elevated",
        destination: "local",
      }),
    ]);
    await manager.close("app", precise.handle);

    const camera = await manager.open(
      "app",
      "pub",
      ["device:camera"],
      ["device:camera"],
      {
        class: "camera",
        purpose: "scan qr",
      },
    );
    expect(await manager.read("app", camera.handle)).toMatchObject({
      kind: "camera",
      tier: "derived",
      barcodes: [{ format: "qr", value: "TPI1:example" }],
    });
    await manager.close("app", camera.handle);

    const mic = await manager.open(
      "app",
      "pub",
      ["device:microphone"],
      ["device:microphone"],
      {
        class: "microphone",
        purpose: "level meter",
      },
    );
    expect(await manager.read("app", mic.handle)).toMatchObject({
      kind: "microphone",
      tier: "derived",
      level: 0.25,
      voiceActive: true,
    });
    await manager.close("app", mic.handle);

    const motion = await manager.open(
      "app",
      "pub",
      ["device:motion"],
      ["device:motion"],
      {
        class: "motion",
        purpose: "shake detect",
      },
    );
    const motionSample = await manager.read("app", motion.handle);
    expect(motionSample.kind).toBe("motion");
    if (motionSample.kind === "motion") {
      expect(motionSample.events).toContain("shake");
    }
  });

  it("opens speaker:pcm with platform voice-duplex options", async () => {
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [createSimulatedSpeakerDriver()],
      now: () => 1,
    });
    await expect(
      manager.open(
        "app",
        "pub",
        ["device:speaker:pcm"],
        ["device:speaker:pcm"],
        {
          class: "speaker",
          tier: "pcm",
          purpose: "voice call",
          options: { voiceDuplex: true },
        },
      ),
    ).resolves.toMatchObject({ class: "speaker", tier: "pcm" });
  });
});

describe("DeviceManager Phase 3 actuators", () => {
  it("writes torch/speaker/tts/haptics with safety caps and stops on close", async () => {
    let clock = 1_000;
    const torchLog = { commands: [], stopped: 0 };
    const speakerLog = { commands: [], stopped: 0 };
    const ttsLog = { commands: [], stopped: 0 };
    const hapticsLog = { commands: [], stopped: 0 };
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [
        createSimulatedTorchDriver(torchLog),
        createSimulatedSpeakerDriver(speakerLog),
        createSimulatedTtsDriver(ttsLog),
        createSimulatedHapticsDriver(hapticsLog),
      ],
      now: () => clock,
    });

    const torch = await manager.open(
      "app",
      "pub",
      ["device:torch"],
      ["device:torch"],
      {
        class: "torch",
        purpose: "flashlight",
      },
    );
    await manager.write("app", "pub", torch.handle, {
      kind: "torch",
      on: true,
    });
    await expect(
      manager.write("app", "pub", torch.handle, {
        kind: "torch",
        on: true,
        strobeIntervalMs: 50,
      }),
    ).rejects.toMatchObject({ code: "DEVICE_BAD_REQUEST" });
    clock += 1_000;
    await manager.write("app", "pub", torch.handle, {
      kind: "torch",
      on: true,
      strobeIntervalMs: 400,
    });
    await manager.close("app", torch.handle);
    expect(torchLog.stopped).toBe(1);

    const speaker = await manager.open(
      "app",
      "pub",
      ["device:speaker"],
      ["device:speaker"],
      {
        class: "speaker",
        purpose: "play chime",
      },
    );
    await manager.write("app", "pub", speaker.handle, {
      kind: "speaker",
      assetId: "chime",
    });
    await expect(
      manager.write("app", "pub", speaker.handle, {
        kind: "speaker",
        frequencyHz: 25_000,
      }),
    ).rejects.toMatchObject({ code: "DEVICE_BAD_REQUEST" });
    await manager.close("app", speaker.handle);

    clock += 1_000;
    const tts = await manager.open(
      "app",
      "pub",
      ["device:tts"],
      ["device:tts"],
      {
        class: "tts",
        purpose: "announce",
      },
    );
    await manager.write("app", "pub", tts.handle, {
      kind: "tts",
      text: "hello",
    });
    await manager.close("app", tts.handle);

    clock += 1_000;
    const haptics = await manager.open(
      "app",
      "pub",
      ["device:haptics"],
      ["device:haptics"],
      {
        class: "haptics",
        purpose: "nudge",
      },
    );
    await manager.write("app", "pub", haptics.handle, {
      kind: "haptics",
      patternMs: [40, 200],
    });
    await manager.close("app", haptics.handle);

    expect(torchLog.commands).toHaveLength(2);
    expect(speakerLog.commands[0]).toMatchObject({
      kind: "speaker",
      assetId: "chime",
    });
    expect(ttsLog.commands[0]).toMatchObject({ kind: "tts", text: "hello" });
    expect(hapticsLog.commands[0]).toMatchObject({ kind: "haptics" });
  });

  it("confirms NFC writes when a confirmation channel is configured", async () => {
    const nfcLog = { commands: [], stopped: 0 };
    const confirmations: string[] = [];
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [createSimulatedNfcDriver(nfcLog)],
      now: () => 5_000,
      confirmationChannel: {
        confirm: async (request) => {
          confirmations.push(request.summary.payload ?? "");
          return { approved: true };
        },
      },
      confirmationEffects: {
        randomBytes: (length) => new Uint8Array(length),
        delay: async () => undefined,
      },
    });
    const session = await manager.open(
      "app",
      "pub",
      ["device:nfc"],
      ["device:nfc"],
      {
        class: "nfc",
        purpose: "tag write",
      },
    );
    // open is elevated → one confirmation; write is an extra NFC confirmation
    expect(confirmations.length).toBeGreaterThanOrEqual(1);
    await manager.write("app", "pub", session.handle, {
      kind: "nfc",
      action: "write",
      ndef: "hello-tag",
    });
    expect(confirmations).toContain("hello-tag");
    expect(nfcLog.commands).toHaveLength(1);
  });
});

describe("DeviceManager Phase 4 raw tiers + sidecar", () => {
  it("delivers sanitized camera frames over the sidecar", async () => {
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [createSimulatedRawCameraDriver()],
      now: () => 20_000,
    });
    const session = await manager.open(
      "app",
      "pub",
      ["device:camera:frames"],
      ["device:camera:frames"],
      { class: "camera", tier: "frames", purpose: "record" },
    );
    const sample = await manager.read("app", session.handle);
    expect(sample.kind).toBe("camera");
    if (sample.kind === "camera" && sample.tier === "frames") {
      expect(sample.width).toBe(16);
      expect(sample.byteLength).toBe(16 * 16 * 4);
      expect(sample.sidecar?.frames.length).toBe(1);
      expect(JSON.stringify(sample)).not.toContain("secret-phone");
      expect(JSON.stringify(sample)).not.toContain("sensorCalibration");
      const frame = decodeDeviceStreamFrame(sample.sidecar!.frames[0]!);
      expect(frame.sampleKind).toBe(1);
    }
  });

  it("never emits raw fields from a derived camera session", async () => {
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [createSimulatedCameraDriver()],
      now: () => 21_000,
    });
    const session = await manager.open(
      "app",
      "pub",
      ["device:camera"],
      ["device:camera"],
      {
        class: "camera",
        purpose: "scan",
      },
    );
    const sample = await manager.read("app", session.handle);
    expect(sample).toMatchObject({ kind: "camera", tier: "derived" });
    expect(sample).not.toHaveProperty("byteLength");
    expect(sample).not.toHaveProperty("sidecar");
  });

  it("denies frames when only derived is granted", async () => {
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [createSimulatedRawCameraDriver()],
      now: () => 22_000,
    });
    await expect(
      manager.open("app", "pub", ["device:camera"], ["device:camera"], {
        class: "camera",
        tier: "frames",
        purpose: "escalate",
      }),
    ).rejects.toMatchObject({ code: "DEVICE_DENIED" });
  });

  it("sanitizes pcm and motion samples and supports screen-capture frames", async () => {
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [
        createSimulatedRawMicrophoneDriver(),
        createSimulatedRawMotionDriver(),
        createSimulatedScreenCaptureDriver(),
      ],
      now: () => 23_000,
    });

    const mic = await manager.open(
      "app",
      "pub",
      ["device:microphone:pcm"],
      ["device:microphone:pcm"],
      {
        class: "microphone",
        tier: "pcm",
        purpose: "record audio",
      },
    );
    const pcm = await manager.read("app", mic.handle);
    expect(pcm).toMatchObject({
      kind: "microphone",
      tier: "pcm",
      sampleRate: 16_000,
      sampleCount: 3,
    });
    expect(JSON.stringify(pcm)).not.toContain("mic-fingerprint");
    await manager.close("app", mic.handle);

    const motion = await manager.open(
      "app",
      "pub",
      ["device:motion:samples"],
      ["device:motion:samples"],
      {
        class: "motion",
        tier: "samples",
        purpose: "imu",
      },
    );
    const samples = await manager.read("app", motion.handle);
    expect(samples).toMatchObject({ kind: "motion", tier: "samples" });
    if (samples.kind === "motion" && samples.tier === "samples") {
      expect(samples.accel[0]).toBe(0.123);
    }
    expect(JSON.stringify(samples)).not.toContain("imu-serial");
    await manager.close("app", motion.handle);

    const screen = await manager.open(
      "app",
      "pub",
      ["device:screen-capture:frames"],
      ["device:screen-capture:frames"],
      { class: "screen-capture", tier: "frames", purpose: "share region" },
    );
    const frame = await manager.read("app", screen.handle);
    expect(frame).toMatchObject({
      kind: "screen-capture",
      tier: "frames",
      width: 8,
      height: 8,
    });
  });

  it("refuses control messages on the sidecar", () => {
    const sidecar = new DeviceStreamSidecar();
    expect(() =>
      sidecar.rejectControlFrame(1, new Uint8Array([1, 2, 3])),
    ).toThrow(DeviceStreamFrameError);
    expect(() =>
      encodeDeviceStreamFrame({
        version: 1,
        sampleKind: 0 as never,
        sessionToken: 1,
        sequence: 0,
        payload: new Uint8Array([1]),
      }),
    ).toThrow(/control/i);
  });
});
