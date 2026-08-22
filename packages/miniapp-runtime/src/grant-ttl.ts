import { DEVICE_CAPABILITY_DEFINITIONS } from "./device-capabilities.gen.js";

export type CapabilityConsentClass = "low" | "elevated" | "sensitive";

/** Default grant lifetime per consent class — settled for CAP-TTL open question 2. */
export const GRANT_TTL_MS_BY_CONSENT_CLASS: Readonly<
  Record<CapabilityConsentClass, number>
> = {
  low: 90 * 24 * 60 * 60_000,
  elevated: 7 * 24 * 60 * 60_000,
  sensitive: 15 * 60_000,
};

const CORE_CONSENT_CLASS = new Map<string, CapabilityConsentClass>([
  ["storage:kv", "low"],
  ["storage:hyperbee", "low"],
  ["workspace", "low"],
  ["presence", "low"],
  ["link:observe", "low"],
  ["relay:read", "low"],
  ["identity", "elevated"],
  ["announce:subscribe", "elevated"],
  ["announce:publish", "elevated"],
  ["share:cas", "elevated"],
  ["ai:chat", "elevated"],
  ["ai:embed", "elevated"],
  ["resource:fetch", "elevated"],
  ["peer:connect", "elevated"],
  ["link:probe", "elevated"],
  ["apps:preview", "elevated"],
  ["apps:channel", "elevated"],
  ["runtime:background", "elevated"],
  ["runtime:wake", "elevated"],
  ["notify:post", "elevated"],
  ["lxmf:send", "sensitive"],
  ["lxmf:receive", "sensitive"],
  ["freenet:contract", "sensitive"],
  ["apps:package", "sensitive"],
  ["apps:publish", "sensitive"],
  ["apps:install", "sensitive"],
  ["relay:configure", "sensitive"],
]);

const DEVICE_CONSENT_CLASS = new Map<string, CapabilityConsentClass>(
  DEVICE_CAPABILITY_DEFINITIONS.map((entry) => [entry.id, entry.consentClass]),
);

export function consentClassForCapability(
  capability: string,
): CapabilityConsentClass {
  return (
    CORE_CONSENT_CLASS.get(capability) ??
    DEVICE_CONSENT_CLASS.get(capability) ??
    "elevated"
  );
}

/** Shortest TTL among the requested capabilities — the most restrictive class wins. */
export function grantTtlMsForCapabilities(
  capabilities: ReadonlyArray<string>,
): number {
  if (capabilities.length === 0) {
    return GRANT_TTL_MS_BY_CONSENT_CLASS.elevated;
  }
  let min: number | undefined;
  for (const capability of capabilities) {
    const ttl =
      GRANT_TTL_MS_BY_CONSENT_CLASS[consentClassForCapability(capability)];
    min = min === undefined ? ttl : Math.min(min, ttl);
  }
  return min ?? GRANT_TTL_MS_BY_CONSENT_CLASS.elevated;
}

export function isGrantLifecycleEffective(
  lifecycle:
    | {
        readonly phase: string;
        readonly expiresAt: number | null;
      }
    | undefined,
  now: number,
): boolean {
  if (lifecycle === undefined) return false;
  if (
    lifecycle.phase === "denied" ||
    lifecycle.phase === "expired" ||
    lifecycle.phase === "revoked"
  ) {
    return false;
  }
  if (lifecycle.expiresAt !== null && now >= lifecycle.expiresAt) {
    return false;
  }
  return lifecycle.phase === "granted" || lifecycle.phase === "active";
}
