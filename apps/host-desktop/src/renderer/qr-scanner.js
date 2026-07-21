const T256_PATTERN = /^[A-Za-z0-9_-]{94}$/;

export function normalizeScannedT256(value) {
  const normalized = String(value ?? "").trim();
  if (!T256_PATTERN.test(normalized)) {
    throw new Error("QR code is not a 94-character 256t identifier");
  }
  return normalized;
}

export async function supportsQrDetection(BarcodeDetectorClass = globalThis.BarcodeDetector) {
  if (typeof BarcodeDetectorClass !== "function") return false;
  if (typeof BarcodeDetectorClass.getSupportedFormats !== "function") return true;
  return (await BarcodeDetectorClass.getSupportedFormats()).includes("qr_code");
}
