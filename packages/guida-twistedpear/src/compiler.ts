import { createRequire } from "node:module";
import { extractOutput, isolateCompiledJs } from "./extract-output.js";
import { utf8, type GuidaFsConfig } from "./fs-config.js";
import { nodeGuidaConfig } from "./node-config.js";
import { extractFormatted } from "./problems.js";

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
  diagnostics(args: { content: string } | { path: string }): Promise<unknown>;
}

export type GuidaLibrary = {
  make: (
    config: GuidaFsConfig,
    path: string,
    options?: MakeOptions,
  ) => Promise<unknown>;
  format: (config: GuidaFsConfig, content: string) => Promise<unknown>;
  diagnostics: (config: GuidaFsConfig, args: unknown) => Promise<unknown>;
};

export function loadGuidaLibrary(): GuidaLibrary {
  return require("guida") as GuidaLibrary;
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
    const guida = loadGuidaLibrary();
    const result = await guida.make(this.config, entryPath, options);
    let output: string;
    try {
      output = extractOutput(result);
    } catch (error) {
      const html = await this.config
        .readFile("index.html")
        .then((buffer) => utf8(buffer))
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
    const guida = loadGuidaLibrary();
    return extractFormatted(await guida.format(this.config, content));
  }

  diagnostics(args: { content: string } | { path: string }): Promise<unknown> {
    const guida = loadGuidaLibrary();
    return guida.diagnostics(this.config, args);
  }
}
