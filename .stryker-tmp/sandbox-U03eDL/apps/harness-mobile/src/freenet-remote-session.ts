/**
 * Trusted-chrome session state for a granted Freenet remote node.
 * Keeps non-Freenet host paths usable when the node is unavailable.
 */
// @ts-nocheck


import {
  assertNoTokenInText,
  freenetGrantLogSafe,
  type FreenetRemoteGrant,
  validateFreenetNodeUrl
} from "./freenet-remote-grant";

export type FreenetRemoteSessionStatus =
  | "idle"
  | "connecting"
  | "online"
  | "auth-failed"
  | "unavailable"
  | "reconnecting"
  | "degraded";

export type FreenetRemoteProbeReason =
  | "auth-failed"
  | "unavailable"
  | "timeout"
  | "malformed-url";

export type FreenetRemoteProbeResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: FreenetRemoteProbeReason; readonly detail?: string };

export interface FreenetRemoteSession {
  readonly status: FreenetRemoteSessionStatus;
  readonly grant: FreenetRemoteGrant | null;
  readonly lastError: string | null;
  readonly pendingWriteConfirmation: boolean;
  readonly reconnectAttempts: number;
}

export type FreenetRemoteSessionEvent =
  | { readonly type: "enable"; readonly grant: FreenetRemoteGrant }
  | { readonly type: "probe-result"; readonly result: FreenetRemoteProbeResult }
  | { readonly type: "disconnect" }
  | { readonly type: "reconnect" }
  | { readonly type: "request-write-confirmation" }
  | { readonly type: "confirm-write" }
  | { readonly type: "cancel-write" }
  | { readonly type: "revoke" };

export function idleFreenetRemoteSession(): FreenetRemoteSession {
  return {
    status: "idle",
    grant: null,
    lastError: null,
    pendingWriteConfirmation: false,
    reconnectAttempts: 0
  };
}

export function reduceFreenetRemoteSession(
  current: FreenetRemoteSession,
  event: FreenetRemoteSessionEvent
): FreenetRemoteSession {
  switch (event.type) {
    case "enable":
      return {
        status: "connecting",
        grant: event.grant,
        lastError: null,
        pendingWriteConfirmation: false,
        reconnectAttempts: 0
      };
    case "probe-result": {
      if (current.grant === null) return current;
      if (event.result.ok) {
        return {
          ...current,
          status: "online",
          lastError: null,
          reconnectAttempts: 0
        };
      }
      const status =
        event.result.reason === "auth-failed"
          ? "auth-failed"
          : current.status === "reconnecting"
            ? "degraded"
            : "unavailable";
      return {
        ...current,
        status,
        lastError: event.result.detail ?? event.result.reason
      };
    }
    case "disconnect":
      if (current.grant === null || current.status === "idle") return current;
      return {
        ...current,
        status: "unavailable",
        lastError: current.lastError ?? "node disconnected"
      };
    case "reconnect":
      if (current.grant === null) return current;
      return {
        ...current,
        status: "reconnecting",
        lastError: null,
        reconnectAttempts: current.reconnectAttempts + 1
      };
    case "request-write-confirmation":
      if (current.grant === null || !current.grant.capabilities.contractWrites) {
        return current;
      }
      return { ...current, pendingWriteConfirmation: true };
    case "confirm-write":
      return { ...current, pendingWriteConfirmation: false };
    case "cancel-write":
      return { ...current, pendingWriteConfirmation: false };
    case "revoke":
      return idleFreenetRemoteSession();
    default:
      return current;
  }
}

/**
 * Probe a granted remote node without putting tokens in URLs or status text.
 * Injectable for unit tests; default uses a short WebSocket open attempt.
 * Auth tokens are applied the same way as FreenetWsApi (query + never logged).
 */
export async function probeFreenetRemoteNode(
  grant: FreenetRemoteGrant,
  options?: {
    readonly open?: (
      url: string,
      options?: { readonly authToken?: string }
    ) => Promise<FreenetRemoteProbeResult>;
    readonly timeoutMs?: number;
  }
): Promise<FreenetRemoteProbeResult> {
  const urlCheck = validateFreenetNodeUrl(grant.nodeUrl);
  if (!urlCheck.ok) {
    return { ok: false, reason: "malformed-url", detail: urlCheck.errors.join("; ") };
  }

  const open = options?.open ?? defaultOpenWebSocket;
  const authToken =
    grant.authToken !== undefined && grant.authToken.length > 0
      ? grant.authToken
      : undefined;
  const result = await open(grant.nodeUrl.trim(), {
    ...(authToken === undefined ? {} : { authToken })
  });
  if (authToken !== undefined) {
    assertNoTokenInText(JSON.stringify(freenetGrantLogSafe(grant)), authToken);
    if (result.ok === false && result.detail !== undefined) {
      assertNoTokenInText(result.detail, authToken);
    }
  }
  return result;
}

function defaultOpenWebSocket(
  url: string,
  options?: { readonly authToken?: string }
): Promise<FreenetRemoteProbeResult> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: FreenetRemoteProbeResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    let probeUrl = url;
    if (options?.authToken !== undefined) {
      // FreenetWsApi appends authToken as a query param; keep it out of logs/UI.
      const parsed = new URL(url);
      parsed.searchParams.set("authToken", options.authToken);
      probeUrl = parsed.toString();
    }

    let socket: WebSocket;
    try {
      socket = new WebSocket(probeUrl);
    } catch (error) {
      finish({
        ok: false,
        reason: "unavailable",
        detail: error instanceof Error ? error.message : String(error)
      });
      return;
    }

    const timer = setTimeout(() => {
      try {
        socket.close();
      } catch {
        /* ignore */
      }
      finish({ ok: false, reason: "timeout", detail: "WebSocket open timed out" });
    }, 4_000);

    socket.onopen = () => {
      clearTimeout(timer);
      try {
        socket.close();
      } catch {
        /* ignore */
      }
      finish({ ok: true });
    };
    socket.onerror = () => {
      clearTimeout(timer);
      finish({ ok: false, reason: "unavailable", detail: "WebSocket error" });
    };
    socket.onclose = (event) => {
      clearTimeout(timer);
      if (settled) return;
      if (event.code === 1008 || event.code === 4001 || event.code === 4401) {
        finish({ ok: false, reason: "auth-failed", detail: `close ${event.code}` });
        return;
      }
      finish({
        ok: false,
        reason: "unavailable",
        detail: `closed ${event.code}`
      });
    };
  });
}

export function freenetRemoteSessionStatusLabel(session: FreenetRemoteSession): string {
  switch (session.status) {
    case "idle":
      return "Idle";
    case "connecting":
      return "Connecting";
    case "online":
      return "Online";
    case "auth-failed":
      return "Authentication failed";
    case "unavailable":
      return "Node unavailable";
    case "reconnecting":
      return `Reconnecting (${session.reconnectAttempts})`;
    case "degraded":
      return "Degraded";
    default:
      return session.status;
  }
}

/** Log/UI dump snapshot — never includes the raw auth token. */
export function freenetRemoteSessionLogSafe(
  session: FreenetRemoteSession
): Record<string, unknown> {
  return {
    status: session.status,
    lastError: session.lastError,
    pendingWriteConfirmation: session.pendingWriteConfirmation,
    reconnectAttempts: session.reconnectAttempts,
    grant: session.grant === null ? null : freenetGrantLogSafe(session.grant)
  };
}
