/**
 * Deterministic in-memory ES-module linker. No npm, no node_modules, no
 * network. Keep in sync with packages/cli/src/commands/js-bundle.ts.
 */

const IMPORT_RE =
  /(?:import\s+(?:type\s+)?(?:[\s\S]*?)\s+from\s+|export\s+[\s\S]*?\s+from\s+)["'](\.[^"']+)["']/g;

function posixJoin(fromFile, spec) {
  const dir = fromFile.includes("/")
    ? fromFile.slice(0, fromFile.lastIndexOf("/"))
    : "";
  const combined = `${dir ? `${dir}/` : ""}${spec}`.replace(/\\/g, "/");
  const parts = [];
  for (const part of combined.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return parts.join("/");
}

function fileExistsIn(files, relative) {
  const candidates = [relative];
  if (!relative.endsWith(".js") && !relative.endsWith(".mjs")) {
    candidates.push(`${relative}.js`, `${relative}.mjs`);
  }
  for (const candidate of candidates) {
    if (files.has(candidate)) return candidate;
  }
  return null;
}

function collectImports(source, fromFile, files) {
  const imports = [];
  IMPORT_RE.lastIndex = 0;
  let match = IMPORT_RE.exec(source);
  while (match !== null) {
    const spec = match[1];
    if (spec !== undefined) {
      const resolved = posixJoin(fromFile, spec);
      const existing = fileExistsIn(files, resolved);
      if (existing === null) {
        throw new Error(`Unresolved relative import ${spec} from ${fromFile}`);
      }
      imports.push(existing);
    }
    match = IMPORT_RE.exec(source);
  }
  return imports;
}

function topoSort(entry, graph) {
  const ordered = [];
  const visiting = new Set();
  const visited = new Set();
  const visit = (file) => {
    if (visited.has(file)) return;
    if (visiting.has(file)) {
      throw new Error(`Circular import involving ${file}`);
    }
    visiting.add(file);
    for (const dep of graph.get(file) ?? []) visit(dep);
    visiting.delete(file);
    visited.add(file);
    ordered.push(file);
  };
  visit(entry);
  return ordered;
}

function wrapModule(relative, source, id) {
  const withoutImports = source.replace(
    /^\s*(?:import\s+[\s\S]*?from\s+["']\.[^"']+["']\s*;?|export\s+\*\s+from\s+["']\.[^"']+["']\s*;?)\s*$/gm,
    "",
  );
  const rewritten = withoutImports
    .replace(/^export\s+async\s+function\s+/gm, "async function ")
    .replace(/^export\s+function\s+/gm, "function ")
    .replace(/^export\s+const\s+/gm, "const ")
    .replace(/^export\s+let\s+/gm, "let ")
    .replace(/^export\s+class\s+/gm, "class ")
    .replace(/^export\s+\{([^}]+)\}\s*;?\s*$/gm, (_, names) =>
      names
        .split(",")
        .map((name) => {
          const trimmed = name.trim().split(/\s+as\s+/);
          const local = trimmed[0]?.trim() ?? "";
          const exported = trimmed[1]?.trim() ?? local;
          return `__m${id}.${exported} = ${local};`;
        })
        .join("\n"),
    );
  const exportedFns = [...source.matchAll(/^export\s+(?:async\s+)?function\s+(\w+)/gm)].map(
    (match) => match[1],
  );
  const exportedConsts = [...source.matchAll(/^export\s+const\s+(\w+)/gm)].map(
    (match) => match[1],
  );
  const assignments = [...exportedFns, ...exportedConsts]
    .map((name) => `__m${id}.${name} = ${name};`)
    .join("\n");
  return `const __m${id} = Object.create(null); // ${relative}
await (async () => {
${rewritten}
${assignments}
})();
`;
}

function rewriteLocalImports(source, fromFile, files, ids) {
  return source.replace(
    /import\s+(?:type\s+)?(\{[^}]+\}|\*\s+as\s+\w+|\w+)\s+from\s+["'](\.[^"']+)["']\s*;?/g,
    (_all, binding, spec) => {
      const resolved = fileExistsIn(files, posixJoin(fromFile, spec));
      if (resolved === null) {
        throw new Error(`Unresolved relative import ${spec} from ${fromFile}`);
      }
      const id = ids.get(resolved);
      if (id === undefined) {
        throw new Error(`Module ${resolved} was not bundled`);
      }
      if (binding.startsWith("{")) {
        return binding
          .slice(1, -1)
          .split(",")
          .map((part) => part.trim())
          .filter((part) => part.length > 0)
          .map((part) => {
            const [local, alias] = part.split(/\s+as\s+/);
            const exported = (local ?? "").trim();
            const name = (alias ?? local ?? "").trim();
            return `const ${name} = __m${id}.${exported};`;
          })
          .join("\n");
      }
      return `const ${binding.replace(/^\*\s+as\s+/, "")} = __m${id};`;
    },
  );
}

export function needsJsLink(source) {
  return /from\s+["']\./.test(source);
}

export function linkJsModules(files, entry) {
  const normalizedEntry = entry.replace(/\\/g, "/");
  const graph = new Map();
  const sources = new Map();
  const queue = [normalizedEntry];
  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || sources.has(file)) continue;
    const source = files.get(file);
    if (source === undefined) {
      throw new Error(`Missing module ${file}`);
    }
    const normalized = source.replace(/\r\n/g, "\n");
    sources.set(file, normalized);
    const imports = collectImports(normalized, file, files);
    graph.set(file, imports);
    queue.push(...imports);
  }
  const ordered = topoSort(normalizedEntry, graph);
  const ids = new Map(ordered.map((file, index) => [file, index]));
  const parts = ordered.map((file, index) => {
    const rewritten = rewriteLocalImports(
      sources.get(file) ?? "",
      file,
      files,
      ids,
    );
    return wrapModule(file, rewritten, index);
  });
  const entryId = ids.get(normalizedEntry);
  return `${parts.join("\n")}
const __entry = __m${entryId};
if (typeof __entry.default === "function") {
  await __entry.default();
}
`;
}
