/**
 * Pure announce ingress rate limiting.
 * Mirrors RNS/Transport.py announce_rate_table decisions; time arrives as `now` only.
 * Blocked-gate / record-gate conclusions leave via machine actions (no ad-hoc
 * `isAnnounceBlocked` / `recordAnnounce` reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { hasActionOfKind } from "./action-kind.js";

export const MAX_ANNOUNCE_RATE_TIMESTAMPS = 16;
export const DEFAULT_ANNOUNCE_RATE_TARGET = 0.2;
export const DEFAULT_ANNOUNCE_RATE_GRACE = 2;
export const DEFAULT_ANNOUNCE_RATE_PENALTY = 60;

export interface AnnounceRateEntry {
  readonly last: number;
  readonly rateViolations: number;
  readonly blockedUntil: number;
  readonly timestamps: readonly number[];
}

export interface AnnounceRateOptions {
  readonly rateTarget?: number;
  readonly rateGrace?: number;
  readonly ratePenalty?: number;
}

export interface AnnounceRateState {
  readonly rateTarget: number;
  readonly rateGrace: number;
  readonly ratePenalty: number;
  readonly table: ReadonlyMap<string, AnnounceRateEntry>;
  readonly lastBlocked: boolean;
}

export type AnnounceRateEvent =
  | Event
  | {
      readonly kind: "announce/is-blocked";
      readonly destinationKey: string;
      readonly at: number;
    }
  | {
      readonly kind: "announce/record";
      readonly destinationKey: string;
      readonly at: number;
    };

export function initialAnnounceRateState(
  options: AnnounceRateOptions = {},
): AnnounceRateState {
  return {
    rateTarget: options.rateTarget ?? DEFAULT_ANNOUNCE_RATE_TARGET,
    rateGrace: options.rateGrace ?? DEFAULT_ANNOUNCE_RATE_GRACE,
    ratePenalty: options.ratePenalty ?? DEFAULT_ANNOUNCE_RATE_PENALTY,
    table: new Map(),
    lastBlocked: false,
  };
}

export function isAnnounceBlocked(
  state: AnnounceRateState,
  destinationKey: string,
  now: number,
): boolean {
  const entry = state.table.get(destinationKey);
  if (entry === undefined) {
    return false;
  }
  return now <= entry.blockedUntil;
}

/**
 * Announce blocked gate is event-driven over the rate-table state.
 * Conclusions leave via machine actions (no ad-hoc `isAnnounceBlocked` reads
 * beside the step).
 */
export type AnnounceBlockedEvent =
  | Event
  | {
      readonly kind: "announce/blocked-gate";
      readonly destinationKey: string;
      readonly at: number;
    };

export type AnnounceBlockedAction =
  { readonly kind: "blocked" } | { readonly kind: "live" };

export interface AnnounceBlockedStepResult {
  readonly state: AnnounceRateState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceBlockedAction[];
}

export function stepAnnounceBlockedWithActions(
  state: AnnounceRateState,
  event: AnnounceBlockedEvent,
): AnnounceBlockedStepResult {
  if (event.kind === "announce/blocked-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: isAnnounceBlocked(state, event.destinationKey, event.at)
            ? "blocked"
            : "live",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldTreatAnnounceBlocked(
  actions: ReadonlyArray<AnnounceBlockedAction>,
): boolean {
  return hasActionOfKind(actions, "blocked");
}

export function shouldTreatAnnounceLive(
  actions: ReadonlyArray<AnnounceBlockedAction>,
): boolean {
  return hasActionOfKind(actions, "live");
}

export function recordAnnounce(
  state: AnnounceRateState,
  destinationKey: string,
  now: number,
): { readonly state: AnnounceRateState; readonly blocked: boolean } {
  const existing = state.table.get(destinationKey);
  if (existing === undefined) {
    const entry: AnnounceRateEntry = {
      last: now,
      rateViolations: 0,
      blockedUntil: 0,
      timestamps: [now],
    };
    const table = new Map(state.table);
    table.set(destinationKey, entry);
    return { state: { ...state, table, lastBlocked: false }, blocked: false };
  }

  const timestamps = [...existing.timestamps, now];
  while (timestamps.length > MAX_ANNOUNCE_RATE_TIMESTAMPS) {
    timestamps.shift();
  }

  if (now <= existing.blockedUntil) {
    const entry: AnnounceRateEntry = { ...existing, timestamps };
    const table = new Map(state.table);
    table.set(destinationKey, entry);
    return { state: { ...state, table, lastBlocked: true }, blocked: true };
  }

  const currentRate = now - existing.last;
  const rateViolations =
    currentRate < state.rateTarget
      ? existing.rateViolations + 1
      : Math.max(0, existing.rateViolations - 1);

  if (rateViolations > state.rateGrace) {
    const entry: AnnounceRateEntry = {
      ...existing,
      rateViolations,
      blockedUntil: existing.last + state.rateTarget + state.ratePenalty,
      timestamps,
    };
    const table = new Map(state.table);
    table.set(destinationKey, entry);
    return { state: { ...state, table, lastBlocked: true }, blocked: true };
  }

  const entry: AnnounceRateEntry = {
    ...existing,
    last: now,
    rateViolations,
    timestamps,
  };
  const table = new Map(state.table);
  table.set(destinationKey, entry);
  return { state: { ...state, table, lastBlocked: false }, blocked: false };
}

/**
 * Announce record gate is event-driven over the rate-table state.
 * Conclusions leave via machine actions (no ad-hoc `recordAnnounce` reads
 * beside the step).
 */
export type RecordAnnounceEvent =
  | Event
  | {
      readonly kind: "announce/record-gate";
      readonly destinationKey: string;
      readonly at: number;
    };

export type RecordAnnounceAction =
  { readonly kind: "blocked" } | { readonly kind: "clear" };

export interface RecordAnnounceStepResult {
  readonly state: AnnounceRateState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RecordAnnounceAction[];
}

export function stepRecordAnnounceWithActions(
  state: AnnounceRateState,
  event: RecordAnnounceEvent,
): RecordAnnounceStepResult {
  if (event.kind === "announce/record-gate") {
    const result = recordAnnounce(state, event.destinationKey, event.at);
    return {
      state: result.state,
      intents: [],
      actions: [{ kind: result.blocked ? "blocked" : "clear" }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldTreatRecordAnnounceBlocked(
  actions: ReadonlyArray<RecordAnnounceAction>,
): boolean {
  return hasActionOfKind(actions, "blocked");
}

export function shouldTreatRecordAnnounceClear(
  actions: ReadonlyArray<RecordAnnounceAction>,
): boolean {
  return hasActionOfKind(actions, "clear");
}

export const stepAnnounceRate: StepFn<AnnounceRateState> = (state, event) =>
  stepAnnounceRateInner(state, event as AnnounceRateEvent);

function stepAnnounceRateInner(
  state: AnnounceRateState,
  event: AnnounceRateEvent,
): { state: AnnounceRateState; intents: [] } {
  if (event.kind === "announce/is-blocked") {
    return {
      state: {
        ...state,
        lastBlocked: isAnnounceBlocked(state, event.destinationKey, event.at),
      },
      intents: [],
    };
  }

  if (event.kind === "announce/record") {
    const result = recordAnnounce(state, event.destinationKey, event.at);
    return { state: result.state, intents: [] };
  }

  return { state, intents: [] };
}
