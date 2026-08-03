import {
  PeerDiscoveryRegistry,
  PeerSessionManager,
} from "../../packages/peer-discovery/dist/index.js";

export function makePeerSessionManager() {
  return new PeerSessionManager(new PeerDiscoveryRegistry(), {
    async request() {
      throw new Error("Handbook conformance does not pair real peers");
    },
    async listen() {
      throw new Error("Handbook conformance does not pair real peers");
    },
  });
}

export function makeRelayService() {
  let mode = "off";
  return {
    async setMode(nextMode) {
      mode = nextMode;
    },
    async enable() {},
    async disable() {},
    async setDirection() {},
    async configure() {},
    async setPolicy() {},
    list: () => [],
    status: () => ({ mode, interfaces: [], onlineCount: 0 }),
    diagnostics: async () => [],
  };
}
