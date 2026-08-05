/**
 * Rewrites mini-app entry sources that import @twistedpear/miniapp-sdk into code
 * that destructures the injected `sdk` global provided by the sandbox bootstrap.
 */
export function prepareBundleSource(source: string): string {
  const importMatch = source.match(/import\s+\{([^}]+)\}\s+from\s+["']@twistedpear\/miniapp-sdk["'];?\s*/);
  if (importMatch === null) {
    return source;
  }

  const names = importMatch[1]!
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const withoutImport = source.replace(/import\s+\{[^}]+\}\s+from\s+["']@twistedpear\/miniapp-sdk["'];?\s*/, "");
  return `const { ${names.join(", ")} } = sdk;\n${withoutImport}`;
}
