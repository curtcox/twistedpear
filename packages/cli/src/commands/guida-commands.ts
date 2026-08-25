import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { HOST_API_VERSION } from "@twistedpear/miniapp-runtime";
import { ensureDir, resolveFromCwd } from "../config.js";
import {
  type CommandContext,
  hasFlag,
  parseFlag,
  printHelp,
} from "./helpers.js";

type GuidaBuildResult = {
  readonly bundle: string;
  readonly minifiedBytes: number;
  readonly compilerVersion: string;
};

type GuidaBuildModule = {
  readonly GUIDA_COMPILER_VERSION: string;
  buildGuidaApp(options: {
    appDir: string;
    minify?: boolean;
  }): Promise<GuidaBuildResult>;
};

function loadGuidaBuild(): Promise<GuidaBuildModule> {
  const dist = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../guida-twistedpear/dist/index.js",
  );
  const src = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../guida-twistedpear/src/index.ts",
  );
  return import(existsSync(dist) ? dist : src) as Promise<GuidaBuildModule>;
}

const TEMPLATE_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../guida-twistedpear/templates/hello",
);

function isGuidaAppDir(appDir: string): boolean {
  return existsSync(join(appDir, "elm.json"));
}

export async function maybeBuildGuidaApp(appDir: string): Promise<void> {
  if (!isGuidaAppDir(appDir)) return;
  const bundlePath = join(appDir, "bundle.js");
  if (existsSync(bundlePath)) {
    const source = readFileSync(bundlePath, "utf8");
    if (!source.includes("Elm.Main") && !source.includes("__scope")) {
      return;
    }
  }
  const { buildGuidaApp } = await loadGuidaBuild();
  await buildGuidaApp({ appDir });
}

export async function runGuida(ctx: CommandContext): Promise<number> {
  const sub = ctx.args[0];
  if (sub === "init") {
    return runGuidaInit({ ...ctx, args: ctx.args.slice(1) });
  }
  printHelp("guida");
  return 1;
}

export async function runGuidaInit(ctx: CommandContext): Promise<number> {
  const appDir = resolveFromCwd(ctx.cwd, ctx.args[0] ?? "hello-guida");
  if (existsSync(appDir)) {
    throw new Error(`Refusing to overwrite existing directory: ${appDir}`);
  }

  copyTemplate(TEMPLATE_ROOT, appDir);
  const manifestPath = join(appDir, "app.manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    minHostApi?: string;
  };
  manifest.minHostApi = HOST_API_VERSION;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const { GUIDA_COMPILER_VERSION } = await loadGuidaBuild();
  console.log(
    `Created Guida mini-app at ${appDir} (compiler ${GUIDA_COMPILER_VERSION})`,
  );
  console.log(`Next: tp app build ${appDir}`);
  return Promise.resolve(0);
}

export async function runApp(ctx: CommandContext): Promise<number> {
  const sub = ctx.args[0];
  if (sub === "build") {
    const rest = { ...ctx, args: ctx.args.slice(1) };
    const appDirArg = rest.args[0];
    if (appDirArg === undefined) {
      printHelp("app");
      return 1;
    }
    const appDir = resolveFromCwd(ctx.cwd, appDirArg);
    if (isGuidaAppDir(appDir)) {
      return runAppBuild(rest);
    }
    const { runJsAppBuild } = await import("./js-bundle-commands.js");
    return runJsAppBuild(rest);
  }
  if (sub === "export") {
    const { runAppExport } = await import("./app-data-commands.js");
    return runAppExport({ ...ctx, args: ctx.args.slice(1) });
  }
  if (sub === "restore") {
    const { runAppRestore } = await import("./app-data-commands.js");
    return runAppRestore({ ...ctx, args: ctx.args.slice(1) });
  }
  printHelp("app");
  return 1;
}

async function runAppBuild(ctx: CommandContext): Promise<number> {
  const appDirArg = ctx.args[0];
  if (appDirArg === undefined) {
    printHelp("app");
    return 1;
  }
  const appDir = resolveFromCwd(ctx.cwd, appDirArg);
  if (!isGuidaAppDir(appDir)) {
    throw new Error(`No elm.json in ${appDir} — not a Guida project`);
  }
  const { buildGuidaApp } = await loadGuidaBuild();
  const result = await buildGuidaApp({
    appDir,
    minify: !hasFlag(ctx.args, "--no-minify"),
  });
  const out = parseFlag(ctx.args, "--out");
  if (out !== null) {
    writeFileSync(resolveFromCwd(ctx.cwd, out), result.bundle);
    console.log(
      `Built ${out} (${result.minifiedBytes} bytes, guida ${result.compilerVersion})`,
    );
  } else {
    console.log(
      `Built ${join(appDir, "bundle.js")} (${result.minifiedBytes} bytes, guida ${result.compilerVersion})`,
    );
  }
  return 0;
}

function copyTemplate(from: string, to: string): void {
  ensureDir(to);
  for (const entry of readdirSync(from)) {
    const source = join(from, entry);
    const dest = join(to, entry);
    if (statSync(source).isDirectory()) {
      mkdirSync(dest, { recursive: true });
      copyTemplate(source, dest);
    } else {
      writeFileSync(dest, readFileSync(source));
    }
  }
}
