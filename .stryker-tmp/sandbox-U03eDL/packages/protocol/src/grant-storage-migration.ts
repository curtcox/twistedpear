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
import type { GrantRecord } from "./grants.js";
import { encodeGrantRecord } from "./grants.js";
import { utf8Decode } from "./utf8.js";

/** Host adapter only: validate an old JSON record and return its canonical replacement. */
export function migrateLegacyGrantRecord(bytes: Uint8Array): Uint8Array | null {
  if (stryMutAct_9fa48("8888")) {
    {}
  } else {
    stryCov_9fa48("8888");
    try {
      if (stryMutAct_9fa48("8889")) {
        {}
      } else {
        stryCov_9fa48("8889");
        const text = utf8Decode(bytes);
        const keys = topLevelObjectKeys(text);
        if (stryMutAct_9fa48("8892") ? keys === null && new Set(keys).size !== keys.length : stryMutAct_9fa48("8891") ? false : stryMutAct_9fa48("8890") ? true : (stryCov_9fa48("8890", "8891", "8892"), (stryMutAct_9fa48("8894") ? keys !== null : stryMutAct_9fa48("8893") ? false : (stryCov_9fa48("8893", "8894"), keys === null)) || (stryMutAct_9fa48("8896") ? new Set(keys).size === keys.length : stryMutAct_9fa48("8895") ? false : (stryCov_9fa48("8895", "8896"), new Set(keys).size !== keys.length)))) return null;
        const value: unknown = JSON.parse(text);
        if (stryMutAct_9fa48("8899") ? (typeof value !== "object" || value === null) && Array.isArray(value) : stryMutAct_9fa48("8898") ? false : stryMutAct_9fa48("8897") ? true : (stryCov_9fa48("8897", "8898", "8899"), (stryMutAct_9fa48("8901") ? typeof value !== "object" && value === null : stryMutAct_9fa48("8900") ? false : (stryCov_9fa48("8900", "8901"), (stryMutAct_9fa48("8903") ? typeof value === "object" : stryMutAct_9fa48("8902") ? false : (stryCov_9fa48("8902", "8903"), typeof value !== (stryMutAct_9fa48("8904") ? "" : (stryCov_9fa48("8904"), "object")))) || (stryMutAct_9fa48("8906") ? value !== null : stryMutAct_9fa48("8905") ? false : (stryCov_9fa48("8905", "8906"), value === null)))) || Array.isArray(value))) return null;
        const record = value as Record<string, unknown>;
        if (stryMutAct_9fa48("8909") ? Object.keys(record).every(key => !["appId", "publisherPublicKey", "granted", "updatedAt"].includes(key)) : stryMutAct_9fa48("8908") ? false : stryMutAct_9fa48("8907") ? true : (stryCov_9fa48("8907", "8908", "8909"), Object.keys(record).some(stryMutAct_9fa48("8910") ? () => undefined : (stryCov_9fa48("8910"), key => stryMutAct_9fa48("8911") ? ["appId", "publisherPublicKey", "granted", "updatedAt"].includes(key) : (stryCov_9fa48("8911"), !(stryMutAct_9fa48("8912") ? [] : (stryCov_9fa48("8912"), [stryMutAct_9fa48("8913") ? "" : (stryCov_9fa48("8913"), "appId"), stryMutAct_9fa48("8914") ? "" : (stryCov_9fa48("8914"), "publisherPublicKey"), stryMutAct_9fa48("8915") ? "" : (stryCov_9fa48("8915"), "granted"), stryMutAct_9fa48("8916") ? "" : (stryCov_9fa48("8916"), "updatedAt")])).includes(key)))))) return null;
        if (stryMutAct_9fa48("8919") ? (typeof record.appId !== "string" || typeof record.publisherPublicKey !== "string" || !Array.isArray(record.granted) || record.granted.some(entry => typeof entry !== "string") || new Set(record.granted).size !== record.granted.length || typeof record.updatedAt !== "number" || !Number.isSafeInteger(record.updatedAt)) && record.updatedAt < 0 : stryMutAct_9fa48("8918") ? false : stryMutAct_9fa48("8917") ? true : (stryCov_9fa48("8917", "8918", "8919"), (stryMutAct_9fa48("8921") ? (typeof record.appId !== "string" || typeof record.publisherPublicKey !== "string" || !Array.isArray(record.granted) || record.granted.some(entry => typeof entry !== "string") || new Set(record.granted).size !== record.granted.length || typeof record.updatedAt !== "number") && !Number.isSafeInteger(record.updatedAt) : stryMutAct_9fa48("8920") ? false : (stryCov_9fa48("8920", "8921"), (stryMutAct_9fa48("8923") ? (typeof record.appId !== "string" || typeof record.publisherPublicKey !== "string" || !Array.isArray(record.granted) || record.granted.some(entry => typeof entry !== "string") || new Set(record.granted).size !== record.granted.length) && typeof record.updatedAt !== "number" : stryMutAct_9fa48("8922") ? false : (stryCov_9fa48("8922", "8923"), (stryMutAct_9fa48("8925") ? (typeof record.appId !== "string" || typeof record.publisherPublicKey !== "string" || !Array.isArray(record.granted) || record.granted.some(entry => typeof entry !== "string")) && new Set(record.granted).size !== record.granted.length : stryMutAct_9fa48("8924") ? false : (stryCov_9fa48("8924", "8925"), (stryMutAct_9fa48("8927") ? (typeof record.appId !== "string" || typeof record.publisherPublicKey !== "string" || !Array.isArray(record.granted)) && record.granted.some(entry => typeof entry !== "string") : stryMutAct_9fa48("8926") ? false : (stryCov_9fa48("8926", "8927"), (stryMutAct_9fa48("8929") ? (typeof record.appId !== "string" || typeof record.publisherPublicKey !== "string") && !Array.isArray(record.granted) : stryMutAct_9fa48("8928") ? false : (stryCov_9fa48("8928", "8929"), (stryMutAct_9fa48("8931") ? typeof record.appId !== "string" && typeof record.publisherPublicKey !== "string" : stryMutAct_9fa48("8930") ? false : (stryCov_9fa48("8930", "8931"), (stryMutAct_9fa48("8933") ? typeof record.appId === "string" : stryMutAct_9fa48("8932") ? false : (stryCov_9fa48("8932", "8933"), typeof record.appId !== (stryMutAct_9fa48("8934") ? "" : (stryCov_9fa48("8934"), "string")))) || (stryMutAct_9fa48("8936") ? typeof record.publisherPublicKey === "string" : stryMutAct_9fa48("8935") ? false : (stryCov_9fa48("8935", "8936"), typeof record.publisherPublicKey !== (stryMutAct_9fa48("8937") ? "" : (stryCov_9fa48("8937"), "string")))))) || (stryMutAct_9fa48("8938") ? Array.isArray(record.granted) : (stryCov_9fa48("8938"), !Array.isArray(record.granted))))) || (stryMutAct_9fa48("8939") ? record.granted.every(entry => typeof entry !== "string") : (stryCov_9fa48("8939"), record.granted.some(stryMutAct_9fa48("8940") ? () => undefined : (stryCov_9fa48("8940"), entry => stryMutAct_9fa48("8943") ? typeof entry === "string" : stryMutAct_9fa48("8942") ? false : stryMutAct_9fa48("8941") ? true : (stryCov_9fa48("8941", "8942", "8943"), typeof entry !== (stryMutAct_9fa48("8944") ? "" : (stryCov_9fa48("8944"), "string"))))))))) || (stryMutAct_9fa48("8946") ? new Set(record.granted).size === record.granted.length : stryMutAct_9fa48("8945") ? false : (stryCov_9fa48("8945", "8946"), new Set(record.granted).size !== record.granted.length)))) || (stryMutAct_9fa48("8948") ? typeof record.updatedAt === "number" : stryMutAct_9fa48("8947") ? false : (stryCov_9fa48("8947", "8948"), typeof record.updatedAt !== (stryMutAct_9fa48("8949") ? "" : (stryCov_9fa48("8949"), "number")))))) || (stryMutAct_9fa48("8950") ? Number.isSafeInteger(record.updatedAt) : (stryCov_9fa48("8950"), !Number.isSafeInteger(record.updatedAt))))) || (stryMutAct_9fa48("8953") ? record.updatedAt >= 0 : stryMutAct_9fa48("8952") ? record.updatedAt <= 0 : stryMutAct_9fa48("8951") ? false : (stryCov_9fa48("8951", "8952", "8953"), record.updatedAt < 0)))) return null;
        return encodeGrantRecord(record as unknown as GrantRecord);
      }
    } catch {
      if (stryMutAct_9fa48("8954")) {
        {}
      } else {
        stryCov_9fa48("8954");
        return null;
      }
    }
  }
}

/** Decode top-level key spellings before checking uniqueness (for example, `\u0061ppId`). */
function topLevelObjectKeys(text: string): readonly string[] | null {
  if (stryMutAct_9fa48("8955")) {
    {}
  } else {
    stryCov_9fa48("8955");
    const keys: string[] = stryMutAct_9fa48("8956") ? ["Stryker was here"] : (stryCov_9fa48("8956"), []);
    let objectDepth = 0;
    let arrayDepth = 0;
    let previous: "open" | "comma" | "other" = stryMutAct_9fa48("8957") ? "" : (stryCov_9fa48("8957"), "other");
    let offset = 0;
    while (stryMutAct_9fa48("8960") ? offset >= text.length : stryMutAct_9fa48("8959") ? offset <= text.length : stryMutAct_9fa48("8958") ? false : (stryCov_9fa48("8958", "8959", "8960"), offset < text.length)) {
      if (stryMutAct_9fa48("8961")) {
        {}
      } else {
        stryCov_9fa48("8961");
        const character = text[offset]!;
        if (stryMutAct_9fa48("8963") ? false : stryMutAct_9fa48("8962") ? true : (stryCov_9fa48("8962", "8963"), (stryMutAct_9fa48("8964") ? /\S/ : (stryCov_9fa48("8964"), /\s/)).test(character))) {
          if (stryMutAct_9fa48("8965")) {
            {}
          } else {
            stryCov_9fa48("8965");
            stryMutAct_9fa48("8966") ? offset -= 1 : (stryCov_9fa48("8966"), offset += 1);
            continue;
          }
        }
        if (stryMutAct_9fa48("8969") ? character !== "\"" : stryMutAct_9fa48("8968") ? false : stryMutAct_9fa48("8967") ? true : (stryCov_9fa48("8967", "8968", "8969"), character === (stryMutAct_9fa48("8970") ? "" : (stryCov_9fa48("8970"), "\"")))) {
          if (stryMutAct_9fa48("8971")) {
            {}
          } else {
            stryCov_9fa48("8971");
            const end = jsonStringEnd(text, offset);
            if (stryMutAct_9fa48("8974") ? end !== null : stryMutAct_9fa48("8973") ? false : stryMutAct_9fa48("8972") ? true : (stryCov_9fa48("8972", "8973", "8974"), end === null)) return null;
            if (stryMutAct_9fa48("8977") ? objectDepth === 1 && arrayDepth === 0 || previous === "open" || previous === "comma" : stryMutAct_9fa48("8976") ? false : stryMutAct_9fa48("8975") ? true : (stryCov_9fa48("8975", "8976", "8977"), (stryMutAct_9fa48("8979") ? objectDepth === 1 || arrayDepth === 0 : stryMutAct_9fa48("8978") ? true : (stryCov_9fa48("8978", "8979"), (stryMutAct_9fa48("8981") ? objectDepth !== 1 : stryMutAct_9fa48("8980") ? true : (stryCov_9fa48("8980", "8981"), objectDepth === 1)) && (stryMutAct_9fa48("8983") ? arrayDepth !== 0 : stryMutAct_9fa48("8982") ? true : (stryCov_9fa48("8982", "8983"), arrayDepth === 0)))) && (stryMutAct_9fa48("8985") ? previous === "open" && previous === "comma" : stryMutAct_9fa48("8984") ? true : (stryCov_9fa48("8984", "8985"), (stryMutAct_9fa48("8987") ? previous !== "open" : stryMutAct_9fa48("8986") ? false : (stryCov_9fa48("8986", "8987"), previous === (stryMutAct_9fa48("8988") ? "" : (stryCov_9fa48("8988"), "open")))) || (stryMutAct_9fa48("8990") ? previous !== "comma" : stryMutAct_9fa48("8989") ? false : (stryCov_9fa48("8989", "8990"), previous === (stryMutAct_9fa48("8991") ? "" : (stryCov_9fa48("8991"), "comma")))))))) {
              if (stryMutAct_9fa48("8992")) {
                {}
              } else {
                stryCov_9fa48("8992");
                const key: unknown = JSON.parse(stryMutAct_9fa48("8993") ? text : (stryCov_9fa48("8993"), text.slice(offset, end)));
                if (stryMutAct_9fa48("8996") ? typeof key === "string" : stryMutAct_9fa48("8995") ? false : stryMutAct_9fa48("8994") ? true : (stryCov_9fa48("8994", "8995", "8996"), typeof key !== (stryMutAct_9fa48("8997") ? "" : (stryCov_9fa48("8997"), "string")))) return null;
                keys.push(key);
              }
            }
            previous = stryMutAct_9fa48("8998") ? "" : (stryCov_9fa48("8998"), "other");
            offset = end;
            continue;
          }
        }
        if (stryMutAct_9fa48("9001") ? character !== "{" : stryMutAct_9fa48("9000") ? false : stryMutAct_9fa48("8999") ? true : (stryCov_9fa48("8999", "9000", "9001"), character === (stryMutAct_9fa48("9002") ? "" : (stryCov_9fa48("9002"), "{")))) {
          if (stryMutAct_9fa48("9003")) {
            {}
          } else {
            stryCov_9fa48("9003");
            stryMutAct_9fa48("9004") ? objectDepth -= 1 : (stryCov_9fa48("9004"), objectDepth += 1);
            previous = stryMutAct_9fa48("9005") ? "" : (stryCov_9fa48("9005"), "open");
          }
        } else if (stryMutAct_9fa48("9008") ? character !== "}" : stryMutAct_9fa48("9007") ? false : stryMutAct_9fa48("9006") ? true : (stryCov_9fa48("9006", "9007", "9008"), character === (stryMutAct_9fa48("9009") ? "" : (stryCov_9fa48("9009"), "}")))) {
          if (stryMutAct_9fa48("9010")) {
            {}
          } else {
            stryCov_9fa48("9010");
            stryMutAct_9fa48("9011") ? objectDepth += 1 : (stryCov_9fa48("9011"), objectDepth -= 1);
            previous = stryMutAct_9fa48("9012") ? "" : (stryCov_9fa48("9012"), "other");
          }
        } else if (stryMutAct_9fa48("9015") ? character !== "[" : stryMutAct_9fa48("9014") ? false : stryMutAct_9fa48("9013") ? true : (stryCov_9fa48("9013", "9014", "9015"), character === (stryMutAct_9fa48("9016") ? "" : (stryCov_9fa48("9016"), "[")))) {
          if (stryMutAct_9fa48("9017")) {
            {}
          } else {
            stryCov_9fa48("9017");
            stryMutAct_9fa48("9018") ? arrayDepth -= 1 : (stryCov_9fa48("9018"), arrayDepth += 1);
            previous = stryMutAct_9fa48("9019") ? "" : (stryCov_9fa48("9019"), "other");
          }
        } else if (stryMutAct_9fa48("9022") ? character !== "]" : stryMutAct_9fa48("9021") ? false : stryMutAct_9fa48("9020") ? true : (stryCov_9fa48("9020", "9021", "9022"), character === (stryMutAct_9fa48("9023") ? "" : (stryCov_9fa48("9023"), "]")))) {
          if (stryMutAct_9fa48("9024")) {
            {}
          } else {
            stryCov_9fa48("9024");
            stryMutAct_9fa48("9025") ? arrayDepth += 1 : (stryCov_9fa48("9025"), arrayDepth -= 1);
            previous = stryMutAct_9fa48("9026") ? "" : (stryCov_9fa48("9026"), "other");
          }
        } else if (stryMutAct_9fa48("9029") ? character !== "," : stryMutAct_9fa48("9028") ? false : stryMutAct_9fa48("9027") ? true : (stryCov_9fa48("9027", "9028", "9029"), character === (stryMutAct_9fa48("9030") ? "" : (stryCov_9fa48("9030"), ",")))) {
          if (stryMutAct_9fa48("9031")) {
            {}
          } else {
            stryCov_9fa48("9031");
            previous = stryMutAct_9fa48("9032") ? "" : (stryCov_9fa48("9032"), "comma");
          }
        } else if (stryMutAct_9fa48("9035") ? character === ":" : stryMutAct_9fa48("9034") ? false : stryMutAct_9fa48("9033") ? true : (stryCov_9fa48("9033", "9034", "9035"), character !== (stryMutAct_9fa48("9036") ? "" : (stryCov_9fa48("9036"), ":")))) {
          if (stryMutAct_9fa48("9037")) {
            {}
          } else {
            stryCov_9fa48("9037");
            previous = stryMutAct_9fa48("9038") ? "" : (stryCov_9fa48("9038"), "other");
          }
        }
        if (stryMutAct_9fa48("9041") ? objectDepth < 0 && arrayDepth < 0 : stryMutAct_9fa48("9040") ? false : stryMutAct_9fa48("9039") ? true : (stryCov_9fa48("9039", "9040", "9041"), (stryMutAct_9fa48("9044") ? objectDepth >= 0 : stryMutAct_9fa48("9043") ? objectDepth <= 0 : stryMutAct_9fa48("9042") ? false : (stryCov_9fa48("9042", "9043", "9044"), objectDepth < 0)) || (stryMutAct_9fa48("9047") ? arrayDepth >= 0 : stryMutAct_9fa48("9046") ? arrayDepth <= 0 : stryMutAct_9fa48("9045") ? false : (stryCov_9fa48("9045", "9046", "9047"), arrayDepth < 0)))) return null;
        stryMutAct_9fa48("9048") ? offset -= 1 : (stryCov_9fa48("9048"), offset += 1);
      }
    }
    return (stryMutAct_9fa48("9051") ? objectDepth === 0 || arrayDepth === 0 : stryMutAct_9fa48("9050") ? false : stryMutAct_9fa48("9049") ? true : (stryCov_9fa48("9049", "9050", "9051"), (stryMutAct_9fa48("9053") ? objectDepth !== 0 : stryMutAct_9fa48("9052") ? true : (stryCov_9fa48("9052", "9053"), objectDepth === 0)) && (stryMutAct_9fa48("9055") ? arrayDepth !== 0 : stryMutAct_9fa48("9054") ? true : (stryCov_9fa48("9054", "9055"), arrayDepth === 0)))) ? keys : null;
  }
}
function jsonStringEnd(text: string, start: number): number | null {
  if (stryMutAct_9fa48("9056")) {
    {}
  } else {
    stryCov_9fa48("9056");
    for (let offset = stryMutAct_9fa48("9057") ? start - 1 : (stryCov_9fa48("9057"), start + 1); stryMutAct_9fa48("9060") ? offset >= text.length : stryMutAct_9fa48("9059") ? offset <= text.length : stryMutAct_9fa48("9058") ? false : (stryCov_9fa48("9058", "9059", "9060"), offset < text.length); stryMutAct_9fa48("9061") ? offset -= 1 : (stryCov_9fa48("9061"), offset += 1)) {
      if (stryMutAct_9fa48("9062")) {
        {}
      } else {
        stryCov_9fa48("9062");
        if (stryMutAct_9fa48("9065") ? text[offset] !== "\\" : stryMutAct_9fa48("9064") ? false : stryMutAct_9fa48("9063") ? true : (stryCov_9fa48("9063", "9064", "9065"), text[offset] === (stryMutAct_9fa48("9066") ? "" : (stryCov_9fa48("9066"), "\\")))) {
          if (stryMutAct_9fa48("9067")) {
            {}
          } else {
            stryCov_9fa48("9067");
            stryMutAct_9fa48("9068") ? offset -= 1 : (stryCov_9fa48("9068"), offset += 1);
            continue;
          }
        }
        if (stryMutAct_9fa48("9071") ? text[offset] !== "\"" : stryMutAct_9fa48("9070") ? false : stryMutAct_9fa48("9069") ? true : (stryCov_9fa48("9069", "9070", "9071"), text[offset] === (stryMutAct_9fa48("9072") ? "" : (stryCov_9fa48("9072"), "\"")))) return stryMutAct_9fa48("9073") ? offset - 1 : (stryCov_9fa48("9073"), offset + 1);
      }
    }
    return null;
  }
}