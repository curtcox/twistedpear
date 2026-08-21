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
  const children = Array.isArray(value) ? value : Object.values(value);
  for (const item of children) {
    const found = findPlatformExport(item, seen);
    if (found !== undefined) return found;
  }
  return undefined;
}

export function isolateCompiledJs(source: string): string {
  if (!source.includes("<script")) return source;
  const lower = source.toLowerCase();
  let from = 0;
  while (from < source.length) {
    const open = lower.indexOf("<script", from);
    if (open === -1) break;
    const tagEnd = source.indexOf(">", open);
    if (tagEnd === -1) break;
    const close = lower.indexOf("</script>", tagEnd);
    if (close === -1) break;
    const body = source.slice(tagEnd + 1, close);
    if (body.includes("_Platform_export")) return body;
    from = close + "</script>".length;
  }
  throw new Error("Guida HTML output is missing the compiled Elm script");
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
    `unexpected guida make result: ${JSON.stringify(result).slice(0, 400)}`,
  );
}
