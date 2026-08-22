import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, posix } from "node:path";

const IMPORT_RE =
  /(?:import\s+(?:type\s+)?(?:[\s\S]*?)\s+from\s+|export\s+[\s\S]*?\s+from\s+)["'](\.[^"']+)["']/g;

function resolveRelative(fromFile: string, spec: string): string {
  const combined = posix.normalize(posix.join(posix.dirname(fromFile), spec));
  const candidates = [combined];
  if (!combined.endsWith(".js") && !combined.endsWith(".mjs")) {
    candidates.push(`${combined}.js`, `${combined}.mjs`, join(combined, "index.js"));
  }
  return candidates[0] ?? combined;
}

function fileExistsIn(
  files: ReadonlyMap<string, string>,
  relative: string,
): string | null {
  const candidates = [relative];
  if (!relative.endsWith(".js") && !relative.endsWith(".mjs")) {
    candidates.push(`${relative}.js`, `${relative}.mjs`);
  }
  for (const candidate of candidates) {
    if (files.has(candidate)) return candidate;
  }
  return null;
}

function collectImports(
  source: string,
  fromFile: string,
  files: ReadonlyMap<string, string>,
): string[] {
  const imports: string[] = [];
  IMPORT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = IMPORT_RE.exec(source)) !== null) {
    const spec = match[1];
    if (spec === undefined) continue;
    const resolved = resolveRelative(fromFile, spec);
    const existing = fileExistsIn(files, resolved);
    if (existing === null) {
      throw new Error(`Unresolved relative import ${spec} from ${fromFile}`);
    }
    imports.push(existing);
  }
  return imports;
}

function topoSort(
  entry: string,
  graph: Map<string, string[]>,
): string[] {
  const ordered: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (file: string) => {
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

function wrapModule(relative: string, source: string, id: number): string {
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
    .replace(/^export\s+\{([^}]+)\}\s*;?\s*$/gm, (_, names: string) => {
      return names
        .split(",")
        .map((name) => {
          const trimmed = name.trim().split(/\s+as\s+/);
          const local = trimmed[0]?.trim() ?? "";
          const exported = trimmed[1]?.trim() ?? local;
          return `__m${id}.${exported} = ${local};`;
        })
        .join("\n");
    });
  const exportedFns = [
    ...source.matchAll(/^export\s+(?:async\s+)?function\s+(\w+)/gm),
  ].map((match) => match[1]);
  const exportedConsts = [
    ...source.matchAll(/^export\s+const\s+(\w+)/gm),
  ].map((match) => match[1]);
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

function rewriteLocalImports(
  source: string,
  fromFile: string,
  files: ReadonlyMap<string, string>,
  ids: Map<string, number>,
): string {
  return source.replace(
    /import\s+(?:type\s+)?(\{[^}]+\}|\*\s+as\s+\w+|\w+)\s+from\s+["'](\.[^"']+)["']\s*;?/g,
    (_all, binding: string, spec: string) => {
      const resolved = fileExistsIn(files, resolveRelative(fromFile, spec));
      if (resolved === null) {
        throw new Error(`Unresolved relative import ${spec} from ${fromFile}`);
      }
      const id = ids.get(resolved);
      if (id === undefined) {
        throw new Error(`Module ${resolved} was not bundled`);
      }
      if (binding.startsWith("{")) {
        const names = binding
          .slice(1, -1)
          .split(",")
          .map((part) => part.trim())
          .filter((part) => part.length > 0)
          .map((part) => {
            const [local, alias] = part.split(/\s+as\s+/);
            const exported = (local ?? "").trim();
            const name = (alias ?? local ?? "").trim();
            return `const ${name} = __m${id}.${exported};`;
          });
        return names.join("\n");
      }
      return `const ${binding.replace(/^\*\s+as\s+/, "")} = __m${id};`;
    },
  );
}

export function linkJsModules(
  files: ReadonlyMap<string, string>,
  entry: string,
): string {
  const normalizedEntry = entry.split("\\").join("/");
  const graph = new Map<string, string[]>();
  const sources = new Map<string, string>();
  const queue = [normalizedEntry];
  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || sources.has(file)) continue;
    const raw = files.get(file);
    if (raw === undefined) {
      throw new Error(`Missing module ${file}`);
    }
    const source = raw.replace(/\r\n/g, "\n");
    sources.set(file, source);
    const imports = collectImports(source, file, files);
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

function diskFileExists(appDir: string, relative: string): string | null {
  const candidates = [relative];
  if (!relative.endsWith(".js") && !relative.endsWith(".mjs")) {
    candidates.push(`${relative}.js`, `${relative}.mjs`);
  }
  for (const candidate of candidates) {
    if (existsSync(join(appDir, candidate))) return candidate;
  }
  return null;
}

export function linkJsProject(appDir: string, entry: string): string {
  const files = new Map<string, string>();
  const queue = [entry.split("\\").join("/")];
  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || files.has(file)) continue;
    const source = readFileSync(join(appDir, file), "utf8").replace(/\r\n/g, "\n");
    files.set(file, source);
    IMPORT_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = IMPORT_RE.exec(source)) !== null) {
      const spec = match[1];
      if (spec === undefined) continue;
      const resolved = diskFileExists(appDir, resolveRelative(file, spec));
      if (resolved === null) {
        throw new Error(`Unresolved relative import ${spec} from ${file}`);
      }
      queue.push(resolved);
    }
  }
  return linkJsModules(files, entry);
}

export function writeLinkedBundle(appDir: string, entry: string, outFile: string): string {
  const bundle = linkJsProject(appDir, entry);
  writeFileSync(join(appDir, outFile), bundle);
  return bundle;
}

export function maybeLinkJsProject(appDir: string, entry: string): string {
  if (existsSync(join(appDir, "elm.json"))) return entry;
  const source = readFileSync(join(appDir, entry), "utf8");
  if (!/from\s+["']\./.test(source)) return entry;
  writeLinkedBundle(appDir, entry, "bundle.js");
  return "bundle.js";
}
