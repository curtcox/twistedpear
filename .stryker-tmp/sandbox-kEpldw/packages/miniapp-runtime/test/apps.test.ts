// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  AppsService,
  AppsServiceError,
  ConfirmationError,
  type AppsBackend,
  type ConfirmationRequest
} from "../src/index.js";

const context = { appId: "devstudio", publisherPublicKey: "publisher" };
const manifest = {
  name: "hello",
  version: "1.0.0",
  entry: "bundle.js",
  capabilities: ["storage:kv"]
};

function stubBackend(calls: string[]): AppsBackend {
  return {
    package: async () => {
      calls.push("package");
      return { packageHash: "ab".repeat(32), size: 100, t256: "A".repeat(94) };
    },
    publish: async () => {
      calls.push("publish");
      return { t256: "A".repeat(94), driveKey: "cd".repeat(32), version: "1.0.0" };
    },
    install: async () => {
      calls.push("install");
      return { appId: "hello", version: "1.0.0", trusted: true };
    },
    preview: async () => {
      calls.push("preview");
      return { launched: true };
    },
    stopPreview: async () => {
      calls.push("stopPreview");
    }
  };
}

describe("apps service", () => {
  it("denies every dangerous method without a confirmation channel", async () => {
    const calls: string[] = [];
    const service = new AppsService(stubBackend(calls), undefined);

    await expect(service.package(context, { projectPrefix: "hello", manifest })).rejects.toBeInstanceOf(
      ConfirmationError
    );
    await expect(service.publish(context, { t256: "A".repeat(94) })).rejects.toBeInstanceOf(ConfirmationError);
    await expect(service.install(context, { t256: "A".repeat(94) })).rejects.toBeInstanceOf(ConfirmationError);
    await expect(
      service.preview(context, { projectPrefix: "hello", manifest, grants: ["storage:kv"] })
    ).rejects.toBeInstanceOf(ConfirmationError);
    expect(calls).toEqual([]);

    // stopPreview is not dangerous and needs no confirmation
    await service.stopPreview(context);
    expect(calls).toEqual(["stopPreview"]);
  });

  it("asks once per dangerous call and passes identity from context", async () => {
    const calls: string[] = [];
    const confirmations: ConfirmationRequest[] = [];
    const service = new AppsService(stubBackend(calls), {
      confirm: async (request) => {
        confirmations.push(request);
        return { approved: true };
      }
    });

    await service.package(context, { projectPrefix: "hello", manifest });
    await service.publish(context, { t256: "A".repeat(94) });
    await service.install(context, { t256: "A".repeat(94) });
    await service.preview(context, { projectPrefix: "hello", manifest, grants: [] });

    expect(calls).toEqual(["package", "publish", "install", "preview"]);
    expect(confirmations.map((entry) => entry.kind)).toEqual(["package", "publish", "install", "preview"]);
    for (const confirmation of confirmations) {
      expect(confirmation.appId).toBe("devstudio");
      expect(confirmation.publisherPublicKey).toBe("publisher");
      expect(confirmation.token).toMatch(/^[0-9a-f]{32}$/);
    }
  });

  it("stops at a denial without reaching the backend", async () => {
    const calls: string[] = [];
    const service = new AppsService(stubBackend(calls), { confirm: async () => ({ approved: false }) });
    await expect(service.publish(context, { t256: "A".repeat(94) })).rejects.toMatchObject({
      code: "CONFIRMATION_DENIED"
    });
    expect(calls).toEqual([]);
  });

  it("validates manifests, 256t ids, and paths before asking the user", async () => {
    const calls: string[] = [];
    let asked = 0;
    const service = new AppsService(stubBackend(calls), {
      confirm: async () => {
        asked += 1;
        return { approved: true };
      }
    });

    await expect(
      service.package(context, { projectPrefix: "hello", manifest: { ...manifest, name: "Bad Name!" } })
    ).rejects.toBeInstanceOf(AppsServiceError);
    await expect(
      service.package(context, { projectPrefix: "../escape", manifest })
    ).rejects.toThrow();
    await expect(
      service.package(context, { projectPrefix: "hello", manifest: { ...manifest, capabilities: ["root"] } })
    ).rejects.toThrow(/capability/i);
    await expect(service.publish(context, { t256: "not-a-256t" })).rejects.toMatchObject({
      code: "APPS_BAD_REQUEST"
    });
    await expect(service.install(context, { t256: `${"A".repeat(93)}!` })).rejects.toMatchObject({
      code: "APPS_BAD_REQUEST"
    });
    expect(asked).toBe(0);
    expect(calls).toEqual([]);
  });

  it("rejects preview grants that escalate beyond the declared capabilities", async () => {
    const calls: string[] = [];
    const service = new AppsService(stubBackend(calls), { confirm: async () => ({ approved: true }) });
    await expect(
      service.preview(context, { projectPrefix: "hello", manifest, grants: ["lxmf:send"] })
    ).rejects.toMatchObject({ code: "APPS_BAD_REQUEST" });
    expect(calls).toEqual([]);
  });
});
