export type PeerDiscoveryErrorCode =
  | "UNAVAILABLE"
  | "PERMISSION_REQUIRED"
  | "TIMEOUT"
  | "CANCELLED"
  | "INVALID_INVITATION"
  | "REPLAY"
  | "POLICY_DENIED"
  | "QUOTA_EXCEEDED"
  | "NO_RETURN_CHANNEL";

export class PeerDiscoveryError extends Error {
  constructor(
    readonly code: PeerDiscoveryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PeerDiscoveryError";
  }
}
