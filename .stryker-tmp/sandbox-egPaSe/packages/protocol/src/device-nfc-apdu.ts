/**
 * NFC APDU payment AID blocklist — enforced in the driver, not by the app.
 * Rejects well-known EMV / payment applet AIDs.
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
export class NfcPaymentAidError extends Error {
  constructor(readonly code: "PAYMENT_AID_BLOCKED", message: string, readonly aid: string) {
    super(message);
    this.name = stryMutAct_9fa48("7617") ? "" : (stryCov_9fa48("7617"), "NfcPaymentAidError");
  }
}

/** Normalized uppercase hex without spaces or separators. */
export const PAYMENT_AID_BLOCKLIST: ReadonlyArray<string> = stryMutAct_9fa48("7618") ? [] : (stryCov_9fa48("7618"), [stryMutAct_9fa48("7619") ? "" : (stryCov_9fa48("7619"), "A0000000031010"), // Visa
stryMutAct_9fa48("7620") ? "" : (stryCov_9fa48("7620"), "A0000000032010"), // Visa Electron
stryMutAct_9fa48("7621") ? "" : (stryCov_9fa48("7621"), "A0000000041010"), // Mastercard
stryMutAct_9fa48("7622") ? "" : (stryCov_9fa48("7622"), "A0000000043060"), // Mastercard Maestro
stryMutAct_9fa48("7623") ? "" : (stryCov_9fa48("7623"), "A00000002501"), // Amex
stryMutAct_9fa48("7624") ? "" : (stryCov_9fa48("7624"), "A0000001523010"), // Discover
stryMutAct_9fa48("7625") ? "" : (stryCov_9fa48("7625"), "A0000000651010"), // JCB
stryMutAct_9fa48("7626") ? "" : (stryCov_9fa48("7626"), "A000000333010101"), // UnionPay
stryMutAct_9fa48("7627") ? "" : (stryCov_9fa48("7627"), "A0000002771010"), // Interac
stryMutAct_9fa48("7628") ? "" : (stryCov_9fa48("7628"), "325041592E5359532E4444463031") // PPSE directory
]);
export function normalizeAid(aid: string): string {
  if (stryMutAct_9fa48("7629")) {
    {}
  } else {
    stryCov_9fa48("7629");
    return stryMutAct_9fa48("7630") ? aid.replace(/[^0-9a-fA-F]/g, "").toLowerCase() : (stryCov_9fa48("7630"), aid.replace(stryMutAct_9fa48("7631") ? /[0-9a-fA-F]/g : (stryCov_9fa48("7631"), /[^0-9a-fA-F]/g), stryMutAct_9fa48("7632") ? "Stryker was here!" : (stryCov_9fa48("7632"), "")).toUpperCase());
  }
}
export function isPaymentAidBlocked(aid: string): boolean {
  if (stryMutAct_9fa48("7633")) {
    {}
  } else {
    stryCov_9fa48("7633");
    const normalized = normalizeAid(aid);
    if (stryMutAct_9fa48("7637") ? normalized.length >= 10 : stryMutAct_9fa48("7636") ? normalized.length <= 10 : stryMutAct_9fa48("7635") ? false : stryMutAct_9fa48("7634") ? true : (stryCov_9fa48("7634", "7635", "7636", "7637"), normalized.length < 10)) return stryMutAct_9fa48("7638") ? true : (stryCov_9fa48("7638"), false);
    return stryMutAct_9fa48("7639") ? PAYMENT_AID_BLOCKLIST.every(blocked => normalized === blocked || normalized.startsWith(blocked)) : (stryCov_9fa48("7639"), PAYMENT_AID_BLOCKLIST.some(stryMutAct_9fa48("7640") ? () => undefined : (stryCov_9fa48("7640"), blocked => stryMutAct_9fa48("7643") ? normalized === blocked && normalized.startsWith(blocked) : stryMutAct_9fa48("7642") ? false : stryMutAct_9fa48("7641") ? true : (stryCov_9fa48("7641", "7642", "7643"), (stryMutAct_9fa48("7645") ? normalized !== blocked : stryMutAct_9fa48("7644") ? false : (stryCov_9fa48("7644", "7645"), normalized === blocked)) || (stryMutAct_9fa48("7646") ? normalized.endsWith(blocked) : (stryCov_9fa48("7646"), normalized.startsWith(blocked)))))));
  }
}
export function assertAidAllowed(aid: string): string {
  if (stryMutAct_9fa48("7647")) {
    {}
  } else {
    stryCov_9fa48("7647");
    const normalized = normalizeAid(aid);
    if (stryMutAct_9fa48("7650") ? (normalized.length < 10 || normalized.length > 32) && normalized.length % 2 !== 0 : stryMutAct_9fa48("7649") ? false : stryMutAct_9fa48("7648") ? true : (stryCov_9fa48("7648", "7649", "7650"), (stryMutAct_9fa48("7652") ? normalized.length < 10 && normalized.length > 32 : stryMutAct_9fa48("7651") ? false : (stryCov_9fa48("7651", "7652"), (stryMutAct_9fa48("7655") ? normalized.length >= 10 : stryMutAct_9fa48("7654") ? normalized.length <= 10 : stryMutAct_9fa48("7653") ? false : (stryCov_9fa48("7653", "7654", "7655"), normalized.length < 10)) || (stryMutAct_9fa48("7658") ? normalized.length <= 32 : stryMutAct_9fa48("7657") ? normalized.length >= 32 : stryMutAct_9fa48("7656") ? false : (stryCov_9fa48("7656", "7657", "7658"), normalized.length > 32)))) || (stryMutAct_9fa48("7660") ? normalized.length % 2 === 0 : stryMutAct_9fa48("7659") ? false : (stryCov_9fa48("7659", "7660"), (stryMutAct_9fa48("7661") ? normalized.length * 2 : (stryCov_9fa48("7661"), normalized.length % 2)) !== 0)))) {
      if (stryMutAct_9fa48("7662")) {
        {}
      } else {
        stryCov_9fa48("7662");
        throw new NfcPaymentAidError(stryMutAct_9fa48("7663") ? "" : (stryCov_9fa48("7663"), "PAYMENT_AID_BLOCKED"), stryMutAct_9fa48("7664") ? "" : (stryCov_9fa48("7664"), "Invalid AID encoding."), aid);
      }
    }
    if (stryMutAct_9fa48("7666") ? false : stryMutAct_9fa48("7665") ? true : (stryCov_9fa48("7665", "7666"), isPaymentAidBlocked(normalized))) {
      if (stryMutAct_9fa48("7667")) {
        {}
      } else {
        stryCov_9fa48("7667");
        throw new NfcPaymentAidError(stryMutAct_9fa48("7668") ? "" : (stryCov_9fa48("7668"), "PAYMENT_AID_BLOCKED"), stryMutAct_9fa48("7669") ? "" : (stryCov_9fa48("7669"), "Payment applet AIDs are blocklisted; use the OS payment sheet."), normalized);
      }
    }
    return normalized;
  }
}
export interface NfcApduCommand {
  readonly kind: "nfc";
  readonly action: "apdu";
  readonly aid: string;
  readonly apdu: string;
}
export function validateNfcApduCommand(command: NfcApduCommand): NfcApduCommand {
  if (stryMutAct_9fa48("7670")) {
    {}
  } else {
    stryCov_9fa48("7670");
    const aid = assertAidAllowed(command.aid);
    if (stryMutAct_9fa48("7673") ? (typeof command.apdu !== "string" || command.apdu.length < 2) && command.apdu.length > 1024 : stryMutAct_9fa48("7672") ? false : stryMutAct_9fa48("7671") ? true : (stryCov_9fa48("7671", "7672", "7673"), (stryMutAct_9fa48("7675") ? typeof command.apdu !== "string" && command.apdu.length < 2 : stryMutAct_9fa48("7674") ? false : (stryCov_9fa48("7674", "7675"), (stryMutAct_9fa48("7677") ? typeof command.apdu === "string" : stryMutAct_9fa48("7676") ? false : (stryCov_9fa48("7676", "7677"), typeof command.apdu !== (stryMutAct_9fa48("7678") ? "" : (stryCov_9fa48("7678"), "string")))) || (stryMutAct_9fa48("7681") ? command.apdu.length >= 2 : stryMutAct_9fa48("7680") ? command.apdu.length <= 2 : stryMutAct_9fa48("7679") ? false : (stryCov_9fa48("7679", "7680", "7681"), command.apdu.length < 2)))) || (stryMutAct_9fa48("7684") ? command.apdu.length <= 1024 : stryMutAct_9fa48("7683") ? command.apdu.length >= 1024 : stryMutAct_9fa48("7682") ? false : (stryCov_9fa48("7682", "7683", "7684"), command.apdu.length > 1024)))) {
      if (stryMutAct_9fa48("7685")) {
        {}
      } else {
        stryCov_9fa48("7685");
        throw new NfcPaymentAidError(stryMutAct_9fa48("7686") ? "" : (stryCov_9fa48("7686"), "PAYMENT_AID_BLOCKED"), stryMutAct_9fa48("7687") ? "" : (stryCov_9fa48("7687"), "Invalid APDU payload length."), aid);
      }
    }
    return stryMutAct_9fa48("7688") ? {} : (stryCov_9fa48("7688"), {
      kind: stryMutAct_9fa48("7689") ? "" : (stryCov_9fa48("7689"), "nfc"),
      action: stryMutAct_9fa48("7690") ? "" : (stryCov_9fa48("7690"), "apdu"),
      aid,
      apdu: command.apdu
    });
  }
}