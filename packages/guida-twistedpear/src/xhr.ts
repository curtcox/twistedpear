/**
 * Minimal XHR for Guida's library runner. Node has no global XMLHttpRequest;
 * the compiler uses it to fetch Elm packages into ~/.guida.
 */
import { GuidaXhrBase } from "./xhr-base.js";

export class FetchXmlHttpRequest extends GuidaXhrBase {
  private headers: Record<string, string> = {};
  private responseHeaders: Record<string, string> = {};

  override setRequestHeader(key: string, value: string): void {
    this.headers[key] = value;
  }

  override getAllResponseHeaders(): string {
    return Object.entries(this.responseHeaders)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\r\n");
  }

  override send(body?: unknown): void {
    void this.dispatch(body);
  }

  private async dispatch(body: unknown): Promise<void> {
    try {
      const init: RequestInit = {
        method: this.method,
        headers: this.headers,
        redirect: "manual",
      };
      if (body !== undefined && body !== null) {
        init.body = body as NonNullable<RequestInit["body"]>;
      }
      const response = await fetch(this.url, {
        ...init,
        signal: AbortSignal.timeout(30_000),
      });
      this.status = response.status;
      response.headers.forEach((value, key) => {
        this.responseHeaders[key] = value;
      });
      if (this.responseType === "arraybuffer") {
        this.response = await response.arrayBuffer();
      } else {
        this.responseText = await response.text();
        this.response = this.responseText;
      }
      this.onload?.();
    } catch (error) {
      this.onerror?.(error);
    }
  }
}
