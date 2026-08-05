import { describe, expect, it } from "vitest";
import { createCommonHostInfoBackend } from "../../packages/worklet-core/src/miniapp-host-shared.mjs";

describe("createCommonHostInfoBackend", () => {
  it("forwards dropCensus from the host info snapshot", async () => {
    const dropCensus = {
      byReason: { "announce-rate-limit:rate_limited": 3 },
      byPeer: { abcd: { "announce-rate-limit:rate_limited": 3 } }
    };
    const backend = createCommonHostInfoBackend(
      {
        getHostInfoSnapshot: () => ({
          platform: "web",
          hostVersion: "1.0.0",
          roles: { transport: false, seeder: false, propagation: false },
          interfaceTypes: ["websocket"],
          quotas: {
            kvQuotaBytes: null,
            seedStorageUsedBytes: null,
            seedStorageQuotaBytes: null,
            memoryBytes: null
          },
          dropCensus
        })
      },
      "web"
    );

    await expect(backend.info()).resolves.toMatchObject({ dropCensus });
  });

  it("omits dropCensus when the snapshot has none", async () => {
    const backend = createCommonHostInfoBackend(
      {
        getHostInfoSnapshot: () => ({
          platform: "desktop",
          hostVersion: "1.0.0"
        })
      },
      "desktop"
    );

    const info = await backend.info();
    expect(info.dropCensus).toBeUndefined();
  });
});
