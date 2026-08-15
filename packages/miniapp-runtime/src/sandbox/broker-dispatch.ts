export interface WorkerBrokerMessage {
  readonly type: string;
  readonly id?: string;
  readonly ok?: boolean;
  readonly result?: unknown;
  readonly error?: { readonly message: string };
}

interface PendingWaiter {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
}

interface BrokerDispatchOptions {
  readonly worker: { postMessage(message: unknown): void };
  readonly pending: Map<string, PendingWaiter>;
  readonly endpoint?:
    { request?: (request: unknown) => Promise<unknown> } | undefined;
  readonly normalizeResponse?: ((response: unknown) => object) | undefined;
}

export function dispatchWorkerBrokerMessage(
  message: WorkerBrokerMessage,
  options: BrokerDispatchOptions,
): void {
  if (message.type === "broker-request" && message.id !== undefined) {
    handleBrokerRequest(message, options);
    return;
  }
  if (message.type === "broker-response" && message.id !== undefined) {
    settleBrokerResponse(message, options.pending);
  }
}

function handleBrokerRequest(
  message: WorkerBrokerMessage,
  options: BrokerDispatchOptions,
): void {
  if (typeof options.endpoint?.request !== "function") {
    options.worker.postMessage({
      type: "broker-response",
      id: message.id,
      ok: false,
      error: { message: "Broker endpoint is not configured" },
    });
    return;
  }

  void options.endpoint.request(message).then(
    (response) =>
      options.worker.postMessage({
        type: "broker-response",
        ...(options.normalizeResponse?.(response) ?? (response as object)),
      }),
    (error: Error) =>
      options.worker.postMessage({
        type: "broker-response",
        id: message.id,
        ok: false,
        error: { message: error.message },
      }),
  );
}

function settleBrokerResponse(
  message: WorkerBrokerMessage,
  pending: Map<string, PendingWaiter>,
): void {
  const waiter = pending.get(message.id!);
  if (waiter === undefined) return;
  pending.delete(message.id!);
  if (message.ok) waiter.resolve(message.result);
  else
    waiter.reject(new Error(message.error?.message ?? "Broker request failed"));
}
