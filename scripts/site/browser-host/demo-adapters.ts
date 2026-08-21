const encoder = new TextEncoder();

export function demoModelReply(
  messages: ReadonlyArray<{ readonly content: string }>,
) {
  const system = messages[0]?.content ?? "";
  const user = messages.at(-1)?.content ?? "";
  if (system.includes("JSON array")) {
    return JSON.stringify([
      { label: "Name", type: "text" },
      { label: "Party size", type: "number" },
      { label: "Checked in", type: "switch" },
    ]);
  }
  if (system.includes("single JSON object")) {
    return JSON.stringify({
      title: "Demo field note",
      location: "Browser demo",
      severity: "low",
      summary: user.slice(0, 120) || "Sample note",
    });
  }
  if (system.includes("Translate")) {
    return `Demo translation: ${user.replace(/^Into [^:]+:\s*/, "")}`;
  }
  return "This is a deterministic browser-demo response from the local sample adapter.";
}

export function createDemoAiBackend() {
  return {
    chat: async (
      _appId: string,
      request: { readonly messages: ReadonlyArray<{ readonly content: string }> },
    ) => ({
      message: { role: "assistant" as const, content: demoModelReply(request.messages) },
      model: "pages-demo",
      usage: null,
    }),
    stream: async function* (
      _appId: string,
      request: { readonly messages: ReadonlyArray<{ readonly content: string }> },
    ) {
      yield { delta: demoModelReply(request.messages), model: "pages-demo", usage: null };
    },
    embed: async (
      _appId: string,
      request: { readonly inputs: ReadonlyArray<string> },
    ) => ({
      vectors: request.inputs.map((input) => [input.length || 1, 1]),
      model: "pages-demo",
      usage: null,
    }),
  };
}

export function createUnavailableAiBackend() {
  const message = "AI is not available on this static documentation page.";
  return {
    chat: async () => {
      throw new Error(message);
    },
    stream: async function* () {
      throw new Error(message);
    },
    embed: async () => {
      throw new Error(message);
    },
  };
}

export function createDemoPresenceBackend() {
  return {
    snapshot: async () => ({
      onlineInterfaces: 1,
      preferredInterface: "web-demo",
      peers: 1,
    }),
  };
}

export function createDemoHostInfoBackend(hostApiVersion: string) {
  return {
    info: async () => ({
      platform: "web",
      hostVersion: "pages-demo",
      hostApiVersion,
      roles: { transport: false, seeder: false, propagation: false },
      interfaceTypes: ["web-demo"],
      quotas: {
        kvQuotaBytes: 1024 * 1024,
        seedStorageUsedBytes: null,
        seedStorageQuotaBytes: null,
        memoryBytes: null,
      },
    }),
  };
}

export function createDemoResourceBackend() {
  return {
    fetch: async () => encoder.encode("Resource fetched by the browser demo adapter."),
  };
}

export function createDemoCasBackend() {
  const cas = new Map<string, Uint8Array>();
  return {
    put: async (_appId: string, content: Uint8Array) => {
      const t256 = `demo${String(cas.size + 1).padStart(90, "0")}`;
      cas.set(t256, content.slice());
      return { t256, size: content.length };
    },
    get: async (_appId: string, t256: string) => cas.get(t256)?.slice() ?? null,
  };
}

export function createStubAppsBackend() {
  return {
    package: async (
      _appId: string,
      request: { readonly manifest: unknown },
    ) => {
      const size = encoder.encode(JSON.stringify(request.manifest)).length;
      return { packageHash: "pages-demo", size, t256: `demo${"0".repeat(90)}` };
    },
    publish: async (_appId: string, request: { readonly t256: string }) => ({
      t256: request.t256,
      driveKey: "pages-demo",
      version: "1",
    }),
    install: async () => ({ appId: "pages-demo", version: "1.0.0", trusted: false }),
    preview: async () => ({ launched: true }),
    stopPreview: async () => {},
  };
}

export function createNamedStubAppsBackend() {
  return {
    package: async () => {
      throw new Error(
        "Package is a stub on this static page. A real host would sign a .tp with the device publisher identity.",
      );
    },
    publish: async () => {
      throw new Error(
        "Publish is a stub on this static page. There is no Reticulum network to announce to.",
      );
    },
    install: async () => {
      throw new Error(
        "Install is a stub on this static page. Paste a 256t string on a real host instead.",
      );
    },
  };
}
