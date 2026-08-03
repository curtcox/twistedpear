// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  GrantStore,
  MemoryKvStoreBackend,
  MiniappHost,
  NodeWorkerSandboxBackend
} from "../src/index.js";

describe("apps:preview on mobile host platforms", () => {
  for (const platform of ["android", "ios"] as const) {
    it(`launches and stops a preview slot on ${platform}`, async () => {
      const store = new MemoryKvStoreBackend();
      let previewActive = false;
      const host = new MiniappHost({
        backend: new NodeWorkerSandboxBackend(),
        grantStore: new GrantStore(store),
        kvBackend: store,
        confirmationChannel: { confirm: async () => ({ approved: true }) },
        hostInfoBackend: {
          info: async () => ({
            platform,
            hostVersion: "test",
            hostApiVersion: "0.10.0",
            roles: { transport: false, seeder: false, propagation: false },
            interfaceTypes: [],
            quotas: {
              kvQuotaBytes: null,
              seedStorageUsedBytes: null,
              seedStorageQuotaBytes: null,
              memoryBytes: null
            }
          })
        },
        appsBackend: {
          package: async () => {
            throw new Error("unused");
          },
          publish: async () => {
            throw new Error("unused");
          },
          install: async () => {
            throw new Error("unused");
          },
          preview: async () => {
            previewActive = true;
            return { launched: true };
          },
          stopPreview: async () => {
            previewActive = false;
          }
        }
      });

      const manifest = {
        name: "devstudio",
        version: "1",
        entry: "bundle.js",
        publisherPublicKey: "publisher",
        capabilities: ["apps:preview"]
      };
      await host.setGrants("devstudio", "publisher", ["apps:preview", "presence"], ["apps:preview", "presence"]);

      const preview = await host.dispatchRaw(
        {
          id: "preview",
          namespace: "apps",
          method: "preview",
          payload: {
            projectPrefix: "hello",
            manifest: {
              name: "hello",
              version: "1.0.0",
              entry: "bundle.js",
              capabilities: ["storage:kv"]
            },
            grants: ["storage:kv"]
          }
        },
        { ...manifest, capabilities: ["apps:preview", "presence"] },
        ["apps:preview"]
      );
      expect(preview.ok).toBe(true);
      expect(previewActive).toBe(true);

      const stopped = await host.dispatchRaw(
        { id: "stop", namespace: "apps", method: "stopPreview", payload: {} },
        { ...manifest, capabilities: ["apps:preview", "presence"] },
        ["apps:preview"]
      );
      expect(stopped.ok).toBe(true);
      expect(previewActive).toBe(false);

      const info = await host.dispatchRaw(
        { id: "info", namespace: "host", method: "info", payload: {} },
        { ...manifest, capabilities: ["apps:preview", "presence"] },
        ["presence"]
      );
      expect(info.ok).toBe(true);
      expect((info.result as { platform: string }).platform).toBe(platform);
    });
  }
});
