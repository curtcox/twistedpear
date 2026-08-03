/**
 * Periodic status push timer. `onTick` is the per-host pushStatus body.
 */
// @ts-nocheck

export function createStatusTimer(options) {
  const onTick = options.onTick;
  const intervalMs = options.intervalMs ?? 1_000;
  let timer = null;

  function start() {
    if (timer !== null) {
      return;
    }
    timer = setInterval(onTick, intervalMs);
  }

  function stop() {
    if (timer === null) {
      return;
    }
    clearInterval(timer);
    timer = null;
  }

  function isRunning() {
    return timer !== null;
  }

  return { start, stop, isRunning };
}
