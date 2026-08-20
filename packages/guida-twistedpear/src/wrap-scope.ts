/** Wrap Guida/Elm 0.19.1 output so `_Platform_export` can write `Elm` in both sloppy and module evaluation. */
export const SCOPE_TAIL = "}(this));";
const SCOPE_HEAD = "(function(scope){";

export function wrapGuidaScope(source: string): string {
  const last = source.lastIndexOf(SCOPE_TAIL);
  if (last < 0) {
    throw new Error("Guida output missing trailing }(this)); scope export");
  }
  const head = source.lastIndexOf(SCOPE_HEAD, last);
  if (head < 0) {
    throw new Error("Guida output missing (function(scope){ wrapper");
  }

  return `const __scope = {};\n${source.slice(head, last)}}).call(__scope, __scope);\nconst Elm = __scope.Elm;\n`;
}
