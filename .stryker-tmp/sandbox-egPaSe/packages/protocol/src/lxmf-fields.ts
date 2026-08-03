/**
 * Pure LXMF field identifiers, unverified reasons, app name, and peer request paths.
 */
// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
export const LXMF_APP_NAME = stryMutAct_9fa48("21383") ? "" : (stryCov_9fa48("21383"), "lxmf");
export const LXMF_MESSAGE_GET_PATH = stryMutAct_9fa48("21384") ? "" : (stryCov_9fa48("21384"), "/get");
export const LXMF_OFFER_REQUEST_PATH = stryMutAct_9fa48("21385") ? "" : (stryCov_9fa48("21385"), "/offer");
export const LxmfUnverifiedReason = {
  SOURCE_UNKNOWN: 0x01,
  SIGNATURE_INVALID: 0x02
} as const;
export type LxmfUnverifiedReasonValue = (typeof LxmfUnverifiedReason)[keyof typeof LxmfUnverifiedReason];

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
  DEBUG: 0xff
} as const;
export type LxmfFieldValue = (typeof LxmfField)[keyof typeof LxmfField];
export type LxmfMessageFields = Readonly<Record<number, Uint8Array>>;