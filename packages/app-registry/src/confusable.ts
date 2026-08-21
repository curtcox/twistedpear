/**
 * Fold app names so homoglyph pairs (Handbook / Hаndbook) compare equal.
 * NFKD + strip marks, then map a closed Cyrillic/Greek lookalike set to Latin.
 */
const LOOKALIKES: Readonly<Record<string, string>> = {
  а: "a",
  е: "e",
  о: "o",
  р: "p",
  с: "c",
  у: "y",
  х: "x",
  і: "i",
  ӏ: "l",
  А: "a",
  В: "b",
  Е: "e",
  К: "k",
  М: "m",
  Н: "h",
  О: "o",
  Р: "p",
  С: "c",
  Т: "t",
  Х: "x",
  Ι: "i",
  ο: "o",
  ν: "v",
  ι: "i",
  τ: "t",
  α: "a",
};

function foldAppName(name: string): string {
  const stripped = name.normalize("NFKD").replace(/\p{M}/gu, "");
  let out = "";
  for (const char of stripped) {
    out += LOOKALIKES[char] ?? char;
  }
  return out.toLowerCase();
}

export function namesAreConfusable(left: string, right: string): boolean {
  return left !== right && foldAppName(left) === foldAppName(right);
}

export function confusableAmong(
  name: string,
  others: ReadonlyArray<string>,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const other of others) {
    if (seen.has(other) || !namesAreConfusable(name, other)) continue;
    seen.add(other);
    out.push(other);
  }
  return out;
}
