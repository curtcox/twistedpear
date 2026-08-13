import jsQrModule from "jsqr";

export const MAX_PORTABLE_QR_DIMENSION = 4_096;
export class PortableQrDecodeError extends Error {
  constructor(
    readonly code: "MALFORMED" | "OVERSIZED",
    message: string,
  ) {
    super(message);
    this.name = "PortableQrDecodeError";
  }
}
type Decoder = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: { inversionAttempts: "attemptBoth" },
) => { readonly data: string } | null;
const jsQR = ((jsQrModule as unknown as { readonly default?: Decoder })
  .default ?? jsQrModule) as unknown as Decoder;

function validQrDimensions(width: number, height: number): boolean {
  return (
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width >= 21 &&
    height >= 21
  );
}

function withinQrPixelBudget(width: number, height: number): boolean {
  return (
    width <= MAX_PORTABLE_QR_DIMENSION &&
    height <= MAX_PORTABLE_QR_DIMENSION &&
    width * height <= MAX_PORTABLE_QR_DIMENSION * MAX_PORTABLE_QR_DIMENSION
  );
}

/** Static-bundle QR fallback for camera/video ImageData when BarcodeDetector is absent. */
export function decodePeerQrRgba(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): string | null {
  if (!validQrDimensions(width, height))
    throw new PortableQrDecodeError(
      "MALFORMED",
      "QR image dimensions are invalid",
    );
  if (!withinQrPixelBudget(width, height))
    throw new PortableQrDecodeError(
      "OVERSIZED",
      "QR image exceeds pixel budget",
    );
  if (rgba.length !== width * height * 4)
    throw new PortableQrDecodeError(
      "MALFORMED",
      "QR RGBA buffer length is invalid",
    );
  const decoded = jsQR(rgba, width, height, {
    inversionAttempts: "attemptBoth",
  });
  return decoded?.data ?? null;
}
