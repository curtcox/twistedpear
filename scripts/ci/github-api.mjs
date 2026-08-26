/**
 * Minimal GitHub REST client for the CI telemetry scripts.
 *
 * Deliberately dependency-free: these run in `.github/actions` composite steps
 * before `npm ci` has necessarily happened, so `@actions/*` and `octokit` are
 * not on disk.
 */
const API = process.env.GITHUB_API_URL ?? "https://api.github.com";

export function repoSlug() {
  const slug = process.env.GITHUB_REPOSITORY;
  if (!slug) throw new Error("GITHUB_REPOSITORY is not set");
  return slug;
}

export function token() {
  return process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? null;
}

/**
 * @param {string} route path under the API root, e.g. `/repos/o/r/actions/runs/1`
 * @param {{ token?: string | null, retries?: number, timeoutMs?: number }} [options]
 */
export async function get(route, options = {}) {
  const auth = options.token ?? token();
  const retries = options.retries ?? 3;
  // A fetch with no deadline does not fail, it waits — and this client runs
  // inside a job's teardown step, where a hung request would hold a runner
  // until the job timeout rather than reporting anything.
  const timeoutMs = options.timeoutMs ?? 30_000;
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    // Retrying is safe here for exactly one reason, and it is worth naming
    // rather than assuming: every route this module requests is a read. A
    // lost response can be re-requested without duplicating an effect,
    // because there is no effect.
    const idempotency = "http-get";
    try {
      const response = await fetch(`${API}${route}`, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          accept: "application/vnd.github+json",
          "x-github-api-version": "2022-11-28",
          "user-agent": `twistedpear-ci-telemetry (${idempotency})`,
          ...(auth ? { authorization: `Bearer ${auth}` } : {}),
        },
      });
      if (
        response.status === 403 ||
        response.status === 429 ||
        response.status >= 500
      ) {
        lastError = new Error(
          `${response.status} ${response.statusText} for ${route}`,
        );
        await sleep(2000 * 2 ** attempt);
        continue;
      }
      if (!response.ok) {
        throw new Error(
          `${response.status} ${response.statusText} for ${route}`,
        );
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      await sleep(2000 * 2 ** attempt);
    }
  }
  throw lastError ?? new Error(`GET ${route} failed`);
}

/** Follows `page`/`per_page` until a page comes back short. */
export async function paginate(route, key, options = {}) {
  const items = [];
  const separator = route.includes("?") ? "&" : "?";
  for (let page = 1; page <= 20; page += 1) {
    const body = await get(
      `${route}${separator}per_page=100&page=${page}`,
      options,
    );
    const batch = body?.[key] ?? [];
    items.push(...batch);
    if (batch.length < 100) break;
  }
  return items;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
