/**
 * Platform capability probe for USB serial (shared by native module and conformance).
 */

/**
 * @param {string} platform
 * @returns {{ readonly supported: true; readonly reason: null } | { readonly supported: false; readonly reason: "unsupported-on-ios" | "native-module-unavailable" }}
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
