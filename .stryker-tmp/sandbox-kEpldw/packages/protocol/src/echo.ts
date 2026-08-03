/**
 * Example leaf protocol machine: echo with optional delayed ack.
 * Lives here to prove the step/intent pattern and feed determinism tests.
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
import type { Event, Intent, StepResult } from "@twistedpear/effects";
export interface EchoState {
  readonly inbox: readonly string[];
  readonly pendingAcks: readonly string[];
}
export function initialEchoState(): EchoState {
  if (stryMutAct_9fa48("8405")) {
    {}
  } else {
    stryCov_9fa48("8405");
    return stryMutAct_9fa48("8406") ? {} : (stryCov_9fa48("8406"), {
      inbox: stryMutAct_9fa48("8407") ? ["Stryker was here"] : (stryCov_9fa48("8407"), []),
      pendingAcks: stryMutAct_9fa48("8408") ? ["Stryker was here"] : (stryCov_9fa48("8408"), [])
    });
  }
}
export function stepEcho(state: EchoState, event: Event): StepResult<EchoState> {
  if (stryMutAct_9fa48("8409")) {
    {}
  } else {
    stryCov_9fa48("8409");
    if (stryMutAct_9fa48("8412") ? event.kind !== "start" : stryMutAct_9fa48("8411") ? false : stryMutAct_9fa48("8410") ? true : (stryCov_9fa48("8410", "8411", "8412"), event.kind === (stryMutAct_9fa48("8413") ? "" : (stryCov_9fa48("8413"), "start")))) {
      if (stryMutAct_9fa48("8414")) {
        {}
      } else {
        stryCov_9fa48("8414");
        return stryMutAct_9fa48("8415") ? {} : (stryCov_9fa48("8415"), {
          state,
          intents: stryMutAct_9fa48("8416") ? ["Stryker was here"] : (stryCov_9fa48("8416"), [])
        });
      }
    }
    if (stryMutAct_9fa48("8419") ? event.kind !== "transport/recv" : stryMutAct_9fa48("8418") ? false : stryMutAct_9fa48("8417") ? true : (stryCov_9fa48("8417", "8418", "8419"), event.kind === (stryMutAct_9fa48("8420") ? "" : (stryCov_9fa48("8420"), "transport/recv")))) {
      if (stryMutAct_9fa48("8421")) {
        {}
      } else {
        stryCov_9fa48("8421");
        const text = decodeUtf8(event.payload);
        // Ignore our own echo replies to avoid a multi-node feedback loop.
        if (stryMutAct_9fa48("8424") ? text.endsWith("echo:") : stryMutAct_9fa48("8423") ? false : stryMutAct_9fa48("8422") ? true : (stryCov_9fa48("8422", "8423", "8424"), text.startsWith(stryMutAct_9fa48("8425") ? "" : (stryCov_9fa48("8425"), "echo:")))) {
          if (stryMutAct_9fa48("8426")) {
            {}
          } else {
            stryCov_9fa48("8426");
            return stryMutAct_9fa48("8427") ? {} : (stryCov_9fa48("8427"), {
              state: stryMutAct_9fa48("8428") ? {} : (stryCov_9fa48("8428"), {
                ...state,
                inbox: stryMutAct_9fa48("8429") ? [] : (stryCov_9fa48("8429"), [...state.inbox, text])
              }),
              intents: stryMutAct_9fa48("8430") ? ["Stryker was here"] : (stryCov_9fa48("8430"), [])
            });
          }
        }
        const ackId = stryMutAct_9fa48("8431") ? `` : (stryCov_9fa48("8431"), `ack:${event.source}:${state.inbox.length}`);
        const intents: Intent[] = stryMutAct_9fa48("8432") ? [] : (stryCov_9fa48("8432"), [stryMutAct_9fa48("8433") ? {} : (stryCov_9fa48("8433"), {
          kind: stryMutAct_9fa48("8434") ? "" : (stryCov_9fa48("8434"), "transport/send"),
          send: stryMutAct_9fa48("8435") ? {} : (stryCov_9fa48("8435"), {
            channel: event.channel,
            destination: event.source,
            payload: encodeUtf8(stryMutAct_9fa48("8436") ? `` : (stryCov_9fa48("8436"), `echo:${text}`))
          })
        }), stryMutAct_9fa48("8437") ? {} : (stryCov_9fa48("8437"), {
          kind: stryMutAct_9fa48("8438") ? "" : (stryCov_9fa48("8438"), "timer/set"),
          timer: stryMutAct_9fa48("8439") ? {} : (stryCov_9fa48("8439"), {
            id: ackId,
            delayMs: 10
          })
        })]);
        return stryMutAct_9fa48("8440") ? {} : (stryCov_9fa48("8440"), {
          state: stryMutAct_9fa48("8441") ? {} : (stryCov_9fa48("8441"), {
            inbox: stryMutAct_9fa48("8442") ? [] : (stryCov_9fa48("8442"), [...state.inbox, text]),
            pendingAcks: stryMutAct_9fa48("8443") ? [] : (stryCov_9fa48("8443"), [...state.pendingAcks, ackId])
          }),
          intents
        });
      }
    }
    if (stryMutAct_9fa48("8446") ? event.kind !== "timer/fired" : stryMutAct_9fa48("8445") ? false : stryMutAct_9fa48("8444") ? true : (stryCov_9fa48("8444", "8445", "8446"), event.kind === (stryMutAct_9fa48("8447") ? "" : (stryCov_9fa48("8447"), "timer/fired")))) {
      if (stryMutAct_9fa48("8448")) {
        {}
      } else {
        stryCov_9fa48("8448");
        const pendingAcks = stryMutAct_9fa48("8449") ? state.pendingAcks : (stryCov_9fa48("8449"), state.pendingAcks.filter(stryMutAct_9fa48("8450") ? () => undefined : (stryCov_9fa48("8450"), id => stryMutAct_9fa48("8453") ? id === event.id : stryMutAct_9fa48("8452") ? false : stryMutAct_9fa48("8451") ? true : (stryCov_9fa48("8451", "8452", "8453"), id !== event.id))));
        return stryMutAct_9fa48("8454") ? {} : (stryCov_9fa48("8454"), {
          state: stryMutAct_9fa48("8455") ? {} : (stryCov_9fa48("8455"), {
            ...state,
            pendingAcks
          }),
          intents: stryMutAct_9fa48("8456") ? [] : (stryCov_9fa48("8456"), [stryMutAct_9fa48("8457") ? {} : (stryCov_9fa48("8457"), {
            kind: stryMutAct_9fa48("8458") ? "" : (stryCov_9fa48("8458"), "log"),
            level: stryMutAct_9fa48("8459") ? "" : (stryCov_9fa48("8459"), "debug"),
            message: stryMutAct_9fa48("8460") ? `` : (stryCov_9fa48("8460"), `ack-complete:${event.id}`)
          })])
        });
      }
    }
    return stryMutAct_9fa48("8461") ? {} : (stryCov_9fa48("8461"), {
      state,
      intents: stryMutAct_9fa48("8462") ? ["Stryker was here"] : (stryCov_9fa48("8462"), [])
    });
  }
}
function encodeUtf8(text: string): Uint8Array {
  if (stryMutAct_9fa48("8463")) {
    {}
  } else {
    stryCov_9fa48("8463");
    const out = new Uint8Array(text.length);
    for (let i = 0; stryMutAct_9fa48("8466") ? i >= text.length : stryMutAct_9fa48("8465") ? i <= text.length : stryMutAct_9fa48("8464") ? false : (stryCov_9fa48("8464", "8465", "8466"), i < text.length); stryMutAct_9fa48("8467") ? i -= 1 : (stryCov_9fa48("8467"), i += 1)) {
      if (stryMutAct_9fa48("8468")) {
        {}
      } else {
        stryCov_9fa48("8468");
        out[i] = text.charCodeAt(i) & 0xff;
      }
    }
    return out;
  }
}
function decodeUtf8(bytes: Uint8Array): string {
  if (stryMutAct_9fa48("8469")) {
    {}
  } else {
    stryCov_9fa48("8469");
    let text = stryMutAct_9fa48("8470") ? "Stryker was here!" : (stryCov_9fa48("8470"), "");
    for (const b of bytes) {
      if (stryMutAct_9fa48("8471")) {
        {}
      } else {
        stryCov_9fa48("8471");
        stryMutAct_9fa48("8472") ? text -= String.fromCharCode(b) : (stryCov_9fa48("8472"), text += String.fromCharCode(b));
      }
    }
    return text;
  }
}