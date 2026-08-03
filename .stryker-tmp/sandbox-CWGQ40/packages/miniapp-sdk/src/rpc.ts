// @ts-nocheck
import type { BrokerRequest, BrokerResponse } from "@twistedpear/miniapp-runtime";

export interface MiniappHostTransport {
  request(request: BrokerRequest): Promise<BrokerResponse>;
}

let transport: MiniappHostTransport | null = null;
let nextRequestId = 0;

export class MiniappHostError extends Error {
  constructor(readonly code: string, message: string) { super(message); this.name = "MiniappHostError"; }
}

export function setMiniappHostTransport(nextTransport: MiniappHostTransport): void {
  transport = nextTransport;
}

export async function callHost(namespace: string, method: string, payload?: unknown, capability?: string): Promise<unknown> {
  if (transport === null) {
    throw new Error("Mini-app host transport has not been initialized");
  }

  const request: BrokerRequest = {
    id: `sdk-${nextRequestId++}`,
    namespace,
    method,
    sentAt: Date.now()
  };

  if (capability !== undefined) {
    Object.assign(request, { capability });
  }

  if (payload !== undefined) {
    Object.assign(request, { payload });
  }

  const response = await transport.request(request);

  if (!response.ok) {
    throw new MiniappHostError(response.error?.code ?? "BROKER_ERROR", response.error?.message ?? "Host request failed");
  }

  return response.result;
}
