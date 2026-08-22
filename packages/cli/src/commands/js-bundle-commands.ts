import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { resolveFromCwd } from "../config.js";
import {
  type CommandContext,
  parseFlag,
  printHelp,
  readAppManifest,
} from "./helpers.js";
import { writeLinkedBundle } from "./js-bundle.js";

export async function runJsAppBuild(ctx: CommandContext): Promise<number> {
  const appDirArg = ctx.args[0];
  if (appDirArg === undefined) {
    printHelp("app");
    return 1;
  }
  const appDir = resolveFromCwd(ctx.cwd, appDirArg);
  const manifest = readAppManifest(appDir);
  const outName = parseFlag(ctx.args, "--out");
  const bundle = writeLinkedBundle(appDir, manifest.entry, "bundle.js");
  if (outName !== null) {
    writeFileSync(resolveFromCwd(ctx.cwd, outName), bundle);
    console.log(`Built ${outName} (${bundle.length} bytes, js-link)`);
  } else {
    console.log(
      `Built ${join(appDir, "bundle.js")} (${bundle.length} bytes, js-link)`,
    );
  }
  return 0;
}
