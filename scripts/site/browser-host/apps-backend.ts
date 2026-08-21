import { GrantStore } from "../../../packages/miniapp-runtime/src/capabilities";
import { MiniappHost } from "../../../packages/miniapp-runtime/src/host";
import { WebSandboxBackend } from "../../../packages/miniapp-runtime/src/sandbox/web";
import { grantTtlMsForCapabilities } from "../../../packages/miniapp-runtime/src/grant-ttl.ts";
import type { WidgetTree } from "@twistedpear/miniapp-runtime/ui";
import {
  createAppsBackendCompileAction,
  createAppsBackendDiagnosticsAction,
  createAppsBackendFormatAction,
  createAppsBackendPreviewAction,
} from "../../../packages/worklet-core/src/miniapp-host-apps-compile.mjs";
import { MemoryStore } from "./store.ts";
import { createNamedStubAppsBackend } from "./demo-adapters.ts";

export type GuidaWorklet = {
  compileGuidaWorkspace: (files: unknown) => Promise<{
    bundle: string;
    minifiedBytes: number;
    compilerVersion: string;
  }>;
  diagnoseGuidaWorkspace: (files: unknown, path?: string) => Promise<unknown>;
  formatGuidaSource: (content: string) => Promise<string>;
};

export type PreviewSlot = {
  host: MiniappHost;
  grantStore: GrantStore;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function createWorkspaceFileCollector(host: MiniappHost) {
  return async function collectWorkspaceFiles(appId: string, projectPrefix: string) {
    const infos = await host.workspace.list(appId, `${projectPrefix}/`);
    const files = [];
    for (const info of infos) {
      const content = await host.workspace.read(appId, info.path);
      files.push({
        path: info.path.slice(projectPrefix.length + 1),
        content: encoder.encode(content),
      });
    }
    return files.sort((left, right) => left.path.localeCompare(right.path));
  };
}

export function createEditorAppsBackend(options: {
  readonly getHost: () => MiniappHost;
  readonly loadWorklet: () => Promise<GuidaWorklet | null>;
  readonly previewRef: { current: PreviewSlot | null };
  readonly onPreviewTree: (tree: WidgetTree | null) => void;
}) {
  const collectWorkspaceFiles = (appId: string, projectPrefix: string) =>
    createWorkspaceFileCollector(options.getHost())(appId, projectPrefix);
  const writeWorkspaceFile = (appId: string, path: string, content: string | Uint8Array) =>
    options.getHost().workspace.write(
      appId,
      path,
      typeof content === "string" ? content : decoder.decode(content),
    );

  async function stopPreviewHost() {
    if (options.previewRef.current === null) return;
    const stopped = options.previewRef.current;
    options.previewRef.current = null;
    await stopped.host.stop("preview-stopped");
    options.onPreviewTree(null);
  }

  function createPreviewHost(): PreviewSlot {
    const memoryStore = new MemoryStore();
    const grantStore = new GrantStore(memoryStore);
    const host = new MiniappHost({
      backend: new WebSandboxBackend(),
      grantStore,
      kvBackend: memoryStore,
      callbacks: {
        onWidgetTree: (tree) => options.onPreviewTree(tree),
        onLifecycle: () => {
          options.onPreviewTree(
            options.previewRef.current?.host.snapshot().widgetTree ?? null,
          );
        },
      },
    });
    return { host, grantStore };
  }

  const stubs = createNamedStubAppsBackend();
  return {
    compile: createAppsBackendCompileAction({
      collectWorkspaceFiles,
      writeWorkspaceFile,
      loadWorklet: options.loadWorklet,
    }),
    format: createAppsBackendFormatAction({ loadWorklet: options.loadWorklet }),
    diagnostics: createAppsBackendDiagnosticsAction({
      collectWorkspaceFiles,
      loadWorklet: options.loadWorklet,
    }),
    preview: createAppsBackendPreviewAction({
      collectWorkspaceFiles,
      stopPreviewHost,
      createPreviewHost,
      previewRef: options.previewRef,
      pushPreviewRuntime: () => {
        options.onPreviewTree(
          options.previewRef.current?.host.snapshot().widgetTree ?? null,
        );
      },
      now: () => Date.now(),
      grantTtlMs: grantTtlMsForCapabilities,
    }),
    stopPreview: stopPreviewHost,
    package: stubs.package,
    publish: stubs.publish,
    install: stubs.install,
  };
}

export function createPreviewEventHandler(
  previewRef: { current: PreviewSlot | null },
) {
  return (nodeId: string, event: string, value?: unknown) => {
    void previewRef.current?.host.handleUiEvent(nodeId, event, value);
  };
}
