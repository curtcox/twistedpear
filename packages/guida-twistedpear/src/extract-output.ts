function findPlatformExport(
  value: unknown,
  seen = new Set<unknown>(),
): string | undefined {
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

export function isolateCompiledJs(source: string): string {
  if (!source.includes("<script")) return source;
  const scripts = [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  const compiled = scripts
    .map((match) => match[1] ?? "")
    .find((body) => body.includes("_Platform_export"));
  if (compiled === undefined) {
    throw new Error("Guida HTML output is missing the compiled Elm script");
  }
  return compiled;
}

export function extractOutput(result: unknown): string {
  const found = findPlatformExport(result);
  if (found !== undefined) return isolateCompiledJs(found);
  if (result !== null && typeof result === "object" && "error" in result) {
    const error = (result as { error: unknown }).error;
    const text = typeof error === "string" ? error : JSON.stringify(error);
    throw new Error(`guida make failed: ${text.slice(0, 800)}`);
  }
  throw new Error(
    `unexpected guida make result: ${JSON.stringify(result)?.slice(0, 400)}`,
  );
}
