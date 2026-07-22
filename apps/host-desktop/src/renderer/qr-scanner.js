const T256_PATTERN = /^[A-Za-z0-9_-]{94}$/;

export function normalizeScannedT256(value) {
  const normalized = String(value ?? "").trim();
  if (!T256_PATTERN.test(normalized)) {
    throw new Error("QR code is not a 94-character 256t identifier");
  }
  return normalized;
}

export async function supportsQrDetection(BarcodeDetectorClass = globalThis.BarcodeDetector, portableDecoder = globalThis.jsQR) {
  if (typeof BarcodeDetectorClass !== "function") return typeof portableDecoder === "function";
  if (typeof BarcodeDetectorClass.getSupportedFormats !== "function") return true;
  return (await BarcodeDetectorClass.getSupportedFormats()).includes("qr_code") || typeof portableDecoder === "function";
}

export async function decodeQrVideoFrame(video, BarcodeDetectorClass = globalThis.BarcodeDetector, portableDecoder = globalThis.jsQR) {
  if (typeof BarcodeDetectorClass === "function") {
    const supported = typeof BarcodeDetectorClass.getSupportedFormats !== "function" || (await BarcodeDetectorClass.getSupportedFormats()).includes("qr_code");
    if (supported) {
      const codes = await new BarcodeDetectorClass({ formats: ["qr_code"] }).detect(video);
      return codes.find((code) => typeof code.rawValue === "string")?.rawValue ?? null;
    }
  }
  if (typeof portableDecoder !== "function" || video.videoWidth < 1 || video.videoHeight < 1) return null;
  const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true }); if (context === null) return null;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return portableDecoder(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" })?.data ?? null;
}
