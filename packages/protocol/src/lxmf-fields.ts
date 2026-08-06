/**
 * Pure LXMF field identifiers, unverified reasons, app name, and peer request paths.
 */

export const LXMF_APP_NAME = "lxmf";

export const LXMF_MESSAGE_GET_PATH = "/get";
export const LXMF_OFFER_REQUEST_PATH = "/offer";

export const LxmfUnverifiedReason = {
  SOURCE_UNKNOWN: 0x01,
  SIGNATURE_INVALID: 0x02,
} as const;

export type LxmfUnverifiedReasonValue =
  (typeof LxmfUnverifiedReason)[keyof typeof LxmfUnverifiedReason];

/** Core LXMF field identifiers from LXMF/LXMF.py. */
export const LxmfField = {
  EMBEDDED_LXMS: 0x01,
  TELEMETRY: 0x02,
  TELEMETRY_STREAM: 0x03,
  ICON_APPEARANCE: 0x04,
  FILE_ATTACHMENTS: 0x05,
  IMAGE: 0x06,
  AUDIO: 0x07,
  THREAD: 0x08,
  COMMANDS: 0x09,
  RESULTS: 0x0a,
  GROUP: 0x0b,
  TICKET: 0x0c,
  EVENT: 0x0d,
  RNR_REFS: 0x0e,
  RENDERER: 0x0f,
  CUSTOM_TYPE: 0xfb,
  CUSTOM_DATA: 0xfc,
  CUSTOM_META: 0xfd,
  NON_SPECIFIC: 0xfe,
  DEBUG: 0xff,
} as const;

export type LxmfFieldValue = (typeof LxmfField)[keyof typeof LxmfField];

export type LxmfMessageFields = Readonly<Record<number, Uint8Array>>;
