/**
 * Announces this installation's TPDV certificate and merges verified
 * sibling certificates heard on the account-derived aspect.
 */
import {
  DestinationDirection,
  DestinationType,
  bytesToHex,
  type CryptoProvider,
  type Identity,
  type RegisteredDestination,
  type Reticulum,
} from "@twistedpear/reticulum-ts";
import {
  LINKED_INSTALLATION_APP_NAME,
  asciiHexLower,
  decodeLinkedInstallationCertificate,
  encodeLinkedInstallationCertificate,
  linkedInstallationAnnounceAspects,
  linkedInstallationAnnounceFilter,
  type LinkedInstallationCertificate,
} from "./linked-installation.js";
import type { LinkedInstallationRoster } from "./linked-installation-roster.js";

export interface LinkedInstallationAnnounceOptions {
  readonly reticulum: Reticulum;
  readonly provider: CryptoProvider;
  readonly installationIdentity: Identity;
  readonly certificate: LinkedInstallationCertificate;
  readonly roster: LinkedInstallationRoster;
  readonly announceIntervalMs?: number;
  readonly now?: () => number;
  /** When false, the caller must invoke `announce()` after both peers are up. */
  readonly autoAnnounce?: boolean;
}

export interface LinkedInstallationAnnounceSession {
  readonly destinationHash: string;
  readonly destination: RegisteredDestination;
  announce(): Promise<void>;
  stop(): Promise<void>;
}

export async function createLinkedInstallationAnnounce(
  options: LinkedInstallationAnnounceOptions,
): Promise<LinkedInstallationAnnounceSession> {
  const { reticulum, provider, installationIdentity, certificate, roster } =
    options;
  const now = options.now ?? (() => Date.now());
  const announceIntervalMs = options.announceIntervalMs ?? 0;
  const autoAnnounce = options.autoAnnounce !== false;
  const encoded = encodeLinkedInstallationCertificate(certificate);
  const aspects = linkedInstallationAnnounceAspects(
    provider,
    certificate.accountPublicKey,
  );
  const destination: RegisteredDestination = reticulum.registerDestination({
    provider,
    identity: installationIdentity,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: LINKED_INSTALLATION_APP_NAME,
    aspects,
  });
  const destinationHash = bytesToHex(destination.hash);
  const ownPublicKey = asciiHexLower(
    bytesToHex(installationIdentity.getPublicKey()),
  );
  const filter = linkedInstallationAnnounceFilter(
    provider,
    certificate.accountPublicKey,
  );

  let stopped = false;
  let announceTimer: ReturnType<typeof setInterval> | null = null;

  reticulum.registerAnnounceHandler({
    aspectFilter: filter,
    receivedAnnounce(info) {
      if (stopped) return;
      if (bytesToHex(info.destinationHash) === destinationHash) return;
      if (info.appData === null) return;
      let heard: LinkedInstallationCertificate;
      try {
        heard = decodeLinkedInstallationCertificate(info.appData);
      } catch {
        return;
      }
      if (
        asciiHexLower(bytesToHex(info.announcedIdentity.getPublicKey())) !==
        asciiHexLower(heard.installationPublicKey)
      ) {
        return;
      }
      if (asciiHexLower(heard.installationPublicKey) === ownPublicKey) return;
      void roster.merge(heard, now());
    },
  });

  const announce = async (): Promise<void> => {
    if (stopped) return;
    await destination.announce({ appData: encoded });
  };

  if (autoAnnounce) await announce();
  if (autoAnnounce && announceIntervalMs > 0) {
    announceTimer = setInterval(() => void announce(), announceIntervalMs);
    if (typeof announceTimer.unref === "function") announceTimer.unref();
  }

  return {
    destinationHash,
    destination,
    announce,
    stop() {
      stopped = true;
      if (announceTimer !== null) {
        clearInterval(announceTimer);
        announceTimer = null;
      }
      return Promise.resolve();
    },
  };
}
