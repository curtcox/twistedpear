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
import type { Event, Intent, StepFn } from "./types.js";

/**
 * Stateless decision gates.
 *
 * A gate concludes from a single event and carries no durable session fields:
 * its control state is uninhabited and its conclusions leave via actions.
 * `machine.ts` covers the stateful case (control states plus a transition
 * table); this module covers the far more common stateless case so that each
 * gate is declared as data instead of restating the same step/reader shape.
 *
 * Enumerability is preserved: a gate declares its action alphabet up front, so
 * {@link enumerateGateCells} yields the same kind of coverage frame that
 * {@link enumerateCells} yields for transition tables, and
 * {@link interpretGate} rejects any conclusion outside the declared alphabet.
 */

/** Uninhabited control state: a gate concludes from the event alone. */
export type GateState = Record<string, never>;

/** Every gate conclusion is a discriminated action; payloads are allowed. */
export interface GateAction {
  readonly kind: string;
}

/** A gate event is its own kind plus the decision inputs. */
export type GateEvent<K extends string, P> = {
  readonly kind: K;
} & P;
export interface GateStepResult<A extends GateAction> {
  readonly state: GateState;
  readonly intents: readonly Intent[];
  readonly actions: readonly A[];
}

/**
 * Declarative gate. `GE` is the gate's own event (kind plus inputs); `A` is its
 * action alphabet. `decide` stays a pure function of the event.
 */
export interface Gate<GE extends GateAction, A extends GateAction> {
  readonly event: GE["kind"];
  /** Declared action alphabet; `decide` may not conclude outside it. */
  readonly actions: readonly A["kind"][];
  readonly decide: (event: GE) => readonly A[];
}

/** Step signature of an interpreted gate: accepts the wire alphabet too. */
export type GateStepFn<GE extends GateAction, A extends GateAction> = (state: GateState, event: Event | GE) => GateStepResult<A>;
export type GateActionOf<G> = G extends Gate<GateAction, infer A> ? A : never;
export interface GateCell {
  readonly event: string;
  readonly actionKind: string;
}
export class UndeclaredGateActionError extends Error {
  constructor(event: string, actionKind: string) {
    if (stryMutAct_9fa48("1544")) {
      {}
    } else {
      stryCov_9fa48("1544");
      super(stryMutAct_9fa48("1545") ? `` : (stryCov_9fa48("1545"), `gate ${event} concluded with an undeclared action: ${actionKind}`));
      this.name = stryMutAct_9fa48("1546") ? "" : (stryCov_9fa48("1546"), "UndeclaredGateActionError");
    }
  }
}
function validateGate<GE extends GateAction, A extends GateAction>(gate: Gate<GE, A>): void {
  if (stryMutAct_9fa48("1547")) {
    {}
  } else {
    stryCov_9fa48("1547");
    if (stryMutAct_9fa48("1550") ? gate.actions.length !== 0 : stryMutAct_9fa48("1549") ? false : stryMutAct_9fa48("1548") ? true : (stryCov_9fa48("1548", "1549", "1550"), gate.actions.length === 0)) {
      if (stryMutAct_9fa48("1551")) {
        {}
      } else {
        stryCov_9fa48("1551");
        throw new Error(stryMutAct_9fa48("1552") ? `` : (stryCov_9fa48("1552"), `gate declares no actions: ${gate.event}`));
      }
    }
    const seen = new Set<string>();
    for (const kind of gate.actions) {
      if (stryMutAct_9fa48("1553")) {
        {}
      } else {
        stryCov_9fa48("1553");
        if (stryMutAct_9fa48("1555") ? false : stryMutAct_9fa48("1554") ? true : (stryCov_9fa48("1554", "1555"), seen.has(kind))) {
          if (stryMutAct_9fa48("1556")) {
            {}
          } else {
            stryCov_9fa48("1556");
            throw new Error(stryMutAct_9fa48("1557") ? `` : (stryCov_9fa48("1557"), `gate declares a duplicate action: ${gate.event}/${kind}`));
          }
        }
        seen.add(kind);
      }
    }
  }
}

/** Declare a gate. Validates the action alphabet at construction. */
export function defineGate<GE extends GateAction, A extends GateAction>(gate: Gate<GE, A>): Gate<GE, A> {
  if (stryMutAct_9fa48("1558")) {
    {}
  } else {
    stryCov_9fa48("1558");
    validateGate(gate);
    return gate;
  }
}

/**
 * Declare a two-way gate from a predicate — the dominant shape (allow/deny,
 * accept/reject, transmit/skip, match/mismatch).
 */
export function defineBooleanGate<GE extends GateAction, T extends string, F extends string>(spec: {
  readonly event: GE["kind"];
  readonly whenTrue: T;
  readonly whenFalse: F;
  readonly decide: (event: GE) => boolean;
}): Gate<GE, {
  readonly kind: T | F;
}> {
  if (stryMutAct_9fa48("1559")) {
    {}
  } else {
    stryCov_9fa48("1559");
    return defineGate<GE, {
      readonly kind: T | F;
    }>(stryMutAct_9fa48("1560") ? {} : (stryCov_9fa48("1560"), {
      event: spec.event,
      actions: stryMutAct_9fa48("1561") ? [] : (stryCov_9fa48("1561"), [spec.whenTrue, spec.whenFalse]),
      decide: stryMutAct_9fa48("1562") ? () => undefined : (stryCov_9fa48("1562"), event => stryMutAct_9fa48("1563") ? [] : (stryCov_9fa48("1563"), [stryMutAct_9fa48("1564") ? {} : (stryCov_9fa48("1564"), {
        kind: spec.decide(event) ? spec.whenTrue : spec.whenFalse
      })]))
    }));
  }
}

/**
 * Declare a gate over a plan that may abstain: `null` becomes the `none` kind
 * so the conclusion is still explicit in the action stream.
 */
export function defineOptionGate<GE extends GateAction, V extends string, N extends string>(spec: {
  readonly event: GE["kind"];
  readonly kinds: readonly V[];
  readonly none: N;
  readonly decide: (event: GE) => V | null;
}): Gate<GE, {
  readonly kind: V | N;
}> {
  if (stryMutAct_9fa48("1565")) {
    {}
  } else {
    stryCov_9fa48("1565");
    return defineGate<GE, {
      readonly kind: V | N;
    }>(stryMutAct_9fa48("1566") ? {} : (stryCov_9fa48("1566"), {
      event: spec.event,
      actions: stryMutAct_9fa48("1567") ? [] : (stryCov_9fa48("1567"), [...spec.kinds, spec.none]),
      decide: stryMutAct_9fa48("1568") ? () => undefined : (stryCov_9fa48("1568"), event => stryMutAct_9fa48("1569") ? [] : (stryCov_9fa48("1569"), [stryMutAct_9fa48("1570") ? {} : (stryCov_9fa48("1570"), {
        kind: stryMutAct_9fa48("1571") ? spec.decide(event) && spec.none : (stryCov_9fa48("1571"), spec.decide(event) ?? spec.none)
      })]))
    }));
  }
}

/**
 * Run a gate directly. Nested gates use this instead of restating the
 * state/intents envelope of the parent step.
 */
export function decideGate<GE extends GateAction, A extends GateAction>(gate: Gate<GE, A>, event: NoInfer<GE>): readonly A[] {
  if (stryMutAct_9fa48("1572")) {
    {}
  } else {
    stryCov_9fa48("1572");
    const actions = gate.decide(event);
    const declared: readonly string[] = gate.actions;
    for (const action of actions) {
      if (stryMutAct_9fa48("1573")) {
        {}
      } else {
        stryCov_9fa48("1573");
        if (stryMutAct_9fa48("1576") ? false : stryMutAct_9fa48("1575") ? true : stryMutAct_9fa48("1574") ? declared.includes(action.kind) : (stryCov_9fa48("1574", "1575", "1576"), !declared.includes(action.kind))) {
          if (stryMutAct_9fa48("1577")) {
            {}
          } else {
            stryCov_9fa48("1577");
            throw new UndeclaredGateActionError(gate.event, action.kind);
          }
        }
      }
    }
    return actions;
  }
}

/** Interpret gate data as the standard stateless step function. */
export function interpretGate<GE extends GateAction, A extends GateAction>(gate: Gate<GE, A>): GateStepFn<GE, A> {
  if (stryMutAct_9fa48("1578")) {
    {}
  } else {
    stryCov_9fa48("1578");
    validateGate(gate);
    return (state: GateState, event: Event | GE): GateStepResult<A> => {
      if (stryMutAct_9fa48("1579")) {
        {}
      } else {
        stryCov_9fa48("1579");
        if (stryMutAct_9fa48("1582") ? event.kind === gate.event : stryMutAct_9fa48("1581") ? false : stryMutAct_9fa48("1580") ? true : (stryCov_9fa48("1580", "1581", "1582"), event.kind !== gate.event)) {
          if (stryMutAct_9fa48("1583")) {
            {}
          } else {
            stryCov_9fa48("1583");
            return stryMutAct_9fa48("1584") ? {} : (stryCov_9fa48("1584"), {
              state,
              intents: stryMutAct_9fa48("1585") ? ["Stryker was here"] : (stryCov_9fa48("1585"), []),
              actions: stryMutAct_9fa48("1586") ? ["Stryker was here"] : (stryCov_9fa48("1586"), [])
            });
          }
        }
        return stryMutAct_9fa48("1587") ? {} : (stryCov_9fa48("1587"), {
          state,
          intents: stryMutAct_9fa48("1588") ? ["Stryker was here"] : (stryCov_9fa48("1588"), []),
          actions: decideGate(gate, event as GE)
        });
      }
    };
  }
}

/** The uninhabited initial state shared by every gate. */
export function initialGateState(): GateState {
  if (stryMutAct_9fa48("1589")) {
    {}
  } else {
    stryCov_9fa48("1589");
    return {};
  }
}

/**
 * Interpret gate data as a plain {@link StepFn}, dropping actions. Gates never
 * emit intents, so this is the kernel-facing view of a gate.
 */
export function gateStepFn<GE extends GateAction, A extends GateAction>(gate: Gate<GE, A>): StepFn<GateState> {
  if (stryMutAct_9fa48("1590")) {
    {}
  } else {
    stryCov_9fa48("1590");
    validateGate(gate);
    return stryMutAct_9fa48("1591") ? () => undefined : (stryCov_9fa48("1591"), (state: GateState) => stryMutAct_9fa48("1592") ? {} : (stryCov_9fa48("1592"), {
      state,
      intents: stryMutAct_9fa48("1593") ? ["Stryker was here"] : (stryCov_9fa48("1593"), [])
    }));
  }
}

/** Reader: whether the gate concluded with `kind`. */
export function gateConcluded<A extends GateAction>(kind: A["kind"]): (actions: ReadonlyArray<A>) => boolean {
  if (stryMutAct_9fa48("1594")) {
    {}
  } else {
    stryCov_9fa48("1594");
    return stryMutAct_9fa48("1595") ? () => undefined : (stryCov_9fa48("1595"), actions => stryMutAct_9fa48("1596") ? actions.every(action => action.kind === kind) : (stryCov_9fa48("1596"), actions.some(stryMutAct_9fa48("1597") ? () => undefined : (stryCov_9fa48("1597"), action => stryMutAct_9fa48("1600") ? action.kind !== kind : stryMutAct_9fa48("1599") ? false : stryMutAct_9fa48("1598") ? true : (stryCov_9fa48("1598", "1599", "1600"), action.kind === kind)))));
  }
}

/**
 * Reader: the concluded kind restricted to `kinds`; `null` when the gate did
 * not conclude in that set (empty actions, or an abstain/none conclusion).
 */
export function gateConclusion<A extends GateAction, K extends A["kind"] = A["kind"]>(...kinds: readonly K[]): (actions: ReadonlyArray<A>) => K | null {
  if (stryMutAct_9fa48("1601")) {
    {}
  } else {
    stryCov_9fa48("1601");
    return actions => {
      if (stryMutAct_9fa48("1602")) {
        {}
      } else {
        stryCov_9fa48("1602");
        const match = actions.find(stryMutAct_9fa48("1603") ? () => undefined : (stryCov_9fa48("1603"), action => (kinds as readonly string[]).includes(action.kind)));
        return (stryMutAct_9fa48("1606") ? match !== undefined : stryMutAct_9fa48("1605") ? false : stryMutAct_9fa48("1604") ? true : (stryCov_9fa48("1604", "1605", "1606"), match === undefined)) ? null : match.kind as K;
      }
    };
  }
}

/** Reader: a payload field of the `kind` conclusion; `null` when absent. */
export function gatePayload<A extends GateAction, K extends A["kind"], F extends keyof Extract<A, {
  readonly kind: K;
}>>(kind: K, field: F): (actions: ReadonlyArray<A>) => Extract<A, {
  readonly kind: K;
}>[F] | null {
  if (stryMutAct_9fa48("1607")) {
    {}
  } else {
    stryCov_9fa48("1607");
    return actions => {
      if (stryMutAct_9fa48("1608")) {
        {}
      } else {
        stryCov_9fa48("1608");
        const match = actions.find(stryMutAct_9fa48("1609") ? () => undefined : (stryCov_9fa48("1609"), action => stryMutAct_9fa48("1612") ? action.kind !== kind : stryMutAct_9fa48("1611") ? false : stryMutAct_9fa48("1610") ? true : (stryCov_9fa48("1610", "1611", "1612"), action.kind === kind)));
        return (stryMutAct_9fa48("1615") ? match !== undefined : stryMutAct_9fa48("1614") ? false : stryMutAct_9fa48("1613") ? true : (stryCov_9fa48("1613", "1614", "1615"), match === undefined)) ? null : (match as Extract<A, {
          readonly kind: K;
        }>)[field];
      }
    };
  }
}

/** Enumerate the complete gate × action-kind coverage frame. */
export function enumerateGateCells<GE extends GateAction, A extends GateAction>(gate: Gate<GE, A>): readonly GateCell[] {
  if (stryMutAct_9fa48("1616")) {
    {}
  } else {
    stryCov_9fa48("1616");
    validateGate(gate);
    return gate.actions.map(stryMutAct_9fa48("1617") ? () => undefined : (stryCov_9fa48("1617"), actionKind => stryMutAct_9fa48("1618") ? {} : (stryCov_9fa48("1618"), {
      event: gate.event,
      actionKind
    })));
  }
}