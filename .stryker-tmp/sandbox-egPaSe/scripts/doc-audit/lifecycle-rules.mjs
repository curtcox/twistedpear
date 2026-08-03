/**
 * Default tp-doc metadata for tracked markdown paths (relative to repo root).
 *
 * @param {string} relPath POSIX path
 * @returns {{ lifecycle: string; audited: string; register: string }}
 */
// @ts-nocheck

export function defaultTpDocForPath(relPath) {
  const register = registerForPath(relPath);
  const lifecycle = lifecycleForPath(relPath);
  const audited = auditedForPath(relPath, lifecycle);
  return { lifecycle, audited, register };
}

/** @param {string} relPath */
function registerForPath(relPath) {
  if (relPath === "STATUS-COMPLETE.md") return "complete";
  if (relPath === "STATUS-SOFTWARE.md") return "software";
  if (relPath === "STATUS-HARDWARE.md") return "hardware";
  if (relPath === "RELEASE-PLAN.md") return "release";
  return "none";
}

/** @param {string} relPath */
function lifecycleForPath(relPath) {
  if (relPath.startsWith("archive/")) return "historical";
  if (relPath === "RELEASE-PLAN.md") return "planned";
  // `docs/<topic>-plan.md` is the planned half of a live/planned pair; the live half is
  // `docs/<topic>.md`. See docs/README.md, "How to tell current from planned".
  if (/-plan\.md$/.test(relPath)) return "planned";
  if (
    relPath === "README.md" ||
    relPath === "STATUS-COMPLETE.md" ||
    relPath === "STATUS-SOFTWARE.md" ||
    relPath === "STATUS-HARDWARE.md" ||
    relPath === "docs/README.md" ||
    relPath === "specs/README.md" ||
    relPath.startsWith("specs/spec-") ||
    relPath.startsWith("apps/handbook/content/")
  ) {
    return "live";
  }
  return "reference";
}

/** @param {string} relPath @param {string} lifecycle */
function auditedForPath(relPath, lifecycle) {
  if (relPath === "STATUS-COMPLETE.md") return "2026-07-19";
  if (relPath === "STATUS-SOFTWARE.md" || relPath === "STATUS-HARDWARE.md") {
    return "2026-07-16";
  }
  if (relPath === "RELEASE-PLAN.md") return "2026-07-18";
  if (relPath === "README.md" || relPath === "docs/README.md") return "2026-07-19";
  if (relPath.startsWith("specs/")) return "2026-07-20";
  if (lifecycle === "historical") return "2026-07-20";
  if (relPath.startsWith("apps/handbook/content/")) return "2026-07-10";
  return "2026-07-20";
}
