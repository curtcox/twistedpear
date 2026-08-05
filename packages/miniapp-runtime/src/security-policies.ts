/** Standalone one-use bearer primitive; not a MiniappHost integration. */
export class BearerReplayPolicy {
  private readonly consumed = new Set<string>();
  use(tokenId: string): "accepted" | "replay-rejected" {
    if (this.consumed.has(tokenId)) return "replay-rejected";
    this.consumed.add(tokenId);
    return "accepted";
  }
}

/** Standalone key-share policy primitive; no shipping key-share ingress exists yet. */
export class KeySharePolicy {
  constructor(private readonly trustedDeviceIds: ReadonlySet<string>) {}
  authorize(deviceId: string): "accepted" | "untrusted-device-rejected" {
    return this.trustedDeviceIds.has(deviceId)
      ? "accepted"
      : "untrusted-device-rejected";
  }
}

/** Standalone federation policy primitive; no shipping federation ingress exists yet. */
export class FederationPolicy {
  constructor(private readonly trustedPeers: ReadonlySet<string>) {}
  authorize(peerId: string): "accepted" | "malicious-acl-contained" {
    return this.trustedPeers.has(peerId)
      ? "accepted"
      : "malicious-acl-contained";
  }
}
