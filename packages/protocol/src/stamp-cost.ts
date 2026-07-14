/**
 * Pure LXMF announce app-data stamp-cost extraction.
 * Conclusions leave via machine actions (no ad-hoc `stampCostFromAppData`
 * reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";
import { msgpackUnpack } from "./msgpack-core.js";

export interface StampCostFields {
  readonly cost: number;
}

export function stampCostFromAppData(appData: Uint8Array | null): number | null {
  if (appData === null || appData.length === 0) {
    return null;
  }

  const tag = appData[0];
  if (tag === undefined || ((tag < 0x90 || tag > 0x9f) && tag !== 0xdc)) {
    return null;
  }

  try {
    const value = msgpackUnpack(appData);
    if (value.type !== "array" || value.array.length < 2) {
      return null;
    }
    const cost = value.array[1];
    return cost !== undefined && cost.type === "int" ? cost.int : null;
  } catch {
    return null;
  }
}

/**
 * Stamp-cost extraction is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `stampCostFromAppData`
 * reads beside the step). Missing / malformed app-data become `reject`.
 */
export type StampCostFromAppDataState = Record<string, never>;

export type StampCostFromAppDataEvent =
  | Event
  | {
      readonly kind: "lxmf/stamp-cost-gate";
      readonly appData: Uint8Array | null;
    };

export type StampCostFromAppDataAction =
  | { readonly kind: "use-fields"; readonly fields: StampCostFields }
  | { readonly kind: "reject" };

export interface StampCostFromAppDataStepResult {
  readonly state: StampCostFromAppDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly StampCostFromAppDataAction[];
}

export function initialStampCostFromAppDataState(): StampCostFromAppDataState {
  return {};
}

export function stepStampCostFromAppDataWithActions(
  state: StampCostFromAppDataState,
  event: StampCostFromAppDataEvent
): StampCostFromAppDataStepResult {
  if (event.kind === "lxmf/stamp-cost-gate") {
    const cost = stampCostFromAppData(event.appData);
    if (cost === null) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "use-fields", fields: { cost } }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseStampCostFromAppData(
  actions: ReadonlyArray<StampCostFromAppDataAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectStampCostFromAppData(
  actions: ReadonlyArray<StampCostFromAppDataAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract stamp cost from step actions; null when no `use-fields`. */
export function stampCostFromActions(
  actions: ReadonlyArray<StampCostFromAppDataAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields.cost : null;
}
