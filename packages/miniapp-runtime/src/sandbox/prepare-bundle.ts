function sdkSpecifier(
  source: string,
): { value: string; index: number } | undefined {
  const specifier = "@twistedpear/miniapp-sdk";
  return [`"${specifier}"`, `'${specifier}'`]
    .map((value) => ({ value, index: source.indexOf(value) }))
    .filter((entry) => entry.index >= 0)
    .sort((left, right) => left.index - right.index)[0];
}

function endOfImport(
  source: string,
  quoted: { value: string; index: number },
): number {
  let end = quoted.index + quoted.value.length;
  if (source[end] === ";") end += 1;
  while (end < source.length && /\s/u.test(source[end]!)) end += 1;
  return end;
}

/**
 * Rewrites one named mini-app SDK import into the injected sandbox global.
 * Deliberate index-based parsing keeps this boundary linear for hostile source.
 */
export function prepareBundleSource(source: string): string {
  const quoted = sdkSpecifier(source);
  if (quoted === undefined) return source;

  const importStart = source.lastIndexOf("import", quoted.index);
  const openBrace = source.indexOf("{", importStart);
  const closeBrace = source.indexOf("}", openBrace);
  if (
    importStart < 0 ||
    openBrace < 0 ||
    closeBrace < 0 ||
    source.slice(importStart + "import".length, openBrace).trim() !== "" ||
    source.slice(closeBrace + 1, quoted.index).trim() !== "from"
  )
    return source;

  const names = source
    .slice(openBrace + 1, closeBrace)
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (names.length === 0) return source;
  return `${source.slice(0, importStart)}const { ${names.join(", ")} } = sdk;\n${source.slice(endOfImport(source, quoted))}`;
}
