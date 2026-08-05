import { describe, expect, it } from "vitest";
import qrcode from "qrcode-generator";
import { decodePeerQrRgba } from "../src/index.js";

function raster(
  value: string,
  inverted = false,
): { rgba: Uint8ClampedArray; width: number; height: number } {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const modules = qr.getModuleCount();
  const scale = 5;
  const quiet = 4;
  const width = (modules + quiet * 2) * scale;
  const rgba = new Uint8ClampedArray(width * width * 4);
  for (let y = 0; y < width; y += 1)
    for (let x = 0; x < width; x += 1) {
      const moduleX = Math.floor(x / scale) - quiet;
      const moduleY = Math.floor(y / scale) - quiet;
      const dark =
        moduleX >= 0 &&
        moduleY >= 0 &&
        moduleX < modules &&
        moduleY < modules &&
        qr.isDark(moduleY, moduleX);
      const valueByte = dark !== inverted ? 0 : 255;
      const offset = (y * width + x) * 4;
      rgba[offset] = valueByte;
      rgba[offset + 1] = valueByte;
      rgba[offset + 2] = valueByte;
      rgba[offset + 3] = 255;
    }
  return { rgba, width, height: width };
}

describe("portable QR fallback", () => {
  it("decodes normal and inverted static-bundle raster fixtures", () => {
    const value = "TPI1:FULL-SERVERLESS-PEER-INVITATION";
    for (const inverted of [false, true]) {
      const image = raster(value, inverted);
      expect(decodePeerQrRgba(image.rgba, image.width, image.height)).toBe(
        value,
      );
    }
  });
  it("rejects malformed and oversized image buffers before decoding", () => {
    expect(() => decodePeerQrRgba(new Uint8ClampedArray(4), 100, 100)).toThrow(
      /buffer/,
    );
    expect(() =>
      decodePeerQrRgba(new Uint8ClampedArray(), 5_000, 5_000),
    ).toThrow(/pixel budget/);
  });
});
