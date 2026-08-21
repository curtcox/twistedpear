import { GrantStore } from "../../../packages/miniapp-runtime/src/capabilities";
import { HOST_API_VERSION } from "../../../packages/miniapp-runtime/src/host-api";
import { MiniappHost } from "../../../packages/miniapp-runtime/src/host";
import { WebSandboxBackend } from "../../../packages/miniapp-runtime/src/sandbox/web";
import { KvStorageBeeBackend } from "../../../packages/miniapp-runtime/src/services/storage-bee-kv";
import type { HostConfirmationChannel } from "../../../packages/miniapp-runtime/src/confirm.ts";
import type { MiniappKvStoreBackend } from "../../../packages/miniapp-runtime/src/services/storage-kv.ts";
import type { WidgetTree } from "@twistedpear/miniapp-runtime/ui";
import { createPagesPeerSessionManager } from "../react-native-web-samples/peer-session.ts";
import type { PagesPeerChrome } from "../react-native-web-samples/peer-chrome.ts";
import {
  createDemoAiBackend,
  createDemoCasBackend,
  createDemoHostInfoBackend,
  createDemoPresenceBackend,
  createDemoResourceBackend,
  createStubAppsBackend,
  createUnavailableAiBackend,
} from "./demo-adapters.ts";

export type CreateDemoHostOptions = {
  readonly store: MiniappKvStoreBackend;
  readonly peerChrome: PagesPeerChrome;
  readonly onTree: (tree: WidgetTree | null) => void;
  readonly confirmationChannel: HostConfirmationChannel;
  readonly appsBackend?: ConstructorParameters<typeof MiniappHost>[0]["appsBackend"];
  readonly includeDemoAi?: boolean;
};

export function createDemoHost(options: CreateDemoHostOptions): MiniappHost {
  const bee = new KvStorageBeeBackend(options.store);
  const stubs = createStubAppsBackend();
  return new MiniappHost({
    backend: new WebSandboxBackend(),
    grantStore: new GrantStore(options.store),
    kvBackend: options.store,
    beeBackend: bee,
    presenceBackend: createDemoPresenceBackend(),
    hostInfoBackend: createDemoHostInfoBackend(HOST_API_VERSION),
    aiBackend:
      options.includeDemoAi === false
        ? createUnavailableAiBackend()
        : createDemoAiBackend(),
    resourceBackend: createDemoResourceBackend(),
    casBackend: createDemoCasBackend(),
    confirmationChannel: options.confirmationChannel,
    peerSessionManager: createPagesPeerSessionManager(options.peerChrome),
    appsBackend: { ...stubs, ...options.appsBackend },
    callbacks: {
      onWidgetTree: (tree) => options.onTree(tree),
      onLifecycle: () => undefined,
    },
  });
}
