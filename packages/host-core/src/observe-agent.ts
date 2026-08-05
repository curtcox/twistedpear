/**
 * Peer-agent observe domain: subscribe live `observe.drop` events and snapshot
 * the bounded ring as recorded-history.
 */
import type { ObserveDropIntent } from "@twistedpear/protocol";
import type { DropCensusCounts } from "./drop-census.js";
import { ringToRecordedHistory, type ObserveRing } from "./observe-ring.js";

export interface ObserveAgentState {
  observeSubscribed: boolean;
  readonly observeRing: ObserveRing;
  readonly dropCensusSnapshot: () => DropCensusCounts;
  readonly label: string;
}

export function handleObserveCommand(
  state: ObserveAgentState,
  request: { readonly cmd: string; readonly domain?: unknown },
): Record<string, unknown> | null {
  switch (request.cmd) {
    case "subscribe": {
      const domain =
        typeof request.domain === "string" ? request.domain : "observe";
      if (domain !== "observe") {
        throw new Error(`unsupported subscribe domain: ${domain}`);
      }
      state.observeSubscribed = true;
      return { domain, subscribed: true, buffered: state.observeRing.size() };
    }
    case "unsubscribe": {
      state.observeSubscribed = false;
      return { domain: "observe", subscribed: false };
    }
    case "observe-snapshot":
      return {
        history: ringToRecordedHistory(
          state.observeRing.snapshot(),
          state.label,
        ),
        dropCensus: state.dropCensusSnapshot(),
      };
    default:
      return null;
  }
}

export function recordObserveDrop(
  state: {
    readonly dropCensus: { readonly record: (drop: ObserveDropIntent) => void };
    readonly observeRing: ObserveRing;
    readonly notifyObserve: ((drop: ObserveDropIntent) => void) | null;
  },
  drop: ObserveDropIntent,
): void {
  state.dropCensus.record(drop);
  state.observeRing.push(drop);
  state.notifyObserve?.(drop);
}
