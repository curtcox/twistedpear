import type { GuidaWorklet } from "../browser-host/apps-backend.ts";

type RpcResult = { readonly id: number; readonly ok: true; readonly result: unknown }
  | { readonly id: number; readonly ok: false; readonly error: string };

type StatusListener = (status: string) => void;

export function createGuidaWorkerClient(onStatus: StatusListener): GuidaWorklet {
  let workerPromise: Promise<Worker> | null = null;
  let nextId = 1;
  const pending = new Map<number, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }>();

  function worker(): Promise<Worker> {
    if (workerPromise !== null) return workerPromise;
    onStatus("Fetching the Guida compiler (~2 MB)…");
    workerPromise = new Promise((resolve, reject) => {
      const instance = new Worker("./guida-worker.js", { type: "module" });
      const onReady = (event: MessageEvent<RpcResult | { type: string }>) => {
        if (!("type" in event.data) || event.data.type !== "ready") return;
        instance.removeEventListener("message", onReady);
        instance.addEventListener("message", onRpc);
        onStatus("Guida compiler ready.");
        resolve(instance);
      };
      const onRpc = (event: MessageEvent<RpcResult>) => {
        if (!("id" in event.data)) return;
        const waiter = pending.get(event.data.id);
        if (waiter === undefined) return;
        pending.delete(event.data.id);
        if (event.data.ok) waiter.resolve(event.data.result);
        else waiter.reject(new Error(event.data.error));
      };
      instance.addEventListener("message", onReady);
      instance.addEventListener("error", (event) => {
        reject(new Error(event.message || "Guida worker failed to load"));
      });
    });
    return workerPromise;
  }

  async function rpc(payload: Record<string, unknown>): Promise<unknown> {
    const instance = await worker();
    const id = nextId;
    nextId += 1;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      instance.postMessage({ id, ...payload });
    });
  }

  return {
    compileGuidaWorkspace: (files) =>
      rpc({ op: "compile", files }) as ReturnType<GuidaWorklet["compileGuidaWorkspace"]>,
    diagnoseGuidaWorkspace: (files, path) =>
      rpc({ op: "diagnose", files, path }),
    formatGuidaSource: async (content) => {
      const formatted = await rpc({ op: "format", content });
      if (typeof formatted !== "string") {
        throw new Error("Guida format returned a non-string result");
      }
      return formatted;
    },
  };
}
