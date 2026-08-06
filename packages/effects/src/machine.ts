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
    super(`ambiguous transition from ${state}: ${eventClasses.join(", ")}`);
    this.name = "AmbiguousTransitionError";
  }
}

function validateMachine<S, E>(machine: Machine<S, E>): void {
  const states = new Set(machine.states);
  if (!states.has(machine.initial)) {
    throw new Error(
      `machine initial state is not declared: ${machine.initial}`,
    );
  }
  for (const row of machine.table) {
    if (!states.has(row.from) || !states.has(row.to)) {
      throw new Error(
        `machine row references undeclared state: ${row.from} -> ${row.to}`,
      );
    }
    if (!machine.events.includes(row.on)) {
      throw new Error(
        `machine row references undeclared event class: ${row.on.name}`,
      );
    }
  }
}

/** Interpret transition-table data as the standard pure step function. */
export function interpret<S, E = Event>(machine: Machine<S, E>): StepFn<S, E> {
  validateMachine(machine);
  return (state: S, event: E): StepResult<S> => {
    const control = machine.stateOf(state);
    const matches = machine.table.filter(
      (row) =>
        row.from === control &&
        row.on.matches(event) &&
        (row.guard?.(state, event) ?? true),
    );
    if (matches.length === 0) {
      return { state, intents: [] };
    }
    if (matches.length > 1) {
      throw new AmbiguousTransitionError(
        control,
        matches.map((row) => row.on.name),
      );
    }
    const row = matches[0]!;
    const reduced = row.reduce?.(state, event) ?? state;
    return {
      state: machine.withState(reduced, row.to),
      intents: row.emit?.(reduced, event) ?? [],
    };
  };
}

/** Enumerate the complete control-state × event-class Layer-3 coverage frame. */
export function enumerateCells<S, E = Event>(
  machine: Machine<S, E>,
): readonly MachineCell<S, E>[] {
  validateMachine(machine);
  const cells: MachineCell<S, E>[] = [];
  for (const state of machine.states) {
    for (const eventClass of machine.events) {
      cells.push({
        state,
        eventClass: eventClass.name,
        rows: machine.table.filter(
          (row) => row.from === state && row.on === eventClass,
        ),
      });
    }
  }
  return cells;
}
