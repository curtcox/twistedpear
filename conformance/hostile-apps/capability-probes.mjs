/**
 * Phase 0 capability probes: cross-app announce, unconfirmed Freenet reads,
 * confirmation-absent device sessions, stale grants, and the zero-capability
 * observation floor (APPR-FLOOR-PROBE).
 */
import {
  GrantStore,
  MemoryKvStoreBackend,
  MiniappHost,
  createSimulatedDeviceManager,
} from "../../packages/miniapp-runtime/dist/index.js";

const unusedBackend = {
  name: "unused",
  async spawn() {
    throw new Error("not used");
  },
};

function deny(response, code, label) {
  if (response.ok) {
    throw new Error(`${label} was not denied`);
  }
  const codes = Array.isArray(code) ? code : [code];
  if (!codes.includes(response.error?.code)) {
    throw new Error(
      `${label}: expected ${codes.join("|")}, got ${response.error?.code}`,
    );
  }
}

function hostOf(options = {}) {
  const store = new MemoryKvStoreBackend();
  return new MiniappHost({
    backend: unusedBackend,
    grantStore: new GrantStore(store),
    kvBackend: store,
    ...options,
  });
}

async function probeCrossAppAnnounce() {
  const host = hostOf();
  const capabilities = ["announce:publish", "announce:subscribe"];
  const manifest = {
    name: "board",
    version: "1",
    entry: "bundle.js",
    publisherPublicKey: "publisher",
    capabilities,
  };
  await host.setGrants("board", "publisher", capabilities, capabilities);
  deny(
    await host.dispatchRaw(
      {
        id: "pub",
        namespace: "announce",
        method: "publish",
        payload: {
          appData: new TextEncoder().encode("hello"),
          namespace: "miniapp-announce:other",
        },
      },
      manifest,
      capabilities,
    ),
    "ANNOUNCE_CROSS_APP_SCOPE",
    "cross-app announce publish",
  );
  deny(
    await host.dispatchRaw(
      {
        id: "sub",
        namespace: "announce",
        method: "subscribe",
        payload: { namespace: "other" },
      },
      manifest,
      capabilities,
    ),
    "ANNOUNCE_CROSS_APP_SCOPE",
    "cross-app announce subscribe",
  );
}

async function probeFreenetRead() {
  const host = hostOf({
    freenetBackend: {
      async get(keyHex) {
        return { keyHex, stateHex: "aa" };
      },
      async put() {
        return { keyHex: "ab" };
      },
      async update() {},
    },
  });
  const capabilities = ["freenet:contract"];
  const manifest = {
    name: "reader",
    version: "1",
    entry: "bundle.js",
    publisherPublicKey: "publisher",
    capabilities,
  };
  await host.setGrants("reader", "publisher", capabilities, capabilities);
  deny(
    await host.dispatchRaw(
      {
        id: "get",
        namespace: "freenet",
        method: "get",
        payload: { keyHex: "ffff" },
      },
      manifest,
      capabilities,
    ),
    "FREENET_KEY_DENIED",
    "unconfirmed Freenet get",
  );
}

async function probeUnconfirmedDeviceSession() {
  const host = hostOf({
    deviceManager: createSimulatedDeviceManager({ now: () => 10_000 }),
  });
  const capabilities = ["device:camera:frames"];
  const manifest = {
    name: "spy",
    version: "1",
    entry: "bundle.js",
    publisherPublicKey: "publisher",
    capabilities,
  };
  await host.setGrants("spy", "publisher", capabilities, capabilities);
  deny(
    await host.dispatchRaw(
      {
        id: "open",
        namespace: "device",
        method: "open",
        payload: { class: "camera", tier: "frames", purpose: "record" },
      },
      manifest,
      capabilities,
    ),
    "DEVICE_DENIED",
    "confirmation-absent camera session",
  );
}

async function probeStaleGrant() {
  const host = hostOf();
  const capabilities = ["identity"];
  const manifest = {
    name: "board",
    version: "1",
    entry: "bundle.js",
    publisherPublicKey: "publisher",
    capabilities,
  };
  await host.setGrants("board", "publisher", capabilities, capabilities);
  const before = await host.dispatchRaw(
    {
      id: "before",
      namespace: "identity",
      method: "destinationHash",
      payload: {},
    },
    manifest,
    capabilities,
  );
  if (!before.ok) {
    throw new Error(`identity before revoke failed: ${before.error?.code}`);
  }
  await host.deleteGrants("board", "publisher");
  deny(
    await host.dispatchRaw(
      {
        id: "after",
        namespace: "identity",
        method: "destinationHash",
        payload: {},
      },
      manifest,
      capabilities,
    ),
    "CAPABILITY_DENIED",
    "stale launch-time grant",
  );
}

async function probeZeroCapabilityFloor() {
  const deviceManager = createSimulatedDeviceManager({
    now: () => 10_000,
    allowUnconfirmedDeviceSessions: true,
  });
  await deviceManager.open(
    "other-app",
    "other-publisher",
    ["device:camera"],
    ["device:camera"],
    { class: "camera", purpose: "record" },
  );
  const host = hostOf({ deviceManager });
  const manifest = {
    name: "empty",
    version: "1",
    entry: "bundle.js",
    publisherPublicKey: "publisher",
    capabilities: [],
  };
  const observations = [
    ["device", "inventory", {}],
    ["device", "diagnostics", {}],
    ["host", "info", {}],
    ["presence", "snapshot", {}],
    ["announce", "subscribe", { namespace: "miniapp-announce:other" }],
    ["relay", "list", {}],
    ["relay", "status", {}],
    ["freenet", "get", { keyHex: "ffff" }],
  ];
  for (const [namespace, method, payload] of observations) {
    deny(
      await host.dispatchRaw(
        { id: `${namespace}-${method}`, namespace, method, payload },
        manifest,
        [],
      ),
      ["CAPABILITY_DENIED", "UNDECLARED_CAPABILITY"],
      `zero-capability ${namespace}.${method}`,
    );
  }
}

export async function runCapabilityProbes() {
  await probeCrossAppAnnounce();
  await probeFreenetRead();
  await probeUnconfirmedDeviceSession();
  await probeStaleGrant();
  await probeZeroCapabilityFloor();
}
