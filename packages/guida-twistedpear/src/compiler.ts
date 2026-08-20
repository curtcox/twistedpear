import { createRequire } from "node:module";
import { nodeGuidaConfig, type GuidaFsConfig } from "./node-config.js";

const require = createRequire(import.meta.url);

export interface MakeOptions {
  readonly debug?: boolean;
  readonly optimize?: boolean;
  readonly sourcemaps?: boolean;
}

export interface GuidaCompiler {
  make(
    entryPath: string,
    options?: MakeOptions,
  ): Promise<{ output: string; diagnostics?: unknown }>;
  format(content: string): Promise<string>;
  diagnostics(
    args: { content: string } | { path: string },
  ): Promise<unknown>;
}

function loadGuida(): {
  make: (
    config: GuidaFsConfig,
    path: string,
    options?: MakeOptions,
  ) => Promise<unknown>;
  format: (config: GuidaFsConfig, content: string) => Promise<unknown>;
  diagnostics: (config: GuidaFsConfig, args: unknown) => Promise<unknown>;
} {
  return require("guida") as ReturnType<typeof loadGuida>;
}

function findPlatformExport(
  value: unknown,
  seen = new Set<unknown>(),
): string | undefined {
  if (typeof value === "string" && value.includes("_Platform_export")) {
    return value;
  }
  if (value === null || typeof value !== "object" || seen.has(value)) {
    return undefined;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPlatformExport(item, seen);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  for (const item of Object.values(value)) {
    const found = findPlatformExport(item, seen);
    if (found !== undefined) return found;
  }
  return undefined;
}

function isolateCompiledJs(source: string): string {
  if (!source.includes("<script")) return source;
  const scripts = [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  const compiled = scripts
    .map((match) => match[1] ?? "")
    .find((body) => body.includes("_Platform_export"));
  if (compiled === undefined) {
    throw new Error("Guida HTML output is missing the compiled Elm script");
  }
  return compiled;
}

function extractOutput(result: unknown): string {
  const found = findPlatformExport(result);
  if (found !== undefined) return isolateCompiledJs(found);
  if (result !== null && typeof result === "object" && "error" in result) {
    const error = (result as { error: unknown }).error;
    const text = typeof error === "string" ? error : JSON.stringify(error);
    throw new Error(`guida make failed: ${text.slice(0, 800)}`);
  }
  throw new Error(
    `unexpected guida make result: ${JSON.stringify(result)?.slice(0, 400)}`,
  );
}

/** In-process compiler: the same JavaScript module the CLI and DevStudio share. */
export class JsModuleGuidaCompiler implements GuidaCompiler {
  constructor(private readonly config: GuidaFsConfig) {}

  static forDirectory(cwd: string): JsModuleGuidaCompiler {
    return new JsModuleGuidaCompiler(nodeGuidaConfig(cwd));
  }

  async make(
    entryPath: string,
    options: MakeOptions = { optimize: true },
  ): Promise<{ output: string; diagnostics?: unknown }> {
    const guida = loadGuida();
    const result = await guida.make(this.config, entryPath, options);
    let output: string;
    try {
      output = extractOutput(result);
    } catch (error) {
      const html = await this.config
        .readFile("index.html")
        .then((buffer) => buffer.toString("utf8"))
        .catch(() => "");
      if (html.includes("_Platform_export")) {
        output = isolateCompiledJs(html);
      } else {
        throw error;
      }
    }
    return { output, diagnostics: result };
  }

  async format(content: string): Promise<string> {
    const guida = loadGuida();
    const result = await guida.format(this.config, content);
    if (typeof result === "string") return result;
    if (result !== null && typeof result === "object" && "content" in result) {
      return String((result as { content: unknown }).content);
    }
    throw new Error("unexpected guida format result");
  }

  diagnostics(args: { content: string } | { path: string }): Promise<unknown> {
    const guida = loadGuida();
    return guida.diagnostics(this.config, args);
  }
}
