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
import type { Event, Intent, StepFn, StepResult } from "./types.js";

/** A named class of events. The name is stable data; the predicate may inspect payloads. */
export interface EventClass<E> {
  readonly name: string;
  readonly matches: (event: E) => boolean;
}
export interface MachineRow<S, E> {
  readonly from: string;
  readonly on: EventClass<E>;
  readonly to: string;
  readonly guard?: (state: S, event: E) => boolean;
  /** Apply data-plane state changes in addition to the control-state transition. */
  readonly reduce?: (state: S, event: E) => S;
  readonly emit?: (state: S, event: E) => readonly Intent[];
}

/**
 * Enumerable control structure for an abstract machine. `stateOf` and
 * `withState` allow existing domain state shapes to remain unchanged.
 */
export interface Machine<S, E = Event> {
  readonly states: readonly string[];
  readonly events: readonly EventClass<E>[];
  readonly initial: string;
  readonly stateOf: (state: S) => string;
  readonly withState: (state: S, controlState: string) => S;
  readonly table: readonly MachineRow<S, E>[];
}
export interface MachineCell<S, E> {
  readonly state: string;
  readonly eventClass: string;
  readonly rows: readonly MachineRow<S, E>[];
}
export class AmbiguousTransitionError extends Error {
  constructor(state: string, eventClasses: readonly string[]) {
    if (stryMutAct_9fa48("1619")) {
      {}
    } else {
      stryCov_9fa48("1619");
      super(stryMutAct_9fa48("1620") ? `` : (stryCov_9fa48("1620"), `ambiguous transition from ${state}: ${eventClasses.join(stryMutAct_9fa48("1621") ? "" : (stryCov_9fa48("1621"), ", "))}`));
      this.name = stryMutAct_9fa48("1622") ? "" : (stryCov_9fa48("1622"), "AmbiguousTransitionError");
    }
  }
}
function validateMachine<S, E>(machine: Machine<S, E>): void {
  if (stryMutAct_9fa48("1623")) {
    {}
  } else {
    stryCov_9fa48("1623");
    const states = new Set(machine.states);
    if (stryMutAct_9fa48("1626") ? false : stryMutAct_9fa48("1625") ? true : stryMutAct_9fa48("1624") ? states.has(machine.initial) : (stryCov_9fa48("1624", "1625", "1626"), !states.has(machine.initial))) {
      if (stryMutAct_9fa48("1627")) {
        {}
      } else {
        stryCov_9fa48("1627");
        throw new Error(stryMutAct_9fa48("1628") ? `` : (stryCov_9fa48("1628"), `machine initial state is not declared: ${machine.initial}`));
      }
    }
    for (const row of machine.table) {
      if (stryMutAct_9fa48("1629")) {
        {}
      } else {
        stryCov_9fa48("1629");
        if (stryMutAct_9fa48("1632") ? !states.has(row.from) && !states.has(row.to) : stryMutAct_9fa48("1631") ? false : stryMutAct_9fa48("1630") ? true : (stryCov_9fa48("1630", "1631", "1632"), (stryMutAct_9fa48("1633") ? states.has(row.from) : (stryCov_9fa48("1633"), !states.has(row.from))) || (stryMutAct_9fa48("1634") ? states.has(row.to) : (stryCov_9fa48("1634"), !states.has(row.to))))) {
          if (stryMutAct_9fa48("1635")) {
            {}
          } else {
            stryCov_9fa48("1635");
            throw new Error(stryMutAct_9fa48("1636") ? `` : (stryCov_9fa48("1636"), `machine row references undeclared state: ${row.from} -> ${row.to}`));
          }
        }
        if (stryMutAct_9fa48("1639") ? false : stryMutAct_9fa48("1638") ? true : stryMutAct_9fa48("1637") ? machine.events.includes(row.on) : (stryCov_9fa48("1637", "1638", "1639"), !machine.events.includes(row.on))) {
          if (stryMutAct_9fa48("1640")) {
            {}
          } else {
            stryCov_9fa48("1640");
            throw new Error(stryMutAct_9fa48("1641") ? `` : (stryCov_9fa48("1641"), `machine row references undeclared event class: ${row.on.name}`));
          }
        }
      }
    }
  }
}

/** Interpret transition-table data as the standard pure step function. */
export function interpret<S, E = Event>(machine: Machine<S, E>): StepFn<S, E> {
  if (stryMutAct_9fa48("1642")) {
    {}
  } else {
    stryCov_9fa48("1642");
    validateMachine(machine);
    return (state: S, event: E): StepResult<S> => {
      if (stryMutAct_9fa48("1643")) {
        {}
      } else {
        stryCov_9fa48("1643");
        const control = machine.stateOf(state);
        const matches = stryMutAct_9fa48("1644") ? machine.table : (stryCov_9fa48("1644"), machine.table.filter(stryMutAct_9fa48("1645") ? () => undefined : (stryCov_9fa48("1645"), row => stryMutAct_9fa48("1648") ? row.from === control && row.on.matches(event) || (row.guard?.(state, event) ?? true) : stryMutAct_9fa48("1647") ? false : stryMutAct_9fa48("1646") ? true : (stryCov_9fa48("1646", "1647", "1648"), (stryMutAct_9fa48("1650") ? row.from === control || row.on.matches(event) : stryMutAct_9fa48("1649") ? true : (stryCov_9fa48("1649", "1650"), (stryMutAct_9fa48("1652") ? row.from !== control : stryMutAct_9fa48("1651") ? true : (stryCov_9fa48("1651", "1652"), row.from === control)) && row.on.matches(event))) && (stryMutAct_9fa48("1653") ? row.guard?.(state, event) && true : (stryCov_9fa48("1653"), (stryMutAct_9fa48("1654") ? row.guard(state, event) : (stryCov_9fa48("1654"), row.guard?.(state, event))) ?? (stryMutAct_9fa48("1655") ? false : (stryCov_9fa48("1655"), true))))))));
        if (stryMutAct_9fa48("1658") ? matches.length !== 0 : stryMutAct_9fa48("1657") ? false : stryMutAct_9fa48("1656") ? true : (stryCov_9fa48("1656", "1657", "1658"), matches.length === 0)) {
          if (stryMutAct_9fa48("1659")) {
            {}
          } else {
            stryCov_9fa48("1659");
            return stryMutAct_9fa48("1660") ? {} : (stryCov_9fa48("1660"), {
              state,
              intents: stryMutAct_9fa48("1661") ? ["Stryker was here"] : (stryCov_9fa48("1661"), [])
            });
          }
        }
        if (stryMutAct_9fa48("1665") ? matches.length <= 1 : stryMutAct_9fa48("1664") ? matches.length >= 1 : stryMutAct_9fa48("1663") ? false : stryMutAct_9fa48("1662") ? true : (stryCov_9fa48("1662", "1663", "1664", "1665"), matches.length > 1)) {
          if (stryMutAct_9fa48("1666")) {
            {}
          } else {
            stryCov_9fa48("1666");
            throw new AmbiguousTransitionError(control, matches.map(stryMutAct_9fa48("1667") ? () => undefined : (stryCov_9fa48("1667"), row => row.on.name)));
          }
        }
        const row = matches[0]!;
        const reduced = stryMutAct_9fa48("1668") ? row.reduce?.(state, event) && state : (stryCov_9fa48("1668"), (stryMutAct_9fa48("1669") ? row.reduce(state, event) : (stryCov_9fa48("1669"), row.reduce?.(state, event))) ?? state);
        return stryMutAct_9fa48("1670") ? {} : (stryCov_9fa48("1670"), {
          state: machine.withState(reduced, row.to),
          intents: stryMutAct_9fa48("1671") ? row.emit?.(reduced, event) && [] : (stryCov_9fa48("1671"), (stryMutAct_9fa48("1672") ? row.emit(reduced, event) : (stryCov_9fa48("1672"), row.emit?.(reduced, event))) ?? (stryMutAct_9fa48("1673") ? ["Stryker was here"] : (stryCov_9fa48("1673"), [])))
        });
      }
    };
  }
}

/** Enumerate the complete control-state × event-class Layer-3 coverage frame. */
export function enumerateCells<S, E = Event>(machine: Machine<S, E>): readonly MachineCell<S, E>[] {
  if (stryMutAct_9fa48("1674")) {
    {}
  } else {
    stryCov_9fa48("1674");
    validateMachine(machine);
    const cells: MachineCell<S, E>[] = stryMutAct_9fa48("1675") ? ["Stryker was here"] : (stryCov_9fa48("1675"), []);
    for (const state of machine.states) {
      if (stryMutAct_9fa48("1676")) {
        {}
      } else {
        stryCov_9fa48("1676");
        for (const eventClass of machine.events) {
          if (stryMutAct_9fa48("1677")) {
            {}
          } else {
            stryCov_9fa48("1677");
            cells.push(stryMutAct_9fa48("1678") ? {} : (stryCov_9fa48("1678"), {
              state,
              eventClass: eventClass.name,
              rows: stryMutAct_9fa48("1679") ? machine.table : (stryCov_9fa48("1679"), machine.table.filter(stryMutAct_9fa48("1680") ? () => undefined : (stryCov_9fa48("1680"), row => stryMutAct_9fa48("1683") ? row.from === state || row.on === eventClass : stryMutAct_9fa48("1682") ? false : stryMutAct_9fa48("1681") ? true : (stryCov_9fa48("1681", "1682", "1683"), (stryMutAct_9fa48("1685") ? row.from !== state : stryMutAct_9fa48("1684") ? true : (stryCov_9fa48("1684", "1685"), row.from === state)) && (stryMutAct_9fa48("1687") ? row.on !== eventClass : stryMutAct_9fa48("1686") ? true : (stryCov_9fa48("1686", "1687"), row.on === eventClass))))))
            }));
          }
        }
      }
    }
    return cells;
  }
}