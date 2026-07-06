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
