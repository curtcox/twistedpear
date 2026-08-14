/** Extracted from path-table.ts; the original module remains the public composition point. */
/**
 * Pure path-table / pathfinder decisions for announce ingress and path requests.
 * No IO — time and bytes arrive only as event/parameters.
 * Path-request ingress / discovery fulfill / outbound / entry-lookup conclusions
 * leave via machine actions (no ad-hoc plan reads beside the step). Plans nested via
 * {@link stepPathRequestIngressPlanWithActions} /
 * {@link stepPathOutboundPlanWithActions} /
 * {@link stepDiscoveryPathRequestFulfillPlanWithActions} /
 * {@link stepPathEntryLookupPlanWithActions}.
 * Path random-blob append / expiry conclusions leave via machine actions (no
 * ad-hoc `appendPathRandomBlob` / `computePathExpiry` reads beside the step).
 * Path-request emit / discovery-expired / begin-discovery / path-entry expired /
 * add-entry conclusions leave via machine actions (no ad-hoc
 * `shouldEmitPathRequest` / `isDiscoveryPathRequestExpired` /
 * `shouldBeginPathDiscovery` / `isPathEntryExpired` / `shouldAddPathEntry`
 * reads beside the step). Answer-local / remember-tag / clear-expired-discovery /
 * use-path-for-outbound / answer-path-with-entry / touch-path-entry conclusions
 * leave via machine actions (no ad-hoc `canAnswerLocalPathRequest` /
 * `shouldRememberPathRequestTag` / `shouldClearExpiredDiscoveryPathRequest` /
 * `shouldUsePathForOutbound` / `shouldAnswerPathWithEntry` /
 * `shouldTouchPathEntry` / `shouldAnswerPathRequest` /
 * `shouldFulfillDiscoveryPending` reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { TRUNCATED_HASH_BYTES } from "../hash-truncate.js";
import { firstAction, hasActionOfKind } from "../action-kind.js";

export { TRUNCATED_HASH_BYTES };

export const PATHFINDER_MAX_HOPS = 128;
export const PATHFINDER_EXPIRY_SECONDS = 60 * 60 * 24 * 7;
export const PATH_REQUEST_TIMEOUT_SECONDS = 15;
export const PATH_REQUEST_GRACE_MS = 400;
export const PATH_REQUEST_MIN_INTERVAL = 20;

/** Whether enough time has passed to emit another path request for a destination. */
export function shouldEmitPathRequest(input: {
  readonly lastRequestAt: number;
  readonly nowSeconds: number;
  readonly minIntervalSeconds?: number;
}): boolean {
  const minInterval = input.minIntervalSeconds ?? PATH_REQUEST_MIN_INTERVAL;
  return input.nowSeconds - input.lastRequestAt >= minInterval;
}

/**
 * shouldEmitPathRequest gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldEmitPathRequest`
 * reads beside the step).
 */
export type EmitPathRequestState = Record<string, never>;

export type EmitPathRequestEvent =
  | Event
  | {
      readonly kind: "path-request/emit-gate";
      readonly lastRequestAt: number;
      readonly nowSeconds: number;
      readonly minIntervalSeconds?: number;
    };

export type EmitPathRequestAction =
  { readonly kind: "emit" } | { readonly kind: "skip" };

export interface EmitPathRequestStepResult {
  readonly state: EmitPathRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EmitPathRequestAction[];
}

export function initialEmitPathRequestState(): EmitPathRequestState {
  return {};
}

export function stepEmitPathRequestWithActions(
  state: EmitPathRequestState,
  event: EmitPathRequestEvent,
): EmitPathRequestStepResult {
  if (event.kind === "path-request/emit-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldEmitPathRequest({
            lastRequestAt: event.lastRequestAt,
            nowSeconds: event.nowSeconds,
            ...(event.minIntervalSeconds !== undefined
              ? { minIntervalSeconds: event.minIntervalSeconds }
              : {}),
          })
            ? "emit"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldEmitPathRequestNow(
  actions: ReadonlyArray<EmitPathRequestAction>,
): boolean {
  return hasActionOfKind(actions, "emit");
}

export function shouldSkipEmitPathRequest(
  actions: ReadonlyArray<EmitPathRequestAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/** True when a discovery path-request entry is past its absolute deadline. */
export function isDiscoveryPathRequestExpired(input: {
  readonly timeoutAt: number;
  readonly nowSeconds: number;
}): boolean {
  return input.nowSeconds > input.timeoutAt;
}

/**
 * isDiscoveryPathRequestExpired gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `isDiscoveryPathRequestExpired` reads beside the step).
 */
export type DiscoveryPathRequestExpiredState = Record<string, never>;

export type DiscoveryPathRequestExpiredEvent =
  | Event
  | {
      readonly kind: "path-request/discovery-expired-gate";
      readonly timeoutAt: number;
      readonly nowSeconds: number;
    };

export type DiscoveryPathRequestExpiredAction =
  { readonly kind: "expired" } | { readonly kind: "live" };

export interface DiscoveryPathRequestExpiredStepResult {
  readonly state: DiscoveryPathRequestExpiredState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DiscoveryPathRequestExpiredAction[];
}

export function initialDiscoveryPathRequestExpiredState(): DiscoveryPathRequestExpiredState {
  return {};
}

export function stepDiscoveryPathRequestExpiredWithActions(
  state: DiscoveryPathRequestExpiredState,
  event: DiscoveryPathRequestExpiredEvent,
): DiscoveryPathRequestExpiredStepResult {
  if (event.kind === "path-request/discovery-expired-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: isDiscoveryPathRequestExpired({
            timeoutAt: event.timeoutAt,
            nowSeconds: event.nowSeconds,
          })
            ? "expired"
            : "live",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldTreatDiscoveryPathRequestExpired(
  actions: ReadonlyArray<DiscoveryPathRequestExpiredAction>,
): boolean {
  return hasActionOfKind(actions, "expired");
}

export function shouldTreatDiscoveryPathRequestLive(
  actions: ReadonlyArray<DiscoveryPathRequestExpiredAction>,
): boolean {
  return hasActionOfKind(actions, "live");
}

/**
 * Path-request ingress outcome after parse / tag / local / path / discovery gates.
 * Tag recording and transmit stay at the adapter edge.
 */
export type PathRequestIngressPlan =
  | "ignore-unparsed"
  | "ignore-seen-tag"
  | "answer-local"
  | "answer-path"
  | "ignore"
  | "ignore-in-flight-discovery"
  | "start-discovery";

/**
 * Plan inbound path-request handling for leaf and transport-enabled nodes.
 * Pass `allowDiscovery: true` on TransportNode (missing path may forward);
 * leaf transport keeps the default (`false`) and ignores when no answerable path.
 */
function planTransportPathRequest(input: {
  readonly transportEnabled: boolean;
  readonly hasPath: boolean;
  readonly shouldAnswerPath: boolean;
  readonly discoveryPresent: boolean;
  readonly discoveryExpired: boolean;
  readonly allowDiscovery?: boolean;
}): PathRequestIngressPlan {
  if (!input.transportEnabled) return "ignore";
  if (input.hasPath) return input.shouldAnswerPath ? "answer-path" : "ignore";
  if (input.allowDiscovery !== true) return "ignore";
  if (input.discoveryPresent && !input.discoveryExpired) {
    return "ignore-in-flight-discovery";
  }
  return "start-discovery";
}

export function planPathRequestIngress(input: {
  readonly parsedOk: boolean;
  readonly hasTag: boolean;
  readonly tagAlreadySeen: boolean;
  readonly hasLocalAnswerer: boolean;
  readonly transportEnabled: boolean;
  readonly hasPath: boolean;
  readonly shouldAnswerPath: boolean;
  readonly discoveryPresent: boolean;
  readonly discoveryExpired: boolean;
  readonly allowDiscovery?: boolean;
}): PathRequestIngressPlan {
  if (!input.parsedOk || !input.hasTag) {
    return "ignore-unparsed";
  }
  if (input.tagAlreadySeen) {
    return "ignore-seen-tag";
  }
  if (input.hasLocalAnswerer) {
    return "answer-local";
  }
  return planTransportPathRequest(input);
}

/**
 * Path-request-ingress plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPathRequestIngress` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepPathRequestIngressWithActions}.
 */
export type PathRequestIngressPlanState = Record<string, never>;

export type PathRequestIngressPlanEvent =
  | Event
  | {
      readonly kind: "path-request/ingress-plan-gate";
      readonly parsedOk: boolean;
      readonly hasTag: boolean;
      readonly tagAlreadySeen: boolean;
      readonly hasLocalAnswerer: boolean;
      readonly transportEnabled: boolean;
      readonly hasPath: boolean;
      readonly shouldAnswerPath: boolean;
      readonly discoveryPresent: boolean;
      readonly discoveryExpired: boolean;
      readonly allowDiscovery?: boolean;
    };

export type PathRequestIngressPlanAction = {
  readonly kind: PathRequestIngressPlan;
};

export interface PathRequestIngressPlanStepResult {
  readonly state: PathRequestIngressPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathRequestIngressPlanAction[];
}

export function initialPathRequestIngressPlanState(): PathRequestIngressPlanState {
  return {};
}

export function stepPathRequestIngressPlanWithActions(
  state: PathRequestIngressPlanState,
  event: PathRequestIngressPlanEvent,
): PathRequestIngressPlanStepResult {
  if (event.kind === "path-request/ingress-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planPathRequestIngress({
            parsedOk: event.parsedOk,
            hasTag: event.hasTag,
            tagAlreadySeen: event.tagAlreadySeen,
            hasLocalAnswerer: event.hasLocalAnswerer,
            transportEnabled: event.transportEnabled,
            hasPath: event.hasPath,
            shouldAnswerPath: event.shouldAnswerPath,
            discoveryPresent: event.discoveryPresent,
            discoveryExpired: event.discoveryExpired,
            ...(event.allowDiscovery !== undefined
              ? { allowDiscovery: event.allowDiscovery }
              : {}),
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the path-request ingress plan from actions; null when empty. */
export function pathRequestIngressPlanFromActions(
  actions: ReadonlyArray<PathRequestIngressPlanAction>,
): PathRequestIngressPlan | null {
  const action = firstAction(actions);
  return action?.kind ?? null;
}

/**
 * Path-request ingress is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepPathRequestIngressPlanWithActions}.
 */
export type PathRequestIngressState = Record<string, never>;

export type PathRequestIngressEvent =
  | Event
  | {
      readonly kind: "path-request/ingress-gate";
      readonly parsedOk: boolean;
      readonly hasTag: boolean;
      readonly tagAlreadySeen: boolean;
      readonly hasLocalAnswerer: boolean;
      readonly transportEnabled: boolean;
      readonly hasPath: boolean;
      readonly shouldAnswerPath: boolean;
      readonly discoveryPresent: boolean;
      readonly discoveryExpired: boolean;
      readonly allowDiscovery?: boolean;
    };

export type PathRequestIngressAction = {
  readonly kind: PathRequestIngressPlan;
};

export interface PathRequestIngressStepResult {
  readonly state: PathRequestIngressState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathRequestIngressAction[];
}

export function initialPathRequestIngressState(): PathRequestIngressState {
  return {};
}

export const stepPathRequestIngress: StepFn<PathRequestIngressState> = (
  state,
  event,
) => {
  const result = stepPathRequestIngressInner(
    state,
    event as PathRequestIngressEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepPathRequestIngressWithActions(
  state: PathRequestIngressState,
  event: PathRequestIngressEvent,
): PathRequestIngressStepResult {
  return stepPathRequestIngressInner(state, event);
}

export function pathRequestIngressFromActions(
  actions: ReadonlyArray<PathRequestIngressAction>,
): PathRequestIngressPlan | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldIgnorePathRequestUnparsed(
  actions: ReadonlyArray<PathRequestIngressAction>,
): boolean {
  return hasActionOfKind(actions, "ignore-unparsed");
}

export function shouldIgnorePathRequestSeenTag(
  actions: ReadonlyArray<PathRequestIngressAction>,
): boolean {
  return hasActionOfKind(actions, "ignore-seen-tag");
}

export function shouldAnswerPathRequestLocal(
  actions: ReadonlyArray<PathRequestIngressAction>,
): boolean {
  return hasActionOfKind(actions, "answer-local");
}

export function shouldAnswerPathRequestPath(
  actions: ReadonlyArray<PathRequestIngressAction>,
): boolean {
  return hasActionOfKind(actions, "answer-path");
}

export function shouldIgnorePathRequestIngress(
  actions: ReadonlyArray<PathRequestIngressAction>,
): boolean {
  return hasActionOfKind(actions, "ignore");
}

export function shouldIgnorePathRequestInFlightDiscovery(
  actions: ReadonlyArray<PathRequestIngressAction>,
): boolean {
  return hasActionOfKind(actions, "ignore-in-flight-discovery");
}

export function shouldStartPathRequestDiscovery(
  actions: ReadonlyArray<PathRequestIngressAction>,
): boolean {
  return hasActionOfKind(actions, "start-discovery");
}

function stepPathRequestIngressInner(
  state: PathRequestIngressState,
  event: PathRequestIngressEvent,
): PathRequestIngressStepResult {
  if (event.kind === "path-request/ingress-gate") {
    const planActions = stepPathRequestIngressPlanWithActions(
      initialPathRequestIngressPlanState(),
      {
        kind: "path-request/ingress-plan-gate",
        parsedOk: event.parsedOk,
        hasTag: event.hasTag,
        tagAlreadySeen: event.tagAlreadySeen,
        hasLocalAnswerer: event.hasLocalAnswerer,
        transportEnabled: event.transportEnabled,
        hasPath: event.hasPath,
        shouldAnswerPath: event.shouldAnswerPath,
        discoveryPresent: event.discoveryPresent,
        discoveryExpired: event.discoveryExpired,
        ...(event.allowDiscovery !== undefined
          ? { allowDiscovery: event.allowDiscovery }
          : {}),
      },
    ).actions;
    const plan = pathRequestIngressPlanFromActions(planActions);
    if (plan === null) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

/** Whether answer-local may invoke the local destination path-request handler. */
export function canAnswerLocalPathRequest(handlerPresent: boolean): boolean {
  return handlerPresent;
}

/**
 * canAnswerLocalPathRequest gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canAnswerLocalPathRequest`
 * reads beside the step).
 */
export type AnswerLocalPathRequestState = Record<string, never>;

export type AnswerLocalPathRequestEvent =
  | Event
  | {
      readonly kind: "path-request/answer-local-handler-gate";
      readonly handlerPresent: boolean;
    };
