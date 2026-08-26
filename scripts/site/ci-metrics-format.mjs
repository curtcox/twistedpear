/**
 * Shared formatting for the CI cost report.
 *
 * Durations are shown in minutes almost everywhere: the report exists to find
 * work worth tens of minutes, and seconds-precision on a 40-minute job is
 * noise that makes the tables harder to scan.
 */

export function minutes(msValue, digits = 1) {
  if (msValue == null || Number.isNaN(msValue)) return "—";
  const value = msValue / 60000;
  if (value < 0.1) return `${(msValue / 1000).toFixed(1)} s`;
  return `${value.toFixed(digits)} min`;
}

export function hours(msValue) {
  if (msValue == null) return "—";
  const value = msValue / 3_600_000;
  return value >= 1 ? `${value.toFixed(1)} h` : minutes(msValue);
}

export function bytes(value) {
  if (value == null || Number.isNaN(value)) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let scaled = Math.abs(value);
  let unit = 0;
  while (scaled >= 1024 && unit < units.length - 1) {
    scaled /= 1024;
    unit += 1;
  }
  return `${value < 0 ? "-" : ""}${scaled.toFixed(scaled >= 100 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function percent(value, digits = 0) {
  return value == null || Number.isNaN(value) ? "—" : `${Number(value).toFixed(digits)}%`;
}

export function escapeMd(value) {
  return String(value ?? "").replaceAll("\\", "\\\\").replaceAll("|", "\\|");
}

export function shortSha(sha) {
  return sha ? String(sha).slice(0, 7) : "unknown";
}

export function conclusionBadge(conclusion) {
  if (conclusion === "success") return "✅";
  if (conclusion === "skipped") return "⏭️";
  if (conclusion == null) return "—";
  return "❌";
}

export function ago(iso, now = Date.now()) {
  if (!iso) return "unknown";
  const delta = now - Date.parse(iso);
  if (!Number.isFinite(delta)) return "unknown";
  const hoursAgo = delta / 3_600_000;
  if (hoursAgo < 1) return `${Math.max(1, Math.round(delta / 60000))} min ago`;
  if (hoursAgo < 48) return `${Math.round(hoursAgo)} h ago`;
  return `${Math.round(hoursAgo / 24)} days ago`;
}
