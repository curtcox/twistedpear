import type { AttackProposal } from "./adversary.js";

export interface HistoricalReplayFixture {
  readonly source: string;
  readonly reference?: string;
  readonly attackClass?: string;
  readonly name: string;
  readonly expressible: boolean;
  readonly reason?: string;
  readonly proposal?: AttackProposal;
}

/** Kernel-level lifts of the hostile-app corpus, with non-network cases explicit. */
export const HISTORICAL_REPLAY_FIXTURES: readonly HistoricalReplayFixture[] = [
  {
    source: "conformance/hostile-apps",
    name: "broker-flood",
    expressible: true,
    proposal: {
      name: "broker-flood",
      actions: Array.from({ length: 32 }, (_, index) => ({
        power: "inject" as const,
        source: "app",
        destination: "host",
        channel: "broker",
        payload: new Uint8Array([index])
      }))
    }
  },
  { source: "conformance/hostile-apps", name: "busy-loop", expressible: false, reason: "CPU scheduling is outside the protocol event model" },
  { source: "conformance/hostile-apps", name: "memory-bomb", expressible: false, reason: "heap allocation is enforced by the sandbox, not transport" },
  { source: "conformance/hostile-apps", name: "constructor-chain-escape", expressible: false, reason: "language sandbox escape is outside the protocol event model" },
  { source: "conformance/hostile-apps", name: "oversized-broker-message", expressible: true, proposal: {
    name: "oversized-broker-message",
    actions: [{ power: "inject", source: "app", destination: "host", channel: "broker", payload: new Uint8Array(512) }]
  } },
  {
    source: "Signal X3DH security considerations",
    reference: "https://signal.org/docs/specifications/x3dh/#security-considerations",
    attackClass: "protocol replay",
    name: "replayed-initial-key-agreement-message",
    expressible: true,
    proposal: { name: "replayed-initial-key-agreement-message", actions: [
      { power: "duplicate", source: "initiator", destination: "recipient" }
    ] }
  },
  {
    source: "IETF RFC 9700 OAuth 2.0 Security BCP",
    reference: "https://www.rfc-editor.org/rfc/rfc9700.html#name-token-replay-prevention",
    attackClass: "stolen bearer replay",
    name: "replayed-authority-token",
    expressible: true,
    proposal: { name: "replayed-authority-token", actions: [
      { power: "inject", source: "malicious-peer", destination: "resource-host", channel: "grant", payload: new Uint8Array([0x74, 0x6f, 0x6b, 0x65, 0x6e]) }
    ] }
  },
  {
    source: "Matrix CVE-2021-40823/40824 disclosure",
    reference: "https://matrix.org/blog/2021/09/13/vulnerability-disclosure-key-sharing/",
    attackClass: "device impersonation and key disclosure",
    name: "impersonated-device-key-request",
    expressible: true,
    proposal: { name: "impersonated-device-key-request", actions: [
      { power: "inject", source: "malicious-homeserver", destination: "client", channel: "key-share", payload: new Uint8Array([0x72, 0x65, 0x71]) }
    ] }
  },
  {
    source: "Mastodon GHSA-c2r5-cfqr-c553",
    reference: "https://github.com/mastodon/mastodon/security/advisories/GHSA-c2r5-cfqr-c553",
    attackClass: "trusted-proxy identity spoofing",
    name: "forwarded-for-rate-limit-bypass",
    expressible: false,
    reason: "trusted reverse-proxy header interpretation is outside the protocol event model"
  },
  {
    source: "Synapse CVE-2023-45129",
    reference: "https://github.com/matrix-org/synapse/security/advisories/GHSA-5chr-wjw5-3gq4",
    attackClass: "malicious federation event denial of service",
    name: "malicious-server-acl-event",
    expressible: true,
    proposal: { name: "malicious-server-acl-event", actions: [
      { power: "inject", source: "malicious-relay", destination: "host", channel: "federation", payload: new Uint8Array([0x61, 0x63, 0x6c]) },
      { power: "duplicate", source: "malicious-relay", destination: "host" }
    ] }
  }
];
