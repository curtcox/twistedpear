import { Xoshiro128StarStar } from "@twistedpear/effects/adapters/sim";

export interface CompletenessEstimate {
  /** Conservative canary-detection floor. */
  readonly floor: number;
  readonly confidence95: readonly [number, number];
  readonly canaries: number;
  readonly recaptured: number;
  readonly captureRecapturePopulation: number | null;
}

/** Deterministically choose canary ids without perturbing any scenario PRNG. */
export function injectCanaries(population: readonly string[], count: number, seed: number): readonly string[] {
  const available = [...new Set(population)].sort();
  const rng = new Xoshiro128StarStar(seed >>> 0);
  const selected: string[] = [];
  while (selected.length < Math.min(available.length, Math.max(0, Math.floor(count)))) {
    const index = rng.randomBytes(4)[0]! % available.length;
    selected.push(available.splice(index, 1)[0]!);
  }
  return selected;
}

export function estimateCompleteness(options: {
  readonly canaryIds: readonly string[];
  readonly firstCapture: ReadonlySet<string>;
  readonly secondCapture: ReadonlySet<string>;
}): CompletenessEstimate {
  const canaries = new Set(options.canaryIds);
  const recaptured = [...canaries].filter((id) => options.firstCapture.has(id) || options.secondCapture.has(id)).length;
  const [low, high] = wilson(recaptured, canaries.size);
  const overlap = [...options.firstCapture].filter((id) => options.secondCapture.has(id)).length;
  const population = options.firstCapture.size === 0 || options.secondCapture.size === 0
    ? null
    : ((options.firstCapture.size + 1) * (options.secondCapture.size + 1) / (overlap + 1)) - 1;
  return {
    floor: low,
    confidence95: [low, high],
    canaries: canaries.size,
    recaptured,
    captureRecapturePopulation: population
  };
}

function wilson(successes: number, total: number): [number, number] {
  if (total === 0) return [0, 1];
  const z = 1.96;
  const p = successes / total;
  const denominator = 1 + z * z / total;
  const center = (p + z * z / (2 * total)) / denominator;
  const margin = z * Math.sqrt((p * (1 - p) + z * z / (4 * total)) / total) / denominator;
  return [Math.max(0, center - margin), Math.min(1, center + margin)];
}
