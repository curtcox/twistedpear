import type { AttackProposal } from "./adversary.js";

export interface HistoricalReplayFixture {
  readonly source: string;
  readonly name: string;
  readonly expressible: boolean;
  readonly reason?: string;
  readonly proposal?: AttackProposal;
}

/** Kernel-level lifts of the hostile-app corpus, with non-network cases explicit. */
export const HISTORICAL_REPLAY_FIXTURES: readonly HistoricalReplayFixture[] = [
  {
    source: "conformance/hostile-apps",
    name: "broker-flood",
    expressible: true,
    proposal: {
      name: "broker-flood",
      actions: Array.from({ length: 32 }, (_, index) => ({
        power: "inject" as const,
        source: "app",
        destination: "host",
        channel: "broker",
        payload: new Uint8Array([index])
      }))
    }
  },
  { source: "conformance/hostile-apps", name: "busy-loop", expressible: false, reason: "CPU scheduling is outside the protocol event model" },
  { source: "conformance/hostile-apps", name: "memory-bomb", expressible: false, reason: "heap allocation is enforced by the sandbox, not transport" },
  { source: "conformance/hostile-apps", name: "constructor-chain-escape", expressible: false, reason: "language sandbox escape is outside the protocol event model" },
  { source: "conformance/hostile-apps", name: "oversized-broker-message", expressible: true, proposal: {
    name: "oversized-broker-message",
    actions: [{ power: "inject", source: "app", destination: "host", channel: "broker", payload: new Uint8Array(512) }]
  } }
];
