/**
 * Platform capability probe for USB serial (shared by native module and conformance).
 */
// @ts-nocheck


/**
 * @param {string} platform
 * @returns {{ readonly supported: boolean; readonly reason: "unsupported-on-ios" | "native-module-unavailable" | null }}
 */
export function resolveUsbSerialCapability(platform) {
  if (platform === "ios") {
    return { supported: false, reason: "unsupported-on-ios" };
  }

  if (platform !== "android") {
    return { supported: false, reason: "native-module-unavailable" };
  }

  return { supported: true, reason: null };
}
