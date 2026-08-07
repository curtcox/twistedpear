/**
 * Shared Handbook applet expectation helpers for node / web / mobile conformance.
 */

export const HANDBOOK_PLATFORMS = ["android", "ios", "desktop", "web", "node"];

/**
 * Map applet.json expectation to the status CI should accept on a host.
 * device-gated probes report unavailable without hardware.
 */
export function expectedStatusForPlatform(applet, platform) {
  const raw = applet.expectations?.[platform];
  if (raw === "device-gated") {
    return "unavailable";
  }
  if (raw === undefined || raw === null) {
    return "pass";
  }
  return raw;
}

/**
 * @param {object} applet catalog applet entry
 * @param {string} actualStatus pass | fail | unavailable | not-granted | skipped
 * @param {string} platform android | ios | desktop | web | node
 * @param {string} [reported] the rendered result line, quoted in the failure so
 *   the applet's own `details` reaches the log instead of just its status
 */
export function assertAppletStatusMatchesExpectation(
  applet,
  actualStatus,
  platform,
  reported = "",
) {
  const expected = expectedStatusForPlatform(applet, platform);
  const acceptable = new Set([expected]);
  if (
    expected === "unavailable" &&
    applet.expectations?.[platform] === "device-gated"
  ) {
    acceptable.add("pass");
  }
  if (acceptable.has(actualStatus)) {
    return;
  }
  const because =
    reported.trim() === "" ? "" : `; reported: ${JSON.stringify(reported)}`;
  throw new Error(
    `applet ${applet.id} on ${platform}: expected ${[...acceptable].join(" or ")}, got ${actualStatus}${because}`,
  );
}

/**
 * Parse PASS / UNAVAILABLE / … from a rendered result line.
 * @param {string} resultLine
 */
export function parseResultStatus(resultLine) {
  if (resultLine.startsWith("PASS")) {
    return "pass";
  }
  if (resultLine.startsWith("FAIL")) {
    return "fail";
  }
  if (resultLine.startsWith("UNAVAILABLE")) {
    return "unavailable";
  }
  if (resultLine.startsWith("NOT-GRANTED")) {
    return "not-granted";
  }
  if (resultLine.startsWith("SKIPPED")) {
    return "skipped";
  }
  return null;
}
