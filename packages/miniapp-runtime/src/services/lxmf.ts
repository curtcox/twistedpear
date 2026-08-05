import type { MiniappKvStoreBackend } from "./storage-kv.js";

export interface LxmfSendRequest {
  readonly to: string;
  readonly subject: string;
  readonly body: string;
}

export interface LxmfDelivery {
  readonly id: string;
  readonly status: "queued" | "sent" | "failed";
  readonly error?: string;
}

export interface LxmfInboxMessage {
  readonly id: string;
  readonly from: string;
  readonly subject: string;
  readonly body: string;
  readonly receivedAt: number;
}

export interface LxmfBackend {
  send(appId: string, request: LxmfSendRequest): Promise<LxmfDelivery>;
  receive(appId: string): Promise<ReadonlyArray<LxmfInboxMessage>>;
}

export class NamespacedLxmfService implements LxmfBackend {
  constructor(private readonly kv: MiniappKvStoreBackend) {}

  async send(appId: string, request: LxmfSendRequest): Promise<LxmfDelivery> {
    const id = `lxmf-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const outboxKey = this.outboxKey(appId);
    const outbox = await this.readMessages(outboxKey);
    outbox.push({
      id,
      from: appId,
      subject: request.subject,
      body: request.body,
      receivedAt: Date.now()
    });
    await this.kv.set(outboxKey, this.encode(outbox));

    const inboxKey = this.inboxKey(request.to);
    const inbox = await this.readMessages(inboxKey);
    inbox.push({
      id,
      from: appId,
      subject: request.subject,
      body: request.body,
      receivedAt: Date.now()
    });
    await this.kv.set(inboxKey, this.encode(inbox));

    return { id, status: "queued" };
  }

  async receive(appId: string): Promise<ReadonlyArray<LxmfInboxMessage>> {
    const inboxKey = this.inboxKey(appId);
    const inbox = await this.readMessages(inboxKey);
    await this.kv.delete(inboxKey);
    return inbox;
  }

  private inboxKey(appId: string): string {
    return `miniapp-lxmf-inbox:${appId}`;
  }

  private outboxKey(appId: string): string {
    return `miniapp-lxmf-outbox:${appId}`;
  }

  private async readMessages(key: string): Promise<LxmfInboxMessage[]> {
    const raw = await this.kv.get(key);
    if (raw === null) {
      return [];
    }

    return JSON.parse(new TextDecoder().decode(raw)) as LxmfInboxMessage[];
  }

  private encode(messages: ReadonlyArray<LxmfInboxMessage>): Uint8Array {
    return new TextEncoder().encode(JSON.stringify(messages));
  }
}
