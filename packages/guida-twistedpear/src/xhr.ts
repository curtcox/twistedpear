/**
 * Minimal XHR for Guida's library runner. Node has no global XMLHttpRequest;
 * the compiler uses it to fetch Elm packages into ~/.guida.
 */
export class FetchXmlHttpRequest {
  status = 0;
  response: ArrayBuffer | string | null = null;
  responseText = "";
  responseType = "";
  onload: (() => void) | null = null;
  onerror: ((err?: unknown) => void) | null = null;
  ontimeout: (() => void) | null = null;

  private method = "GET";
  private url = "";
  private headers: Record<string, string> = {};
  private responseHeaders: Record<string, string> = {};

  open(method: string, url: string): void {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(key: string, value: string): void {
    this.headers[key] = value;
  }

  getAllResponseHeaders(): string {
    return Object.entries(this.responseHeaders)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\r\n");
  }

  send(body?: unknown): void {
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
        init.body = body as string | Buffer | Uint8Array;
      }
      const response = await fetch(this.url, init);
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
