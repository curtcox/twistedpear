/**
 * Persistent host LXMF delivery destination.
 *
 * Shipping hosts own one always-on `lxmf.delivery` destination so a
 * `session-invite` can raise trusted chrome without a mounted peer control agent.
 * Announce cadence is a host policy choice: desktop may re-announce on a
 * timer; mobile and web may announce once at start and again on resume.
 * Principle 3 is unchanged — this path never runs mini-app code.
 */

import {
  bytesToHex,
  type CryptoProvider,
  type Identity,
  type RegisteredDestination,
  type Reticulum,
} from "@twistedpear/reticulum-ts";
import { LXMFRouter, type DeliveryCallback } from "@twistedpear/lxmf-ts";
import {
  createSessionInviteReceiver,
  SESSION_INVITE_TITLE,
  type DeliveredSessionInvite,
} from "./session-invite-carrier.js";

const LXMF_DELIVERY_ASPECT = "lxmf.delivery";
/** Desktop-friendly default; mobile/web hosts pass a longer interval or `0`. */
export const DEFAULT_HOST_LXMF_ANNOUNCE_INTERVAL_MS = 60_000;

export interface HostLxmfPeerRecord {
  /** Delivery destination hash of the announcing peer, hex. */
  readonly destinationHash: string;
  /** Truncated identity hash of the announcing peer, hex. */
  readonly identityHash: string;
  readonly firstSeenAt: number;
  readonly lastSeenAt: number;
  readonly count: number;
}

export interface HostLxmfDeliveryOptions {
  readonly reticulum: Reticulum;
  readonly provider: CryptoProvider;
  readonly identity: Identity;
  /** Raises a verified invite in host chrome. */
  readonly receiveSessionInvite: (
    invite: DeliveredSessionInvite,
  ) => Promise<void>;
  /**
   * Host policy gate for which apps may be rung. Returning false is
   * indistinguishable to the sender from an unreachable host.
   */
  readonly isInvitableApp: (appId: string) => boolean;
  /**
   * Optional override. Default names peers from verified LXMF announces only —
   * an unnamed peer must not be rung.
   */
  readonly resolvePeer?: (
    sourceHashHex: string,
    peers: ReadonlyMap<string, HostLxmfPeerRecord>,
  ) => { readonly handleId: string; readonly displayLabel: string } | null;
  /**
   * Re-announce interval. `0` announces once at start and never on a timer
   * (hosts re-announce from resume/foreground hooks instead).
   */
  readonly announceIntervalMs?: number;
  readonly now?: () => number;
  readonly log?: (line: string) => void;
}

export interface HostLxmfDeliverySession {
  readonly lxmfAddress: string;
  readonly identityHash: string;
  readonly router: LXMFRouter;
  readonly delivery: RegisteredDestination;
  peers(): ReadonlyArray<HostLxmfPeerRecord>;
  peer(destinationHash: string): HostLxmfPeerRecord | undefined;
  /** Observe verified invites after they are handed to chrome. */
  onInvite(handler: (invite: DeliveredSessionInvite) => void): void;
  /** Additional delivery handlers after the invite carrier (probes, media). */
  onMessage(handler: DeliveryCallback): void;
  announce(): Promise<void>;
  stop(): Promise<void>;
}

/**
 * Registers the host's single LXMF delivery destination and wires the verified
 * `session-invite` carrier onto it.
 */
export async function createHostLxmfDelivery(
  options: HostLxmfDeliveryOptions,
): Promise<HostLxmfDeliverySession> {
  const { reticulum, provider, identity } = options;
  const log = options.log ?? (() => {});
  const now = options.now ?? (() => Date.now());
  const announceIntervalMs =
    options.announceIntervalMs ?? DEFAULT_HOST_LXMF_ANNOUNCE_INTERVAL_MS;

  const router = new LXMFRouter({ reticulum, provider });
  const delivery = router.registerDeliveryIdentity(identity);
  const lxmfAddress = bytesToHex(delivery.hash);
  const identityHash = bytesToHex(
    provider.sha256(identity.getPublicKey()).slice(0, 16),
  );

  const peers = new Map<string, HostLxmfPeerRecord>();
  const inviteObservers: Array<(invite: DeliveredSessionInvite) => void> = [];
  const extraHandlers: DeliveryCallback[] = [];
  let stopped = false;
  let announceTimer: ReturnType<typeof setInterval> | null = null;

  reticulum.registerAnnounceHandler({
    aspectFilter: LXMF_DELIVERY_ASPECT,
    receivedAnnounce(info) {
      const destinationHash = bytesToHex(info.destinationHash);
      if (destinationHash === lxmfAddress) return;
      const at = now();
      const existing = peers.get(destinationHash);
      peers.set(destinationHash, {
        destinationHash,
        identityHash: bytesToHex(
          provider.sha256(info.announcedIdentity.getPublicKey()).slice(0, 16),
        ),
        firstSeenAt: existing?.firstSeenAt ?? at,
        lastSeenAt: at,
        count: (existing?.count ?? 0) + 1,
      });
    },
  });

  const resolvePeer =
    options.resolvePeer ??
    ((sourceHashHex, known) => {
      const peer = known.get(sourceHashHex);
      return peer === undefined
        ? null
        : {
            handleId: `invite-peer-${peer.identityHash.slice(0, 12)}`,
            displayLabel: `peer ${peer.identityHash.slice(0, 8)}`,
          };
    });

  const receiveInvite = createSessionInviteReceiver({
    deliver: async (invite) => {
      await options.receiveSessionInvite(invite);
      for (const observer of inviteObservers) observer(invite);
    },
    isInvitableApp: options.isInvitableApp,
    resolvePeer: (sourceHashHex) => resolvePeer(sourceHashHex, peers),
    now,
    log,
  });

  router.onDelivery((message, context) => {
    let isInvite = false;
    try {
      isInvite = message.titleAsString() === SESSION_INVITE_TITLE;
    } catch {
      isInvite = false;
    }
    if (isInvite) {
      receiveInvite(message);
      return;
    }
    for (const handler of extraHandlers) {
      handler(message, context);
    }
  });

  const announceQuietly = async (): Promise<void> => {
    try {
      await delivery.announce();
    } catch (error: unknown) {
      log(
        `Host LXMF announce deferred: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  await announceQuietly();
  if (announceIntervalMs > 0) {
    announceTimer = setInterval(
      () => void announceQuietly(),
      announceIntervalMs,
    );
    announceTimer.unref?.();
  }

  return {
    lxmfAddress,
    identityHash,
    router,
    delivery,
    peers: () => [...peers.values()],
    peer: (destinationHash) => peers.get(destinationHash),
    onInvite(handler) {
      inviteObservers.push(handler);
    },
    onMessage(handler) {
      extraHandlers.push(handler);
    },
    announce: () => delivery.announce(),
    stop() {
      if (stopped) return Promise.resolve();
      stopped = true;
      if (announceTimer !== null) {
        clearInterval(announceTimer);
        announceTimer = null;
      }
      return Promise.resolve();
    },
  };
}
