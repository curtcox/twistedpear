const SHARE_MAX_ENCODED = 64 * 1024;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(encoded: string): Uint8Array {
  const padded = encoded.replaceAll("-", "+").replaceAll("_", "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export type WorkspaceFileMap = Record<string, string>;

export async function encodeWorkspace(files: WorkspaceFileMap): Promise<string> {
  const json = JSON.stringify(files);
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return toBase64Url(bytes);
}

export async function decodeWorkspace(encoded: string): Promise<WorkspaceFileMap> {
  const bytes = fromBase64Url(encoded);
  const stream = new Blob([bytes]).stream().pipeThrough(
    new DecompressionStream("deflate-raw"),
  );
  const json = await new Response(stream).text();
  const parsed: unknown = JSON.parse(json);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("share payload is not a file map");
  }
  const files: WorkspaceFileMap = {};
  for (const [path, content] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof content !== "string") {
      throw new Error(`share file ${path} is not text`);
    }
    files[path] = content;
  }
  return files;
}

export function shareTooLong(encoded: string): boolean {
  return encoded.length > SHARE_MAX_ENCODED;
}
