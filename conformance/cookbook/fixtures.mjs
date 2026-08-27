/**
 * The simulated host every Cookbook scenario runs on: memory KV, canned AI and
 * CAS answers, a peer session manager, and the egress offers the documented
 * workflows need. Extracted from `cookbook.test.mjs` so that file stays under
 * the size ratchet; behaviour is unchanged. Named `fixtures.mjs` to match the
 * conformance convention for shared scenario data.
 */
import {
  GrantStore,
  KvStorageBeeBackend,
  MiniappHost,
  NodeWorkerSandboxBackend,
  AnnounceService,
  MemoryAnnounceTransport,
  TransportBackedAnnounceService,
  DeviceManager,
  CodecStreamEgressFactory,
  createSimulatedRawMicrophoneDriver,
} from "../../packages/miniapp-runtime/dist/index.js";
import { SimulatedMediaCodecDriver } from "../../packages/effects/dist/index.js";
import {
  PeerDiscoveryRegistry,
  PeerSessionManager,
} from "../../packages/peer-discovery/dist/index.js";

export class MemoryStore {
  values = new Map();

  async get(key) {
    return this.values.get(key) ?? null;
  }

  async set(key, value) {
    this.values.set(key, value);
  }

  async delete(key) {
    this.values.delete(key);
  }

  async list(prefix) {
    return [...this.values.keys()].filter((key) => key.startsWith(prefix));
  }
}

export const fakeT256 = "D".repeat(94);

/**
 * Fixture observation stamp. A constant, not a clock read: a trace replay hands
 * the host a virtual clock, and fixture data must not spend its ticks.
 */
const FIXTURE_OBSERVED_AT = 1_767_225_600_000;

export async function createHost(name = "", hostOptions = {}) {
  const store = new MemoryStore();
  // Trace record/replay hands in a virtual clock so the sandbox entropy seed
  // and every host timestamp reproduce; without it the fixture is wall-clock.
  const now = hostOptions.now ?? (() => Date.now());
  const encoder = new TextEncoder();
  const bee = new KvStorageBeeBackend(store);
  if (name === "ask-the-handbook") {
    await store.set(
      "miniapp-workspace:ask-the-handbook:docs/identity.md",
      encoder.encode(
        "Back up an identity by exporting an encrypted identity file. Keep its passphrase separately.",
      ),
    );
  }
  const answers = {
    "ask-the-handbook":
      "Export an encrypted copy of the identity file and keep its passphrase separately.",
    "form-forge":
      '[{"label":"Name","type":"text"},{"label":"Party size","type":"number"},{"label":"Checked in","type":"switch"}]',
    "pocket-translator": "Buenos días",
    "triage-notes":
      '{"subject":"Water pump inspection","location":"North shelter","severity":"high","action":"Send maintenance crew"}',
  };
  const announceService =
    hostOptions.announceService ??
    (name === "app-relay"
      ? new TransportBackedAnnounceService(
          "publisher-alpha",
          new MemoryAnnounceTransport(),
        )
      : new AnnounceService());
  let peerSessionManager = hostOptions.peerSessionManager;
  if (name === "link-weather" && peerSessionManager === undefined) {
    const registry = new PeerDiscoveryRegistry();
    for (const kind of [
      "reticulum",
      "qr",
      "manual",
      "audio",
      "bluetooth",
      "ntfy",
      "local-peer-to-peer",
    ]) {
      registry.register({
        kind,
        async availability() {
          return { state: "available" };
        },
        async *offer() {},
        async *accept() {},
        async answer() {},
        async cancel() {},
      });
    }
    const connected = (adapter, direction) => ({
      authenticated: true,
      confirmed: true,
      fingerprint: `fixture-${direction}-${adapter.kind}`,
      displayLabel: `Fixture peer (${direction})`,
      rendezvous: adapter.kind,
      dataPlane:
        adapter.kind === "bluetooth"
          ? "bluetooth"
          : adapter.kind === "reticulum"
            ? "reticulum"
            : "webrtc",
    });
    peerSessionManager = new PeerSessionManager(registry, {
      async request(adapter) {
        return connected(adapter, "invite");
      },
      async listen(adapter) {
        return connected(adapter, "join");
      },
    });
  }
  if (name === "app-relay") {
    await announceService.publish(
      "app-relay",
      encoder.encode(JSON.stringify({ name: "Trail map", t256: fakeT256 })),
    );
  }
  const host = new MiniappHost({
    now,
    ...(hostOptions.sessionRecorder === undefined
      ? {}
      : { sessionRecorder: hostOptions.sessionRecorder }),
    ...(hostOptions.callbacks === undefined
      ? {}
      : { callbacks: hostOptions.callbacks }),
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(store),
    kvBackend: store,
    beeBackend: bee,
    presenceBackend: {
      snapshot: async () => ({
        onlineInterfaces: 1,
        preferredInterface: "tcp",
        peers: 1,
      }),
    },
    announceService,
    aiBackend: {
      chat: async () => ({
        message: {
          role: "assistant",
          content: answers[name] ?? "Cookbook response",
        },
        model: "cookbook-test",
        usage: null,
      }),
      stream: async function* () {
        const answer = answers[name] ?? "Cookbook response";
        yield { delta: answer, model: "cookbook-test" };
      },
      embed: async (_appId, request) => ({
        vectors: request.inputs.map((input) => [
          input.toLowerCase().includes("identity") ? 1 : 0,
          1,
        ]),
        model: "cookbook-test",
        usage: null,
      }),
    },
    resourceBackend: {
      fetch: async () => new TextEncoder().encode("cookbook resource"),
    },
    casBackend: {
      put: async (_appId, content) => ({
        t256: fakeT256,
        size: content.length,
      }),
      get: async (_appId, t256) =>
        t256 === fakeT256
          ? encoder.encode(
              "Field notes cover\n---\nWater and shelter\n---\nRadio plan and contacts",
            )
          : null,
    },
    confirmationChannel: { confirm: async () => ({ approved: true }) },
    peerSessionManager,
    ...(name === "line-check"
      ? {
          linkObservatoryBackend: {
            async peers() {
              return [
                {
                  peer: { id: "peer-ana" },
                  displayLabel: "Ana · verified",
                  plane: "webrtc",
                  reachability: "direct",
                  quality: {
                    goodputBps: 1_000_000,
                    rttMs: 42,
                    jitterMs: 4,
                    lossRatio: 0.01,
                    mtu: 1200,
                    source: "observed",
                    samples: 8,
                    confidence: "high",
                  },
                  readiness: {
                    hostApi: "0.12.0",
                    accepts: [
                      {
                        classId: "camera",
                        maxRung: "480p15",
                        encodings: ["vp9"],
                      },
                      {
                        classId: "microphone",
                        maxRung: "16k-opus",
                        encodings: ["opus"],
                      },
                    ],
                    offers: [],
                    downlinkBucket: "sd-video",
                    constrained: [],
                    consentPosture: "ask",
                    expiresAt: Number.MAX_SAFE_INTEGER,
                  },
                  observedAt: FIXTURE_OBSERVED_AT,
                  freshness: "live",
                },
              ];
            },
            async probe(_appId, _peer, request) {
              if (
                request.reservationClass !== "control" ||
                request.abortOnQueueGrowth !== true
              )
                throw new Error("unsafe probe request");
              return {
                goodputBps: 1_200_000,
                rttMs: 38,
                jitterMs: 3,
                lossRatio: 0,
                mtu: 1200,
                source: "probed",
                samples: 1,
                confidence: "medium",
              };
            },
          },
          deviceManager: new DeviceManager({
            allowUnconfirmedDeviceSessions: true,
            drivers: [createSimulatedRawMicrophoneDriver()],
            linkSupply: async () => [
              {
                plane: "webrtc",
                effectiveBps: 1_000_000,
                headroomBps: 1_000_000,
              },
            ],
            streamEgressFactory: new CodecStreamEgressFactory(
              {
                async create({ admission }) {
                  return {
                    plane: admission.plane,
                    async send() {
                      return { queuedBytes: 0, droppedOldest: 0 };
                    },
                    quality() {
                      return {
                        goodputBps: 1_000_000,
                        rttMs: 38,
                        jitterMs: 3,
                        lossRatio: 0,
                        mtu: 1200,
                        source: "observed",
                        samples: 8,
                        confidence: "high",
                      };
                    },
                    async close() {},
                  };
                },
              },
              async () => new SimulatedMediaCodecDriver(),
            ),
            requestShareOffer: async () => ({
              targetKind: "peer",
              targetId: "peer-ana",
              displayLabel: "Ana · verified",
              classId: "microphone",
              tierId: "pcm",
              maxRung: "16k-opus",
              ttlMs: 60_000,
            }),
            confirmShareOfferRevoke: async () => true,
            now: () => Date.now(),
          }),
        }
      : {}),
    appsBackend: {
      package: async () => ({
        packageHash: "cookbook-package",
        size: 3_712,
        t256: fakeT256,
      }),
      publish: async (_appId, request) => ({
        t256: request.t256,
        driveKey: "cookbook-drive",
        version: "1.0.0",
      }),
      install: async () => ({
        appId: "installed-app",
        version: "1.0.0",
        trusted: true,
      }),
      preview: async () => ({ launched: true }),
      stopPreview: async () => undefined,
    },
  });
  grantCookbookEgress(host, name);
  return { host, store, announceService };
}

/** Host-authored destinations the primary workflows actually send or probe. */
export function grantCookbookEgress(host, name) {
  const ttlMs = 60 * 60 * 1000;
  const offers = {
    "dead-drop": [{ capability: "lxmf:send", targetId: "peer-one" }],
    "roll-call": [{ capability: "lxmf:send", targetId: "peer-one" }],
    "signal-check": [{ capability: "lxmf:send", targetId: "peer-one" }],
    "nine-line": [{ capability: "lxmf:send", targetId: "rescue-control" }],
    "net-ledger": [{ capability: "lxmf:send", targetId: "N0CALL" }],
    "line-check": [{ capability: "link:probe", targetId: "peer-ana" }],
  };
  for (const offer of offers[name] ?? []) {
    host.grantEgressOffer({
      appId: name,
      capability: offer.capability,
      targetKind: "peer",
      targetId: offer.targetId,
      ttlMs,
    });
  }
}
