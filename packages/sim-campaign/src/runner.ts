import {
  OracleViolation,
  SimKernel,
  shrinkHistoryWithConfig,
  type SimKernelConfig,
  type Violation
} from "@twistedpear/effects/adapters/sim";
import { cellId, type CoverageCell } from "./frame.js";
import {
  ContainmentTracker,
  summarizeContainment,
  type ContainmentMetrics,
  type ContainmentSummary
} from "./metrics.js";

export interface SeedRange {
  readonly from: number;
  readonly to: number;
}

export interface CampaignScenario<S> {
  readonly config: SimKernelConfig<S>;
  readonly run?: (kernel: SimKernel<S>) => void;
  readonly containment?: ContainmentTracker;
  /** Derive containment exclusively from state produced by virtual-time events. */
  readonly measureContainment?: (kernel: SimKernel<S>) => ContainmentMetrics;
  readonly expectedCanaryOracles?: readonly string[];
  readonly description?: ScenarioDescription;
}

export type ScenarioFactory<S> = (cell: CoverageCell, seed: number) => CampaignScenario<S>;

export interface CampaignFinding {
  readonly cell: string;
  readonly seed: number;
  readonly kind: "violation" | "canary";
  readonly violation: Violation;
  readonly historyPath?: string;
}

export interface ScenarioDescription {
  readonly name: string;
  readonly protocolMachines: readonly string[];
  readonly adversaryPowers: readonly string[];
  readonly transport: string;
}

export interface ScenarioCoverage extends ScenarioDescription {
  readonly cell: string;
}

export interface SaturationPoint {
  readonly scenarios: number;
  readonly distinctFindings: number;
  readonly newFindings: number;
}

export interface CampaignReport {
  readonly schema: "twistedpear.campaign-v1";
  readonly seeds: SeedRange;
  readonly cells: readonly string[];
  readonly scenariosRun: number;
  readonly coverage: readonly ScenarioCoverage[];
  readonly findings: readonly CampaignFinding[];
  readonly canaryFindings: readonly CampaignFinding[];
  readonly saturation: readonly SaturationPoint[];
  readonly containment: readonly ContainmentSummary[];
}

export async function runCampaign<S>(options: {
  readonly cells: readonly CoverageCell[];
  readonly seeds: SeedRange;
  readonly scenario: ScenarioFactory<S>;
  readonly parallelism?: number;
}): Promise<CampaignReport> {
  if (!Number.isSafeInteger(options.seeds.from) || !Number.isSafeInteger(options.seeds.to) || options.seeds.to < options.seeds.from) {
    throw new Error("invalid campaign seed range");
  }
  const jobs = options.cells.flatMap((cell) =>
    Array.from({ length: options.seeds.to - options.seeds.from + 1 }, (_, index) => ({
      cell,
      seed: options.seeds.from + index
    }))
  );
  const parallelism = Math.max(1, Math.floor(options.parallelism ?? 1));
  const findings: CampaignFinding[] = [];
  const canaryFindings: CampaignFinding[] = [];
  const coverage = new Map<string, ScenarioCoverage>();
  const findingKeys = new Set<string>();
  const saturation: SaturationPoint[] = [];
  const containment: ContainmentMetrics[] = [];
  let previousDistinct = 0;

  for (let offset = 0; offset < jobs.length; offset += parallelism) {
    const batch = jobs.slice(offset, offset + parallelism);
    const results = await Promise.all(batch.map(async ({ cell, seed }) => runOne(cell, seed, options.scenario)));
    for (const result of results) {
      containment.push(result.containment);
      if (result.description !== undefined) coverage.set(result.description.cell, result.description);
      if (result.finding !== null) {
        if (result.finding.kind === "canary") canaryFindings.push(result.finding);
        else findings.push(result.finding);
        findingKeys.add(`${result.finding.violation.oracle}\u0000${result.finding.violation.message}`);
      }
    }
    const completed = Math.min(offset + batch.length, jobs.length);
    if (completed % 1_000 === 0 || completed === jobs.length) {
      saturation.push({
        scenarios: completed,
        distinctFindings: findingKeys.size,
        newFindings: findingKeys.size - previousDistinct
      });
      previousDistinct = findingKeys.size;
    }
  }

  return {
    schema: "twistedpear.campaign-v1",
    seeds: options.seeds,
    cells: options.cells.map(cellId),
    scenariosRun: jobs.length,
    coverage: [...coverage.values()].sort((a, b) => a.cell.localeCompare(b.cell)),
    findings,
    canaryFindings,
    saturation,
    containment: summarizeContainment(containment)
  };
}

export function serializeCampaignReport(report: CampaignReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

async function runOne<S>(
  cell: CoverageCell,
  seed: number,
  factory: ScenarioFactory<S>
): Promise<{
  readonly finding: CampaignFinding | null;
  readonly containment: ContainmentMetrics;
  readonly description?: ScenarioCoverage;
}> {
  const scenario = factory(cell, seed);
  const kernel = new SimKernel({ ...scenario.config, seed });
  const description = scenario.description === undefined
    ? undefined
    : { cell: cellId(cell), ...scenario.description };
  const containment = (): ContainmentMetrics => scenario.measureContainment?.(kernel) ??
    scenario.containment?.snapshot() ?? new ContainmentTracker().snapshot();
  try {
    if (scenario.run === undefined) {
      kernel.start();
      kernel.runUntilIdle(1_000_000);
    } else {
      scenario.run(kernel);
    }
    return {
      finding: null,
      containment: containment(),
      ...(description === undefined ? {} : { description })
    };
  } catch (error) {
    if (!(error instanceof OracleViolation)) throw error;
    const minimized = shrinkHistoryWithConfig(error.history, { ...scenario.config, seed });
    const minimizedPath = scenario.config.recorder?.record(minimized);
    const historyPath = minimizedPath ?? error.historyPath;
    return {
      finding: {
        cell: cellId(cell),
        seed,
        kind: scenario.expectedCanaryOracles?.includes(error.violation.oracle) === true ? "canary" : "violation",
        violation: error.violation,
        ...(historyPath === undefined ? {} : { historyPath })
      },
      containment: containment(),
      ...(description === undefined ? {} : { description })
    };
  }
}
