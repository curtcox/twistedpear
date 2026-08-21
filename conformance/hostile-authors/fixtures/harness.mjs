/**
 * Shared MiniappHost + catalog helpers for hostile-author fixtures.
 */
import { capabilityUpdateDelta } from "../../../packages/app-registry/dist/update-delta.js";
import {
  GrantStore,
  MemoryKvStoreBackend,
  MiniappHost,
  describeCapability,
} from "../../../packages/miniapp-runtime/dist/index.js";

export const unusedBackend = {
  name: "unused",
  async spawn() {
    throw new Error("not used");
  },
};

export function autoApprove() {
  return { confirm: async () => ({ approved: true }) };
}

export function makeHost(options = {}) {
  const store = new MemoryKvStoreBackend();
  return new MiniappHost({
    backend: unusedBackend,
    grantStore: new GrantStore(store),
    kvBackend: store,
    now: () => 1_000,
    confirmationChannel: autoApprove(),
    ...options,
  });
}

let requestId = 0;

export async function dispatch(
  host,
  namespace,
  method,
  capability,
  payload,
  app,
) {
  requestId += 1;
  return host.dispatchRaw(
    {
      id: `ha-${requestId}`,
      namespace,
      method,
      ...(capability === undefined ? {} : { capability }),
      ...(payload === undefined ? {} : { payload }),
    },
    {
      name: app.name,
      version: app.version ?? "1.0.0",
      entry: "bundle.js",
      capabilities: app.capabilities,
      publisherPublicKey: app.publisherPublicKey,
    },
    app.granted ?? app.capabilities,
  );
}

export function denyCode(response, code) {
  if (response.ok) return null;
  return response.error?.code === code ? code : (response.error?.code ?? null);
}

export { capabilityUpdateDelta, describeCapability };
