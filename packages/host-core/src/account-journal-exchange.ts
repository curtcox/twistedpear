/**
 * Fan-out of journal envelopes over certified installation destinations.
 *
 * The destination is the one that already carries the TPDV certificate, so a
 * record only travels to a peer this machine has already verified as a sibling.
 */
import {
  DestinationDirection,
  DestinationType,
  Identity,
  type CryptoProvider,
  type RegisteredDestination,
  type Reticulum,
} from "@twistedpear/reticulum-ts";
import {
  LINKED_INSTALLATION_APP_NAME,
  hexBytes,
  linkedInstallationAnnounceAspects,
  type LinkedInstallationCertificate,
} from "./linked-installation.js";
import type { LinkedInstallationRoster } from "./linked-installation-roster.js";
import type {
  AccountJournal,
  AccountJournalRecord,
} from "./account-journal.js";

export interface AccountJournalExchangeOptions {
  readonly reticulum: Reticulum;
  readonly provider: CryptoProvider;
  readonly certificate: LinkedInstallationCertificate;
  readonly destination: RegisteredDestination;
  readonly roster: LinkedInstallationRoster;
  readonly journal: AccountJournal;
  readonly selfInstallationId: string;
}

export interface AccountJournalExchangeSession {
  publish(record: AccountJournalRecord): Promise<void>;
  stop(): void;
}

export function createAccountJournalExchange(
  options: AccountJournalExchangeOptions,
): AccountJournalExchangeSession {
  const { reticulum, provider, certificate, destination, roster, journal } =
    options;
  const selfInstallationId = options.selfInstallationId;
  const aspects = linkedInstallationAnnounceAspects(
    provider,
    certificate.accountPublicKey,
  );
  let stopped = false;

  destination.setPacketCallback((data) => {
    if (stopped) return;
    void journal.ingest(data);
  });

  return {
    async publish(record) {
      if (stopped) return;
      const envelope = await journal.envelope(record.recordHash);
      if (envelope === null) return;
      for (const entry of await roster.list()) {
        if (entry.certificate.installationId === selfInstallationId) continue;
        const peer = Identity.fromPublicKey(
          provider,
          hexBytes(
            entry.certificate.installationPublicKey,
            64,
            "installation public key",
          ),
        );
        if (peer === null) continue;
        const outbound = reticulum.registerDestination({
          provider,
          identity: peer,
          direction: DestinationDirection.OUT,
          type: DestinationType.SINGLE,
          appName: LINKED_INSTALLATION_APP_NAME,
          aspects,
        });
        await outbound.send(envelope);
      }
    },
    stop() {
      stopped = true;
    },
  };
}
