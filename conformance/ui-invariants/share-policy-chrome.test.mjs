import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readModuleSource } from "./worklet-source.mjs";

/**
 * G8: every write to "who may receive my camera or microphone" happens in host
 * chrome. `npm run test:share-policy` drives the desktop renderer for real;
 * these invariants hold the mobile and web surfaces to the same contract.
 * Device-run Maestro coverage lives in `.maestro/share-policy.yaml` (skippable
 * via `test:ios-sim:share-policy` / `test:android-emulator:share-policy`).
 */
const surfaces = [
  { name: "desktop renderer", path: "apps/host-desktop/src/renderer/app.js" },
  { name: "mobile harness", path: "apps/harness-mobile/App.tsx" },
  { name: "web harness", path: "apps/harness-mobile/App.web.tsx" }
];

describe("share policy chrome", () => {
  for (const surface of surfaces) {
    it(`${surface.name} names the peer and class and keeps stop one interaction away`, () => {
      const source = readModuleSource(surface.path);
      expect(source).toContain("Stop sharing");
      expect(source).toContain("device-revoke-share");
      expect(source).toContain("shareOffers");
      expect(source).toContain("displayLabel");
    });

    it(`${surface.name} sends revoke to the host rather than the app`, () => {
      const source = readModuleSource(surface.path);
      const sender = surface.path.endsWith(".js")
        ? "host.send"
        : surface.path.endsWith(".web.tsx")
          ? "sendToWorker"
          : "sendToWorklet";
      expect(source).toContain(`${sender}({ type: "device-revoke-share"`);
    });
  }
});
