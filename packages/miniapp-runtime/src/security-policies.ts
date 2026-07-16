/** Shipping policy for one-use bearer authority. */
export class BearerReplayPolicy {
  private readonly consumed = new Set<string>();
  use(tokenId: string): "accepted" | "replay-rejected" {
    if (this.consumed.has(tokenId)) return "replay-rejected";
    this.consumed.add(tokenId);
    return "accepted";
  }
}

/** Shipping policy for device-bound recovery/key-share requests. */
export class KeySharePolicy {
  constructor(private readonly trustedDeviceIds: ReadonlySet<string>) {}
  authorize(deviceId: string): "accepted" | "untrusted-device-rejected" {
    return this.trustedDeviceIds.has(deviceId) ? "accepted" : "untrusted-device-rejected";
  }
}

/** Shipping ingress policy for federation control events. */
export class FederationPolicy {
  constructor(private readonly trustedPeers: ReadonlySet<string>) {}
  authorize(peerId: string): "accepted" | "malicious-acl-contained" {
    return this.trustedPeers.has(peerId) ? "accepted" : "malicious-acl-contained";
  }
}
