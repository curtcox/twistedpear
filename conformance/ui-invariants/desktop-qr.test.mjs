import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeScannedT256, supportsQrDetection } from "../../apps/host-desktop/src/renderer/qr-scanner.js";

describe("desktop QR scanner", () => {
  it("accepts only a 94-character base64url 256t value", () => {
    const value = `A${"b".repeat(92)}_`;
    expect(normalizeScannedT256(` ${value}\n`)).toBe(value);
    expect(() => normalizeScannedT256("https://example.test/not-an-id")).toThrow("94-character");
    expect(() => normalizeScannedT256(`${"a".repeat(93)}!`)).toThrow("94-character");
  });

  it("feature-detects Chromium QR support", async () => {
    class Supported { static async getSupportedFormats() { return ["qr_code"]; } }
    class Unsupported { static async getSupportedFormats() { return ["code_128"]; } }
    await expect(supportsQrDetection(Supported)).resolves.toBe(true);
    await expect(supportsQrDetection(Unsupported)).resolves.toBe(false);
    await expect(supportsQrDetection(undefined)).resolves.toBe(false);
  });

  it("keeps camera/microphone permission and capture controls in host chrome", () => {
    const html = readFileSync("apps/host-desktop/src/renderer/index.html", "utf8");
    const main = readFileSync("apps/host-desktop/src/main/index.ts", "utf8");
    expect(html).toContain('id="install-256t-scan"');
    expect(html).toContain('id="trust-scan"');
    expect(main).toContain('permission === "media"');
    expect(main).toContain('details.mediaType === "video"');
    expect(main).toContain('details.mediaTypes?.every((mediaType) => mediaType === "video" || mediaType === "audio") === true');
    expect(main).toContain('requestingOrigin.startsWith("file://")');
  });
});
