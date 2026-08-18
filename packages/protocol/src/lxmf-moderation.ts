export type LxmfModerationDisposition = "allow" | "mute" | "block";

export interface LxmfModerationState {
  readonly blocked: ReadonlySet<string>;
  readonly muted: ReadonlySet<string>;
  readonly blockedApps?: ReadonlySet<string>;
}

export interface LxmfModerationDecision {
  readonly disposition: LxmfModerationDisposition;
  readonly deliver: boolean;
  readonly notify: boolean;
}

export function decideLxmfModeration(
  state: LxmfModerationState,
  sourceHashHex: string,
  appId?: string,
): LxmfModerationDecision {
  if (appId !== undefined && state.blockedApps?.has(appId) === true) {
    return { disposition: "block", deliver: false, notify: false };
  }
  const normalized = sourceHashHex.toLowerCase();
  if (state.blocked.has(normalized))
    return { disposition: "block", deliver: false, notify: false };
  if (state.muted.has(normalized))
    return { disposition: "mute", deliver: true, notify: false };
  return { disposition: "allow", deliver: true, notify: true };
}
