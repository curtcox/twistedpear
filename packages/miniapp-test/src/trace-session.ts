import { createHash } from "node:crypto";
import {
  GrantStore,
  HOST_API_VERSION,
  KvStorageBeeBackend,
  MiniappHost,
  NodeWorkerSandboxBackend,
  SessionRecorder,
  type AppTrace,
  type AppTraceHost,
  type AppTraceIdentity,
  type LaunchManifest,
  type MiniappHostCallbacks,
  type WidgetPatch,
  type WidgetTree,
} from "@twistedpear/miniapp-runtime";
import { MemoryKvStore, findNodeIdByEvent, settleHost } from "./harness.js";
import { createTraceClock, type TraceClockOptions } from "./trace-clock.js";

const HEX64 = /^[0-9a-f]{64}$/;

/** Host the session runs on. Record and replay must build it the same way. */
export interface TraceHostContext {
  readonly now: () => number;
  readonly sessionRecorder: SessionRecorder;
  readonly callbacks: MiniappHostCallbacks;
}

export type TraceHostFactory = (
  context: TraceHostContext,
) => MiniappHost | Promise<MiniappHost>;

export interface TraceSessionOptions {
  readonly manifest: LaunchManifest;
  readonly bundle: Uint8Array;
  readonly grants?: ReadonlyArray<string>;
  readonly host?: TraceHostFactory;
  readonly clock?: TraceClockOptions;
  readonly identity?: Partial<AppTraceIdentity>;
  readonly hostFacts?: Partial<AppTraceHost>;
  readonly settleMs?: number;
}

/** One input and the render it produced. `index` 0 is the launch. */
export interface TraceStep {
  readonly index: number;
  readonly input: string;
  readonly nodeId: string | null;
  readonly tree: WidgetTree | null;
  readonly patches: ReadonlyArray<WidgetPatch>;
}

export interface SessionRecording {
  readonly trace: AppTrace;
  readonly steps: ReadonlyArray<TraceStep>;
  readonly patches: ReadonlyArray<WidgetPatch>;
}

/**
 * A locally recorded trace still has to name one artifact. When the caller has
 * the signed package's values it should pass them; otherwise a digest of the
 * publisher key and of the bundle stands in, so the document is well-formed and
 * self-consistent without claiming a package hash it did not verify.
 */
function traceIdentityFor(
  manifest: LaunchManifest,
  bundle: Uint8Array,
  overrides: Partial<AppTraceIdentity> = {},
): AppTraceIdentity {
  return {
    appId: overrides.appId ?? manifest.name,
    version: overrides.version ?? manifest.version,
    publisherKey:
      overrides.publisherKey ??
      (HEX64.test(manifest.publisherPublicKey)
        ? manifest.publisherPublicKey
        : sha256Hex(`tp-trace-publisher:${manifest.publisherPublicKey}`)),
    packageHash: overrides.packageHash ?? sha256Hex(bundle),
  };
}

function traceHostFactsFor(
  overrides: Partial<AppTraceHost> = {},
): AppTraceHost {
  return {
    platform: overrides.platform ?? "miniapp-test",
    hostVersion: overrides.hostVersion ?? HOST_API_VERSION,
    hostApiVersion: overrides.hostApiVersion ?? HOST_API_VERSION,
  };
}

function sha256Hex(input: string | Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}

const defaultTraceHost: TraceHostFactory = (context) => {
  const store = new MemoryKvStore();
  return new MiniappHost({
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(store),
    kvBackend: store,
    beeBackend: new KvStorageBeeBackend(store),
    now: context.now,
    sessionRecorder: context.sessionRecorder,
    callbacks: context.callbacks,
  });
};

export interface StartedSession {
  readonly host: MiniappHost;
  readonly recorder: SessionRecorder;
  readonly steps: TraceStep[];
  /** Patches seen since the last step boundary. Emptied by `cut`. */
  cut(input: string, nodeId: string | null): TraceStep;
  readonly patches: ReadonlyArray<WidgetPatch>;
  settle(): Promise<void>;
}

/** Launch `manifest` on a recorder-attached host and take the launch step. */
export async function startTraceSession(
  options: TraceSessionOptions,
): Promise<StartedSession> {
  const clock = createTraceClock(options.clock);
  const recorder = new SessionRecorder({
    identity: traceIdentityFor(
      options.manifest,
      options.bundle,
      options.identity,
    ),
    host: traceHostFactsFor(options.hostFacts),
    grants: [...(options.grants ?? options.manifest.capabilities)],
    now: clock.now,
  });
  const patches: WidgetPatch[] = [];
  let pending: WidgetPatch[] = [];
  const host = await (options.host ?? defaultTraceHost)({
    now: clock.now,
    sessionRecorder: recorder,
    callbacks: {
      onWidgetTree: (_tree, next) => {
        patches.push(...next);
        pending.push(...next);
      },
    },
  });
  const steps: TraceStep[] = [];
  const settle = () => settleHost(host, options.settleMs);
  const cut = (input: string, nodeId: string | null): TraceStep => {
    const step: TraceStep = {
      index: steps.length,
      input,
      nodeId,
      tree: host.snapshot().widgetTree,
      patches: pending,
    };
    pending = [];
    steps.push(step);
    return step;
  };

  const granted = [...(options.grants ?? options.manifest.capabilities)];
  await host.setGrants(
    options.manifest.name,
    options.manifest.publisherPublicKey,
    options.manifest.capabilities,
    granted,
  );
  await host.launch(options.manifest, options.bundle);
  await settle();
  cut("launch", null);
  return { host, recorder, steps, cut, patches, settle };
}

/**
 * Record a session: launch, run `script`, and snapshot the shape-only trace.
 * `script` drives the app through `fireTraceEvent` so every input it delivers
 * lands on the tape as an `inbound` row that replay can re-enter.
 */
export async function recordSession(
  options: TraceSessionOptions & {
    readonly script?: (session: StartedSession) => Promise<void>;
  },
): Promise<SessionRecording & { readonly host: MiniappHost }> {
  const session = await startTraceSession(options);
  await options.script?.(session);
  return {
    host: session.host,
    trace: session.recorder.snapshot(),
    steps: session.steps,
    patches: session.patches,
  };
}

export class TraceInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TraceInputError";
  }
}

/**
 * Deliver one UI event by name and cut a step.
 *
 * A shape trace records the event name, never the node id — the id is app
 * data, and the name is what the tape can honestly carry. Replay resolves the
 * id the same way `AppHandle.fire` does: the first node in document order whose
 * `props.event` matches. A tree that no longer declares the name is a real
 * divergence, so this throws rather than skipping the input.
 */
export async function fireTraceEvent(
  session: StartedSession,
  event: string,
  value?: unknown,
): Promise<TraceStep> {
  const tree = session.host.snapshot().widgetTree;
  if (tree === null) {
    throw new TraceInputError(
      `cannot deliver ${event}: the app has not rendered`,
    );
  }
  const nodeId = findNodeIdByEvent(tree.root, event);
  if (nodeId === null) {
    throw new TraceInputError(`no widget declares event ${event}`);
  }
  await session.host.handleUiEvent(nodeId, event, value);
  await session.settle();
  return session.cut(event, nodeId);
}
