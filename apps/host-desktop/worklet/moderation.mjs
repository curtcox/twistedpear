/**
 * Desktop host moderation state: the persisted block/mute/report lists mirrored
 * to the renderer.
 */
function normalizedSourceHash(value) {
  const normalized = String(value).trim().toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(normalized)) throw new Error("LXMF source hash must be 32 hexadecimal characters");
  return normalized;
}

export function createModerationOps(deps) {
  const { state, runtime, send, moderationStoreKey: MODERATION_STORE_KEY } = deps;

  async function persistModerationState() {
    await runtime.store.set(MODERATION_STORE_KEY, new TextEncoder().encode(JSON.stringify(state.moderationState)));
  }

  function pushModerationState() {
    send({ type: "moderation-state", blocked: state.moderationState.blocked, muted: state.moderationState.muted, reports: state.moderationState.reports });
  }

  async function loadModerationState() {
    const stored = await runtime.store.get(MODERATION_STORE_KEY);
    if (stored !== undefined) {
      const parsed = JSON.parse(new TextDecoder().decode(stored));
      if (parsed.version === 1 && Array.isArray(parsed.blocked) && Array.isArray(parsed.muted) && Array.isArray(parsed.reports)) {
        state.moderationState = parsed;
      }
    }
    pushModerationState();
  }

  return { persistModerationState, pushModerationState, loadModerationState };
}

export { normalizedSourceHash };
