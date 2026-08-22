import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolveFromCwd } from "../config.js";
import { type CommandContext, printHelp } from "./helpers.js";

function collectTestFiles(appDir: string): string[] {
  const found: string[] = [];
  const candidates = [join(appDir, "test"), appDir];
  for (const dir of candidates) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith(".test.js") && !entry.name.endsWith(".test.mjs"))
        continue;
      found.push(join(dir, entry.name));
    }
  }
  return [...new Set(found)].sort();
}

export async function runTest(ctx: CommandContext): Promise<number> {
  const appDirArg = ctx.args[0];
  if (appDirArg === undefined) {
    printHelp("test");
    return 1;
  }
  const appDir = resolveFromCwd(ctx.cwd, appDirArg);
  if (!statSync(appDir, { throwIfNoEntry: false })?.isDirectory()) {
    console.error(`Not an app directory: ${appDir}`);
    return 1;
  }
  const files = collectTestFiles(appDir);
  if (files.length === 0) {
    console.error(`No *.test.js files under ${appDir}`);
    return 1;
  }
  const harnessRoot = join(
    fileURLToPath(new URL("../../..", import.meta.url)),
    "miniapp-test",
  );
  return await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--test", "--test-reporter=spec", ...files],
      {
        cwd: appDir,
        stdio: "inherit",
        env: {
          ...process.env,
          NODE_PATH: [harnessRoot, process.env.NODE_PATH]
            .filter((value) => value !== undefined && value.length > 0)
            .join(":"),
        },
      },
    );
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}
