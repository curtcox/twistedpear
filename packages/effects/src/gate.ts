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
export type GateEvent<K extends string, P> = { readonly kind: K } & P;

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
export type GateStepFn<GE extends GateAction, A extends GateAction> = (
  state: GateState,
  event: Event | GE,
) => GateStepResult<A>;

export type GateActionOf<G> = G extends Gate<GateAction, infer A> ? A : never;

export interface GateCell {
  readonly event: string;
  readonly actionKind: string;
}

export class UndeclaredGateActionError extends Error {
  constructor(event: string, actionKind: string) {
    super(`gate ${event} concluded with an undeclared action: ${actionKind}`);
    this.name = "UndeclaredGateActionError";
  }
}

function validateGate<GE extends GateAction, A extends GateAction>(
  gate: Gate<GE, A>,
): void {
  if (gate.actions.length === 0) {
    throw new Error(`gate declares no actions: ${gate.event}`);
  }
  const seen = new Set<string>();
  for (const kind of gate.actions) {
    if (seen.has(kind)) {
      throw new Error(
        `gate declares a duplicate action: ${gate.event}/${kind}`,
      );
    }
    seen.add(kind);
  }
}

/** Declare a gate. Validates the action alphabet at construction. */
export function defineGate<GE extends GateAction, A extends GateAction>(
  gate: Gate<GE, A>,
): Gate<GE, A> {
  validateGate(gate);
  return gate;
}

/**
 * Declare a two-way gate from a predicate — the dominant shape (allow/deny,
 * accept/reject, transmit/skip, match/mismatch).
 */
export function defineBooleanGate<
  GE extends GateAction,
  T extends string,
  F extends string,
>(spec: {
  readonly event: GE["kind"];
  readonly whenTrue: T;
  readonly whenFalse: F;
  readonly decide: (event: GE) => boolean;
}): Gate<GE, { readonly kind: T | F }> {
  return defineGate<GE, { readonly kind: T | F }>({
    event: spec.event,
    actions: [spec.whenTrue, spec.whenFalse],
    decide: (event) => [
      { kind: spec.decide(event) ? spec.whenTrue : spec.whenFalse },
    ],
  });
}

/**
 * Declare a gate over a plan that may abstain: `null` becomes the `none` kind
 * so the conclusion is still explicit in the action stream.
 */
export function defineOptionGate<
  GE extends GateAction,
  V extends string,
  N extends string,
>(spec: {
  readonly event: GE["kind"];
  readonly kinds: readonly V[];
  readonly none: N;
  readonly decide: (event: GE) => V | null;
}): Gate<GE, { readonly kind: V | N }> {
  return defineGate<GE, { readonly kind: V | N }>({
    event: spec.event,
    actions: [...spec.kinds, spec.none],
    decide: (event) => [{ kind: spec.decide(event) ?? spec.none }],
  });
}

/**
 * Run a gate directly. Nested gates use this instead of restating the
 * state/intents envelope of the parent step.
 */
export function decideGate<GE extends GateAction, A extends GateAction>(
  gate: Gate<GE, A>,
  event: NoInfer<GE>,
): readonly A[] {
  const actions = gate.decide(event);
  const declared: readonly string[] = gate.actions;
  for (const action of actions) {
    if (!declared.includes(action.kind)) {
      throw new UndeclaredGateActionError(gate.event, action.kind);
    }
  }
  return actions;
}

/** Interpret gate data as the standard stateless step function. */
export function interpretGate<GE extends GateAction, A extends GateAction>(
  gate: Gate<GE, A>,
): GateStepFn<GE, A> {
  validateGate(gate);
  return (state: GateState, event: Event | GE): GateStepResult<A> => {
    if (event.kind !== gate.event) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: decideGate(gate, event as GE) };
  };
}

/** The uninhabited initial state shared by every gate. */
export function initialGateState(): GateState {
  return {};
}

/**
 * Interpret gate data as a plain {@link StepFn}, dropping actions. Gates never
 * emit intents, so this is the kernel-facing view of a gate.
 */
export function gateStepFn<GE extends GateAction, A extends GateAction>(
  gate: Gate<GE, A>,
): StepFn<GateState> {
  validateGate(gate);
  return (state: GateState) => ({ state, intents: [] });
}

/** Reader: whether the gate concluded with `kind`. */
export function gateConcluded<A extends GateAction>(
  kind: A["kind"],
): (actions: ReadonlyArray<A>) => boolean {
  return (actions) => actions.some((action) => action.kind === kind);
}

/**
 * Reader: the concluded kind restricted to `kinds`; `null` when the gate did
 * not conclude in that set (empty actions, or an abstain/none conclusion).
 */
export function gateConclusion<
  A extends GateAction,
  K extends A["kind"] = A["kind"],
>(...kinds: readonly K[]): (actions: ReadonlyArray<A>) => K | null {
  return (actions) => {
    const match = actions.find((action) =>
      (kinds as readonly string[]).includes(action.kind),
    );
    return match === undefined ? null : (match.kind as K);
  };
}

/** Reader: a payload field of the `kind` conclusion; `null` when absent. */
export function gatePayload<
  A extends GateAction,
  K extends A["kind"],
  F extends keyof Extract<A, { readonly kind: K }>,
>(
  kind: K,
  field: F,
): (actions: ReadonlyArray<A>) => Extract<A, { readonly kind: K }>[F] | null {
  return (actions) => {
    const match = actions.find((action) => action.kind === kind);
    return match === undefined
      ? null
      : (match as Extract<A, { readonly kind: K }>)[field];
  };
}

/** Enumerate the complete gate × action-kind coverage frame. */
export function enumerateGateCells<GE extends GateAction, A extends GateAction>(
  gate: Gate<GE, A>,
): readonly GateCell[] {
  validateGate(gate);
  return gate.actions.map((actionKind) => ({ event: gate.event, actionKind }));
}
