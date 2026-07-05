/** Newline-delimited JSON messages over bare-kit IPC. */

export interface WorkletStatus {
  readonly running: boolean;
  readonly linkOnline: boolean;
  readonly announcesSeen: number;
}

export type HostToWorkletMessage =
  | { readonly type: "start"; readonly targetHost: string; readonly targetPort: number }
  | { readonly type: "stop" };

export type WorkletToHostMessage =
  | { readonly type: "status"; readonly status: WorkletStatus }
  | { readonly type: "log"; readonly line: string };

export function encodeMessage(message: HostToWorkletMessage | WorkletToHostMessage): string {
  return `${JSON.stringify(message)}\n`;
}

export function decodeMessages(buffer: string): { readonly messages: ReadonlyArray<WorkletToHostMessage>; readonly remainder: string } {
  const messages: WorkletToHostMessage[] = [];
  let remainder = buffer;

  while (true) {
    const newline = remainder.indexOf("\n");
    if (newline < 0) {
      break;
    }

    const line = remainder.slice(0, newline).trim();
    remainder = remainder.slice(newline + 1);
    if (line.length === 0) {
      continue;
    }

    try {
      messages.push(JSON.parse(line) as WorkletToHostMessage);
    } catch {
      // Ignore malformed lines; the worklet may log raw text during development.
    }
  }

  return { messages, remainder };
}
