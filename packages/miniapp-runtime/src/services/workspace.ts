import type { MiniappKvStoreBackend } from "./storage-kv.js";

export interface WorkspaceLimits {
  readonly maxFileBytes: number;
  readonly maxTotalBytes: number;
  readonly maxFiles: number;
}

export const DEFAULT_WORKSPACE_LIMITS: WorkspaceLimits = {
  maxFileBytes: 256 * 1024,
  maxTotalBytes: 4 * 1024 * 1024,
  maxFiles: 512,
};

export interface WorkspaceFileInfo {
  readonly path: string;
  readonly size: number;
}

export interface WorkspaceTextEdit {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

export class WorkspaceError extends Error {
  constructor(
    readonly code:
      | "INVALID_PATH"
      | "INVALID_PATCH"
      | "PATCH_CONFLICT"
      | "FILE_TOO_LARGE"
      | "WORKSPACE_FULL"
      | "NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "WorkspaceError";
  }
}

const PATH_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function hasInvalidPathShape(path: string): boolean {
  return (
    path.length === 0 ||
    path.length > 256 ||
    path.includes("\\") ||
    path.startsWith("/") ||
    path.endsWith("/")
  );
}

function isInvalidPathSegment(segment: string): boolean {
  return (
    !PATH_SEGMENT.test(segment) || segment === "." || segment.includes("..")
  );
}

export function validateWorkspacePath(path: string): string {
  if (typeof path !== "string" || hasInvalidPathShape(path)) {
    throw new WorkspaceError(
      "INVALID_PATH",
      `Invalid workspace path: ${String(path).slice(0, 64)}`,
    );
  }

  for (const segment of path.split("/")) {
    if (isInvalidPathSegment(segment)) {
      throw new WorkspaceError(
        "INVALID_PATH",
        `Invalid workspace path segment: ${segment.slice(0, 64)}`,
      );
    }
  }

  return path;
}

export class WorkspaceService {
  private readonly limits: WorkspaceLimits;

  constructor(
    private readonly backend: MiniappKvStoreBackend,
    limits: Partial<WorkspaceLimits> = {},
  ) {
    this.limits = { ...DEFAULT_WORKSPACE_LIMITS, ...limits };
  }

  async list(
    appId: string,
    prefix = "",
  ): Promise<ReadonlyArray<WorkspaceFileInfo>> {
    if (prefix !== "") {
      validateWorkspacePath(
        prefix.endsWith("/") ? prefix.slice(0, -1) : prefix,
      );
    }

    const keyPrefix = this.keyPrefix(appId);
    const keys = await this.backend.list(`${keyPrefix}${prefix}`);
    const files: WorkspaceFileInfo[] = [];
    for (const key of keys.slice().sort()) {
      const bytes = await this.backend.get(key);
      files.push({
        path: key.slice(keyPrefix.length),
        size: bytes.length,
      });
    }

    return files;
  }

  async read(appId: string, path: string): Promise<string> {
    const bytes = await this.backend.get(this.key(appId, path));
    if (bytes === null) {
      throw new WorkspaceError(
        "NOT_FOUND",
        `Workspace file not found: ${path}`,
      );
    }

    return new TextDecoder().decode(bytes);
  }

  async write(
    appId: string,
    path: string,
    content: string,
  ): Promise<WorkspaceFileInfo> {
    const key = this.key(appId, path);
    const bytes = new TextEncoder().encode(content);
    if (bytes.length > this.limits.maxFileBytes) {
      throw new WorkspaceError(
        "FILE_TOO_LARGE",
        `Workspace file exceeds ${this.limits.maxFileBytes} bytes: ${path}`,
      );
    }

    const keys = await this.backend.list(this.keyPrefix(appId));
    let total = bytes.length;
    let count = 1;
    for (const existing of keys) {
      if (existing === key) {
        continue;
      }

      count += 1;
      total += (await this.backend.get(existing))?.length ?? 0;
    }

    if (count > this.limits.maxFiles) {
      throw new WorkspaceError(
        "WORKSPACE_FULL",
        `Workspace exceeds ${this.limits.maxFiles} files`,
      );
    }

    if (total > this.limits.maxTotalBytes) {
      throw new WorkspaceError(
        "WORKSPACE_FULL",
        `Workspace exceeds ${this.limits.maxTotalBytes} bytes`,
      );
    }

    await this.backend.set(key, bytes);
    return { path, size: bytes.length };
  }

  async patch(
    appId: string,
    path: string,
    baseLength: number,
    edits: ReadonlyArray<WorkspaceTextEdit>,
  ): Promise<WorkspaceFileInfo> {
    assertPatchRequest(baseLength, edits);
    const current = await this.read(appId, path);
    if (current.length !== baseLength) {
      throw new WorkspaceError(
        "PATCH_CONFLICT",
        `Workspace file changed before patch: ${path}`,
      );
    }
    assertOrderedEdits(edits, current, path);
    return this.write(appId, path, applyWorkspaceEdits(current, edits));
  }

  async delete(appId: string, path: string): Promise<void> {
    await this.backend.delete(this.key(appId, path));
  }

  private key(appId: string, path: string): string {
    return `${this.keyPrefix(appId)}${validateWorkspacePath(path)}`;
  }

  private keyPrefix(appId: string): string {
    return `miniapp-workspace:${appId}:`;
  }
}

function assertPatchRequest(
  baseLength: number,
  edits: ReadonlyArray<WorkspaceTextEdit>,
): void {
  if (
    !Number.isSafeInteger(baseLength) ||
    baseLength < 0 ||
    !Array.isArray(edits) ||
    edits.length === 0 ||
    edits.length > 1024
  ) {
    throw new WorkspaceError(
      "INVALID_PATCH",
      "Workspace patch needs 1-1024 edits and a valid base length",
    );
  }
}

function isInvalidEdit(
  edit: WorkspaceTextEdit,
  previousEnd: number,
  currentLength: number,
): boolean {
  return (
    !Number.isSafeInteger(edit.start) ||
    !Number.isSafeInteger(edit.end) ||
    edit.start < previousEnd ||
    edit.end < edit.start ||
    edit.end > currentLength ||
    typeof edit.text !== "string"
  );
}

function assertOrderedEdits(
  edits: ReadonlyArray<WorkspaceTextEdit>,
  current: string,
  path: string,
): void {
  let previousEnd = 0;
  for (const edit of edits) {
    if (isInvalidEdit(edit, previousEnd, current.length)) {
      throw new WorkspaceError(
        "INVALID_PATCH",
        `Invalid or overlapping workspace edit: ${path}`,
      );
    }
    previousEnd = edit.end;
  }
}

function applyWorkspaceEdits(
  current: string,
  edits: ReadonlyArray<WorkspaceTextEdit>,
): string {
  let content = current;
  for (let index = edits.length - 1; index >= 0; index -= 1) {
    const edit = edits[index]!;
    content = `${content.slice(0, edit.start)}${edit.text}${content.slice(edit.end)}`;
  }
  return content;
}
