import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  SERVICE_CLASS,
  applyNodeServiceManifest,
} = require("../../apps/harness-mobile/modules/node-service/app.plugin.js");

function mainActivityApplication() {
  return {
    $: {
      "android:name": ".MainApplication",
      "android:label": "@string/app_name",
    },
    activity: [
      {
        $: {
          "android:name": ".MainActivity",
          "android:exported": "true",
        },
        "intent-filter": [
          {
            action: [{ $: { "android:name": "android.intent.action.MAIN" } }],
            category: [
              {
                $: { "android:name": "android.intent.category.LAUNCHER" },
              },
            ],
          },
        ],
      },
    ],
  };
}

describe("node-service Android manifest plugin", () => {
  it("adds the foreground service to the existing application", () => {
    const manifest = {
      application: [mainActivityApplication()],
      "uses-permission": [],
    };

    applyNodeServiceManifest(manifest);

    expect(manifest.application).toHaveLength(1);
    expect(manifest.application[0].activity).toHaveLength(1);
    expect(
      manifest.application[0].service.some(
        (entry) => entry.$?.["android:name"] === SERVICE_CLASS,
      ),
    ).toBe(true);
    expect(
      manifest["uses-permission"].map((entry) => entry.$?.["android:name"]),
    ).toContain("android.permission.FOREGROUND_SERVICE");
  });

  it("collapses a second application instead of leaving two", () => {
    const manifest = {
      application: [
        mainActivityApplication(),
        {
          $: { "android:name": ".MainApplication" },
          service: [
            {
              $: {
                "android:name": SERVICE_CLASS,
                "android:exported": "false",
              },
            },
          ],
        },
      ],
      "uses-permission": [],
    };

    applyNodeServiceManifest(manifest);

    expect(manifest.application).toHaveLength(1);
    expect(manifest.application[0].activity?.[0].$?.["android:name"]).toBe(
      ".MainActivity",
    );
    expect(
      manifest.application[0].service.some(
        (entry) => entry.$?.["android:name"] === SERVICE_CLASS,
      ),
    ).toBe(true);
  });

  it("refuses to invent a second application when none exists", () => {
    expect(() => applyNodeServiceManifest({ "uses-permission": [] })).toThrow(
      /no <application>/,
    );
  });
});
