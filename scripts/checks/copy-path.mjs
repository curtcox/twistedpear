/**
 * Copy a file or a directory, preserving the destination's relative path.
 *
 * Gate artifacts are declared as repo-relative paths and can be either a file
 * (`coverage-ratchet.json`) or a directory (`reports/api`). `copyFileSync` on a
 * directory throws EISDIR, which is what failed the Pages publish after
 * `api-signatures` started staging a folder.
 */
import fs from "node:fs";
import path from "node:path";

export function copyPath(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (fs.statSync(source).isDirectory()) {
    fs.cpSync(source, destination, { recursive: true });
    return;
  }
  fs.copyFileSync(source, destination);
}
