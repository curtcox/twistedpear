import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import type { GuidaFsConfig } from "./fs-config.js";
import { FetchXmlHttpRequest } from "./xhr.js";

export type { GuidaFsConfig, GuidaXhrCtor, GuidaXhrLike } from "./fs-config.js";

/**
 * Filesystem + XHR environment for `guida`'s library `make` / `format` /
 * `diagnostics`. Used by the CLI build and by on-device embedding.
 *
 * Guida's library runner does not canonicalize relative paths, so every
 * filesystem call is resolved against the app directory.
 */
export function nodeGuidaConfig(cwd: string): GuidaFsConfig {
  const located = (path: string) => resolve(cwd, path);
  return {
    XMLHttpRequest: FetchXmlHttpRequest,
    async writeFile(path, data) {
      await writeFile(located(path), data);
    },
    readFile(path) {
      return readFile(located(path));
    },
    async readDirectory(path) {
      return { files: await readdir(located(path)) };
    },
    async createDirectory(path) {
      await mkdir(located(path), { recursive: true });
    },
    async details(path) {
      const info = await stat(located(path));
      return {
        type: info.isDirectory() ? "directory" : "file",
        createdAt: Math.trunc(info.mtimeMs),
      };
    },
    async getCurrentDirectory() {
      return cwd;
    },
    async homedir() {
      return homedir();
    },
    env: process.env,
  };
}
