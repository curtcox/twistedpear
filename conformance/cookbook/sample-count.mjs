/**
 * Prose that states how many cookbook samples there are, spelled out.
 *
 * Keep this consistency check separate from the cookbook runtime suite so the
 * large table-driven conformance file stays below its decomposition threshold.
 */
const SAMPLE_COUNT_CLAIMS = [
  "README.md",
  "authors/README.md",
  "guide/README.md",
  "docs/FAQ.md",
  "cookbook/README.md",
  "cookbook/appendix-app-index.md",
  "cookbook/02-apps-with-no-capabilities.md",
  "cookbook/09-apps-for-a-bad-link.md",
  "scripts/site/stage.mjs",
  "scripts/analysis/spelling.mjs",
];

const COUNT_WORDS = new Map([
  [20, "twenty"],
  [21, "twenty-one"],
  [22, "twenty-two"],
  [23, "twenty-three"],
  [24, "twenty-four"],
  [25, "twenty-five"],
  [26, "twenty-six"],
  [27, "twenty-seven"],
  [28, "twenty-eight"],
  [29, "twenty-nine"],
  [30, "thirty"],
]);

export function validateSampleCountProse({ appNames, repositoryRoot, expect }) {
  const expected = COUNT_WORDS.get(appNames.length);
  expect(
    expected,
    `no spelled-out word for ${appNames.length} samples; extend COUNT_WORDS`,
  ).toBeDefined();
  const stale = [appNames.length - 1, appNames.length + 1]
    .map((n) => COUNT_WORDS.get(n))
    .filter((word) => word !== undefined);

  for (const relativePath of SAMPLE_COUNT_CLAIMS) {
    const text = repositoryRoot.read(relativePath).toLowerCase();
    expect(
      text,
      `${relativePath} states the sample count as "${expected}"`,
    ).toContain(expected);
    for (const word of stale) {
      expect(
        text,
        `${relativePath} still says "${word}"; there are ${appNames.length} samples`,
      ).not.toContain(word);
    }
  }
}
