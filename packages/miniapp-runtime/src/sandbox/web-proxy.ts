import type {
  SandboxBackend,
  SandboxInstance,
  SandboxSpawnOptions,
} from "./backend.js";

export interface WebSandboxProxyOutbound {
  readonly spawn: (request: {
    readonly requestId: string;
    readonly instanceId: string;
    readonly appId: string;
    readonly version: string;
    readonly entryPath: string;
    readonly bundleHex: string;
  }) => void;
  readonly postMessage: (instanceId: string, message: unknown) => void;
  readonly ping: (
    requestId: string,
    instanceId: string,
    timeoutMs: number,
  ) => void;
  readonly kill: (instanceId: string, reason: string) => void;
  readonly brokerResponse: (requestId: string, response: unknown) => void;
}

export interface WebSandboxProxyController {
  readonly backend: WebSandboxProxyBackend;
  handleSpawned(requestId: string, instanceId: string): void;
  handleSpawnFailed(requestId: string, message: string): void;
  handleMessage(instanceId: string, message: unknown): void;
  handlePingResult(requestId: string, alive: boolean): void;
  handleBrokerRequest(
    requestId: string,
    instanceId: string,
    request: unknown,
  ): void;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function createWebSandboxProxyBackend(
  outbound: WebSandboxProxyOutbound,
): WebSandboxProxyController {
  const pendingSpawns = new Map<
    string,
    { resolve: () => void; reject: (error: Error) => void }
  >();
  const pendingPings = new Map<string, { resolve: (alive: boolean) => void }>();
  const instances = new Map<string, ProxySandboxInstance>();

  const backend = new WebSandboxProxyBackend(
    outbound,
    pendingSpawns,
    pendingPings,
    instances,
  );

  return {
    backend,
    handleSpawned(requestId, instanceId) {
      const waiter = pendingSpawns.get(requestId);
      if (waiter === undefined) {
        return;
      }

      pendingSpawns.delete(requestId);
      waiter.resolve();
      instances.get(instanceId)?.markAlive();
    },
    handleSpawnFailed(requestId, message) {
      const waiter = pendingSpawns.get(requestId);
      if (waiter === undefined) {
        return;
      }

      pendingSpawns.delete(requestId);
      waiter.reject(new Error(message));
    },
    handleMessage(instanceId, message) {
      instances.get(instanceId)?.handleMessage(message);
    },
    handlePingResult(requestId, alive) {
      const waiter = pendingPings.get(requestId);
      if (waiter === undefined) {
        return;
      }

      pendingPings.delete(requestId);
      waiter.resolve(alive);
    },
    handleBrokerRequest(requestId, instanceId, request) {
      const instance = instances.get(instanceId);
      if (instance === undefined) {
        outbound.brokerResponse(requestId, {
          id: (request as { id?: string }).id,
          ok: false,
          error: { message: "Sandbox instance is not active" },
        });
        return;
      }

      void instance.handleBrokerRequest(request).then(
        (response) => outbound.brokerResponse(requestId, response),
        (error) =>
          outbound.brokerResponse(requestId, {
            id: (request as { id?: string }).id,
            ok: false,
            error: {
              message: error instanceof Error ? error.message : String(error),
            },
          }),
      );
    },
  };
}

class WebSandboxProxyBackend implements SandboxBackend {
  readonly name = "web-iframe-worker-proxy";

  constructor(
    private readonly outbound: WebSandboxProxyOutbound,
    private readonly pendingSpawns: Map<
      string,
      { resolve: () => void; reject: (error: Error) => void }
    >,
    private readonly pendingPings: Map<
      string,
      { resolve: (alive: boolean) => void }
    >,
    private readonly instances: Map<string, ProxySandboxInstance>,
  ) {}

  async spawn(options: SandboxSpawnOptions): Promise<SandboxInstance> {
    const requestId = `spawn-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const instanceId = `${options.appId}-${Date.now()}`;
    const instance = new ProxySandboxInstance(
      instanceId,
      this.outbound,
      this.pendingPings,
      options.brokerEndpoint,
    );
    this.instances.set(instanceId, instance);

    await new Promise<void>((resolve, reject) => {
      this.pendingSpawns.set(requestId, { resolve, reject });
      this.outbound.spawn({
        requestId,
        instanceId,
        appId: options.appId,
        version: options.version,
        entryPath: options.entryPath,
        bundleHex: bytesToHex(options.bundle),
      });
    });

    return instance;
  }
}

class ProxySandboxInstance implements SandboxInstance {
  readonly id: string;
  private alive = false;
  private killed = false;

  constructor(
    id: string,
    private readonly outbound: WebSandboxProxyOutbound,
    private readonly pendingPings: Map<
      string,
      { resolve: (alive: boolean) => void }
    >,
    private readonly brokerEndpoint: unknown,
  ) {
    this.id = id;
  }

  markAlive(): void {
    this.alive = true;
  }

  isAlive(): boolean {
    return this.alive && !this.killed;
  }

  postMessage(message: unknown): Promise<void> {
    if (this.killed) {
      return Promise.resolve();
    }

    this.outbound.postMessage(this.id, message);
    return Promise.resolve();
  }

  ping(timeoutMs: number): Promise<boolean> {
    if (this.killed) {
      return Promise.resolve(false);
    }

    const requestId = `ping-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    return new Promise((resolve) => {
      this.pendingPings.set(requestId, { resolve });
      this.outbound.ping(requestId, this.id, timeoutMs);
    });
  }

  kill(reason: string): Promise<void> {
    if (this.killed) {
      return Promise.resolve();
    }

    this.killed = true;
    this.alive = false;
    this.outbound.kill(this.id, reason);
    return Promise.resolve();
  }

  handleMessage(message: unknown): void {
    if (this.killed) {
      return;
    }

    const typed = message as { type?: string; phase?: string };
    if (typed.type === "sandbox-exit") {
      this.alive = false;
      return;
    }
    if (typed.type === "app-error" && typed.phase === "bundle") {
      this.alive = false;
    }
  }

  handleBrokerRequest(request: unknown): Promise<unknown> {
    const endpoint = this.brokerEndpoint as
      { request?: (value: unknown) => Promise<unknown> } | undefined;
    if (typeof endpoint?.request !== "function") {
      return Promise.resolve({
        id: (request as { id?: string }).id,
        ok: false,
        error: { message: "Broker endpoint is not configured" },
      });
    }

    return Promise.resolve(endpoint.request(request));
  }
}
