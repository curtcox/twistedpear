/** Shared helpers for SPEC-DEVICE registry generators. */

export function capabilityId(classId, suffix) {
  return suffix === null || suffix === undefined
    ? `device:${classId}`
    : `device:${classId}:${suffix}`;
}

export function formatBps(value) {
  if (value >= 1_000_000) return `${value / 1_000_000} Mbps`;
  if (value >= 1_000) return `${value / 1_000} kbps`;
  return `${value} bps`;
}
