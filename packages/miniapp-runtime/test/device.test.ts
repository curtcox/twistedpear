import { describe, expect, it, vi } from "vitest";
import {
  CAPABILITY_DEFINITIONS,
  DEVICE_CAPABILITY_DEFINITIONS,
  DeviceManager,
  HOST_API_VERSION,
  assertCapabilityAllowed,
  assertDeviceCapabilityAllowed,
  createSimulatedAmbientLightDriver,
  createSimulatedCameraDriver,
  createSimulatedDeviceManager,
  createHybridDeviceDrivers,
  createSimulatedHapticsDriver,
  createSimulatedLocationDriver,
  createSimulatedMicrophoneDriver,
  createSimulatedMotionDriver,
  createSimulatedNfcDriver,
  createSimulatedBiometricDriver,
  createSimulatedScalarDriver,
  createSimulatedRawCameraDriver,
  createSimulatedRawMicrophoneDriver,
  createSimulatedRawMotionDriver,
  createSimulatedScreenCaptureDriver,
  createSimulatedSpeakerDriver,
  createSimulatedSttDriver,
  createSimulatedTorchDriver,
  createSimulatedTtsDriver,
  DeviceStreamSidecar
} from "../src/index.js";
import {
  DeviceStreamFrameError,
  decodeDeviceStreamFrame,
  encodeDeviceStreamFrame
} from "@twistedpear/protocol";

function testEgressFactory(sent: Uint8Array[] = []) {
  return {
    async create(input: { admission: { plane: "webrtc" | "pears-bulk" | "reticulum" | "lxmf" | "cas" } }) {
      return {
        plane: input.admission.plane,
        async send(frame: Uint8Array) { sent.push(frame); return { queuedBytes: 0, droppedOldest: 0 }; },
        quality() { return { goodputBps: 64_000, rttMs: 10, jitterMs: 1, lossRatio: 0, mtu: 1_200, source: "declared" as const, samples: 0, confidence: "low" as const }; },
        async close() {}
      };
    }
  };
}

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
        granted: ["device:location:precise"]
      })
    ).not.toThrow();
  });

  it("does not reinterpret cross-cutting capability segments as device classes", () => {
    expect(() => assertDeviceCapabilityAllowed({
      capability: "device:microphone:pcm",
      declared: ["device:microphone:pcm", "device:share-policy:read"],
      granted: ["device:microphone:pcm", "device:share-policy:read"]
    })).not.toThrow();
  });

  it("does not let default grants satisfy precise", () => {
    expect(() =>
      assertDeviceCapabilityAllowed({
        capability: "device:location:precise",
        declared: ["device:location"],
        granted: ["device:location"]
      })
    ).toThrow();
  });

  it("still rejects unknown capabilities", () => {
    expect(() =>
      assertCapabilityAllowed({
        capability: "device:telepathy",
        declared: ["device:telepathy"],
        granted: ["device:telepathy"]
      })
    ).toThrow(/Unknown capability/);
  });
});

describe("DeviceManager Phase 1", () => {
  it("inventories simulated drivers and reports unsupported otherwise", async () => {
    const manager = new DeviceManager({
      drivers: [createSimulatedLocationDriver(), createSimulatedAmbientLightDriver(40)],
      now: () => 1_000
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
      drivers: [
        createSimulatedLocationDriver({ latitude: 37.7749, longitude: -122.4194, accuracyM: 5 }),
        createSimulatedAmbientLightDriver(40)
      ],
      now: () => 5_000
    });

    const location = await manager.open("nav", "pub", ["device:location"], ["device:location"], {
      class: "location",
      purpose: "show neighborhood"
    });
    expect(location.tier).toBe("coarse");
    const fix = await manager.read("nav", location.handle);
    expect(fix.kind).toBe("location");
    if (fix.kind === "location") {
      expect(fix.tier).toBe("coarse");
      expect(fix.accuracyM).toBe(1000);
      expect(fix.latitude).not.toBe(37.7749);
    }

    const light = await manager.open("nav", "pub", ["device:ambient-light"], ["device:ambient-light"], {
      class: "ambient-light",
      purpose: "adapt theme"
    });
    const sample = await manager.read("nav", light.handle);
    expect(sample).toEqual({
      kind: "ambient-light",
      tier: "quantized",
      at: 5_000,
      luxBucket: "dim"
    });

    await manager.close("nav", location.handle);
    await expect(manager.read("nav", location.handle)).rejects.toMatchObject({ code: "DEVICE_SESSION_EXPIRED" });
  });

  it("enforces arbitration locks between sessions", async () => {
    const manager = new DeviceManager({
      drivers: [createSimulatedLocationDriver()],
      now: () => 1
    });
    await manager.open("a", "pub", ["device:location"], ["device:location"], {
      class: "location",
      purpose: "first"
    });
    await expect(
      manager.open("b", "pub", ["device:location"], ["device:location"], {
        class: "location",
        purpose: "second"
      })
    ).rejects.toMatchObject({ code: "DEVICE_BUSY" });
  });

  it("denies open without grant", async () => {
    const manager = new DeviceManager({
      drivers: [createSimulatedLocationDriver()],
      now: () => 1
    });
    await expect(
      manager.open("a", "pub", ["device:location"], [], {
        class: "location",
        purpose: "no grant"
      })
    ).rejects.toMatchObject({ code: "DEVICE_DENIED" });
  });
});

describe("host API version", () => {
  it("includes device I/O, Freenet, and media link observation in 0.12.0", () => {
    expect(HOST_API_VERSION).toBe("0.12.0");
  });
});

describe("DeviceManager Phase 2 derived sensors", () => {
  it("opens precise location and derived camera/mic/motion sessions", async () => {
    const manager = new DeviceManager({
      drivers: [
        createSimulatedLocationDriver({
          latitude: 37.7749,
          longitude: -122.4194,
          accuracyM: 5,
          altitudeM: 10,
          speedMps: 0.5,
          headingDeg: 45
        }),
        createSimulatedCameraDriver(),
        createSimulatedMicrophoneDriver({ level: 0.25 }),
        createSimulatedMotionDriver({ accel: [3.1, 0, 0.2], gyro: [0, 0, 0] })
      ],
      now: () => 10_000
    });

    const precise = await manager.open(
      "app",
      "pub",
      ["device:location:precise"],
      ["device:location:precise"],
      { class: "location", tier: "precise", purpose: "navigate" }
    );
    const fix = await manager.read("app", precise.handle);
    expect(fix).toMatchObject({
      kind: "location",
      tier: "precise",
      latitude: 37.7749,
      longitude: -122.4194,
      altitudeM: 10
    });
    expect(manager.activeIndicators()).toEqual([
      expect.objectContaining({
        class: "location",
        tier: "precise",
        consentClass: "elevated",
        destination: "local"
      })
    ]);
    await manager.close("app", precise.handle);

    const camera = await manager.open("app", "pub", ["device:camera"], ["device:camera"], {
      class: "camera",
      purpose: "scan qr"
    });
    expect(await manager.read("app", camera.handle)).toMatchObject({
      kind: "camera",
      tier: "derived",
      barcodes: [{ format: "qr", value: "TPI1:example" }]
    });
    await manager.close("app", camera.handle);

    const mic = await manager.open("app", "pub", ["device:microphone"], ["device:microphone"], {
      class: "microphone",
      purpose: "level meter"
    });
    expect(await manager.read("app", mic.handle)).toMatchObject({
      kind: "microphone",
      tier: "derived",
      level: 0.25,
      voiceActive: true
    });
    await manager.close("app", mic.handle);

    const motion = await manager.open("app", "pub", ["device:motion"], ["device:motion"], {
      class: "motion",
      purpose: "shake detect"
    });
    const motionSample = await manager.read("app", motion.handle);
    expect(motionSample.kind).toBe("motion");
    if (motionSample.kind === "motion") {
      expect(motionSample.events).toContain("shake");
    }
  });

  it("opens speaker:pcm with platform voice-duplex options", async () => {
    const manager = new DeviceManager({
      drivers: [createSimulatedSpeakerDriver()],
      now: () => 1
    });
    await expect(manager.open("app", "pub", ["device:speaker:pcm"], ["device:speaker:pcm"], {
        class: "speaker",
        tier: "pcm",
        purpose: "voice call",
        options: { voiceDuplex: true }
      })).resolves.toMatchObject({ class: "speaker", tier: "pcm" });
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
      drivers: [
        createSimulatedTorchDriver(torchLog),
        createSimulatedSpeakerDriver(speakerLog),
        createSimulatedTtsDriver(ttsLog),
        createSimulatedHapticsDriver(hapticsLog)
      ],
      now: () => clock
    });

    const torch = await manager.open("app", "pub", ["device:torch"], ["device:torch"], {
      class: "torch",
      purpose: "flashlight"
    });
    await manager.write("app", "pub", torch.handle, { kind: "torch", on: true });
    await expect(
      manager.write("app", "pub", torch.handle, { kind: "torch", on: true, strobeIntervalMs: 50 })
    ).rejects.toMatchObject({ code: "DEVICE_BAD_REQUEST" });
    clock += 1_000;
    await manager.write("app", "pub", torch.handle, {
      kind: "torch",
      on: true,
      strobeIntervalMs: 400
    });
    await manager.close("app", torch.handle);
    expect(torchLog.stopped).toBe(1);

    const speaker = await manager.open("app", "pub", ["device:speaker"], ["device:speaker"], {
      class: "speaker",
      purpose: "play chime"
    });
    await manager.write("app", "pub", speaker.handle, { kind: "speaker", assetId: "chime" });
    await expect(
      manager.write("app", "pub", speaker.handle, { kind: "speaker", frequencyHz: 25_000 })
    ).rejects.toMatchObject({ code: "DEVICE_BAD_REQUEST" });
    await manager.close("app", speaker.handle);

    clock += 1_000;
    const tts = await manager.open("app", "pub", ["device:tts"], ["device:tts"], {
      class: "tts",
      purpose: "announce"
    });
    await manager.write("app", "pub", tts.handle, { kind: "tts", text: "hello" });
    await manager.close("app", tts.handle);

    clock += 1_000;
    const haptics = await manager.open("app", "pub", ["device:haptics"], ["device:haptics"], {
      class: "haptics",
      purpose: "nudge"
    });
    await manager.write("app", "pub", haptics.handle, { kind: "haptics", patternMs: [40, 200] });
    await manager.close("app", haptics.handle);

    expect(torchLog.commands).toHaveLength(2);
    expect(speakerLog.commands[0]).toMatchObject({ kind: "speaker", assetId: "chime" });
    expect(ttsLog.commands[0]).toMatchObject({ kind: "tts", text: "hello" });
    expect(hapticsLog.commands[0]).toMatchObject({ kind: "haptics" });
  });

  it("confirms NFC writes when a confirmation channel is configured", async () => {
    const nfcLog = { commands: [], stopped: 0 };
    const confirmations: string[] = [];
    const manager = new DeviceManager({
      drivers: [createSimulatedNfcDriver(nfcLog)],
      now: () => 5_000,
      confirmationChannel: {
        confirm: async (request) => {
          confirmations.push(request.summary.payload ?? "");
          return { approved: true };
        }
      },
      confirmationEffects: {
        randomBytes: (length) => new Uint8Array(length),
        delay: async () => undefined
      }
    });
    const session = await manager.open("app", "pub", ["device:nfc"], ["device:nfc"], {
      class: "nfc",
      purpose: "tag write"
    });
    // open is elevated → one confirmation; write is an extra NFC confirmation
    expect(confirmations.length).toBeGreaterThanOrEqual(1);
    await manager.write("app", "pub", session.handle, {
      kind: "nfc",
      action: "write",
      ndef: "hello-tag"
    });
    expect(confirmations).toContain("hello-tag");
    expect(nfcLog.commands).toHaveLength(1);
  });
});

describe("DeviceManager Phase 4 raw tiers + sidecar", () => {
  it("delivers sanitized camera frames over the sidecar", async () => {
    const manager = new DeviceManager({
      drivers: [createSimulatedRawCameraDriver()],
      now: () => 20_000
    });
    const session = await manager.open(
      "app",
      "pub",
      ["device:camera:frames"],
      ["device:camera:frames"],
      { class: "camera", tier: "frames", purpose: "record" }
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
      drivers: [createSimulatedCameraDriver()],
      now: () => 21_000
    });
    const session = await manager.open("app", "pub", ["device:camera"], ["device:camera"], {
      class: "camera",
      purpose: "scan"
    });
    const sample = await manager.read("app", session.handle);
    expect(sample).toMatchObject({ kind: "camera", tier: "derived" });
    expect(sample).not.toHaveProperty("byteLength");
    expect(sample).not.toHaveProperty("sidecar");
  });

  it("denies frames when only derived is granted", async () => {
    const manager = new DeviceManager({
      drivers: [createSimulatedRawCameraDriver()],
      now: () => 22_000
    });
    await expect(
      manager.open("app", "pub", ["device:camera"], ["device:camera"], {
        class: "camera",
        tier: "frames",
        purpose: "escalate"
      })
    ).rejects.toMatchObject({ code: "DEVICE_DENIED" });
  });

  it("sanitizes pcm and motion samples and supports screen-capture frames", async () => {
    const manager = new DeviceManager({
      drivers: [
        createSimulatedRawMicrophoneDriver(),
        createSimulatedRawMotionDriver(),
        createSimulatedScreenCaptureDriver()
      ],
      now: () => 23_000
    });

    const mic = await manager.open("app", "pub", ["device:microphone:pcm"], ["device:microphone:pcm"], {
      class: "microphone",
      tier: "pcm",
      purpose: "record audio"
    });
    const pcm = await manager.read("app", mic.handle);
    expect(pcm).toMatchObject({ kind: "microphone", tier: "pcm", sampleRate: 16_000, sampleCount: 3 });
    expect(JSON.stringify(pcm)).not.toContain("mic-fingerprint");
    await manager.close("app", mic.handle);

    const motion = await manager.open("app", "pub", ["device:motion:samples"], ["device:motion:samples"], {
      class: "motion",
      tier: "samples",
      purpose: "imu"
    });
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
      { class: "screen-capture", tier: "frames", purpose: "share region" }
    );
    const frame = await manager.read("app", screen.handle);
    expect(frame).toMatchObject({ kind: "screen-capture", tier: "frames", width: 8, height: 8 });
  });

  it("refuses control messages on the sidecar", () => {
    const sidecar = new DeviceStreamSidecar();
    expect(() => sidecar.rejectControlFrame(1, new Uint8Array([1, 2, 3]))).toThrow(DeviceStreamFrameError);
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

describe("DeviceManager Phase 5 streaming", () => {
  it("lets host chrome author, list, revoke, and restart-clear share offers", async () => {
    let now = 28_000;
    const manager = new DeviceManager({
      now: () => now,
      requestShareOffer: async ({ appId, purpose }) => {
        expect(appId).toBe("line-check");
        expect(purpose).toBe("Call Ana");
        return {
          targetKind: "peer",
          targetId: "peer-a",
          displayLabel: "Ana",
          classId: "microphone",
          tierId: "pcm",
          maxRung: "16k-opus",
          ttlMs: 1_000
        };
      },
      confirmShareOfferRevoke: async () => true
    });
    const offer = await manager.requestShareOfferFromChrome("line-check", "Call Ana");
    expect(offer?.displayLabel).toBe("Ana");
    expect(manager.listShareOffers("other")).toEqual([]);
    expect(manager.listShareOffers("line-check")).toHaveLength(1);
    expect(manager.listLiveShareOffers()).toHaveLength(1);
    expect(await manager.requestShareOfferRevoke("line-check", offer!.id)).toBe(true);
    expect(manager.listShareOffers("line-check")).toEqual([]);
    expect(manager.listLiveShareOffers()).toEqual([]);

    manager.grantShareOffer({
      appId: "line-check",
      targetKind: "peer",
      targetId: "peer-a",
      displayLabel: "Ana",
      classId: "camera",
      tierId: "derived",
      maxRung: "derived-events",
      ttlMs: 1_000
    });
    now += 500;
    manager.clearShareOffersForRestart();
    expect(manager.listShareOffers("line-check")).toEqual([]);
  });

  it("uses host link supply and treats app candidates only as ceilings", async () => {
    const manager = new DeviceManager({
      drivers: [createSimulatedCameraDriver()],
      now: () => 29_000,
      linkSupply: async () => [{
        plane: "reticulum",
        effectiveBps: 1_000,
        measuredGoodputBps: 1_000,
        headroomBps: 524_288
      }],
      streamEgressFactory: testEgressFactory()
    });
    const session = await manager.open("app", "pub", ["device:camera:frames"], ["device:camera:frames"], {
      class: "camera",
      tier: "frames",
      purpose: "watch"
    });
    manager.grantShareOffer({
      appId: "app",
      targetKind: "peer",
      targetId: "peer-1",
      displayLabel: "Peer 1",
      classId: "camera",
      tierId: "frames",
      maxRung: "720p30",
      ttlMs: 60_000
    });
    const stream = await manager.stream(
      "app",
      ["device:camera:frames", "device:stream"],
      ["device:camera:frames", "device:stream"],
      session.handle,
      "peer-1",
      { candidates: [{ plane: "reticulum", effectiveBps: 100_000_000, headroomBps: 100_000_000 }] }
    );
    expect(stream.admission).toMatchObject({
      kind: "degrade",
      plane: "cas",
      rung: "cas-snapshot",
      supplyBps: 0
    });
    await manager.closeStream("app", stream.handle);
  });

  it("enforces the host-authored maximum quality rung", async () => {
    let now = 29_500;
    const manager = new DeviceManager({
      drivers: [createSimulatedRawCameraDriver()],
      now: () => now,
      linkSupply: async () => [{ plane: "webrtc", effectiveBps: 4_000_000, headroomBps: 4_000_000 }],
      streamEgressFactory: testEgressFactory()
    });
    const session = await manager.open("app", "pub", ["device:camera:frames"], ["device:camera:frames"], {
      class: "camera",
      tier: "frames",
      purpose: "call"
    });
    manager.grantShareOffer({
      appId: "app",
      targetKind: "peer",
      targetId: "peer-1",
      displayLabel: "Peer 1",
      classId: "camera",
      tierId: "frames",
      maxRung: "480p15",
      ttlMs: 60_000
    });
    const stream = await manager.stream(
      "app",
      ["device:camera:frames", "device:stream"],
      ["device:camera:frames", "device:stream"],
      session.handle,
      "peer-1"
    );
    expect(stream.admission.rung).toBe("480p15");
    expect(stream.admission.kind).toBe("degrade");
    expect(() => manager.grantShareOffer({
      appId: "app",
      targetKind: "peer",
      targetId: "peer-1",
      displayLabel: "Peer 1",
      classId: "camera",
      tierId: "frames",
      maxRung: "app-invented-ultra",
      ttlMs: 60_000
    })).toThrow(/quality ceiling/);
    now += 60_000;
    expect(manager.listShareOffers("app")).toEqual([]);
    expect(manager.activeStreams()).toEqual([]);
  });

  it("requires device:stream and admits with degradation on thin links", async () => {
    const sent: Uint8Array[] = [];
    const manager = new DeviceManager({
      drivers: [createSimulatedCameraDriver()],
      now: () => 30_000,
      linkSupply: async () => [{ plane: "reticulum", effectiveBps: 64_000, headroomBps: 64_000 }],
      streamEgressFactory: testEgressFactory(sent)
    });
    const session = await manager.open("app", "pub", ["device:camera"], ["device:camera"], {
      class: "camera",
      purpose: "watch"
    });

    await expect(
      manager.stream("app", ["device:camera"], ["device:camera"], session.handle, "peer-1", {
        candidates: [{ plane: "reticulum", effectiveBps: 400, headroomBps: 524_288 }]
      })
    ).rejects.toMatchObject({ code: "DEVICE_DENIED" });

    manager.grantShareOffer({
      appId: "app",
      targetKind: "peer",
      targetId: "peer-1",
      displayLabel: "Peer 1",
      classId: "camera",
      tierId: "derived",
      maxRung: "derived-events",
      ttlMs: 60_000
    });

    const stream = await manager.stream(
      "app",
      ["device:camera", "device:stream"],
      ["device:camera", "device:stream"],
      session.handle,
      "peer-1",
      {
        candidates: [{ plane: "reticulum", effectiveBps: 400, headroomBps: 524_288 }]
      }
    );
    expect(stream.admission.kind).toMatch(/accept|degrade|defer/);
    expect(stream.peer).toBe("peer-1");
    expect(manager.activeIndicators()[0]?.destination).toBe("peer-1");
    await manager.read("app", session.handle);
    expect(sent).toHaveLength(1);
    const derivedFrame = decodeDeviceStreamFrame(sent[0]!);
    expect(derivedFrame.sampleKind).toBe(5);
    expect(JSON.parse(new TextDecoder().decode(derivedFrame.payload))).toMatchObject({
      kind: "camera",
      tier: "derived",
      motionDetected: false
    });
    await manager.closeStream("app", stream.handle);
  });

  it("reopens the codec/transport at a lower rung after sustained collapse and recovers only after hysteresis", async () => {
    let now = 30_500;
    let goodputBps = 1_000_000;
    const opened: string[] = [];
    const closed: string[] = [];
    const manager = new DeviceManager({
      drivers: [createSimulatedRawMicrophoneDriver({ sampleRate: 48_000, channels: 1, samples: [0.1, -0.1] })],
      now: () => now,
      linkSupply: async () => [{ plane: "reticulum", effectiveBps: 1_000_000, headroomBps: 1_000_000 }],
      streamEgressFactory: {
        async create({ admission }) {
          opened.push(admission.rung);
          return {
            plane: admission.plane,
            async send() { return { queuedBytes: 0, droppedOldest: 0 }; },
            quality: () => ({ goodputBps, rttMs: 20, jitterMs: 1, lossRatio: 0, mtu: 1_200, source: "observed" as const, samples: 4, confidence: "medium" as const }),
            async close() { closed.push(admission.rung); }
          };
        }
      }
    });
    const session = await manager.open("app", "pub", ["device:microphone:pcm"], ["device:microphone:pcm"], { class: "microphone", tier: "pcm", purpose: "call" });
    manager.grantShareOffer({ appId: "app", targetKind: "peer", targetId: "peer-1", displayLabel: "Peer 1", classId: "microphone", tierId: "pcm", maxRung: "48k-pcm", ttlMs: 60_000 });
    const stream = await manager.stream("app", ["device:microphone:pcm", "device:stream"], ["device:microphone:pcm", "device:stream"], session.handle, "peer-1");
    expect(opened).toEqual(["48k-pcm"]);
    goodputBps = 10_000;
    now += 1_000; await manager.read("app", session.handle); now += 1_000; await manager.read("app", session.handle);
    await vi.waitFor(() => expect(opened).toContain("16k-opus"));
    expect(manager.activeStreams()[0]?.admission.rung).toBe("16k-opus");
    goodputBps = 1_000_000;
    for (let index = 0; index < 4; index += 1) { now += 1_000; await manager.read("app", session.handle); }
    await vi.waitFor(() => expect(opened.filter((rung) => rung === "48k-pcm")).toHaveLength(2));
    expect(manager.activeStreams()[0]?.admission.rung).toBe("48k-pcm");
    expect(closed).toContain("16k-opus");
    await manager.closeStream("app", stream.handle);
  });

  it("falls back to a CAS snapshot when no live bandwidth remains", async () => {
    const manager = new DeviceManager({
      drivers: [createSimulatedCameraDriver()],
      now: () => 31_000,
      linkSupply: async () => [{ plane: "lxmf", effectiveBps: 0, headroomBps: 0 }],
      streamEgressFactory: testEgressFactory()
    });
    const session = await manager.open("app", "pub", ["device:camera"], ["device:camera"], {
      class: "camera",
      purpose: "share view"
    });
    manager.grantShareOffer({
      appId: "app",
      targetKind: "peer",
      targetId: "peer-2",
      displayLabel: "Peer 2",
      classId: "camera",
      tierId: "derived",
      maxRung: "derived-events",
      ttlMs: 60_000
    });
    const stream = await manager.stream(
      "app",
      ["device:camera", "device:stream"],
      ["device:camera", "device:stream"],
      session.handle,
      "peer-2",
      { candidates: [{ plane: "lxmf", effectiveBps: 0, headroomBps: 0 }] }
    );
    expect(stream.admission).toMatchObject({
      kind: "degrade",
      plane: "cas",
      rung: "cas-snapshot",
      supplyBps: 0
    });
    await manager.closeStream("app", stream.handle);
  });
});

describe("DeviceManager Phase 6 remote acquisition", () => {
  it("is off by default and requires host enable + per-peer grant", async () => {
    const serving = new DeviceManager({
      drivers: [createSimulatedCameraDriver()],
      now: () => 40_000
    });
    await expect(
      serving.openForRemotePeer({
        peerId: "peer-a",
        class: "camera",
        purpose: "see kitchen"
      })
    ).rejects.toMatchObject({ code: "DEVICE_DENIED" });

    serving.setRemoteAcquisitionEnabled(true);
    await expect(
      serving.openForRemotePeer({
        peerId: "peer-a",
        class: "camera",
        purpose: "see kitchen"
      })
    ).rejects.toMatchObject({ code: "DEVICE_DENIED" });

    serving.grantRemotePeer({
      peerId: "peer-a",
      classId: "camera",
      tierId: "derived",
      ttlMs: 60_000
    });
    const session = await serving.openForRemotePeer({
      peerId: "peer-a",
      class: "camera",
      purpose: "see kitchen"
    });
    expect(session.tier).toBe("derived");
    expect(serving.activeIndicators()[0]?.destination).toBe("remote:peer-a");
  });

  it("two-host path: requester needs device:remote; serving enforces grant", async () => {
    const requester = new DeviceManager({ now: () => 41_000 });
    const serving = new DeviceManager({
      drivers: [createSimulatedLocationDriver()],
      now: () => 41_000
    });
    serving.setRemoteAcquisitionEnabled(true);
    serving.grantRemotePeer({
      peerId: "peer-req",
      classId: "location",
      tierId: "coarse",
      ttlMs: 30_000
    });

    await expect(
      requester.requestRemoteDevice(
        "app",
        ["device:location"],
        ["device:location"],
        serving,
        { peerId: "peer-req", class: "location", purpose: "nav" }
      )
    ).rejects.toMatchObject({ code: "DEVICE_DENIED" });

    const session = await requester.requestRemoteDevice(
      "app",
      ["device:remote"],
      ["device:remote"],
      serving,
      { peerId: "peer-req", class: "location", purpose: "nav" }
    );
    const sample = await serving.read(`remote:peer-req`, session.handle);
    expect(sample.kind).toBe("location");
  });

  it("refuses re-serving a remote session to a third peer", async () => {
    const serving = new DeviceManager({
      drivers: [createSimulatedCameraDriver()],
      now: () => 42_000
    });
    serving.setRemoteAcquisitionEnabled(true);
    serving.grantRemotePeer({
      peerId: "peer-a",
      classId: "camera",
      tierId: "derived",
      ttlMs: 60_000
    });
    const session = await serving.openForRemotePeer({
      peerId: "peer-a",
      class: "camera",
      purpose: "watch"
    });
    await expect(
      serving.stream(
        `remote:peer-a`,
        ["device:stream"],
        ["device:stream"],
        session.handle,
        "peer-c",
        { candidates: [{ plane: "webrtc", effectiveBps: 1_000_000, headroomBps: 524_288 }] }
      )
    ).rejects.toMatchObject({ code: "DEVICE_DENIED" });
  });

  it("drops grants on simulated restart and enforces concurrency", async () => {
    const serving = new DeviceManager({
      drivers: [createSimulatedCameraDriver()],
      now: () => 43_000,
      maxRemoteSessions: 1
    });
    serving.setRemoteAcquisitionEnabled(true);
    serving.grantRemotePeer({
      peerId: "peer-a",
      classId: "camera",
      tierId: "derived",
      ttlMs: 60_000,
      maxConcurrent: 1
    });
    await serving.openForRemotePeer({
      peerId: "peer-a",
      class: "camera",
      purpose: "one"
    });
    await expect(
      serving.openForRemotePeer({
        peerId: "peer-a",
        class: "camera",
        purpose: "two"
      })
    ).rejects.toMatchObject({ code: "DEVICE_DENIED" });

    serving.clearRemoteGrantsForRestart();
    expect(serving.listRemoteGrants()).toHaveLength(0);
  });
});

describe("DeviceManager Phase 7 hardening", () => {
  it("blocks payment AIDs on nfc:apdu writes", async () => {
    const log = { commands: [], stopped: 0 };
    const manager = new DeviceManager({
      drivers: [createSimulatedNfcDriver(log)],
      now: () => 50_000
    });
    const session = await manager.open("app", "pub", ["device:nfc:apdu"], ["device:nfc:apdu"], {
      class: "nfc",
      tier: "apdu",
      purpose: "transit card"
    });
    await expect(
      manager.write("app", "pub", session.handle, {
        kind: "nfc",
        action: "apdu",
        aid: "A0000000031010",
        apdu: "00A4040000"
      })
    ).rejects.toMatchObject({ code: "DEVICE_BAD_REQUEST" });
    await manager.write("app", "pub", session.handle, {
      kind: "nfc",
      action: "apdu",
      aid: "F001020304",
      apdu: "00A4040000"
    });
    expect(log.commands).toHaveLength(1);
  });

  it("returns biometric assertions without templates", async () => {
    const manager = new DeviceManager({
      drivers: [createSimulatedBiometricDriver(true)],
      now: () => 51_000
    });
    const session = await manager.open("app", "pub", ["device:biometric"], ["device:biometric"], {
      class: "biometric",
      purpose: "unlock"
    });
    const sample = await manager.read("app", session.handle);
    expect(sample).toEqual({ kind: "biometric", tier: "assertion", at: 51_000, passed: true });
    expect(JSON.stringify(sample)).not.toMatch(/template|enroll/i);
  });

  it("reads simulated STT transcripts", async () => {
    const manager = new DeviceManager({
      drivers: [createSimulatedSttDriver({ text: "pairing code one two", isFinal: true, confidence: 0.95 })],
      now: () => 52_000
    });
    const session = await manager.open("app", "pub", ["device:stt"], ["device:stt"], {
      class: "stt",
      purpose: "Dictate a message"
    });
    const sample = await manager.read("app", session.handle);
    expect(sample).toEqual({
      kind: "stt",
      tier: "transcript",
      at: 52_000,
      text: "pairing code one two",
      isFinal: true,
      confidence: 0.95
    });
  });

  it("reads scalar sensors added only via the registry path", async () => {
    const manager = new DeviceManager({
      drivers: [
        createSimulatedScalarDriver("proximity", { near: true }),
        createSimulatedScalarDriver("barometer", { hPa: 1013.25 }),
        createSimulatedScalarDriver("thermometer", { celsius: 22.4 }),
        createSimulatedScalarDriver("hygrometer", { relativeHumidity: 45.2 }),
        createSimulatedScalarDriver("thermal", { bucket: "warm" })
      ],
      now: () => 52_000
    });
    for (const classId of ["proximity", "barometer", "thermometer", "hygrometer", "thermal"] as const) {
      const session = await manager.open("app", "pub", [`device:${classId}`], [`device:${classId}`], {
        class: classId,
        purpose: "sense"
      });
      const sample = await manager.read("app", session.handle);
      expect(sample.kind).toBe(classId);
      await manager.close("app", session.handle);
    }
  });
});

describe("DeviceManager host chrome", () => {
  it("disables classes, kills sessions, and exposes chrome handles", async () => {
    let chromeTicks = 0;
    const manager = createSimulatedDeviceManager({
      now: () => 60_000,
      onChromeChange: () => {
        chromeTicks += 1;
      }
    });
    const session = await manager.open("app", "pub", ["device:location"], ["device:location"], {
      class: "location",
      purpose: "navigate"
    });
    expect(manager.chromeSessions()).toEqual([
      expect.objectContaining({
        handle: session.handle,
        classId: "location",
        appId: "app",
        purpose: "navigate",
        destination: "local"
      })
    ]);
    expect(chromeTicks).toBeGreaterThan(0);

    manager.setClassDisabled("location", true);
    expect(manager.disabledClasses()).toEqual(["location"]);
    expect(manager.chromeSessions()).toEqual([]);
    const inventory = await manager.inventory();
    expect(inventory.find((entry) => entry.class === "location")?.availability).toBe("policy-disabled");

    await expect(
      manager.open("app", "pub", ["device:location"], ["device:location"], {
        class: "location",
        purpose: "navigate again"
      })
    ).rejects.toMatchObject({ code: "DEVICE_DENIED" });

    manager.setClassDisabled("location", false);
    const reopened = await manager.open("app", "pub", ["device:camera"], ["device:camera"], {
      class: "camera",
      purpose: "scan"
    });
    await manager.forceClose(reopened.handle);
    expect(manager.chromeSessions()).toEqual([]);
    expect(manager.activeIndicators()).toEqual([]);
  });

  it("toggles remote acquisition from host chrome", () => {
    const manager = createSimulatedDeviceManager({ now: () => 61_000 });
    expect(manager.isRemoteAcquisitionEnabled()).toBe(false);
    manager.setRemoteAcquisitionEnabled(true);
    expect(manager.isRemoteAcquisitionEnabled()).toBe(true);
    manager.setRemoteAcquisitionEnabled(false);
    expect(manager.isRemoteAcquisitionEnabled()).toBe(false);
  });

  it("replaces selected simulated drivers with host-bridged ones", async () => {
    const senses: string[] = [];
    const manager = createSimulatedDeviceManager({
      now: () => 62_000,
      drivers: createHybridDeviceDrivers(["location"], {
        availability: () => "available",
        sense: async (classId) => {
          senses.push(classId);
          return { latitude: 1, longitude: 2, accuracyM: 3 };
        }
      })
    });
    const session = await manager.open("app", "pub", ["device:location:precise"], ["device:location:precise"], {
      class: "location",
      tier: "precise",
      purpose: "bridge"
    });
    expect(await manager.read("app", session.handle)).toMatchObject({
      kind: "location",
      tier: "precise",
      latitude: 1,
      longitude: 2
    });
    expect(senses).toEqual(["location"]);
    expect((await manager.inventory()).find((entry) => entry.class === "camera")?.availability).toBe(
      "available"
    );
  });
});
