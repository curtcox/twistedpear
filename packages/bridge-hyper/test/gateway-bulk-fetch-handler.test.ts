import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer } from "node:http";
import { describe, expect, it, vi } from "vitest";
import {
  attachGatewayBulkFetchServer,
  createGatewayBulkFetchHttpHandler,
  DEFAULT_BULK_FETCH_PATH,
  driveFetcherFromBulk,
} from "../src/server/gateway-bulk-fetch-server.js";

interface RecordedResponse {
  readonly status: number | null;
  readonly headers: Record<string, string>;
  readonly body: Uint8Array;
}

function recordingResponse(): {
  response: ServerResponse;
  recorded: RecordedResponse;
} {
  const chunks: Uint8Array[] = [];
  const recorded = {
    status: null as number | null,
    headers: {} as Record<string, string>,
    get body() {
      const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const body = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.length;
      }
      return body;
    },
  };

  const response = {
    writeHead(status: number, headers?: Record<string, string>) {
      recorded.status = status;
      recorded.headers = headers ?? {};
      return response;
    },
    write(chunk: Uint8Array) {
      chunks.push(chunk);
      return true;
    },
    end(chunk?: Uint8Array | string) {
      if (typeof chunk === "string")
        chunks.push(new TextEncoder().encode(chunk));
      else if (chunk !== undefined) chunks.push(chunk);
    },
  };

  return { response: response as unknown as ServerResponse, recorded };
}

function request(url: string, method = "GET"): IncomingMessage {
  return { url, method } as IncomingMessage;
}

describe("gateway bulk fetch handler", () => {
  it("ignores requests for other paths", async () => {
    const fetcher = vi.fn(async () => new Uint8Array(0));
    const { response, recorded } = recordingResponse();

    await createGatewayBulkFetchHttpHandler(fetcher)(
      request("/healthz"),
      response,
    );

    expect(recorded.status).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("treats a missing request URL as the root path", async () => {
    const fetcher = vi.fn(async () => new Uint8Array(0));
    const { response, recorded } = recordingResponse();

    await createGatewayBulkFetchHttpHandler(fetcher)(
      { method: "GET" } as IncomingMessage,
      response,
    );

    expect(recorded.status).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects non-GET methods with 405", async () => {
    const { response, recorded } = recordingResponse();

    await createGatewayBulkFetchHttpHandler(async () => new Uint8Array(0))(
      request(`${DEFAULT_BULK_FETCH_PATH}?driveKey=ab&version=1.0.0`, "POST"),
      response,
    );

    expect(recorded.status).toBe(405);
  });

  it("rejects requests missing the query parameters with 400", async () => {
    const { response, recorded } = recordingResponse();

    await createGatewayBulkFetchHttpHandler(async () => new Uint8Array(0))(
      request(`${DEFAULT_BULK_FETCH_PATH}?driveKey=%20`),
      response,
    );

    expect(recorded.status).toBe(400);
    expect(new TextDecoder().decode(recorded.body)).toContain(
      "driveKey and version",
    );
  });

  it("answers HEAD with headers and no body", async () => {
    const { response, recorded } = recordingResponse();

    await createGatewayBulkFetchHttpHandler(async () => new Uint8Array(9))(
      request(`${DEFAULT_BULK_FETCH_PATH}?driveKey=ab&version=1.0.0`, "HEAD"),
      response,
    );

    expect(recorded.status).toBe(200);
    expect(recorded.headers["content-length"]).toBe("9");
    expect(recorded.body).toEqual(new Uint8Array(0));
  });

  it("serves the archive unthrottled when no limiter is configured", async () => {
    const archive = new Uint8Array([7, 8, 9]);
    const { response, recorded } = recordingResponse();

    await createGatewayBulkFetchHttpHandler(async () => archive)(
      request(`${DEFAULT_BULK_FETCH_PATH}?driveKey=ab&version=1.0.0`),
      response,
    );

    expect(recorded.status).toBe(200);
    expect(recorded.headers["access-control-allow-origin"]).toBe("*");
    expect(recorded.body).toEqual(archive);
  });

  it("reports fetcher failures as 502 with the error message", async () => {
    const { response, recorded } = recordingResponse();

    await createGatewayBulkFetchHttpHandler(async () => {
      throw new Error("drive unreachable");
    })(
      request(`${DEFAULT_BULK_FETCH_PATH}?driveKey=ab&version=1.0.0`),
      response,
    );

    expect(recorded.status).toBe(502);
    expect(new TextDecoder().decode(recorded.body)).toBe("drive unreachable");
  });

  it("stringifies non-Error fetcher rejections", async () => {
    const { response, recorded } = recordingResponse();

    await createGatewayBulkFetchHttpHandler(async () => {
      throw "drive exploded";
    })(
      request(`${DEFAULT_BULK_FETCH_PATH}?driveKey=ab&version=1.0.0`),
      response,
    );

    expect(recorded.status).toBe(502);
    expect(new TextDecoder().decode(recorded.body)).toBe("drive exploded");
  });

  it("serves a custom path when configured", async () => {
    const { response, recorded } = recordingResponse();
    const handler = createGatewayBulkFetchHttpHandler(
      async () => new Uint8Array([1]),
      { path: "/archives" },
    );

    await handler(
      request(`${DEFAULT_BULK_FETCH_PATH}?driveKey=ab&version=1`),
      response,
    );
    expect(recorded.status).toBeNull();

    await handler(request("/archives?driveKey=ab&version=1"), response);
    expect(recorded.status).toBe(200);
  });
});

describe("driveFetcherFromBulk", () => {
  it("adapts a bulk fetcher callback to the DriveFetcher seam", async () => {
    const bulk = vi.fn(async () => new Uint8Array([4, 2]));

    const bytes = await driveFetcherFromBulk(bulk).fetchDriveVersion(
      "beef".repeat(16),
      "1.2.3",
    );

    expect(bytes).toEqual(new Uint8Array([4, 2]));
    expect(bulk).toHaveBeenCalledWith("beef".repeat(16), "1.2.3");
  });
});

describe("attachGatewayBulkFetchServer", () => {
  it("adds and removes the request listener on an existing server", async () => {
    const server = createServer();
    const session = attachGatewayBulkFetchServer(
      server,
      async () => new Uint8Array([1, 2, 3]),
      { path: "/archives" },
    );

    expect(session.path).toBe("/archives");
    expect(server.listenerCount("request")).toBe(1);

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("expected listening server");
    }

    const response = await fetch(
      `http://127.0.0.1:${address.port}/archives?driveKey=ab&version=1.0.0`,
    );
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3]),
    );

    await session.close();
    expect(server.listenerCount("request")).toBe(0);

    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });
});
