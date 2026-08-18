import { describe, expect, it, vi } from "vitest";
import {
  DeviceManager,
  createSimulatedBiometricDriver,
  createSimulatedCameraDriver,
  createSimulatedDeviceManager,
  createHybridDeviceDrivers,
  createSimulatedLocationDriver,
  createSimulatedNfcDriver,
  createSimulatedRawCameraDriver,
  createSimulatedRawMicrophoneDriver,
  createSimulatedScalarDriver,
  createSimulatedSttDriver,
} from "../src/index.js";
import { decodeDeviceStreamFrame } from "@twistedpear/protocol";
import { testEgressFactory } from "./device.test-helpers.js";

describe("DeviceManager Phase 5 streaming", () => {
  it("lets host chrome author, list, revoke, and restart-clear share offers", async () => {
    let now = 28_000;
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
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
          ttlMs: 1_000,
        };
      },
      confirmShareOfferRevoke: async () => true,
    });
    const offer = await manager.requestShareOfferFromChrome(
      "line-check",
      "Call Ana",
    );
    expect(offer?.displayLabel).toBe("Ana");
    expect(manager.listShareOffers("other")).toEqual([]);
    expect(manager.listShareOffers("line-check")).toHaveLength(1);
    expect(manager.listLiveShareOffers()).toHaveLength(1);
    expect(await manager.requestShareOfferRevoke("line-check", offer!.id)).toBe(
      true,
    );
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
      ttlMs: 1_000,
    });
    now += 500;
    manager.clearShareOffersForRestart();
    expect(manager.listShareOffers("line-check")).toEqual([]);
  });

  it("uses host link supply and treats app candidates only as ceilings", async () => {
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [createSimulatedCameraDriver()],
      now: () => 29_000,
      linkSupply: async () => [
        {
          effectiveBps: 1_000,
          measuredGoodputBps: 1_000,
          headroomBps: 524_288,
        },
      ],
      streamEgressFactory: testEgressFactory(),
    });
    const session = await manager.open(
      "app",
      "pub",
      ["device:camera:frames"],
      ["device:camera:frames"],
      {
        class: "camera",
        tier: "frames",
        purpose: "watch",
      },
    );
    manager.grantShareOffer({
      appId: "app",
      targetKind: "peer",
      targetId: "peer-1",
      displayLabel: "Peer 1",
      classId: "camera",
      tierId: "frames",
      maxRung: "720p30",
      ttlMs: 60_000,
    });
    const stream = await manager.stream({
      appId: "app",
      declared: ["device:camera:frames", "device:stream"],
      granted: ["device:camera:frames", "device:stream"],
      sessionHandle: session.handle,
      peer: "peer-1",
      constraints: {
        candidates: [
          {
            plane: "reticulum",
            effectiveBps: 100_000_000,
            headroomBps: 100_000_000,
          },
        ],
      },
    });
    expect(stream.admission).toMatchObject({
      kind: "degrade",
      plane: "cas",
      rung: "cas-snapshot",
      supplyBps: 0,
    });
    await manager.closeStream("app", stream.handle);
  });

  it("enforces the host-authored maximum quality rung", async () => {
    let now = 29_500;
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [createSimulatedRawCameraDriver()],
      now: () => now,
      linkSupply: async () => [
        { plane: "webrtc", effectiveBps: 4_000_000, headroomBps: 4_000_000 },
      ],
      streamEgressFactory: testEgressFactory(),
    });
    const session = await manager.open(
      "app",
      "pub",
      ["device:camera:frames"],
      ["device:camera:frames"],
      {
        class: "camera",
        tier: "frames",
        purpose: "call",
      },
    );
    manager.grantShareOffer({
      appId: "app",
      targetKind: "peer",
      targetId: "peer-1",
      displayLabel: "Peer 1",
      classId: "camera",
      tierId: "frames",
      maxRung: "480p15",
      ttlMs: 60_000,
    });
    const stream = await manager.stream({
      appId: "app",
      declared: ["device:camera:frames", "device:stream"],
      granted: ["device:camera:frames", "device:stream"],
      sessionHandle: session.handle,
      peer: "peer-1",
    });
    expect(stream.admission.rung).toBe("480p15");
    expect(stream.admission.kind).toBe("degrade");
    expect(() =>
      manager.grantShareOffer({
        appId: "app",
        targetKind: "peer",
        targetId: "peer-1",
        displayLabel: "Peer 1",
        classId: "camera",
        tierId: "frames",
        maxRung: "app-invented-ultra",
        ttlMs: 60_000,
      }),
    ).toThrow(/quality ceiling/);
    now += 60_000;
    expect(manager.listShareOffers("app")).toEqual([]);
    expect(manager.activeStreams()).toEqual([]);
  });
});

describe("DeviceManager Phase 5 streaming (continued)", () => {
  it("requires device:stream and admits with degradation on thin links", async () => {
    const sent: Uint8Array[] = [];
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [createSimulatedCameraDriver()],
      now: () => 30_000,
      linkSupply: async () => [
        { plane: "reticulum", effectiveBps: 64_000, headroomBps: 64_000 },
      ],
      streamEgressFactory: testEgressFactory(sent),
    });
    const session = await manager.open(
      "app",
      "pub",
      ["device:camera"],
      ["device:camera"],
      {
        class: "camera",
        purpose: "watch",
      },
    );

    await expect(
      manager.stream({
        appId: "app",
        declared: ["device:camera"],
        granted: ["device:camera"],
        sessionHandle: session.handle,
        peer: "peer-1",
        constraints: {
          candidates: [
            { plane: "reticulum", effectiveBps: 400, headroomBps: 524_288 },
          ],
        },
      }),
    ).rejects.toMatchObject({ code: "DEVICE_DENIED" });

    manager.grantShareOffer({
      appId: "app",
      targetKind: "peer",
      targetId: "peer-1",
      displayLabel: "Peer 1",
      classId: "camera",
      tierId: "derived",
      maxRung: "derived-events",
      ttlMs: 60_000,
    });

    const stream = await manager.stream({
      appId: "app",
      declared: ["device:camera", "device:stream"],
      granted: ["device:camera", "device:stream"],
      sessionHandle: session.handle,
      peer: "peer-1",
      constraints: {
        candidates: [
          { plane: "reticulum", effectiveBps: 400, headroomBps: 524_288 },
        ],
      },
    });
    expect(stream.admission.kind).toMatch(/accept|degrade|defer/);
    expect(stream.peer).toBe("peer-1");
    expect(manager.activeIndicators()[0]?.destination).toBe("peer-1");
    await manager.read("app", session.handle);
    expect(sent).toHaveLength(1);
    const derivedFrame = decodeDeviceStreamFrame(sent[0]!);
    expect(derivedFrame.sampleKind).toBe(5);
    expect(
      JSON.parse(new TextDecoder().decode(derivedFrame.payload)),
    ).toMatchObject({
      kind: "camera",
      tier: "derived",
      motionDetected: false,
    });
    await manager.closeStream("app", stream.handle);
  });

  it("reopens the codec/transport at a lower rung after sustained collapse and recovers only after hysteresis", async () => {
    let now = 30_500;
    let goodputBps = 1_000_000;
    const opened: string[] = [];
    const closed: string[] = [];
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [
        createSimulatedRawMicrophoneDriver({
          sampleRate: 48_000,
          channels: 1,
          samples: [0.1, -0.1],
        }),
      ],
      now: () => now,
      linkSupply: async () => [
        { plane: "reticulum", effectiveBps: 1_000_000, headroomBps: 1_000_000 },
      ],
      streamEgressFactory: {
        async create({ admission }) {
          opened.push(admission.rung);
          return {
            plane: admission.plane,
            async send() {
              return { queuedBytes: 0, droppedOldest: 0 };
            },
            quality: () => ({
              goodputBps,
              rttMs: 20,
              jitterMs: 1,
              lossRatio: 0,
              mtu: 1_200,
              source: "observed" as const,
              samples: 4,
              confidence: "medium" as const,
            }),
            async close() {
              closed.push(admission.rung);
            },
          };
        },
      },
    });
    const session = await manager.open(
      "app",
      "pub",
      ["device:microphone:pcm"],
      ["device:microphone:pcm"],
      { class: "microphone", tier: "pcm", purpose: "call" },
    );
    manager.grantShareOffer({
      appId: "app",
      targetKind: "peer",
      targetId: "peer-1",
      displayLabel: "Peer 1",
      classId: "microphone",
      tierId: "pcm",
      maxRung: "48k-pcm",
      ttlMs: 60_000,
    });
    const stream = await manager.stream({
      appId: "app",
      declared: ["device:microphone:pcm", "device:stream"],
      granted: ["device:microphone:pcm", "device:stream"],
      sessionHandle: session.handle,
      peer: "peer-1",
    });
    expect(opened).toEqual(["48k-pcm"]);
    goodputBps = 10_000;
    now += 1_000;
    await manager.read("app", session.handle);
    now += 1_000;
    await manager.read("app", session.handle);
    await vi.waitFor(() => expect(opened).toContain("16k-opus"));
    expect(manager.activeStreams()[0]?.admission.rung).toBe("16k-opus");
    goodputBps = 1_000_000;
    for (let index = 0; index < 4; index += 1) {
      now += 1_000;
      await manager.read("app", session.handle);
    }
    await vi.waitFor(() =>
      expect(opened.filter((rung) => rung === "48k-pcm")).toHaveLength(2),
    );
    expect(manager.activeStreams()[0]?.admission.rung).toBe("48k-pcm");
    expect(closed).toContain("16k-opus");
    await manager.closeStream("app", stream.handle);
  });
});

describe("DeviceManager Phase 5 streaming (continued)", () => {
  it("falls back to a CAS snapshot when no live bandwidth remains", async () => {
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [createSimulatedCameraDriver()],
      now: () => 31_000,
      linkSupply: async () => [
        { plane: "lxmf", effectiveBps: 0, headroomBps: 0 },
      ],
      streamEgressFactory: testEgressFactory(),
    });
    const session = await manager.open(
      "app",
      "pub",
      ["device:camera"],
      ["device:camera"],
      {
        class: "camera",
        purpose: "share view",
      },
    );
    manager.grantShareOffer({
      appId: "app",
      targetKind: "peer",
      targetId: "peer-2",
      displayLabel: "Peer 2",
      classId: "camera",
      tierId: "derived",
      maxRung: "derived-events",
      ttlMs: 60_000,
    });
    const stream = await manager.stream({
      appId: "app",
      declared: ["device:camera", "device:stream"],
      granted: ["device:camera", "device:stream"],
      sessionHandle: session.handle,
      peer: "peer-2",
      constraints: {
        candidates: [{ plane: "lxmf", effectiveBps: 0, headroomBps: 0 }],
      },
    });
    expect(stream.admission).toMatchObject({
      kind: "degrade",
      plane: "cas",
      rung: "cas-snapshot",
      supplyBps: 0,
    });
    await manager.closeStream("app", stream.handle);
  });
});

describe("DeviceManager Phase 6 remote acquisition", () => {
  it("is off by default and requires host enable + per-peer grant", async () => {
    const serving = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [createSimulatedCameraDriver()],
      now: () => 40_000,
    });
    await expect(
      serving.openForRemotePeer({
        peerId: "peer-a",
        class: "camera",
        purpose: "see kitchen",
      }),
    ).rejects.toMatchObject({ code: "DEVICE_DENIED" });

    serving.setRemoteAcquisitionEnabled(true);
    await expect(
      serving.openForRemotePeer({
        peerId: "peer-a",
        class: "camera",
        purpose: "see kitchen",
      }),
    ).rejects.toMatchObject({ code: "DEVICE_DENIED" });

    serving.grantRemotePeer({
      peerId: "peer-a",
      classId: "camera",
      tierId: "derived",
      ttlMs: 60_000,
    });
    const session = await serving.openForRemotePeer({
      peerId: "peer-a",
      class: "camera",
      purpose: "see kitchen",
    });
    expect(session.tier).toBe("derived");
    expect(serving.activeIndicators()[0]?.destination).toBe("remote:peer-a");
  });

  it("two-host path: requester needs device:remote; serving enforces grant", async () => {
    const requester = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      now: () => 41_000,
    });
    const serving = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [createSimulatedLocationDriver()],
      now: () => 41_000,
    });
    serving.setRemoteAcquisitionEnabled(true);
    serving.grantRemotePeer({
      peerId: "peer-req",
      classId: "location",
      tierId: "coarse",
      ttlMs: 30_000,
    });

    await expect(
      requester.requestRemoteDevice(
        "app",
        ["device:location"],
        ["device:location"],
        serving,
        { peerId: "peer-req", class: "location", purpose: "nav" },
      ),
    ).rejects.toMatchObject({ code: "DEVICE_DENIED" });

    const session = await requester.requestRemoteDevice(
      "app",
      ["device:remote"],
      ["device:remote"],
      serving,
      { peerId: "peer-req", class: "location", purpose: "nav" },
    );
    const sample = await serving.read(`remote:peer-req`, session.handle);
    expect(sample.kind).toBe("location");
  });

  it("refuses re-serving a remote session to a third peer", async () => {
    const serving = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [createSimulatedCameraDriver()],
      now: () => 42_000,
    });
    serving.setRemoteAcquisitionEnabled(true);
    serving.grantRemotePeer({
      peerId: "peer-a",
      classId: "camera",
      tierId: "derived",
      ttlMs: 60_000,
    });
    const session = await serving.openForRemotePeer({
      peerId: "peer-a",
      class: "camera",
      purpose: "watch",
    });
    await expect(
      serving.stream({
        appId: `remote:peer-a`,
        declared: ["device:stream"],
        granted: ["device:stream"],
        sessionHandle: session.handle,
        peer: "peer-c",
        constraints: {
          candidates: [
            { plane: "webrtc", effectiveBps: 1_000_000, headroomBps: 524_288 },
          ],
        },
      }),
    ).rejects.toMatchObject({ code: "DEVICE_DENIED" });
  });

  it("drops grants on simulated restart and enforces concurrency", async () => {
    const serving = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [createSimulatedCameraDriver()],
      now: () => 43_000,
      maxRemoteSessions: 1,
    });
    serving.setRemoteAcquisitionEnabled(true);
    serving.grantRemotePeer({
      peerId: "peer-a",
      classId: "camera",
      tierId: "derived",
      ttlMs: 60_000,
      maxConcurrent: 1,
    });
    await serving.openForRemotePeer({
      peerId: "peer-a",
      class: "camera",
      purpose: "one",
    });
    await expect(
      serving.openForRemotePeer({
        peerId: "peer-a",
        class: "camera",
        purpose: "two",
      }),
    ).rejects.toMatchObject({ code: "DEVICE_DENIED" });

    serving.clearRemoteGrantsForRestart();
    expect(serving.listRemoteGrants()).toHaveLength(0);
  });
});

describe("DeviceManager Phase 7 hardening", () => {
  it("blocks payment AIDs on nfc:apdu writes", async () => {
    const log = { commands: [], stopped: 0 };
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [createSimulatedNfcDriver(log)],
      now: () => 50_000,
    });
    const session = await manager.open(
      "app",
      "pub",
      ["device:nfc:apdu"],
      ["device:nfc:apdu"],
      {
        class: "nfc",
        tier: "apdu",
        purpose: "transit card",
      },
    );
    await expect(
      manager.write("app", "pub", session.handle, {
        kind: "nfc",
        action: "apdu",
        aid: "A0000000031010",
        apdu: "00A4040000",
      }),
    ).rejects.toMatchObject({ code: "DEVICE_BAD_REQUEST" });
    await manager.write("app", "pub", session.handle, {
      kind: "nfc",
      action: "apdu",
      aid: "F001020304",
      apdu: "00A4040000",
    });
    expect(log.commands).toHaveLength(1);
  });

  it("returns biometric assertions without templates", async () => {
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [createSimulatedBiometricDriver(true)],
      now: () => 51_000,
    });
    const session = await manager.open(
      "app",
      "pub",
      ["device:biometric"],
      ["device:biometric"],
      {
        class: "biometric",
        purpose: "unlock",
      },
    );
    const sample = await manager.read("app", session.handle);
    expect(sample).toMatchObject({
      kind: "biometric",
      tier: "assertion",
      at: 51_000,
      passed: true,
      assertion: { alg: "host-assert-v1", payload: "pass" },
    });
    expect(JSON.stringify(sample)).not.toMatch(/template|enroll/i);
  });

  it("reads simulated STT transcripts", async () => {
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [
        createSimulatedSttDriver({
          text: "pairing code one two",
          isFinal: true,
          confidence: 0.95,
        }),
      ],
      now: () => 52_000,
    });
    const session = await manager.open(
      "app",
      "pub",
      ["device:stt"],
      ["device:stt"],
      {
        class: "stt",
        purpose: "Dictate a message",
      },
    );
    const sample = await manager.read("app", session.handle);
    expect(sample).toEqual({
      kind: "stt",
      tier: "transcript",
      at: 52_000,
      text: "pairing code one two",
      isFinal: true,
      confidence: 0.95,
    });
  });

  it("reads scalar sensors added only via the registry path", async () => {
    const manager = new DeviceManager({
      allowUnconfirmedDeviceSessions: true,
      drivers: [
        createSimulatedScalarDriver("proximity", { near: true }),
        createSimulatedScalarDriver("barometer", { hPa: 1013.25 }),
        createSimulatedScalarDriver("thermometer", { celsius: 22.4 }),
        createSimulatedScalarDriver("hygrometer", { relativeHumidity: 45.2 }),
        createSimulatedScalarDriver("thermal", { bucket: "warm" }),
      ],
      now: () => 52_000,
    });
    for (const classId of [
      "proximity",
      "barometer",
      "thermometer",
      "hygrometer",
      "thermal",
    ] as const) {
      const session = await manager.open(
        "app",
        "pub",
        [`device:${classId}`],
        [`device:${classId}`],
        {
          class: classId,
          purpose: "sense",
        },
      );
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
      allowUnconfirmedDeviceSessions: true,
      onChromeChange: () => {
        chromeTicks += 1;
      },
    });
    const session = await manager.open(
      "app",
      "pub",
      ["device:location"],
      ["device:location"],
      {
        class: "location",
        purpose: "navigate",
      },
    );
    expect(manager.chromeSessions()).toEqual([
      expect.objectContaining({
        handle: session.handle,
        classId: "location",
        appId: "app",
        purpose: "navigate",
        destination: "local",
      }),
    ]);
    expect(chromeTicks).toBeGreaterThan(0);

    manager.setClassDisabled("location", true);
    expect(manager.disabledClasses()).toEqual(["location"]);
    expect(manager.chromeSessions()).toEqual([]);
    const inventory = await manager.inventory();
    expect(
      inventory.find((entry) => entry.class === "location")?.availability,
    ).toBe("policy-disabled");

    await expect(
      manager.open("app", "pub", ["device:location"], ["device:location"], {
        class: "location",
        purpose: "navigate again",
      }),
    ).rejects.toMatchObject({ code: "DEVICE_DENIED" });

    manager.setClassDisabled("location", false);
    const reopened = await manager.open(
      "app",
      "pub",
      ["device:camera"],
      ["device:camera"],
      {
        class: "camera",
        purpose: "scan",
      },
    );
    await manager.forceClose(reopened.handle);
    expect(manager.chromeSessions()).toEqual([]);
    expect(manager.activeIndicators()).toEqual([]);
  });

  it("toggles remote acquisition from host chrome", () => {
    const manager = createSimulatedDeviceManager({
      now: () => 61_000,
      allowUnconfirmedDeviceSessions: true,
    });
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
      allowUnconfirmedDeviceSessions: true,
      drivers: createHybridDeviceDrivers(["location"], {
        availability: () => "available",
        sense: async (classId) => {
          senses.push(classId);
          return { latitude: 1, longitude: 2, accuracyM: 3 };
        },
      }),
    });
    const session = await manager.open(
      "app",
      "pub",
      ["device:location:precise"],
      ["device:location:precise"],
      {
        class: "location",
        tier: "precise",
        purpose: "bridge",
      },
    );
    expect(await manager.read("app", session.handle)).toMatchObject({
      kind: "location",
      tier: "precise",
      latitude: 1,
      longitude: 2,
    });
    expect(senses).toEqual(["location"]);
    expect(
      (await manager.inventory()).find((entry) => entry.class === "camera")
        ?.availability,
    ).toBe("available");
  });
});
