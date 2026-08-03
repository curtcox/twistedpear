/**
 * Pure UTF-8 encode/decode without TextEncoder/TextDecoder (no DOM).
 * Conclusions leave via machine actions (no ad-hoc `utf8Encode` /
 * `utf8Decode` / `utf8OrBytes` reads beside the step).
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
import type { Event, Intent } from "@twistedpear/effects";
export function utf8Encode(value: string): Uint8Array {
  if (stryMutAct_9fa48("34597")) {
    {}
  } else {
    stryCov_9fa48("34597");
    const out: number[] = stryMutAct_9fa48("34598") ? ["Stryker was here"] : (stryCov_9fa48("34598"), []);
    for (let i = 0; stryMutAct_9fa48("34601") ? i >= value.length : stryMutAct_9fa48("34600") ? i <= value.length : stryMutAct_9fa48("34599") ? false : (stryCov_9fa48("34599", "34600", "34601"), i < value.length); stryMutAct_9fa48("34602") ? i -= 1 : (stryCov_9fa48("34602"), i += 1)) {
      if (stryMutAct_9fa48("34603")) {
        {}
      } else {
        stryCov_9fa48("34603");
        let code = value.charCodeAt(i);
        if (stryMutAct_9fa48("34607") ? code >= 0x80 : stryMutAct_9fa48("34606") ? code <= 0x80 : stryMutAct_9fa48("34605") ? false : stryMutAct_9fa48("34604") ? true : (stryCov_9fa48("34604", "34605", "34606", "34607"), code < 0x80)) {
          if (stryMutAct_9fa48("34608")) {
            {}
          } else {
            stryCov_9fa48("34608");
            out.push(code);
          }
        } else if (stryMutAct_9fa48("34612") ? code >= 0x800 : stryMutAct_9fa48("34611") ? code <= 0x800 : stryMutAct_9fa48("34610") ? false : stryMutAct_9fa48("34609") ? true : (stryCov_9fa48("34609", "34610", "34611", "34612"), code < 0x800)) {
          if (stryMutAct_9fa48("34613")) {
            {}
          } else {
            stryCov_9fa48("34613");
            out.push(0xc0 | code >> 6, 0x80 | code & 0x3f);
          }
        } else if (stryMutAct_9fa48("34616") ? code >= 0xd800 && code <= 0xdbff || i + 1 < value.length : stryMutAct_9fa48("34615") ? false : stryMutAct_9fa48("34614") ? true : (stryCov_9fa48("34614", "34615", "34616"), (stryMutAct_9fa48("34618") ? code >= 0xd800 || code <= 0xdbff : stryMutAct_9fa48("34617") ? true : (stryCov_9fa48("34617", "34618"), (stryMutAct_9fa48("34621") ? code < 0xd800 : stryMutAct_9fa48("34620") ? code > 0xd800 : stryMutAct_9fa48("34619") ? true : (stryCov_9fa48("34619", "34620", "34621"), code >= 0xd800)) && (stryMutAct_9fa48("34624") ? code > 0xdbff : stryMutAct_9fa48("34623") ? code < 0xdbff : stryMutAct_9fa48("34622") ? true : (stryCov_9fa48("34622", "34623", "34624"), code <= 0xdbff)))) && (stryMutAct_9fa48("34627") ? i + 1 >= value.length : stryMutAct_9fa48("34626") ? i + 1 <= value.length : stryMutAct_9fa48("34625") ? true : (stryCov_9fa48("34625", "34626", "34627"), (stryMutAct_9fa48("34628") ? i - 1 : (stryCov_9fa48("34628"), i + 1)) < value.length)))) {
          if (stryMutAct_9fa48("34629")) {
            {}
          } else {
            stryCov_9fa48("34629");
            const low = value.charCodeAt(stryMutAct_9fa48("34630") ? i - 1 : (stryCov_9fa48("34630"), i + 1));
            if (stryMutAct_9fa48("34633") ? low >= 0xdc00 || low <= 0xdfff : stryMutAct_9fa48("34632") ? false : stryMutAct_9fa48("34631") ? true : (stryCov_9fa48("34631", "34632", "34633"), (stryMutAct_9fa48("34636") ? low < 0xdc00 : stryMutAct_9fa48("34635") ? low > 0xdc00 : stryMutAct_9fa48("34634") ? true : (stryCov_9fa48("34634", "34635", "34636"), low >= 0xdc00)) && (stryMutAct_9fa48("34639") ? low > 0xdfff : stryMutAct_9fa48("34638") ? low < 0xdfff : stryMutAct_9fa48("34637") ? true : (stryCov_9fa48("34637", "34638", "34639"), low <= 0xdfff)))) {
              if (stryMutAct_9fa48("34640")) {
                {}
              } else {
                stryCov_9fa48("34640");
                code = stryMutAct_9fa48("34641") ? 0x10000 + (code - 0xd800 << 10) - (low - 0xdc00) : (stryCov_9fa48("34641"), (stryMutAct_9fa48("34642") ? 0x10000 - (code - 0xd800 << 10) : (stryCov_9fa48("34642"), 0x10000 + ((stryMutAct_9fa48("34643") ? code + 0xd800 : (stryCov_9fa48("34643"), code - 0xd800)) << 10))) + (stryMutAct_9fa48("34644") ? low + 0xdc00 : (stryCov_9fa48("34644"), low - 0xdc00)));
                stryMutAct_9fa48("34645") ? i -= 1 : (stryCov_9fa48("34645"), i += 1);
                out.push(0xf0 | code >> 18, 0x80 | code >> 12 & 0x3f, 0x80 | code >> 6 & 0x3f, 0x80 | code & 0x3f);
                continue;
              }
            }
            out.push(0xef, 0xbf, 0xbd);
          }
        } else {
          if (stryMutAct_9fa48("34646")) {
            {}
          } else {
            stryCov_9fa48("34646");
            out.push(0xe0 | code >> 12, 0x80 | code >> 6 & 0x3f, 0x80 | code & 0x3f);
          }
        }
      }
    }
    return Uint8Array.from(out);
  }
}
export function utf8Decode(bytes: Uint8Array): string {
  if (stryMutAct_9fa48("34647")) {
    {}
  } else {
    stryCov_9fa48("34647");
    let out = stryMutAct_9fa48("34648") ? "Stryker was here!" : (stryCov_9fa48("34648"), "");
    for (let i = 0; stryMutAct_9fa48("34651") ? i >= bytes.length : stryMutAct_9fa48("34650") ? i <= bytes.length : stryMutAct_9fa48("34649") ? false : (stryCov_9fa48("34649", "34650", "34651"), i < bytes.length);) {
      if (stryMutAct_9fa48("34652")) {
        {}
      } else {
        stryCov_9fa48("34652");
        const b0 = bytes[i]!;
        if (stryMutAct_9fa48("34656") ? b0 >= 0x80 : stryMutAct_9fa48("34655") ? b0 <= 0x80 : stryMutAct_9fa48("34654") ? false : stryMutAct_9fa48("34653") ? true : (stryCov_9fa48("34653", "34654", "34655", "34656"), b0 < 0x80)) {
          if (stryMutAct_9fa48("34657")) {
            {}
          } else {
            stryCov_9fa48("34657");
            stryMutAct_9fa48("34658") ? out -= String.fromCharCode(b0) : (stryCov_9fa48("34658"), out += String.fromCharCode(b0));
            stryMutAct_9fa48("34659") ? i -= 1 : (stryCov_9fa48("34659"), i += 1);
          }
        } else if (stryMutAct_9fa48("34662") ? (b0 & 0xe0) === 0xc0 || i + 1 < bytes.length : stryMutAct_9fa48("34661") ? false : stryMutAct_9fa48("34660") ? true : (stryCov_9fa48("34660", "34661", "34662"), (stryMutAct_9fa48("34664") ? (b0 & 0xe0) !== 0xc0 : stryMutAct_9fa48("34663") ? true : (stryCov_9fa48("34663", "34664"), (b0 & 0xe0) === 0xc0)) && (stryMutAct_9fa48("34667") ? i + 1 >= bytes.length : stryMutAct_9fa48("34666") ? i + 1 <= bytes.length : stryMutAct_9fa48("34665") ? true : (stryCov_9fa48("34665", "34666", "34667"), (stryMutAct_9fa48("34668") ? i - 1 : (stryCov_9fa48("34668"), i + 1)) < bytes.length)))) {
          if (stryMutAct_9fa48("34669")) {
            {}
          } else {
            stryCov_9fa48("34669");
            const b1 = bytes[stryMutAct_9fa48("34670") ? i - 1 : (stryCov_9fa48("34670"), i + 1)]!;
            stryMutAct_9fa48("34671") ? out -= String.fromCharCode((b0 & 0x1f) << 6 | b1 & 0x3f) : (stryCov_9fa48("34671"), out += String.fromCharCode((b0 & 0x1f) << 6 | b1 & 0x3f));
            stryMutAct_9fa48("34672") ? i -= 2 : (stryCov_9fa48("34672"), i += 2);
          }
        } else if (stryMutAct_9fa48("34675") ? (b0 & 0xf0) === 0xe0 || i + 2 < bytes.length : stryMutAct_9fa48("34674") ? false : stryMutAct_9fa48("34673") ? true : (stryCov_9fa48("34673", "34674", "34675"), (stryMutAct_9fa48("34677") ? (b0 & 0xf0) !== 0xe0 : stryMutAct_9fa48("34676") ? true : (stryCov_9fa48("34676", "34677"), (b0 & 0xf0) === 0xe0)) && (stryMutAct_9fa48("34680") ? i + 2 >= bytes.length : stryMutAct_9fa48("34679") ? i + 2 <= bytes.length : stryMutAct_9fa48("34678") ? true : (stryCov_9fa48("34678", "34679", "34680"), (stryMutAct_9fa48("34681") ? i - 2 : (stryCov_9fa48("34681"), i + 2)) < bytes.length)))) {
          if (stryMutAct_9fa48("34682")) {
            {}
          } else {
            stryCov_9fa48("34682");
            const b1 = bytes[stryMutAct_9fa48("34683") ? i - 1 : (stryCov_9fa48("34683"), i + 1)]!;
            const b2 = bytes[stryMutAct_9fa48("34684") ? i - 2 : (stryCov_9fa48("34684"), i + 2)]!;
            stryMutAct_9fa48("34685") ? out -= String.fromCharCode((b0 & 0x0f) << 12 | (b1 & 0x3f) << 6 | b2 & 0x3f) : (stryCov_9fa48("34685"), out += String.fromCharCode((b0 & 0x0f) << 12 | (b1 & 0x3f) << 6 | b2 & 0x3f));
            stryMutAct_9fa48("34686") ? i -= 3 : (stryCov_9fa48("34686"), i += 3);
          }
        } else if (stryMutAct_9fa48("34689") ? (b0 & 0xf8) === 0xf0 || i + 3 < bytes.length : stryMutAct_9fa48("34688") ? false : stryMutAct_9fa48("34687") ? true : (stryCov_9fa48("34687", "34688", "34689"), (stryMutAct_9fa48("34691") ? (b0 & 0xf8) !== 0xf0 : stryMutAct_9fa48("34690") ? true : (stryCov_9fa48("34690", "34691"), (b0 & 0xf8) === 0xf0)) && (stryMutAct_9fa48("34694") ? i + 3 >= bytes.length : stryMutAct_9fa48("34693") ? i + 3 <= bytes.length : stryMutAct_9fa48("34692") ? true : (stryCov_9fa48("34692", "34693", "34694"), (stryMutAct_9fa48("34695") ? i - 3 : (stryCov_9fa48("34695"), i + 3)) < bytes.length)))) {
          if (stryMutAct_9fa48("34696")) {
            {}
          } else {
            stryCov_9fa48("34696");
            const b1 = bytes[stryMutAct_9fa48("34697") ? i - 1 : (stryCov_9fa48("34697"), i + 1)]!;
            const b2 = bytes[stryMutAct_9fa48("34698") ? i - 2 : (stryCov_9fa48("34698"), i + 2)]!;
            const b3 = bytes[stryMutAct_9fa48("34699") ? i - 3 : (stryCov_9fa48("34699"), i + 3)]!;
            let code = (b0 & 0x07) << 18 | (b1 & 0x3f) << 12 | (b2 & 0x3f) << 6 | b3 & 0x3f;
            stryMutAct_9fa48("34700") ? code += 0x10000 : (stryCov_9fa48("34700"), code -= 0x10000);
            stryMutAct_9fa48("34701") ? out -= String.fromCharCode(0xd800 + (code >> 10), 0xdc00 + (code & 0x3ff)) : (stryCov_9fa48("34701"), out += String.fromCharCode(stryMutAct_9fa48("34702") ? 0xd800 - (code >> 10) : (stryCov_9fa48("34702"), 0xd800 + (code >> 10)), stryMutAct_9fa48("34703") ? 0xdc00 - (code & 0x3ff) : (stryCov_9fa48("34703"), 0xdc00 + (code & 0x3ff))));
            stryMutAct_9fa48("34704") ? i -= 4 : (stryCov_9fa48("34704"), i += 4);
          }
        } else {
          if (stryMutAct_9fa48("34705")) {
            {}
          } else {
            stryCov_9fa48("34705");
            out += stryMutAct_9fa48("34706") ? "" : (stryCov_9fa48("34706"), "\ufffd");
            stryMutAct_9fa48("34707") ? i -= 1 : (stryCov_9fa48("34707"), i += 1);
          }
        }
      }
    }
    return out;
  }
}

/** Encode a string as UTF-8, or copy an existing byte array. */
export function utf8OrBytes(value: string | Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("34708")) {
    {}
  } else {
    stryCov_9fa48("34708");
    return (stryMutAct_9fa48("34711") ? typeof value !== "string" : stryMutAct_9fa48("34710") ? false : stryMutAct_9fa48("34709") ? true : (stryCov_9fa48("34709", "34710", "34711"), typeof value === (stryMutAct_9fa48("34712") ? "" : (stryCov_9fa48("34712"), "string")))) ? utf8Encode(value) : Uint8Array.from(value);
  }
}

/**
 * UTF-8 encode is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `utf8Encode` reads beside
 * the step).
 */
export type Utf8EncodeState = Record<string, never>;
export type Utf8EncodeEvent = Event | {
  readonly kind: "utf8/encode-gate";
  readonly value: string;
};
export type Utf8EncodeAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface Utf8EncodeStepResult {
  readonly state: Utf8EncodeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly Utf8EncodeAction[];
}
export function initialUtf8EncodeState(): Utf8EncodeState {
  if (stryMutAct_9fa48("34713")) {
    {}
  } else {
    stryCov_9fa48("34713");
    return {};
  }
}
export function stepUtf8EncodeWithActions(state: Utf8EncodeState, event: Utf8EncodeEvent): Utf8EncodeStepResult {
  if (stryMutAct_9fa48("34714")) {
    {}
  } else {
    stryCov_9fa48("34714");
    if (stryMutAct_9fa48("34717") ? event.kind !== "utf8/encode-gate" : stryMutAct_9fa48("34716") ? false : stryMutAct_9fa48("34715") ? true : (stryCov_9fa48("34715", "34716", "34717"), event.kind === (stryMutAct_9fa48("34718") ? "" : (stryCov_9fa48("34718"), "utf8/encode-gate")))) {
      if (stryMutAct_9fa48("34719")) {
        {}
      } else {
        stryCov_9fa48("34719");
        return stryMutAct_9fa48("34720") ? {} : (stryCov_9fa48("34720"), {
          state,
          intents: stryMutAct_9fa48("34721") ? ["Stryker was here"] : (stryCov_9fa48("34721"), []),
          actions: stryMutAct_9fa48("34722") ? [] : (stryCov_9fa48("34722"), [stryMutAct_9fa48("34723") ? {} : (stryCov_9fa48("34723"), {
            kind: stryMutAct_9fa48("34724") ? "" : (stryCov_9fa48("34724"), "use-raw"),
            raw: utf8Encode(event.value)
          })])
        });
      }
    }
    return stryMutAct_9fa48("34725") ? {} : (stryCov_9fa48("34725"), {
      state,
      intents: stryMutAct_9fa48("34726") ? ["Stryker was here"] : (stryCov_9fa48("34726"), []),
      actions: stryMutAct_9fa48("34727") ? ["Stryker was here"] : (stryCov_9fa48("34727"), [])
    });
  }
}
export function shouldUseUtf8Encode(actions: ReadonlyArray<Utf8EncodeAction>): boolean {
  if (stryMutAct_9fa48("34728")) {
    {}
  } else {
    stryCov_9fa48("34728");
    return stryMutAct_9fa48("34729") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("34729"), actions.some(stryMutAct_9fa48("34730") ? () => undefined : (stryCov_9fa48("34730"), action => stryMutAct_9fa48("34733") ? action.kind !== "use-raw" : stryMutAct_9fa48("34732") ? false : stryMutAct_9fa48("34731") ? true : (stryCov_9fa48("34731", "34732", "34733"), action.kind === (stryMutAct_9fa48("34734") ? "" : (stryCov_9fa48("34734"), "use-raw"))))));
  }
}

/** Extract UTF-8 encoded bytes from step actions; null when no `use-raw`. */
export function utf8EncodeRawFromActions(actions: ReadonlyArray<Utf8EncodeAction>): Uint8Array | null {
  if (stryMutAct_9fa48("34735")) {
    {}
  } else {
    stryCov_9fa48("34735");
    const action = actions.find(stryMutAct_9fa48("34736") ? () => undefined : (stryCov_9fa48("34736"), entry => stryMutAct_9fa48("34739") ? entry.kind !== "use-raw" : stryMutAct_9fa48("34738") ? false : stryMutAct_9fa48("34737") ? true : (stryCov_9fa48("34737", "34738", "34739"), entry.kind === (stryMutAct_9fa48("34740") ? "" : (stryCov_9fa48("34740"), "use-raw")))));
    return (stryMutAct_9fa48("34743") ? action?.kind !== "use-raw" : stryMutAct_9fa48("34742") ? false : stryMutAct_9fa48("34741") ? true : (stryCov_9fa48("34741", "34742", "34743"), (stryMutAct_9fa48("34744") ? action.kind : (stryCov_9fa48("34744"), action?.kind)) === (stryMutAct_9fa48("34745") ? "" : (stryCov_9fa48("34745"), "use-raw")))) ? action.raw : null;
  }
}
export interface Utf8DecodeFields {
  readonly text: string;
}

/**
 * UTF-8 decode is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `utf8Decode` reads beside
 * the step).
 */
export type Utf8DecodeState = Record<string, never>;
export type Utf8DecodeEvent = Event | {
  readonly kind: "utf8/decode-gate";
  readonly bytes: Uint8Array;
};
export type Utf8DecodeAction = {
  readonly kind: "use-fields";
  readonly fields: Utf8DecodeFields;
};
export interface Utf8DecodeStepResult {
  readonly state: Utf8DecodeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly Utf8DecodeAction[];
}
export function initialUtf8DecodeState(): Utf8DecodeState {
  if (stryMutAct_9fa48("34746")) {
    {}
  } else {
    stryCov_9fa48("34746");
    return {};
  }
}
export function stepUtf8DecodeWithActions(state: Utf8DecodeState, event: Utf8DecodeEvent): Utf8DecodeStepResult {
  if (stryMutAct_9fa48("34747")) {
    {}
  } else {
    stryCov_9fa48("34747");
    if (stryMutAct_9fa48("34750") ? event.kind !== "utf8/decode-gate" : stryMutAct_9fa48("34749") ? false : stryMutAct_9fa48("34748") ? true : (stryCov_9fa48("34748", "34749", "34750"), event.kind === (stryMutAct_9fa48("34751") ? "" : (stryCov_9fa48("34751"), "utf8/decode-gate")))) {
      if (stryMutAct_9fa48("34752")) {
        {}
      } else {
        stryCov_9fa48("34752");
        return stryMutAct_9fa48("34753") ? {} : (stryCov_9fa48("34753"), {
          state,
          intents: stryMutAct_9fa48("34754") ? ["Stryker was here"] : (stryCov_9fa48("34754"), []),
          actions: stryMutAct_9fa48("34755") ? [] : (stryCov_9fa48("34755"), [stryMutAct_9fa48("34756") ? {} : (stryCov_9fa48("34756"), {
            kind: stryMutAct_9fa48("34757") ? "" : (stryCov_9fa48("34757"), "use-fields"),
            fields: stryMutAct_9fa48("34758") ? {} : (stryCov_9fa48("34758"), {
              text: utf8Decode(event.bytes)
            })
          })])
        });
      }
    }
    return stryMutAct_9fa48("34759") ? {} : (stryCov_9fa48("34759"), {
      state,
      intents: stryMutAct_9fa48("34760") ? ["Stryker was here"] : (stryCov_9fa48("34760"), []),
      actions: stryMutAct_9fa48("34761") ? ["Stryker was here"] : (stryCov_9fa48("34761"), [])
    });
  }
}
export function shouldUseUtf8Decode(actions: ReadonlyArray<Utf8DecodeAction>): boolean {
  if (stryMutAct_9fa48("34762")) {
    {}
  } else {
    stryCov_9fa48("34762");
    return stryMutAct_9fa48("34763") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("34763"), actions.some(stryMutAct_9fa48("34764") ? () => undefined : (stryCov_9fa48("34764"), action => stryMutAct_9fa48("34767") ? action.kind !== "use-fields" : stryMutAct_9fa48("34766") ? false : stryMutAct_9fa48("34765") ? true : (stryCov_9fa48("34765", "34766", "34767"), action.kind === (stryMutAct_9fa48("34768") ? "" : (stryCov_9fa48("34768"), "use-fields"))))));
  }
}

/** Extract decoded UTF-8 text from step actions; null when no `use-fields`. */
export function utf8DecodeTextFromActions(actions: ReadonlyArray<Utf8DecodeAction>): string | null {
  if (stryMutAct_9fa48("34769")) {
    {}
  } else {
    stryCov_9fa48("34769");
    const action = actions.find(stryMutAct_9fa48("34770") ? () => undefined : (stryCov_9fa48("34770"), entry => stryMutAct_9fa48("34773") ? entry.kind !== "use-fields" : stryMutAct_9fa48("34772") ? false : stryMutAct_9fa48("34771") ? true : (stryCov_9fa48("34771", "34772", "34773"), entry.kind === (stryMutAct_9fa48("34774") ? "" : (stryCov_9fa48("34774"), "use-fields")))));
    return (stryMutAct_9fa48("34777") ? action?.kind !== "use-fields" : stryMutAct_9fa48("34776") ? false : stryMutAct_9fa48("34775") ? true : (stryCov_9fa48("34775", "34776", "34777"), (stryMutAct_9fa48("34778") ? action.kind : (stryCov_9fa48("34778"), action?.kind)) === (stryMutAct_9fa48("34779") ? "" : (stryCov_9fa48("34779"), "use-fields")))) ? action.fields.text : null;
  }
}

/**
 * UTF-8-or-bytes is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `utf8OrBytes` reads beside
 * the step).
 */
export type Utf8OrBytesState = Record<string, never>;
export type Utf8OrBytesEvent = Event | {
  readonly kind: "utf8/or-bytes-gate";
  readonly value: string | Uint8Array;
};
export type Utf8OrBytesAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface Utf8OrBytesStepResult {
  readonly state: Utf8OrBytesState;
  readonly intents: readonly Intent[];
  readonly actions: readonly Utf8OrBytesAction[];
}
export function initialUtf8OrBytesState(): Utf8OrBytesState {
  if (stryMutAct_9fa48("34780")) {
    {}
  } else {
    stryCov_9fa48("34780");
    return {};
  }
}
export function stepUtf8OrBytesWithActions(state: Utf8OrBytesState, event: Utf8OrBytesEvent): Utf8OrBytesStepResult {
  if (stryMutAct_9fa48("34781")) {
    {}
  } else {
    stryCov_9fa48("34781");
    if (stryMutAct_9fa48("34784") ? event.kind !== "utf8/or-bytes-gate" : stryMutAct_9fa48("34783") ? false : stryMutAct_9fa48("34782") ? true : (stryCov_9fa48("34782", "34783", "34784"), event.kind === (stryMutAct_9fa48("34785") ? "" : (stryCov_9fa48("34785"), "utf8/or-bytes-gate")))) {
      if (stryMutAct_9fa48("34786")) {
        {}
      } else {
        stryCov_9fa48("34786");
        return stryMutAct_9fa48("34787") ? {} : (stryCov_9fa48("34787"), {
          state,
          intents: stryMutAct_9fa48("34788") ? ["Stryker was here"] : (stryCov_9fa48("34788"), []),
          actions: stryMutAct_9fa48("34789") ? [] : (stryCov_9fa48("34789"), [stryMutAct_9fa48("34790") ? {} : (stryCov_9fa48("34790"), {
            kind: stryMutAct_9fa48("34791") ? "" : (stryCov_9fa48("34791"), "use-raw"),
            raw: utf8OrBytes(event.value)
          })])
        });
      }
    }
    return stryMutAct_9fa48("34792") ? {} : (stryCov_9fa48("34792"), {
      state,
      intents: stryMutAct_9fa48("34793") ? ["Stryker was here"] : (stryCov_9fa48("34793"), []),
      actions: stryMutAct_9fa48("34794") ? ["Stryker was here"] : (stryCov_9fa48("34794"), [])
    });
  }
}
export function shouldUseUtf8OrBytes(actions: ReadonlyArray<Utf8OrBytesAction>): boolean {
  if (stryMutAct_9fa48("34795")) {
    {}
  } else {
    stryCov_9fa48("34795");
    return stryMutAct_9fa48("34796") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("34796"), actions.some(stryMutAct_9fa48("34797") ? () => undefined : (stryCov_9fa48("34797"), action => stryMutAct_9fa48("34800") ? action.kind !== "use-raw" : stryMutAct_9fa48("34799") ? false : stryMutAct_9fa48("34798") ? true : (stryCov_9fa48("34798", "34799", "34800"), action.kind === (stryMutAct_9fa48("34801") ? "" : (stryCov_9fa48("34801"), "use-raw"))))));
  }
}

/** Extract UTF-8-or-bytes result from step actions; null when no `use-raw`. */
export function utf8OrBytesRawFromActions(actions: ReadonlyArray<Utf8OrBytesAction>): Uint8Array | null {
  if (stryMutAct_9fa48("34802")) {
    {}
  } else {
    stryCov_9fa48("34802");
    const action = actions.find(stryMutAct_9fa48("34803") ? () => undefined : (stryCov_9fa48("34803"), entry => stryMutAct_9fa48("34806") ? entry.kind !== "use-raw" : stryMutAct_9fa48("34805") ? false : stryMutAct_9fa48("34804") ? true : (stryCov_9fa48("34804", "34805", "34806"), entry.kind === (stryMutAct_9fa48("34807") ? "" : (stryCov_9fa48("34807"), "use-raw")))));
    return (stryMutAct_9fa48("34810") ? action?.kind !== "use-raw" : stryMutAct_9fa48("34809") ? false : stryMutAct_9fa48("34808") ? true : (stryCov_9fa48("34808", "34809", "34810"), (stryMutAct_9fa48("34811") ? action.kind : (stryCov_9fa48("34811"), action?.kind)) === (stryMutAct_9fa48("34812") ? "" : (stryCov_9fa48("34812"), "use-raw")))) ? action.raw : null;
  }
}