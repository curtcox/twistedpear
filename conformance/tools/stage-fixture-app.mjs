import { cpSync } from "node:fs";
import { join } from "node:path";

/** Copy the example mini-app fixture into a temp cwd so publish/update cannot mutate the repo. */
export function stageExampleApp(cwd, sourceDir) {
  const relative = "example-app";
  cpSync(sourceDir, join(cwd, relative), { recursive: true });
  return relative;
}
