import { describe, expect, it } from "vitest";
import {
  AppsService,
  AppsServiceError,
  ConfirmationError,
  type AppsBackend,
  type ConfirmationRequest,
} from "../src/index.js";

function contextFor(appId: string) {
  return { appId, publisherPublicKey: "publisher" };
}
const manifest = {
  name: "hello",
  version: "1.0.0",
  entry: "bundle.js",
  capabilities: ["storage:kv"],
};

function stubBackend(calls: string[]): AppsBackend {
  return {
    compile: async () => {
      calls.push("compile");
      return { compiled: true, bytes: 12, compiler: "1.0.0-beta.2" };
    },
    format: async () => {
      calls.push("format");
      return { formatted: "module Main exposing (main)\n" };
    },
    diagnostics: async () => {
      calls.push("diagnostics");
      return { problems: [] };
    },
    package: async () => {
      calls.push("package");
      return { packageHash: "ab".repeat(32), size: 100, t256: "A".repeat(94) };
    },
    publish: async () => {
      calls.push("publish");
      return {
        t256: "A".repeat(94),
        driveKey: "cd".repeat(32),
        version: "1.0.0",
      };
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
    },
  };
}

describe("apps service confirmation", () => {
  it("denies every dangerous method without a confirmation channel", async () => {
    const calls: string[] = [];
    const service = new AppsService(stubBackend(calls), undefined);
    const context = contextFor("devstudio-no-channel");

    await expect(
      service.package(context, { projectPrefix: "hello", manifest }),
    ).rejects.toBeInstanceOf(ConfirmationError);
    await expect(
      service.compile(context, { projectPrefix: "hello" }),
    ).rejects.toBeInstanceOf(ConfirmationError);
    await expect(
      service.publish(context, { t256: "A".repeat(94) }),
    ).rejects.toBeInstanceOf(ConfirmationError);
    await expect(
      service.install(context, { t256: "A".repeat(94) }),
    ).rejects.toBeInstanceOf(ConfirmationError);
    await expect(
      service.preview(context, {
        projectPrefix: "hello",
        manifest,
        grants: ["storage:kv"],
      }),
    ).rejects.toBeInstanceOf(ConfirmationError);
    expect(calls).toEqual([]);

    await service.format(context, { content: "module Main exposing (main)" });
    await service.diagnostics(context, {
      projectPrefix: "hello",
      path: "src/Main.elm",
    });
    await service.stopPreview(context);
    expect(calls).toEqual(["format", "diagnostics", "stopPreview"]);
  });

  it("asks once per dangerous call and passes identity from context", async () => {
    const calls: string[] = [];
    const confirmations: ConfirmationRequest[] = [];
    const service = new AppsService(stubBackend(calls), {
      confirm: async (request) => {
        confirmations.push(request);
        return { approved: true };
      },
    });

    await service.package(contextFor("devstudio-package"), {
      projectPrefix: "hello",
      manifest,
    });
    await service.compile(contextFor("devstudio-compile"), {
      projectPrefix: "hello",
    });
    await service.format(contextFor("devstudio-format"), {
      content: "module Main exposing (main)",
    });
    await service.diagnostics(contextFor("devstudio-diagnostics"), {
      projectPrefix: "hello",
      path: "hello/src/Main.elm",
    });
    await service.publish(contextFor("devstudio-publish"), {
      t256: "A".repeat(94),
    });
    await service.install(contextFor("devstudio-install"), {
      t256: "A".repeat(94),
    });
    await service.preview(contextFor("devstudio-preview"), {
      projectPrefix: "hello",
      manifest,
      grants: [],
    });

    expect(calls).toEqual([
      "package",
      "compile",
      "format",
      "diagnostics",
      "publish",
      "install",
      "preview",
    ]);
    expect(confirmations.map((entry) => entry.kind)).toEqual([
      "package",
      "package",
      "publish",
      "install",
      "preview",
    ]);
    expect(confirmations.map((entry) => entry.appId)).toEqual([
      "devstudio-package",
      "devstudio-compile",
      "devstudio-publish",
      "devstudio-install",
      "devstudio-preview",
    ]);
    for (const confirmation of confirmations) {
      expect(confirmation.publisherPublicKey).toBe("publisher");
      expect(confirmation.token).toMatch(/^[0-9a-f]{32}$/);
    }
  });

  it("stops at a denial without reaching the backend", async () => {
    const calls: string[] = [];
    const service = new AppsService(stubBackend(calls), {
      confirm: async () => ({ approved: false }),
    });
    await expect(
      service.publish(contextFor("devstudio-denied"), { t256: "A".repeat(94) }),
    ).rejects.toMatchObject({
      code: "CONFIRMATION_DENIED",
    });
    expect(calls).toEqual([]);
  });
});

describe("apps service validation", () => {
  it("validates manifests, 256t ids, and paths before asking the user", async () => {
    const calls: string[] = [];
    let asked = 0;
    const service = new AppsService(stubBackend(calls), {
      confirm: async () => {
        asked += 1;
        return { approved: true };
      },
    });

    const context = contextFor("devstudio-validate");
    await expect(
      service.package(context, {
        projectPrefix: "hello",
        manifest: { ...manifest, name: "Bad Name!" },
      }),
    ).rejects.toBeInstanceOf(AppsServiceError);
    await expect(
      service.package(context, { projectPrefix: "../escape", manifest }),
    ).rejects.toThrow();
    await expect(
      service.package(context, {
        projectPrefix: "hello",
        manifest: { ...manifest, capabilities: ["root"] },
      }),
    ).rejects.toThrow(/capability/i);
    await expect(
      service.publish(context, { t256: "not-a-256t" }),
    ).rejects.toMatchObject({
      code: "APPS_BAD_REQUEST",
    });
    await expect(
      service.install(context, { t256: `${"A".repeat(93)}!` }),
    ).rejects.toMatchObject({
      code: "APPS_BAD_REQUEST",
    });
    expect(asked).toBe(0);
    expect(calls).toEqual([]);
  });

  it("rejects preview grants that escalate beyond the declared capabilities", async () => {
    const calls: string[] = [];
    const service = new AppsService(stubBackend(calls), {
      confirm: async () => ({ approved: true }),
    });
    await expect(
      service.preview(contextFor("devstudio-escalate"), {
        projectPrefix: "hello",
        manifest,
        grants: ["lxmf:send"],
      }),
    ).rejects.toMatchObject({ code: "APPS_BAD_REQUEST" });
    expect(calls).toEqual([]);
  });

  it("reports APPS_UNCONFIGURED when compile is not injected", async () => {
    const service = new AppsService(
      {
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
          throw new Error("unused");
        },
        stopPreview: async () => undefined,
      },
      { confirm: async () => ({ approved: true }) },
    );
    await expect(
      service.compile(contextFor("devstudio-unconfigured"), {
        projectPrefix: "hello",
      }),
    ).rejects.toMatchObject({ code: "APPS_UNCONFIGURED" });
    await expect(
      service.format(contextFor("devstudio-unconfigured"), { content: "x" }),
    ).rejects.toMatchObject({ code: "APPS_UNCONFIGURED" });
    await expect(
      service.diagnostics(contextFor("devstudio-unconfigured"), {
        projectPrefix: "hello",
      }),
    ).rejects.toMatchObject({ code: "APPS_UNCONFIGURED" });
  });

  it("strips the project prefix from diagnostic paths and rejects non-string format", async () => {
    let seen: { projectPrefix: string; path?: string } | undefined;
    const service = new AppsService(
      {
        ...stubBackend([]),
        diagnostics: async (_appId, request) => {
          seen = request;
          return { problems: [] };
        },
      },
      undefined,
    );
    await service.diagnostics(contextFor("devstudio-path"), {
      projectPrefix: "hello",
      path: "hello/src/Main.elm",
    });
    expect(seen).toEqual({ projectPrefix: "hello", path: "src/Main.elm" });
    await expect(
      service.format(contextFor("devstudio-path"), { content: 1 }),
    ).rejects.toMatchObject({ code: "APPS_BAD_REQUEST" });
  });
});
