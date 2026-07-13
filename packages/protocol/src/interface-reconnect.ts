/**
 * Pure interface reconnect scheduling decisions.
 * Socket connect / timer arming stay at the adapter edge.
 */

export const INTERFACE_RECONNECT_WAIT_MS = 5_000;

export type InterfaceReconnectPlan =
  | { readonly kind: "reconnect"; readonly delayMs: number; readonly attempt: number }
  | { readonly kind: "give-up"; readonly attempt: number };

export function planInterfaceReconnect(input: {
  readonly attempts: number;
  readonly maxTries?: number | null;
  readonly waitMs?: number;
}): InterfaceReconnectPlan {
  const attempt = input.attempts + 1;
  const maxTries = input.maxTries ?? null;
  if (maxTries !== null && attempt > maxTries) {
    return { kind: "give-up", attempt };
  }
  return {
    kind: "reconnect",
    delayMs: input.waitMs ?? INTERFACE_RECONNECT_WAIT_MS,
    attempt
  };
}
