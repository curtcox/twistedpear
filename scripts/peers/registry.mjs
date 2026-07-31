/**
 * Peer id → adapter registry for the multi-peer environment.
 *
 * Every adapter exposes the same shape so `scripts/peers.mjs` and
 * `conformance/local-multipeer` never special-case a platform:
 *   { id, kind, describe(), up(ctx), down(entry, ctx), running(entry) }
 */
import { makeNodeAdapter } from "./adapters/node.mjs";

const EXTRA_NODE_PATTERN = /^node([2-9])$/;

/** Adapters for GUI peers are loaded on demand so a headless run needs no Xcode/Electron. */
const LAZY_ADAPTERS = {
  desktop: async () => (await import("./adapters/desktop.mjs")).desktopAdapter,
  ios: async () => (await import("./adapters/mobile.mjs")).iosAdapter,
  android: async () => (await import("./adapters/mobile.mjs")).androidAdapter,
  web: async () => (await import("./adapters/web.mjs")).webAdapter
};

export async function adapterFor(id) {
  if (id === "hub") {
    return makeNodeAdapter({ id: "hub", isHub: true, statusPort: 9473 });
  }
  const extra = EXTRA_NODE_PATTERN.exec(id);
  if (extra !== null) {
    return makeNodeAdapter({ id, isHub: false, statusPort: 9473 + Number(extra[1]) });
  }
  const lazy = LAZY_ADAPTERS[id];
  return lazy === undefined ? null : lazy();
}

export const KNOWN_PEER_IDS = [
  "hub",
  ...Array.from({ length: 8 }, (_, index) => `node${index + 2}`),
  "desktop",
  "ios",
  "android",
  "web"
];

/** Peers that need a GUI runtime, and so may legitimately be unavailable. */
export const GUI_PEER_IDS = ["desktop", "ios", "android", "web"];
