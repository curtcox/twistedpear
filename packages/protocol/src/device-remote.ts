/**
 * Serving-host remote device grant policy (Sans-IO).
 * Grants never survive a host restart — callers drop the store on reboot.
 */

export type RemoteGrantPhase = "active" | "expired" | "revoked";

export interface RemoteDeviceGrant {
  readonly peerId: string;
  readonly classId: string;
  readonly tierId: string;
  readonly expiresAt: number;
  readonly phase: RemoteGrantPhase;
  readonly grantedAt: number;
  readonly revokedAt: number | null;
  readonly maxConcurrent: number;
  readonly maxSessionMs: number;
}

export type RemoteGrantEvent =
  | {
      readonly kind: "remote/grant";
      readonly at: number;
      readonly peerId: string;
      readonly classId: string;
      readonly tierId: string;
      readonly ttlMs: number;
      readonly maxConcurrent?: number;
      readonly maxSessionMs?: number;
    }
  | {
      readonly kind: "remote/revoke";
      readonly at: number;
      readonly peerId: string;
      readonly classId: string;
      readonly tierId: string;
    }
  | {
      readonly kind: "remote/ttl";
      readonly at: number;
      readonly peerId: string;
      readonly classId: string;
      readonly tierId: string;
    }
  | { readonly kind: "remote/clear-all"; readonly at: number };

export function remoteGrantKey(
  peerId: string,
  classId: string,
  tierId: string,
): string {
  return `${peerId}\0${classId}\0${tierId}`;
}

export function initialRemoteGrantStore(): ReadonlyMap<
  string,
  RemoteDeviceGrant
> {
  return new Map();
}

export function stepRemoteGrantStore(
  store: ReadonlyMap<string, RemoteDeviceGrant>,
  event: RemoteGrantEvent,
): ReadonlyMap<string, RemoteDeviceGrant> {
  const next = new Map(store);
  if (event.kind === "remote/clear-all") {
    return new Map();
  }
  if (event.kind === "remote/grant") {
    const key = remoteGrantKey(event.peerId, event.classId, event.tierId);
    next.set(key, {
      peerId: event.peerId,
      classId: event.classId,
      tierId: event.tierId,
      grantedAt: event.at,
      expiresAt: event.at + Math.max(0, event.ttlMs),
      phase: "active",
      revokedAt: null,
      maxConcurrent: event.maxConcurrent ?? 1,
      maxSessionMs: event.maxSessionMs ?? Math.min(event.ttlMs, 15 * 60_000),
    });
    return next;
  }
  const key = remoteGrantKey(event.peerId, event.classId, event.tierId);
  const current = next.get(key);
  if (current === undefined) return next;
  if (event.kind === "remote/revoke") {
    next.set(key, { ...current, phase: "revoked", revokedAt: event.at });
    return next;
  }
  if (current.phase === "active" && event.at >= current.expiresAt) {
    next.set(key, { ...current, phase: "expired" });
  }
  return next;
}

export function isRemoteGrantLive(
  grant: RemoteDeviceGrant | undefined,
  at: number,
): boolean {
  if (grant === undefined || grant.phase !== "active") return false;
  return at < grant.expiresAt;
}
