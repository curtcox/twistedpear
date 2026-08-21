/**
 * Client-safe incremental search for the documentation sample catalog.
 * Tokens are whitespace-separated; every token must match the haystack.
 *
 * @param {string} haystack
 * @param {string} query
 * @returns {boolean}
 */
export function matchesQuery(haystack, query) {
  const text = haystack.toLowerCase();
  for (const token of query.toLowerCase().trim().split(/\s+/)) {
    if (token !== "" && !text.includes(token)) return false;
  }
  return true;
}
