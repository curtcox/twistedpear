import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  OracleViolation,
  SimKernel,
  shrinkHistoryWithConfig,
  type RecordedHistory,
} from "@twistedpear/effects/adapters/sim";
import {
  compileAttackProposal,
  createFuzzAdversary,
  type AdversaryState,
} from "./adversary.js";
import type { HistoricalReplayFixture } from "./historical.js";
import { decodeGrantRecord, encodeGrantRecord } from "@twistedpear/protocol";
import { GrantStore, MiniappBroker } from "@twistedpear/miniapp-runtime";
import {
  initialLinkHandshakeState,
  LinkHandshakePhase,
  stepLinkHandshakeWithActions,
} from "@twistedpear/protocol";

interface HistoricalDelivery {
  readonly source: string;
  readonly channel: string;
  readonly payload: Uint8Array;
}

interface AccuracyState extends AdversaryState {
  readonly role: "target" | "adversary";
  readonly received: number;
  readonly accepted: number;
  readonly seen: readonly string[];
  readonly outcome: string | null;
  readonly canary: boolean;
  readonly deliveries: readonly HistoricalDelivery[];
}

const initialTarget: AccuracyState = {
  role: "target",
  acted: false,
  entropyRequested: false,
  received: 0,
  accepted: 0,
  seen: [],
  outcome: null,
  canary: false,
  deliveries: [],
};

/** Execute a reviewed historical fixture against its named deterministic target. */
export async function executeHistoricalFixture(
  fixture: HistoricalReplayFixture,
  seed = 1,
  policy: {
    readonly disableContainmentFor?: HistoricalReplayFixture["target"];
  } = {},
): Promise<string> {
  if (
    !fixture.expressible ||
    fixture.proposal === undefined ||
    fixture.expectedOutcome === undefined
  )
    throw new Error(`historical fixture is not executable: ${fixture.name}`);
  const compiled = compileAttackProposal(fixture.proposal, [
    "drop",
    "delay",
    "reorder",
    "duplicate",
    "inject",
  ]);
  const endpoints = new Set(
    compiled.proposal.actions.flatMap((action) => [
      action.source,
      action.destination,
    ]),
  );
  const targetIds = [...endpoints].filter((id) => id !== "z");
  const linkPowers = new Map<
    string,
    Set<import("@twistedpear/effects").DolevYaoPower>
  >();
  for (const action of compiled.proposal.actions) {
    if (action.power === "author-flood") continue;
    const key = `${action.source}\0${action.destination}`;
    const powers = linkPowers.get(key) ?? new Set();
    powers.add(action.power);
    linkPowers.set(key, powers);
  }
  const links = [...linkPowers].map(([key, powers]) => {
    const [source, destination] = key.split("\0") as [string, string];
    return {
      source,
      destination,
      class: "lan" as const,
      adversary: "z",
      powers: [...powers],
      params: clean,
    };
  });
  const config = {
    seed,
    nodes: [
      ...targetIds.map((id) => ({
        id,
        machine: `historical/${fixture.target ?? "target"}`,
        initial: initialTarget,
        step: historicalDeliveryStep(
          id,
          compiled.proposal.actions.filter(
            (
              action,
            ): action is import("@twistedpear/effects").TransportAdversaryAction =>
              action.power !== "author-flood",
          ),
        ),
      })),
      {
        id: "z",
        machine: "historical/adversary",
        initial: adversaryState(compiled.initial),
        step: widen(compiled.step),
      },
    ],
    links,
  };
  const kernel = new SimKernel(config);
  kernel.start();
  kernel.runUntilIdle(10_000);
  const deliveries = targetIds.flatMap(
    (id) => kernel.getNodeState(id).deliveries,
  );
  const outcome = await productionHistoricalOutcome(
    fixture.target!,
    deliveries,
    policy.disableContainmentFor === fixture.target,
  );
  if (outcome !== fixture.expectedOutcome)
    throw new Error(
      `historical accuracy miss for ${fixture.name}: expected ${fixture.expectedOutcome}`,
    );
  return fixture.expectedOutcome;
}

function historicalDeliveryStep(
  id: string,
  actions: readonly import("@twistedpear/effects").TransportAdversaryAction[],
): StepFn<AccuracyState> {
  return (state, event) => {
    if (event.kind === "start") {
      const sends = actions
        .filter((action) => action.source === id && action.power !== "inject")
        .map((action): Intent => ({
          kind: "transport/send",
          send: {
            channel: "historical",
            destination: action.destination,
            payload: new Uint8Array([1]),
          },
        }));
      return { state, intents: sends };
    }
    if (state.role !== "target" || event.kind !== "transport/recv")
      return { state, intents: [] };
    const key = `${event.channel}:${bytes(event.payload)}`;
    return {
      state: {
        ...state,
        received: state.received + 1,
        accepted: state.accepted + 1,
        seen: [...state.seen, key],
        deliveries: [
          ...state.deliveries,
          {
            source: event.source,
            channel: event.channel,
            payload: Uint8Array.from(event.payload),
          },
        ],
      },
      intents: [],
    };
  };
}

async function productionHistoricalOutcome(
  target: NonNullable<HistoricalReplayFixture["target"]>,
  deliveries: readonly HistoricalDelivery[],
  drift: boolean,
): Promise<string | null> {
  if (target === "broker") return brokerHistoricalOutcome(deliveries, drift);
  if (target === "handshake")
    return handshakeHistoricalOutcome(deliveries, drift);
  if (target === "grant") return grantHistoricalOutcome(drift);
  throw new Error(`historical target has no shipping adapter: ${target}`);
}

async function brokerHistoricalOutcome(
  deliveries: readonly HistoricalDelivery[],
  drift: boolean,
): Promise<string | null> {
  const broker = new MiniappBroker({
    now: () => 0,
    maxMessageBytes: drift ? Number.MAX_SAFE_INTEGER : 256,
    maxMessagesPerSecond: drift ? Number.MAX_SAFE_INTEGER : 16,
  });
  broker.register("historical", "accept", null, () => ({ accepted: true }));
  for (const [index, delivery] of deliveries.entries()) {
    const response = await broker.dispatch(
      {
        id: String(index),
        namespace: "historical",
        method: "accept",
        payload: [...delivery.payload],
      },
      {
        appId: "historical",
        publisherPublicKey: "historical",
        declaredCapabilities: [],
        grantedCapabilities: [],
      },
    );
    if (response.error?.code === "MESSAGE_TOO_LARGE")
      return "oversized-message-rejected";
    if (response.error?.code === "RATE_LIMITED") return "broker-rate-limited";
  }
  return null;
}

function handshakeHistoricalOutcome(
  deliveries: readonly HistoricalDelivery[],
  drift: boolean,
): string | null {
  if (drift || deliveries.length < 2) return null;
  const linkId = new Uint8Array([1]);
  let state = stepLinkHandshakeWithActions(
    initialLinkHandshakeState({ role: "responder", peerId: "initiator" }),
    {
      kind: "handshake/begin",
      at: 0,
      entropy: new Uint8Array(32).fill(1),
      linkId,
    },
  ).state;
  const material = new Uint8Array(32).fill(deliveries[0]?.payload[0] ?? 1);
  state = stepLinkHandshakeWithActions(state, {
    kind: "handshake/peer-material",
    material,
    linkId,
  }).state;
  const replayed = stepLinkHandshakeWithActions(state, {
    kind: "handshake/peer-material",
    material,
    linkId,
  }).state;
  return state.phase === LinkHandshakePhase.ESTABLISHED && replayed === state
    ? "replay-rejected"
    : null;
}

async function grantHistoricalOutcome(drift: boolean): Promise<string | null> {
  const store = new GrantStore(new HistoricalGrantBackend());
  await store.set({
    appId: "historical",
    publisherPublicKey: "publisher",
    declared: ["identity"],
    requestedGrants: ["identity"],
    now: 0,
    ttlMs: 60_000,
  });
  await store.use("historical", "publisher", "identity", 1);
  if (!drift) await store.revoke("historical", "publisher", "identity", 2);
  const replay = await store.use("historical", "publisher", "identity", 3);
  return replay?.granted.includes("identity") === true
    ? null
    : "bearer-replay-rejected";
}

class HistoricalGrantBackend {
  private readonly values = new Map<string, Uint8Array>();
  get(key: string): Promise<Uint8Array | null> {
    return Promise.resolve(this.values.get(key)?.slice() ?? null);
  }
  set(key: string, value: Uint8Array): Promise<void> {
    this.values.set(key, value.slice());
    return Promise.resolve();
  }
  delete(key: string): Promise<void> {
    this.values.delete(key);
    return Promise.resolve();
  }
}

export interface FuzzCanaryResult {
  readonly seed: number;
  readonly history: RecordedHistory<AccuracyState>;
  readonly minimized: RecordedHistory<AccuracyState>;
}

/** Search seeds and payloads, then delta-debug the first real target failure. */
export function searchFuzzCanary(options: {
  readonly from: number;
  readonly to: number;
}): FuzzCanaryResult {
  const valid = encodeGrantRecord({
    appId: "a",
    publisherPublicKey: "p",
    granted: ["identity"],
    updatedAt: 1,
  });
  const laxOnly = new TextEncoder().encode(
    '{"appId":"a","publisherPublicKey":"p","granted":["identity"],"updatedAt":1,"updatedAt":2}',
  );
  const payloads = [new Uint8Array([0]), laxOnly, valid];
  for (let seed = options.from; seed <= options.to; seed += 1) {
    const fuzz = createFuzzAdversary({
      source: "fuzzer",
      destination: "target",
      channel: "fuzz",
      payloads,
    });
    const config = {
      seed,
      nodes: [
        {
          id: "sender",
          machine: "fuzz/valid-grant-sender",
          initial: initialTarget,
          step: validGrantSender(valid),
        },
        {
          id: "target",
          machine: "protocol/grant-parser-defect-variant",
          initial: initialTarget,
          step: canaryTargetStep,
        },
        {
          id: "z",
          machine: "fuzz/search",
          initial: adversaryState(fuzz.initial),
          step: widen(fuzz.step),
        },
      ],
      links: [
        {
          source: "sender",
          destination: "target",
          class: "lan" as const,
          params: clean,
        },
        {
          source: "fuzzer",
          destination: "target",
          class: "lan" as const,
          adversary: "z",
          powers: ["inject" as const],
          params: clean,
        },
      ],
      oracles: [
        {
          name: "fuzz-canary",
          check: (world: { nodes: ReadonlyMap<string, AccuracyState> }) =>
            [...world.nodes.values()].some((state) => state.canary)
              ? {
                  oracle: "fuzz-canary",
                  message:
                    "lax grant parser admitted a non-canonical record after canonical traffic",
                }
              : null,
        },
      ],
    };
    const kernel = new SimKernel(config);
    try {
      kernel.start();
      kernel.runUntilIdle(10_000);
    } catch (error) {
      if (!(error instanceof OracleViolation)) throw error;
      return {
        seed,
        history: error.history as RecordedHistory<AccuracyState>,
        minimized: shrinkHistoryWithConfig(error.history, config),
      };
    }
  }
  throw new Error(
    `fuzz canary not found in seeds ${options.from}..${options.to}`,
  );
}

const canaryTargetStep: StepFn<AccuracyState> = (state, event) => {
  if (event.kind !== "transport/recv") return { state, intents: [] };
  const canonical = tryCanonicalGrant(event.payload);
  const lax = tryLaxGrant(event.payload);
  const sawCanonical = state.seen.includes("canonical") || canonical;
  return {
    state: {
      ...state,
      received: state.received + 1,
      seen: canonical ? [...state.seen, "canonical"] : state.seen,
      canary: state.canary || (sawCanonical && lax && !canonical),
    },
    intents: [],
  };
};

function tryCanonicalGrant(payload: Uint8Array): boolean {
  try {
    decodeGrantRecord(payload);
    return true;
  } catch {
    return false;
  }
}

function tryLaxGrant(payload: Uint8Array): boolean {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(payload)) as Record<
      string,
      unknown
    >;
    return (
      typeof parsed.appId === "string" &&
      typeof parsed.publisherPublicKey === "string" &&
      Array.isArray(parsed.granted) &&
      typeof parsed.updatedAt === "number"
    );
  } catch {
    return false;
  }
}

function validGrantSender(payload: Uint8Array): StepFn<AccuracyState> {
  return (state, event) =>
    event.kind === "start"
      ? {
          state,
          intents: [
            {
              kind: "transport/send",
              send: {
                channel: "grant",
                destination: "target",
                payload,
              },
            },
          ],
        }
      : { state, intents: [] };
}

function adversaryState(state: AdversaryState): AccuracyState {
  return { ...initialTarget, ...state, role: "adversary" };
}
function widen(step: StepFn<AdversaryState>): StepFn<AccuracyState> {
  return (state, event: Event) => {
    const result = step(state, event);
    return {
      state: { ...state, ...result.state },
      intents: result.intents as readonly Intent[],
    };
  };
}
function bytes(value: Uint8Array): string {
  return [...value].join(".");
}
const clean = {
  lossRate: 0,
  latency: { kind: "fixed" as const, ms: 1 },
  burstLoss: { goodToBad: 0, badToGood: 1, goodLossRate: 0, badLossRate: 0 },
};
