import { bytesOf, type GuidaFsConfig, type GuidaXhrCtor } from "./fs-config.js";

function normalize(path: string): string {
  return path.replaceAll("\\", "/").replace(/\/{2,}/gu, "/");
}

function parentDir(path: string): string {
  const trimmed = normalize(path).replace(/\/$/u, "");
  const index = trimmed.lastIndexOf("/");
  return index <= 0 ? "/" : trimmed.slice(0, index);
}

export interface MemoryGuidaOptions {
  readonly cwd: string;
  readonly homedir: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly XMLHttpRequest: GuidaXhrCtor;
}

/**
 * In-memory filesystem for embedding `guida` in host chrome (DevStudio).
 * Package metadata is served by the injected XHR; sources live in `files`.
 */
export function memoryGuidaConfig(
  files: Map<string, Uint8Array>,
  options: MemoryGuidaOptions,
): GuidaFsConfig {
  const cwd = normalize(options.cwd);
  const locate = (path: string) => {
    const raw = normalize(path);
    if (raw.startsWith("/")) return raw;
    return normalize(`${cwd}/${raw}`);
  };

  const directories = new Set<string>(["/", cwd]);
  for (const path of files.keys()) {
    let dir = parentDir(path);
    while (dir.length > 0) {
      directories.add(dir);
      if (dir === "/") break;
      dir = parentDir(dir);
    }
  }

  return {
    XMLHttpRequest: options.XMLHttpRequest,
    async writeFile(path, data) {
      const resolved = locate(path);
      files.set(resolved, bytesOf(data));
      directories.add(parentDir(resolved));
    },
    async readFile(path) {
      const resolved = locate(path);
      const found = files.get(resolved);
      if (found === undefined) {
        throw new Error(`ENOENT: ${resolved}`);
      }
      return found;
    },
    async readDirectory(path) {
      const resolved = locate(path).replace(/\/$/u, "") || "/";
      const prefix = resolved === "/" ? "/" : `${resolved}/`;
      const names = new Set<string>();
      for (const filePath of files.keys()) {
        if (!filePath.startsWith(prefix)) continue;
        const rest = filePath.slice(prefix.length);
        const name = rest.split("/")[0];
        if (name) names.add(name);
      }
      for (const dir of directories) {
        if (!dir.startsWith(prefix)) continue;
        const rest = dir.slice(prefix.length);
        const name = rest.split("/")[0];
        if (name) names.add(name);
      }
      return { files: [...names].sort() };
    },
    async createDirectory(path) {
      directories.add(locate(path).replace(/\/$/u, "") || "/");
    },
    async details(path) {
      const resolved = locate(path);
      if (files.has(resolved)) {
        return { type: "file", createdAt: 0 };
      }
      if (directories.has(resolved.replace(/\/$/u, "") || "/")) {
        return { type: "directory", createdAt: 0 };
      }
      throw new Error(`ENOENT: ${resolved}`);
    },
    async getCurrentDirectory() {
      return cwd;
    },
    async homedir() {
      return options.homedir;
    },
    env: options.env ?? {},
  };
}
