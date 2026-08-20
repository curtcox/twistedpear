import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { FetchXmlHttpRequest } from "./xhr.js";

export interface GuidaFsConfig {
  XMLHttpRequest: new () => FetchXmlHttpRequest;
  writeFile: (
    path: string,
    data: string | Buffer | Uint8Array,
  ) => Promise<void>;
  readFile: (path: string) => Promise<Buffer>;
  readDirectory: (path: string) => Promise<{ files: string[] }>;
  createDirectory: (path: string) => Promise<void>;
  details: (
    path: string,
  ) => Promise<{ type: "file" | "directory"; createdAt: number }>;
  getCurrentDirectory: () => Promise<string>;
  homedir: () => Promise<string>;
  env: NodeJS.ProcessEnv;
}

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
