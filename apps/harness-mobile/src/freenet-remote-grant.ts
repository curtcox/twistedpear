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
  /** 32-byte peer rendezvous as 64 hex chars; required when packetTunnel is enabled. */
  readonly rendezvousHex?: string;
  /** Packet-log local direction (0 or 1); peer uses the opposite. */
  readonly localDirection?: 0 | 1;
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
  "missing host",
] as const;

export const FREENET_REMOTE_DISCLOSURE = [
  "This node will see every Freenet contract read, write, and subscription you enable.",
  "Accepted contract updates are published to the Freenet network and cannot be recalled.",
  "Timing, payload size, destination contract keys, and correlation across operations are visible to the node operator.",
  "Start with a node you control. TwistedPear does not ship a third-party gateway.",
] as const;

export function defaultFreenetRemoteGrant(): FreenetRemoteGrant {
  return {
    enabled: false,
    nodeUrl: "",
    operatorLabel: "",
    authToken: undefined,
    rendezvousHex: undefined,
    localDirection: 0,
    acceptedAt: null,
    capabilities: {
      contractReads: false,
      contractWrites: false,
      packetTunnel: false,
      propagation: false,
    },
  };
}

/** Cryptographically random 32-byte Freenet packet-log rendezvous as hex. */
export function generateFreenetRendezvousHex(
  randomBytes: (size: number) => Uint8Array = (size) => {
    const out = new Uint8Array(size);
    crypto.getRandomValues(out);
    return out;
  },
): string {
  const bytes = randomBytes(32);
  let hex = "";
  for (const value of bytes) {
    hex += value.toString(16).padStart(2, "0");
  }
  return hex;
}

export function validateFreenetRendezvousHex(
  hex: string | undefined,
): FreenetRemoteGrantValidation {
  if (hex === undefined || hex.trim().length === 0) {
    return {
      ok: false,
      errors: ["Packet tunnel requires a 64-character hex rendezvous"],
    };
  }
  const trimmed = hex.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return {
      ok: false,
      errors: [
        "Packet-tunnel rendezvous must be exactly 64 hex characters (32 bytes)",
      ],
    };
  }
  return { ok: true, errors: [] };
}

export function validateFreenetNodeUrl(
  urlText: string,
): FreenetRemoteGrantValidation {
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
  if (
    parsed.searchParams.has("authToken") ||
    parsed.searchParams.has("token")
  ) {
    errors.push("Auth tokens must not appear in the URL");
  }

  return { ok: errors.length === 0, errors };
}

export function validateFreenetRemoteGrant(
  draft: FreenetRemoteGrantDraft,
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
    errors.push(
      "Enable at least one Freenet capability, or leave the grant off",
    );
  }

  if (caps.contractWrites && !caps.contractReads) {
    errors.push("Contract writes require contract reads to be enabled");
  }

  if (caps.packetTunnel) {
    errors.push(...validateFreenetRendezvousHex(draft.rendezvousHex).errors);
    if (
      draft.localDirection !== undefined &&
      draft.localDirection !== 0 &&
      draft.localDirection !== 1
    ) {
      errors.push("Packet-tunnel local direction must be 0 or 1");
    }
  }

  return { ok: errors.length === 0, errors };
}

/** First-use enablement: requires explicit acceptance of disclosure. */
export function acceptFreenetRemoteGrant(
  draft: FreenetRemoteGrantDraft,
  options: { readonly acceptedDisclosure: boolean; readonly now?: number },
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
    ...(draft.rendezvousHex === undefined
      ? {}
      : { rendezvousHex: draft.rendezvousHex.trim().toLowerCase() }),
    localDirection: draft.localDirection === 1 ? 1 : 0,
    enabled: true,
    acceptedAt: options.now ?? Date.now(),
  };
}

export function revokeFreenetRemoteGrant(
  current: FreenetRemoteGrant,
): FreenetRemoteGrant {
  return {
    ...defaultFreenetRemoteGrant(),
    nodeUrl: current.nodeUrl,
    operatorLabel: current.operatorLabel,
  };
}

export function freenetGrantLogSafe(
  grant: FreenetRemoteGrant,
): Record<string, unknown> {
  return {
    enabled: grant.enabled,
    nodeUrl: grant.nodeUrl,
    operatorLabel: grant.operatorLabel,
    capabilities: grant.capabilities,
    rendezvousHex: grant.rendezvousHex ?? null,
    localDirection: grant.localDirection ?? 0,
    acceptedAt: grant.acceptedAt,
    authTokenPresent: Boolean(grant.authToken && grant.authToken.length > 0),
  };
}

export function assertNoTokenInText(
  text: string,
  token: string | null | undefined,
): void {
  if (
    token !== undefined &&
    token !== null &&
    token.length > 0 &&
    text.includes(token)
  ) {
    throw new Error("Freenet auth token leaked into log or UI dump text");
  }
}
