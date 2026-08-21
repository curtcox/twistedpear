export interface GuidaProblem {
  readonly path: string;
  readonly title: string;
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
  readonly message: string;
}

const MAX_PROBLEMS = 32;
const MAX_MESSAGE = 500;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function flattenMessage(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(flattenMessage).join("");
  const record = asRecord(value);
  if (record === undefined) return "";
  if (typeof record.string === "string") return record.string;
  if (typeof record.text === "string") return record.text;
  return "";
}

function regionPoint(
  value: unknown,
  key: "start" | "end",
): { line: number; column: number } {
  const record = asRecord(value);
  const point = asRecord(record?.[key]);
  const line = Number(point?.line ?? record?.line ?? 1);
  const column = Number(point?.column ?? record?.column ?? 1);
  return {
    line: Number.isFinite(line) ? line : 1,
    column: Number.isFinite(column) ? column : 1,
  };
}

function pushProblem(out: GuidaProblem[], problem: GuidaProblem): void {
  if (out.length >= MAX_PROBLEMS) return;
  out.push({
    ...problem,
    message: problem.message.slice(0, MAX_MESSAGE),
  });
}

function fromProblemNode(
  path: string,
  fallbackTitle: string,
  value: unknown,
): GuidaProblem {
  const record = asRecord(value) ?? {};
  const start = regionPoint(record.region ?? record, "start");
  const end = regionPoint(record.region ?? record, "end");
  const title =
    typeof record.title === "string"
      ? record.title
      : typeof record.name === "string"
        ? record.name
        : fallbackTitle;
  return {
    path: typeof record.path === "string" ? record.path : path,
    title,
    startLine: start.line,
    startColumn: start.column,
    endLine: end.line,
    endColumn: end.column,
    message: flattenMessage(record.message ?? record).trim() || title,
  };
}

function walkErrors(raw: unknown, out: GuidaProblem[]): void {
  if (raw === undefined || raw === null || out.length >= MAX_PROBLEMS) return;
  if (typeof raw === "string" && raw.length > 0) {
    pushProblem(out, {
      path: "",
      title: "ERROR",
      startLine: 1,
      startColumn: 1,
      endLine: 1,
      endColumn: 1,
      message: raw,
    });
    return;
  }
  if (Array.isArray(raw)) {
    for (const entry of raw) walkErrors(entry, out);
    return;
  }
  const record = asRecord(raw);
  if (record === undefined) return;
  if (Array.isArray(record.errors)) {
    walkErrors(record.errors, out);
    return;
  }
  const path = typeof record.path === "string" ? record.path : "";
  const title =
    typeof record.name === "string"
      ? record.name
      : typeof record.title === "string"
        ? record.title
        : "ERROR";
  if (Array.isArray(record.problems)) {
    for (const problem of record.problems) {
      pushProblem(out, fromProblemNode(path, title, problem));
    }
    return;
  }
  if (record.region !== undefined || record.message !== undefined) {
    pushProblem(out, fromProblemNode(path, title, record));
  }
}

export function flattenGuidaDiagnostics(raw: unknown): GuidaProblem[] {
  const out: GuidaProblem[] = [];
  walkErrors(raw, out);
  return out;
}

export function problemFromError(error: unknown): GuidaProblem {
  const message = error instanceof Error ? error.message : String(error);
  return {
    path: "",
    title: "ERROR",
    startLine: 1,
    startColumn: 1,
    endLine: 1,
    endColumn: 1,
    message: message.slice(0, MAX_MESSAGE),
  };
}

function formattedSourceFrom(record: Record<string, unknown>): string | undefined {
  for (const key of [
    "content",
    "formatted",
    "source",
    "code",
    "elm",
    "text",
    "output",
  ]) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
    const flattened = flattenMessage(value);
    if (flattened.length > 0) return flattened;
  }
  return undefined;
}

export function extractFormatted(raw: unknown): string {
  if (typeof raw === "string") return raw;
  const record = asRecord(raw);
  const fromRecord = record === undefined ? undefined : formattedSourceFrom(record);
  if (fromRecord !== undefined) return fromRecord;
  throw new Error(
    `unexpected guida format result: ${describeFormatResult(raw)}`,
  );
}

function describeFormatResult(raw: unknown): string {
  try {
    return JSON.stringify(raw)?.slice(0, 300) ?? typeof raw;
  } catch {
    if (raw === null) return "null";
    if (Array.isArray(raw)) return `array(${raw.length})`;
    if (typeof raw !== "object") return typeof raw;
    return Object.keys(raw as Record<string, unknown>).slice(0, 12).join(",");
  }
}
