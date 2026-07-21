import { describe, expect, it } from "vitest";
import {
  AiService,
  AiServiceError,
  WorkspaceError,
  WorkspaceService,
  createOpenRouterBackend,
  validateManifestCapabilities,
  validateWidgetTree,
  validateWorkspacePath,
  type AiChatRequest,
  type GrantKeyValueStore
} from "../src/index.js";

class MemoryStore implements GrantKeyValueStore {
  readonly values = new Map<string, Uint8Array>();

  async get(key: string): Promise<Uint8Array | null> {
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: Uint8Array): Promise<void> {
    this.values.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }

  async list(prefix: string): Promise<ReadonlyArray<string>> {
    return [...this.values.keys()].filter((key) => key.startsWith(prefix));
  }
}

describe("workspace service", () => {
  it("round-trips files and lists per app", async () => {
    const service = new WorkspaceService(new MemoryStore());
    await service.write("devstudio", "hello/bundle.js", "export {};\n");
    await service.write("devstudio", "hello/app.manifest.json", "{}");
    await service.write("other-app", "hello/bundle.js", "// other\n");

    expect(await service.read("devstudio", "hello/bundle.js")).toBe("export {};\n");
    const files = await service.list("devstudio", "hello/");
    expect(files.map((file) => file.path)).toEqual(["hello/app.manifest.json", "hello/bundle.js"]);

    await service.delete("devstudio", "hello/bundle.js");
    await expect(service.read("devstudio", "hello/bundle.js")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await service.read("other-app", "hello/bundle.js")).toBe("// other\n");
  });

  it.each(["../escape", "a/../b", "/abs", "a//b", "a\\b", ".hidden", "", "a/./b"])(
    "rejects path %j",
    (path) => {
      expect(() => validateWorkspacePath(path)).toThrow(WorkspaceError);
    }
  );

  it("enforces file, count, and total quotas", async () => {
    const service = new WorkspaceService(new MemoryStore(), {
      maxFileBytes: 16,
      maxTotalBytes: 24,
      maxFiles: 2
    });

    await expect(service.write("app", "big.js", "x".repeat(17))).rejects.toMatchObject({
      code: "FILE_TOO_LARGE"
    });

    await service.write("app", "a.js", "x".repeat(12));
    await expect(service.write("app", "b.js", "x".repeat(13))).rejects.toMatchObject({
      code: "WORKSPACE_FULL"
    });

    await service.write("app", "b.js", "x".repeat(12));
    await expect(service.write("app", "c.js", "x")).rejects.toMatchObject({ code: "WORKSPACE_FULL" });
  });

  it("applies bounded non-overlapping text patches and rejects stale bases", async () => {
    const service = new WorkspaceService(new MemoryStore());
    await service.write("app", "bundle.js", "hello world");
    await service.patch("app", "bundle.js", 11, [
      { start: 0, end: 5, text: "goodbye" },
      { start: 6, end: 11, text: "mesh" }
    ]);
    expect(await service.read("app", "bundle.js")).toBe("goodbye mesh");
    await expect(service.patch("app", "bundle.js", 11, [{ start: 0, end: 1, text: "x" }]))
      .rejects.toMatchObject({ code: "PATCH_CONFLICT" });
    await expect(service.patch("app", "bundle.js", 12, [
      { start: 2, end: 4, text: "x" },
      { start: 3, end: 5, text: "y" }
    ])).rejects.toMatchObject({ code: "INVALID_PATCH" });
  });
});

describe("ai service", () => {
  const request: AiChatRequest = { messages: [{ role: "user", content: "hi" }] };

  it("clamps token and temperature budgets", async () => {
    let seen: AiChatRequest | null = null;
    const service = new AiService({
      chat: async (_appId, sanitized) => {
        seen = sanitized;
        return { message: { role: "assistant", content: "ok" }, model: "m", usage: null };
      }
    });

    await service.chat("app", { ...request, maxTokens: 1_000_000, temperature: 9 });
    expect(seen?.maxTokens).toBe(8_192);
    expect(seen?.temperature).toBe(2);
  });

  it("rejects malformed requests", async () => {
    const service = new AiService({ chat: async () => ({ message: { role: "assistant", content: "" }, model: "m", usage: null }) });
    await expect(service.chat("app", { messages: [] })).rejects.toMatchObject({ code: "AI_BAD_REQUEST" });
    await expect(
      service.chat("app", { messages: [{ role: "root" as never, content: "hi" }] })
    ).rejects.toMatchObject({ code: "AI_BAD_REQUEST" });
  });

  it("allows only one in-flight request per app", async () => {
    let release: (() => void) | null = null;
    const service = new AiService({
      chat: () =>
        new Promise((resolve) => {
          release = () =>
            resolve({ message: { role: "assistant", content: "done" }, model: "m", usage: null });
        })
    });

    const first = service.chat("app", request);
    await expect(service.chat("app", request)).rejects.toMatchObject({ code: "AI_BUSY" });
    release?.();
    await first;

    const second = service.chat("app", request);
    release?.();
    await expect(second).resolves.toBeDefined();
  });

  it("streams deltas, returns a final response, and releases the in-flight slot", async () => {
    const service = new AiService({
      chat: async () => ({ message: { role: "assistant", content: "fallback" }, model: "m", usage: null }),
      stream: async function* () {
        yield { delta: "hel", model: "stream/model" };
        yield { delta: "lo", usage: { promptTokens: 2, completionTokens: 1 } };
      }
    });

    const iterator = service.stream("app", request);
    await expect(service.chat("app", request)).rejects.toMatchObject({ code: "AI_BUSY" });
    expect(await iterator.next()).toEqual({ done: false, value: { type: "delta", delta: "hello" } });
    expect(await iterator.next()).toEqual({
      done: false,
      value: {
        type: "done",
        response: {
          message: { role: "assistant", content: "hello" },
          model: "stream/model",
          usage: { promptTokens: 2, completionTokens: 1 }
        }
      }
    });
    expect((await iterator.next()).done).toBe(true);
    await expect(service.chat("app", request)).resolves.toBeDefined();
  });

  it("adapts a non-streaming backend and releases the slot when cancelled", async () => {
    const service = new AiService({
      chat: async () => ({ message: { role: "assistant", content: "whole" }, model: "m", usage: null })
    });
    const fallback = service.stream("app", request);
    expect(await fallback.next()).toEqual({ done: false, value: { type: "delta", delta: "whole" } });
    await fallback.return?.();
    await expect(service.chat("app", request)).resolves.toBeDefined();
  });

  it("propagates cancellation into a streaming backend", async () => {
    let cancelled = false;
    const service = new AiService({
      chat: async () => ({ message: { role: "assistant", content: "whole" }, model: "m", usage: null }),
      stream: async function* () {
        try {
          yield { delta: "x".repeat(32), model: "m" };
          await new Promise(() => undefined);
        } finally {
          cancelled = true;
        }
      }
    });
    const iterator = service.stream("app", request);
    await iterator.next();
    await iterator.return?.();
    expect(cancelled).toBe(true);
  });

  it("embeds bounded inputs and ranks cosine matches", async () => {
    const service = new AiService({
      chat: async () => ({ message: { role: "assistant", content: "" }, model: "m", usage: null }),
      embed: async (_appId, request) => ({
        vectors: request.inputs.map((input) => input.includes("pear") ? [1, 0] : [0, 1]),
        model: "embed/model",
        usage: { promptTokens: request.inputs.length }
      })
    });
    await expect(service.embed("app", { inputs: ["pear"] })).resolves.toMatchObject({ vectors: [[1, 0]] });
    await expect(service.search("app", {
      query: "pear",
      documents: [{ id: "other", text: "apple" }, { id: "match", text: "pear guide" }],
      limit: 1
    })).resolves.toMatchObject({ matches: [{ id: "match", score: 1 }] });
    await expect(service.embed("app", { inputs: [] })).rejects.toMatchObject({ code: "AI_BAD_REQUEST" });
  });

  it("openrouter backend enforces the model allowlist and translates the wire shape", async () => {
    const calls: Array<{ url: string; body: Record<string, unknown>; auth: string | undefined }> = [];
    const fetchImpl = (async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: String(url),
        body: JSON.parse(String(init?.body)),
        auth: (init?.headers as Record<string, string>)?.authorization
      });
      return new Response(
        JSON.stringify({
          model: "test/model",
          choices: [{ message: { content: "patched" } }],
          usage: { prompt_tokens: 3, completion_tokens: 5 }
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    const backend = createOpenRouterBackend({
      baseUrl: "https://example.test/api/v1/",
      apiKey: "secret",
      model: "test/model",
      fetchImpl
    });

    const response = await backend.chat("app", { ...request, maxTokens: 32 });
    expect(response.message.content).toBe("patched");
    expect(response.usage).toEqual({ promptTokens: 3, completionTokens: 5 });
    expect(calls[0]?.url).toBe("https://example.test/api/v1/chat/completions");
    expect(calls[0]?.auth).toBe("Bearer secret");
    expect(calls[0]?.body.max_tokens).toBe(32);

    await expect(backend.chat("app", { ...request, model: "other/model" })).rejects.toMatchObject({
      code: "AI_BAD_REQUEST"
    });
  });

  it("parses OpenRouter-compatible SSE streams", async () => {
    let requestBody: Record<string, unknown> | null = null;
    const fetchImpl = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response([
        'data: {"model":"test/model","choices":[{"delta":{"content":"hel"}}]}',
        'data: {"choices":[{"delta":{"content":"lo"}}]}',
        'data: {"choices":[],"usage":{"prompt_tokens":3,"completion_tokens":2}}',
        "data: [DONE]",
        ""
      ].join("\n\n"), { status: 200, headers: { "content-type": "text/event-stream" } });
    }) as typeof fetch;
    const backend = createOpenRouterBackend({
      baseUrl: "https://example.test/api/v1",
      apiKey: "secret",
      model: "test/model",
      fetchImpl
    });

    const chunks = [];
    for await (const chunk of backend.stream!("app", request)) chunks.push(chunk);
    expect(chunks).toEqual([
      { delta: "hel", model: "test/model" },
      { delta: "lo" },
      { delta: "", usage: { promptTokens: 3, completionTokens: 2 } }
    ]);
    expect(requestBody?.stream).toBe(true);
    expect(requestBody?.stream_options).toEqual({ include_usage: true });
  });

  it("uses the OpenRouter-compatible embeddings endpoint", async () => {
    let seenUrl = "";
    let seenBody: Record<string, unknown> = {};
    const backend = createOpenRouterBackend({
      baseUrl: "https://example.test/api/v1",
      apiKey: "secret",
      model: "chat/model",
      embeddingModel: "embed/model",
      fetchImpl: (async (url: RequestInfo | URL, init?: RequestInit) => {
        seenUrl = String(url);
        seenBody = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({
          model: "embed/model",
          data: [{ index: 1, embedding: [0, 1] }, { index: 0, embedding: [1, 0] }],
          usage: { prompt_tokens: 4 }
        }), { status: 200 });
      }) as typeof fetch
    });
    await expect(backend.embed!("app", { inputs: ["a", "b"] })).resolves.toEqual({
      vectors: [[1, 0], [0, 1]], model: "embed/model", usage: { promptTokens: 4 }
    });
    expect(seenUrl).toBe("https://example.test/api/v1/embeddings");
    expect(seenBody).toEqual({ model: "embed/model", input: ["a", "b"] });
  });

  it("exposes a typed error", () => {
    expect(new AiServiceError("AI_BUSY", "busy").name).toBe("AiServiceError");
  });
});

describe("new widgets", () => {
  it("accepts a valid code-editor and qr-code", () => {
    expect(() =>
      validateWidgetTree({
        root: {
          id: "root",
          type: "view",
          children: [
            { id: "editor", type: "code-editor", props: { documentId: "hello/bundle.js", language: "javascript", event: "edit" } },
            { id: "qr", type: "qr-code", props: { value: "A".repeat(94), caption: "Scan to install" } }
          ]
        }
      })
    ).not.toThrow();
  });

  it("rejects invalid code-editor and qr-code props", () => {
    expect(() =>
      validateWidgetTree({ root: { id: "e", type: "code-editor", props: { documentId: "" } } })
    ).toThrow(/documentId/);
    expect(() =>
      validateWidgetTree({
        root: { id: "e", type: "code-editor", props: { documentId: "a.js", language: "cobol" } }
      })
    ).toThrow(/language/);
    expect(() =>
      validateWidgetTree({ root: { id: "q", type: "qr-code", props: { value: "x".repeat(513) } } })
    ).toThrow(/qr-code/);
    expect(() =>
      validateWidgetTree({ root: { id: "e", type: "code-editor", props: { documentId: "a.js", content: "x" } } })
    ).toThrow(/prop/);
  });

  it("keeps the new capabilities in the manifest validator", () => {
    expect(() =>
      validateManifestCapabilities(["workspace", "ai:chat", "apps:package", "apps:publish", "apps:install", "apps:preview", "share:cas"])
    ).not.toThrow();
  });
});
