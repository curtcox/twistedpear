export interface CommunityTcpEndpoint {
  readonly id: string;
  readonly label: string;
  readonly host: string;
  readonly port: number;
}

export interface CommunityNetworkProfile {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly privacyNotice: string;
  readonly endpoints: ReadonlyArray<CommunityTcpEndpoint>;
}

/**
 * Opt-in bootstrap onto the community-operated Reticulum backbone. These are
 * independent public services, not TwistedPear infrastructure or trust roots.
 */
export const RETICULUM_COMMUNITY_NETWORK: CommunityNetworkProfile = {
  id: "reticulum-community",
  label: "Reticulum community network",
  description:
    "Connect to a public community transport node and discover the wider Reticulum backbone.",
  privacyNotice:
    "Public transport operators can observe your IP address and traffic timing. Traffic contents remain Reticulum-encrypted. Availability is not guaranteed.",
  endpoints: [
    {
      id: "reticulumnet-nl",
      label: "ReticulumNet (Netherlands)",
      host: "node.reticulumnet.nl",
      port: 4242,
    },
    {
      id: "faultline-us",
      label: "Faultline community node (US)",
      host: "rns.faultline.dev",
      port: 4242,
    },
  ],
};
