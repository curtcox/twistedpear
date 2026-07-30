/**
 * Trusted-chrome helpers for mobile Freenet remote-node grants.
 * Off by default; no preconfigured third-party gateway.
 */

export interface FreenetRemoteGrantCapabilities {
  readonly contractReads: boolean;
  readonly contractWrites: boolean;
  readonly packetTunnel: boolean;
  readonly propagation: boolean;
}

export interface FreenetRemoteGrantDraft {
  readonly nodeUrl: string;
  readonly operatorLabel: string;
  readonly capabilities: FreenetRemoteGrantCapabilities;
  readonly authToken?: string;
}

export interface FreenetRemoteGrant extends FreenetRemoteGrantDraft {
  readonly enabled: boolean;
  readonly acceptedAt: number | null;
}

export interface FreenetRemoteGrantValidation {
  readonly ok: boolean;
  readonly errors: ReadonlyArray<string>;
}

const UNSAFE_URL_REASONS = [
  "credentials in the URL (userinfo)",
  "non-ws(s) scheme",
  "missing host"
] as const;

export const FREENET_REMOTE_DISCLOSURE = [
  "This node will see every Freenet contract read, write, and subscription you enable.",
  "Accepted contract updates are published to the Freenet network and cannot be recalled.",
  "Timing, payload size, destination contract keys, and correlation across operations are visible to the node operator.",
  "Start with a node you control. TwistedPear does not ship a third-party gateway."
] as const;

export function defaultFreenetRemoteGrant(): FreenetRemoteGrant {
  return {
    enabled: false,
    nodeUrl: "",
    operatorLabel: "",
    authToken: undefined,
    acceptedAt: null,
    capabilities: {
      contractReads: false,
      contractWrites: false,
      packetTunnel: false,
      propagation: false
    }
  };
}

export function validateFreenetNodeUrl(urlText: string): FreenetRemoteGrantValidation {
  const errors: string[] = [];
  const trimmed = urlText.trim();
  if (trimmed.length === 0) {
    return { ok: false, errors: ["Node URL is required"] };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, errors: ["Node URL is malformed"] };
  }

  if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
    errors.push(`Rejecting ${UNSAFE_URL_REASONS[1]}`);
  }
  if (parsed.username.length > 0 || parsed.password.length > 0) {
    errors.push(`Rejecting ${UNSAFE_URL_REASONS[0]}`);
  }
  if (parsed.hostname.length === 0) {
    errors.push(`Rejecting ${UNSAFE_URL_REASONS[2]}`);
  }
  if (parsed.searchParams.has("authToken") || parsed.searchParams.has("token")) {
    errors.push("Auth tokens must not appear in the URL");
  }

  return { ok: errors.length === 0, errors };
}

export function validateFreenetRemoteGrant(
  draft: FreenetRemoteGrantDraft
): FreenetRemoteGrantValidation {
  const errors: string[] = [];
  const url = validateFreenetNodeUrl(draft.nodeUrl);
  errors.push(...url.errors);

  if (draft.operatorLabel.trim().length === 0) {
    errors.push("Operator label is required");
  }

  const caps = draft.capabilities;
  if (
    !caps.contractReads &&
    !caps.contractWrites &&
    !caps.packetTunnel &&
    !caps.propagation
  ) {
    errors.push("Enable at least one Freenet capability, or leave the grant off");
  }

  if (caps.contractWrites && !caps.contractReads) {
    errors.push("Contract writes require contract reads to be enabled");
  }

  return { ok: errors.length === 0, errors };
}

/** First-use enablement: requires explicit acceptance of disclosure. */
export function acceptFreenetRemoteGrant(
  draft: FreenetRemoteGrantDraft,
  options: { readonly acceptedDisclosure: boolean; readonly now?: number }
): FreenetRemoteGrant {
  if (!options.acceptedDisclosure) {
    throw new Error("Remote-node disclosure must be accepted before enabling");
  }
  const validation = validateFreenetRemoteGrant(draft);
  if (!validation.ok) {
    throw new Error(validation.errors.join("; "));
  }
  return {
    ...draft,
    nodeUrl: draft.nodeUrl.trim(),
    operatorLabel: draft.operatorLabel.trim(),
    enabled: true,
    acceptedAt: options.now ?? Date.now()
  };
}

export function revokeFreenetRemoteGrant(
  current: FreenetRemoteGrant
): FreenetRemoteGrant {
  return {
    ...defaultFreenetRemoteGrant(),
    nodeUrl: current.nodeUrl,
    operatorLabel: current.operatorLabel
  };
}

export function freenetGrantLogSafe(
  grant: FreenetRemoteGrant
): Record<string, unknown> {
  return {
    enabled: grant.enabled,
    nodeUrl: grant.nodeUrl,
    operatorLabel: grant.operatorLabel,
    capabilities: grant.capabilities,
    acceptedAt: grant.acceptedAt,
    authTokenPresent: Boolean(grant.authToken && grant.authToken.length > 0)
  };
}

export function assertNoTokenInText(
  text: string,
  token: string | null | undefined
): void {
  if (token !== undefined && token !== null && token.length > 0 && text.includes(token)) {
    throw new Error("Freenet auth token leaked into log or UI dump text");
  }
}
