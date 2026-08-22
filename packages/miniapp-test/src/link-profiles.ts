export type LinkProfileName = "lan" | "ble" | "lora";

export interface LinkProfile {
  readonly name: LinkProfileName;
  readonly bitrate: number;
  readonly latencyMs: number;
  readonly loss: number;
  readonly peerOffline: boolean;
}

export const LINK_PROFILES: Readonly<Record<LinkProfileName, LinkProfile>> = {
  lan: {
    name: "lan",
    bitrate: 8_000_000,
    latencyMs: 5,
    loss: 0,
    peerOffline: false,
  },
  ble: {
    name: "ble",
    bitrate: 24_000,
    latencyMs: 80,
    loss: 0.02,
    peerOffline: false,
  },
  lora: {
    name: "lora",
    bitrate: 1_200,
    latencyMs: 400,
    loss: 0.15,
    peerOffline: false,
  },
};

export function resolveLinkProfile(
  profile: LinkProfileName | LinkProfile,
): LinkProfile {
  return typeof profile === "string" ? LINK_PROFILES[profile] : profile;
}

export interface LinkAwareHandle {
  setRateLimit(maxMessagesPerSecond: number | null): void;
}

/**
 * Authoring profiles, not the abuse-resistance simulator. They throttle the
 * broker so a degradation test can run in CI rather than by hand.
 */
export async function applyLinkProfile(
  handle: LinkAwareHandle,
  profile: LinkProfileName | LinkProfile,
): Promise<LinkProfile> {
  const resolved = resolveLinkProfile(profile);
  if (resolved.peerOffline) {
    handle.setRateLimit(1);
    return resolved;
  }
  const messages = Math.max(1, Math.floor(resolved.bitrate / 8 / 256));
  handle.setRateLimit(Math.min(128, messages));
  if (resolved.latencyMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, resolved.latencyMs));
  }
  return resolved;
}
