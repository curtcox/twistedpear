export function createEnsureDevChannel(deps) {
  let devChannel = null;
  return function ensureDevChannel() {
    if (devChannel === null) {
      devChannel = deps.createDevChannelClient({
        isDeveloperMode: () => deps.ensureMiniappHost().isDeveloperMode(),
        onConnected: (address) => {
          deps.send({ type: "dev-channel", state: "connected", detail: address });
          deps.log(`Dev channel connected to ${address}`);
        },
        onDisconnected: () => {
          deps.send({ type: "dev-channel", state: "disconnected" });
          deps.log("Dev channel disconnected");
        },
        onBundleLoaded: (name) => {
          deps.send({ type: "dev-channel", state: "loaded", detail: name });
          deps.log(`Dev side-loaded ${name}`);
        },
        onError: (message) => {
          deps.send({ type: "dev-channel", state: "error", detail: message });
          deps.log(`Dev channel error: ${message}`);
        },
        onBundle: async (manifest, bundleBytes) => {
          await deps.ensureMiniappHost().devSideLoad(manifest, bundleBytes);
        }
      });
    }
    return devChannel;
  };
}
