/**
 * Public linked-installation surface shared by the Node and web barrels.
 * Keeping the re-exports in one file is what stops index.ts and web.ts from
 * becoming a jscpd pair every time this surface grows.
 */
export {
  LINKED_INSTALLATION_ANNOUNCE_ASPECT,
  LINKED_INSTALLATION_APP_NAME,
  LINKED_INSTALLATION_ID_BYTES,
  LINKED_INSTALLATION_MAGIC,
  LINKED_INSTALLATION_MAX_CERTIFICATE_BYTES,
  LINKED_INSTALLATION_MAX_LABEL_BYTES,
  createLinkedInstallation,
  createLinkedInstallationId,
  decodeLinkedInstallationCertificate,
  deriveLinkedInstallationIdentity,
  encodeLinkedInstallationCertificate,
  linkedInstallationAnnounceAspects,
  linkedInstallationAnnounceFilter,
  signLinkedInstallationCertificate,
  verifyLinkedInstallationCertificate,
  type LinkedInstallationCertificate,
} from "./linked-installation.js";
export {
  LINKED_ACCOUNT_BACKUP_WARNING,
  createKeyValueLinkedInstallationRoster,
  exportLinkedAccountBackup,
  pairNewLinkedInstallation,
  type LinkedAccountBackupExport,
  type LinkedInstallationKeyValueStore,
  type LinkedInstallationRoster,
  type LinkedInstallationRosterEntry,
} from "./linked-installation-roster.js";
export {
  createLinkedInstallationAnnounce,
  type LinkedInstallationAnnounceOptions,
  type LinkedInstallationAnnounceSession,
} from "./linked-installation-announce.js";
export {
  ACCOUNT_JOURNAL_HARD_MAX_BYTES,
  ACCOUNT_JOURNAL_MAX_RECORD_BYTES,
  accountJournalRecordAsProposal,
  createKeyValueAccountJournal,
  type AccountJournal,
  type AccountJournalKeyValueStore,
  type AccountJournalRecord,
} from "./account-journal.js";
export {
  createAccountJournalExchange,
  type AccountJournalExchangeOptions,
  type AccountJournalExchangeSession,
} from "./account-journal-exchange.js";
export {
  createKeyValueLinkedModeSwitch,
  previewLinkedModeSwitch,
  type LinkedModeIdentities,
  type LinkedModePreview,
  type LinkedModeStatus,
  type LinkedModeSwitch,
} from "./linked-mode.js";
