export function normalize(path) {
  return path.replaceAll("\\", "/").replace(/\/{2,}/g, "/");
}

export function parentDir(path) {
  const trimmed = normalize(path).replace(/\/$/u, "");
  const index = trimmed.lastIndexOf("/");
  return index <= 0 ? "/" : trimmed.slice(0, index);
}

export function memoryConfig(files, cwd, XMLHttpRequest) {
  const locate = (path) => {
    const raw = normalize(path);
    return raw.startsWith("/") ? raw : normalize(`${cwd}/${raw}`);
  };
  const directories = new Set(["/", cwd]);
  for (const path of files.keys()) {
    let dir = parentDir(path);
    while (dir.length > 0) {
      directories.add(dir);
      if (dir === "/") break;
      dir = parentDir(dir);
    }
  }
  return {
    XMLHttpRequest,
    async writeFile(path, data) {
      const resolved = locate(path);
      files.set(
        resolved,
        typeof data === "string" ? data : new TextDecoder().decode(data),
      );
      directories.add(parentDir(resolved));
    },
    async readFile(path) {
      const resolved = locate(path);
      const found = files.get(resolved);
      if (found === undefined) throw new Error(`ENOENT: ${resolved}`);
      return found;
    },
    async readDirectory(path) {
      const resolved = locate(path).replace(/\/$/u, "") || "/";
      const prefix = resolved === "/" ? "/" : `${resolved}/`;
      const names = new Set();
      for (const filePath of files.keys()) {
        if (!filePath.startsWith(prefix)) continue;
        const name = filePath.slice(prefix.length).split("/")[0];
        if (name) names.add(name);
      }
      return { files: [...names].sort() };
    },
    async createDirectory(path) {
      directories.add(locate(path).replace(/\/$/u, "") || "/");
    },
    async details(path) {
      const resolved = locate(path);
      if (files.has(resolved)) return { type: "file", createdAt: 0 };
      if (directories.has(resolved.replace(/\/$/u, "") || "/")) {
        return { type: "directory", createdAt: 0 };
      }
      throw new Error(`ENOENT: ${resolved}`);
    },
    async getCurrentDirectory() {
      return cwd;
    },
    async homedir() {
      return "/home";
    },
    env: {},
  };
}

export function findPlatformExport(value, seen = new Set()) {
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

export class FetchXmlHttpRequest {
  status = 0;
  response = null;
  responseText = "";
  responseType = "";
  onload = null;
  onerror = null;
  ontimeout = null;
  method = "GET";
  url = "";
  headers = {};
  responseHeaders = {};

  open(method, url) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(key, value) {
    this.headers[key] = value;
  }

  getAllResponseHeaders() {
    return Object.entries(this.responseHeaders)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\r\n");
  }

  send(body) {
    void this.dispatch(body);
  }

  async dispatch(body) {
    try {
      const init = { method: this.method, headers: this.headers };
      if (body !== undefined && body !== null) init.body = body;
      const response = await fetch(this.url, init);
      this.status = response.status;
      response.headers.forEach((value, key) => {
        this.responseHeaders[key] = value;
      });
      if (this.responseType === "arraybuffer") {
        this.response = await response.arrayBuffer();
      } else {
        this.responseText = await response.text();
        this.response = this.responseText;
      }
      this.onload?.();
    } catch (error) {
      this.onerror?.(error);
    }
  }
}

export async function compileHello(guida, fileList, XMLHttpRequestCtor, heap) {
  const files = new Map();
  for (const file of fileList) {
    files.set(`/app/${file.path}`, file.content);
  }
  let peakHeapBytes = heap();
  if (guida === undefined || typeof guida.make !== "function") {
    throw new Error("guida.make is not available");
  }
  const now = () =>
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  const compileStarted = now();
  const result = await guida.make(
    memoryConfig(files, "/app", XMLHttpRequestCtor),
    "src/Main.elm",
    { optimize: true },
  );
  const helloCompileMs = now() - compileStarted;
  peakHeapBytes = Math.max(peakHeapBytes, heap());
  const output = findPlatformExport(result);
  if (output === undefined) {
    throw new Error("guida make produced no compiled JS");
  }
  return {
    helloCompileMs: Number(helloCompileMs.toFixed(1)),
    peakHeapBytes,
    compiledChars: output.length,
  };
}
