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
import { interpret, type EventClass, type Machine } from "@twistedpear/effects";
export type GrantParserPhase = "expect-open" | "expect-appId-key" | "expect-appId-colon" | "expect-appId" | "expect-publisher-comma" | "expect-publisher-key" | "expect-publisher-colon" | "expect-publisher" | "expect-granted-comma" | "expect-granted-key" | "expect-granted-colon" | "expect-array-open" | "expect-capability-or-end" | "expect-capability-comma-or-end" | "expect-capability" | "expect-updated-comma" | "expect-updated-key" | "expect-updated-colon" | "expect-updated" | "expect-close" | "expect-eof" | "accept";
export type GrantParserToken = {
  readonly kind: "open" | "close" | "colon" | "comma" | "array-open" | "array-close" | "eof";
} | {
  readonly kind: "string";
  readonly value: string;
} | {
  readonly kind: "integer";
  readonly value: number;
};
export interface GrantParserState {
  readonly phase: GrantParserPhase;
  readonly appId?: string;
  readonly publisherPublicKey?: string;
  readonly granted: readonly string[];
  readonly updatedAt?: number;
}
const token = stryMutAct_9fa48("8743") ? () => undefined : (stryCov_9fa48("8743"), (() => {
  const token = <K extends GrantParserToken["kind"],>(kind: K): EventClass<GrantParserToken> => stryMutAct_9fa48("8744") ? {} : (stryCov_9fa48("8744"), {
    name: kind,
    matches: stryMutAct_9fa48("8745") ? () => undefined : (stryCov_9fa48("8745"), event => stryMutAct_9fa48("8748") ? event.kind !== kind : stryMutAct_9fa48("8747") ? false : stryMutAct_9fa48("8746") ? true : (stryCov_9fa48("8746", "8747", "8748"), event.kind === kind))
  });
  return token;
})());
export const grantParserTokenClasses = {
  open: token("open"),
  close: token("close"),
  colon: token("colon"),
  comma: token("comma"),
  arrayOpen: token("array-open"),
  arrayClose: token("array-close"),
  string: token("string"),
  integer: token("integer"),
  eof: token("eof")
} as const;
const t = grantParserTokenClasses;
const stringIs = stryMutAct_9fa48("8749") ? () => undefined : (stryCov_9fa48("8749"), (() => {
  const stringIs = (expected: string) => stryMutAct_9fa48("8750") ? () => undefined : (stryCov_9fa48("8750"), (_state: GrantParserState, event: GrantParserToken): boolean => stryMutAct_9fa48("8753") ? event.kind === "string" || event.value === expected : stryMutAct_9fa48("8752") ? false : stryMutAct_9fa48("8751") ? true : (stryCov_9fa48("8751", "8752", "8753"), (stryMutAct_9fa48("8755") ? event.kind !== "string" : stryMutAct_9fa48("8754") ? true : (stryCov_9fa48("8754", "8755"), event.kind === (stryMutAct_9fa48("8756") ? "" : (stryCov_9fa48("8756"), "string")))) && (stryMutAct_9fa48("8758") ? event.value !== expected : stryMutAct_9fa48("8757") ? true : (stryCov_9fa48("8757", "8758"), event.value === expected))));
  return stringIs;
})());
const captureString = stryMutAct_9fa48("8759") ? () => undefined : (stryCov_9fa48("8759"), (() => {
  const captureString = (field: "appId" | "publisherPublicKey") => stryMutAct_9fa48("8760") ? () => undefined : (stryCov_9fa48("8760"), (state: GrantParserState, event: GrantParserToken): GrantParserState => (stryMutAct_9fa48("8763") ? event.kind !== "string" : stryMutAct_9fa48("8762") ? false : stryMutAct_9fa48("8761") ? true : (stryCov_9fa48("8761", "8762", "8763"), event.kind === (stryMutAct_9fa48("8764") ? "" : (stryCov_9fa48("8764"), "string")))) ? stryMutAct_9fa48("8765") ? {} : (stryCov_9fa48("8765"), {
    ...state,
    [field]: event.value
  }) : state);
  return captureString;
})());
const addCapability = stryMutAct_9fa48("8766") ? () => undefined : (stryCov_9fa48("8766"), (() => {
  const addCapability = (state: GrantParserState, event: GrantParserToken): GrantParserState => (stryMutAct_9fa48("8769") ? event.kind !== "string" : stryMutAct_9fa48("8768") ? false : stryMutAct_9fa48("8767") ? true : (stryCov_9fa48("8767", "8768", "8769"), event.kind === (stryMutAct_9fa48("8770") ? "" : (stryCov_9fa48("8770"), "string")))) ? stryMutAct_9fa48("8771") ? {} : (stryCov_9fa48("8771"), {
    ...state,
    granted: stryMutAct_9fa48("8772") ? [] : (stryCov_9fa48("8772"), [...state.granted, event.value])
  }) : state;
  return addCapability;
})());
export const grantParserMachine: Machine<GrantParserState, GrantParserToken> = stryMutAct_9fa48("8773") ? {} : (stryCov_9fa48("8773"), {
  states: stryMutAct_9fa48("8774") ? [] : (stryCov_9fa48("8774"), [stryMutAct_9fa48("8775") ? "" : (stryCov_9fa48("8775"), "expect-open"), stryMutAct_9fa48("8776") ? "" : (stryCov_9fa48("8776"), "expect-appId-key"), stryMutAct_9fa48("8777") ? "" : (stryCov_9fa48("8777"), "expect-appId-colon"), stryMutAct_9fa48("8778") ? "" : (stryCov_9fa48("8778"), "expect-appId"), stryMutAct_9fa48("8779") ? "" : (stryCov_9fa48("8779"), "expect-publisher-comma"), stryMutAct_9fa48("8780") ? "" : (stryCov_9fa48("8780"), "expect-publisher-key"), stryMutAct_9fa48("8781") ? "" : (stryCov_9fa48("8781"), "expect-publisher-colon"), stryMutAct_9fa48("8782") ? "" : (stryCov_9fa48("8782"), "expect-publisher"), stryMutAct_9fa48("8783") ? "" : (stryCov_9fa48("8783"), "expect-granted-comma"), stryMutAct_9fa48("8784") ? "" : (stryCov_9fa48("8784"), "expect-granted-key"), stryMutAct_9fa48("8785") ? "" : (stryCov_9fa48("8785"), "expect-granted-colon"), stryMutAct_9fa48("8786") ? "" : (stryCov_9fa48("8786"), "expect-array-open"), stryMutAct_9fa48("8787") ? "" : (stryCov_9fa48("8787"), "expect-capability-or-end"), stryMutAct_9fa48("8788") ? "" : (stryCov_9fa48("8788"), "expect-capability-comma-or-end"), stryMutAct_9fa48("8789") ? "" : (stryCov_9fa48("8789"), "expect-capability"), stryMutAct_9fa48("8790") ? "" : (stryCov_9fa48("8790"), "expect-updated-comma"), stryMutAct_9fa48("8791") ? "" : (stryCov_9fa48("8791"), "expect-updated-key"), stryMutAct_9fa48("8792") ? "" : (stryCov_9fa48("8792"), "expect-updated-colon"), stryMutAct_9fa48("8793") ? "" : (stryCov_9fa48("8793"), "expect-updated"), stryMutAct_9fa48("8794") ? "" : (stryCov_9fa48("8794"), "expect-close"), stryMutAct_9fa48("8795") ? "" : (stryCov_9fa48("8795"), "expect-eof"), stryMutAct_9fa48("8796") ? "" : (stryCov_9fa48("8796"), "accept")]),
  events: stryMutAct_9fa48("8797") ? [] : (stryCov_9fa48("8797"), [t.open, t.close, t.colon, t.comma, t.arrayOpen, t.arrayClose, t.string, t.integer, t.eof]),
  initial: stryMutAct_9fa48("8798") ? "" : (stryCov_9fa48("8798"), "expect-open"),
  stateOf: stryMutAct_9fa48("8799") ? () => undefined : (stryCov_9fa48("8799"), state => state.phase),
  withState: stryMutAct_9fa48("8800") ? () => undefined : (stryCov_9fa48("8800"), (state, phase) => stryMutAct_9fa48("8801") ? {} : (stryCov_9fa48("8801"), {
    ...state,
    phase: phase as GrantParserPhase
  })),
  table: stryMutAct_9fa48("8802") ? [] : (stryCov_9fa48("8802"), [stryMutAct_9fa48("8803") ? {} : (stryCov_9fa48("8803"), {
    from: stryMutAct_9fa48("8804") ? "" : (stryCov_9fa48("8804"), "expect-open"),
    on: t.open,
    to: stryMutAct_9fa48("8805") ? "" : (stryCov_9fa48("8805"), "expect-appId-key")
  }), stryMutAct_9fa48("8806") ? {} : (stryCov_9fa48("8806"), {
    from: stryMutAct_9fa48("8807") ? "" : (stryCov_9fa48("8807"), "expect-appId-key"),
    on: t.string,
    to: stryMutAct_9fa48("8808") ? "" : (stryCov_9fa48("8808"), "expect-appId-colon"),
    guard: stringIs(stryMutAct_9fa48("8809") ? "" : (stryCov_9fa48("8809"), "appId"))
  }), stryMutAct_9fa48("8810") ? {} : (stryCov_9fa48("8810"), {
    from: stryMutAct_9fa48("8811") ? "" : (stryCov_9fa48("8811"), "expect-appId-colon"),
    on: t.colon,
    to: stryMutAct_9fa48("8812") ? "" : (stryCov_9fa48("8812"), "expect-appId")
  }), stryMutAct_9fa48("8813") ? {} : (stryCov_9fa48("8813"), {
    from: stryMutAct_9fa48("8814") ? "" : (stryCov_9fa48("8814"), "expect-appId"),
    on: t.string,
    to: stryMutAct_9fa48("8815") ? "" : (stryCov_9fa48("8815"), "expect-publisher-comma"),
    reduce: captureString(stryMutAct_9fa48("8816") ? "" : (stryCov_9fa48("8816"), "appId"))
  }), stryMutAct_9fa48("8817") ? {} : (stryCov_9fa48("8817"), {
    from: stryMutAct_9fa48("8818") ? "" : (stryCov_9fa48("8818"), "expect-publisher-comma"),
    on: t.comma,
    to: stryMutAct_9fa48("8819") ? "" : (stryCov_9fa48("8819"), "expect-publisher-key")
  }), stryMutAct_9fa48("8820") ? {} : (stryCov_9fa48("8820"), {
    from: stryMutAct_9fa48("8821") ? "" : (stryCov_9fa48("8821"), "expect-publisher-key"),
    on: t.string,
    to: stryMutAct_9fa48("8822") ? "" : (stryCov_9fa48("8822"), "expect-publisher-colon"),
    guard: stringIs(stryMutAct_9fa48("8823") ? "" : (stryCov_9fa48("8823"), "publisherPublicKey"))
  }), stryMutAct_9fa48("8824") ? {} : (stryCov_9fa48("8824"), {
    from: stryMutAct_9fa48("8825") ? "" : (stryCov_9fa48("8825"), "expect-publisher-colon"),
    on: t.colon,
    to: stryMutAct_9fa48("8826") ? "" : (stryCov_9fa48("8826"), "expect-publisher")
  }), stryMutAct_9fa48("8827") ? {} : (stryCov_9fa48("8827"), {
    from: stryMutAct_9fa48("8828") ? "" : (stryCov_9fa48("8828"), "expect-publisher"),
    on: t.string,
    to: stryMutAct_9fa48("8829") ? "" : (stryCov_9fa48("8829"), "expect-granted-comma"),
    reduce: captureString(stryMutAct_9fa48("8830") ? "" : (stryCov_9fa48("8830"), "publisherPublicKey"))
  }), stryMutAct_9fa48("8831") ? {} : (stryCov_9fa48("8831"), {
    from: stryMutAct_9fa48("8832") ? "" : (stryCov_9fa48("8832"), "expect-granted-comma"),
    on: t.comma,
    to: stryMutAct_9fa48("8833") ? "" : (stryCov_9fa48("8833"), "expect-granted-key")
  }), stryMutAct_9fa48("8834") ? {} : (stryCov_9fa48("8834"), {
    from: stryMutAct_9fa48("8835") ? "" : (stryCov_9fa48("8835"), "expect-granted-key"),
    on: t.string,
    to: stryMutAct_9fa48("8836") ? "" : (stryCov_9fa48("8836"), "expect-granted-colon"),
    guard: stringIs(stryMutAct_9fa48("8837") ? "" : (stryCov_9fa48("8837"), "granted"))
  }), stryMutAct_9fa48("8838") ? {} : (stryCov_9fa48("8838"), {
    from: stryMutAct_9fa48("8839") ? "" : (stryCov_9fa48("8839"), "expect-granted-colon"),
    on: t.colon,
    to: stryMutAct_9fa48("8840") ? "" : (stryCov_9fa48("8840"), "expect-array-open")
  }), stryMutAct_9fa48("8841") ? {} : (stryCov_9fa48("8841"), {
    from: stryMutAct_9fa48("8842") ? "" : (stryCov_9fa48("8842"), "expect-array-open"),
    on: t.arrayOpen,
    to: stryMutAct_9fa48("8843") ? "" : (stryCov_9fa48("8843"), "expect-capability-or-end")
  }), stryMutAct_9fa48("8844") ? {} : (stryCov_9fa48("8844"), {
    from: stryMutAct_9fa48("8845") ? "" : (stryCov_9fa48("8845"), "expect-capability-or-end"),
    on: t.arrayClose,
    to: stryMutAct_9fa48("8846") ? "" : (stryCov_9fa48("8846"), "expect-updated-comma")
  }), stryMutAct_9fa48("8847") ? {} : (stryCov_9fa48("8847"), {
    from: stryMutAct_9fa48("8848") ? "" : (stryCov_9fa48("8848"), "expect-capability-or-end"),
    on: t.string,
    to: stryMutAct_9fa48("8849") ? "" : (stryCov_9fa48("8849"), "expect-capability-comma-or-end"),
    reduce: addCapability
  }), stryMutAct_9fa48("8850") ? {} : (stryCov_9fa48("8850"), {
    from: stryMutAct_9fa48("8851") ? "" : (stryCov_9fa48("8851"), "expect-capability-comma-or-end"),
    on: t.arrayClose,
    to: stryMutAct_9fa48("8852") ? "" : (stryCov_9fa48("8852"), "expect-updated-comma")
  }), stryMutAct_9fa48("8853") ? {} : (stryCov_9fa48("8853"), {
    from: stryMutAct_9fa48("8854") ? "" : (stryCov_9fa48("8854"), "expect-capability-comma-or-end"),
    on: t.comma,
    to: stryMutAct_9fa48("8855") ? "" : (stryCov_9fa48("8855"), "expect-capability")
  }), stryMutAct_9fa48("8856") ? {} : (stryCov_9fa48("8856"), {
    from: stryMutAct_9fa48("8857") ? "" : (stryCov_9fa48("8857"), "expect-capability"),
    on: t.string,
    to: stryMutAct_9fa48("8858") ? "" : (stryCov_9fa48("8858"), "expect-capability-comma-or-end"),
    reduce: addCapability
  }), stryMutAct_9fa48("8859") ? {} : (stryCov_9fa48("8859"), {
    from: stryMutAct_9fa48("8860") ? "" : (stryCov_9fa48("8860"), "expect-updated-comma"),
    on: t.comma,
    to: stryMutAct_9fa48("8861") ? "" : (stryCov_9fa48("8861"), "expect-updated-key")
  }), stryMutAct_9fa48("8862") ? {} : (stryCov_9fa48("8862"), {
    from: stryMutAct_9fa48("8863") ? "" : (stryCov_9fa48("8863"), "expect-updated-key"),
    on: t.string,
    to: stryMutAct_9fa48("8864") ? "" : (stryCov_9fa48("8864"), "expect-updated-colon"),
    guard: stringIs(stryMutAct_9fa48("8865") ? "" : (stryCov_9fa48("8865"), "updatedAt"))
  }), stryMutAct_9fa48("8866") ? {} : (stryCov_9fa48("8866"), {
    from: stryMutAct_9fa48("8867") ? "" : (stryCov_9fa48("8867"), "expect-updated-colon"),
    on: t.colon,
    to: stryMutAct_9fa48("8868") ? "" : (stryCov_9fa48("8868"), "expect-updated")
  }), stryMutAct_9fa48("8869") ? {} : (stryCov_9fa48("8869"), {
    from: stryMutAct_9fa48("8870") ? "" : (stryCov_9fa48("8870"), "expect-updated"),
    on: t.integer,
    to: stryMutAct_9fa48("8871") ? "" : (stryCov_9fa48("8871"), "expect-close"),
    reduce: stryMutAct_9fa48("8872") ? () => undefined : (stryCov_9fa48("8872"), (state, event) => (stryMutAct_9fa48("8875") ? event.kind !== "integer" : stryMutAct_9fa48("8874") ? false : stryMutAct_9fa48("8873") ? true : (stryCov_9fa48("8873", "8874", "8875"), event.kind === (stryMutAct_9fa48("8876") ? "" : (stryCov_9fa48("8876"), "integer")))) ? stryMutAct_9fa48("8877") ? {} : (stryCov_9fa48("8877"), {
      ...state,
      updatedAt: event.value
    }) : state)
  }), stryMutAct_9fa48("8878") ? {} : (stryCov_9fa48("8878"), {
    from: stryMutAct_9fa48("8879") ? "" : (stryCov_9fa48("8879"), "expect-close"),
    on: t.close,
    to: stryMutAct_9fa48("8880") ? "" : (stryCov_9fa48("8880"), "expect-eof")
  }), stryMutAct_9fa48("8881") ? {} : (stryCov_9fa48("8881"), {
    from: stryMutAct_9fa48("8882") ? "" : (stryCov_9fa48("8882"), "expect-eof"),
    on: t.eof,
    to: stryMutAct_9fa48("8883") ? "" : (stryCov_9fa48("8883"), "accept")
  })])
});
export const stepGrantParser = interpret(grantParserMachine);
export function initialGrantParserState(): GrantParserState {
  if (stryMutAct_9fa48("8884")) {
    {}
  } else {
    stryCov_9fa48("8884");
    return stryMutAct_9fa48("8885") ? {} : (stryCov_9fa48("8885"), {
      phase: stryMutAct_9fa48("8886") ? "" : (stryCov_9fa48("8886"), "expect-open"),
      granted: stryMutAct_9fa48("8887") ? ["Stryker was here"] : (stryCov_9fa48("8887"), [])
    });
  }
}