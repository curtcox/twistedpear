import type { HistoryRecorder } from "@twistedpear/effects/adapters/sim";
import { cellId, type CoverageCell } from "./frame.js";
import type { CampaignScenario } from "./runner.js";
import {
  productionScenario,
  type CampaignNodeState,
} from "./scenarios-production-steps.js";

export type { CampaignNodeState } from "./scenarios-production-steps.js";

export interface ProductionScenarioRegistryOptions {
  readonly cells: readonly CoverageCell[];
  /** Reviewed exclusions are reported and cannot be executed or counted as supported coverage. */
  readonly reviewedUnsupported?: Readonly<Record<string, string>>;
  readonly defectIds?: ReadonlySet<string>;
  readonly recorder?: HistoryRecorder<CampaignNodeState>;
  /** Test-only behavior knob: scales actual transport latency. */
  readonly latencyMultiplier?: number;
  /** Test-only production projection defect used to prove each global oracle end to end. */
  readonly oracleBreak?:
    "grant-coverage" | "id-uniqueness" | "revocation-monotonicity";
}

export interface ProductionScenarioRegistry {
  readonly supportedCells: readonly string[];
  readonly unsupportedCells: Readonly<Record<string, string>>;
  create(cell: CoverageCell, seed: number): CampaignScenario<CampaignNodeState>;
}

/**
 * Real scheduled-simulation registry. Every key owns an executable grant lifecycle,
 * identity-bound handshake, mediated adversary, transport topology, and global oracles.
 */
export function createProductionScenarioRegistry(
  options: ProductionScenarioRegistryOptions,
): ProductionScenarioRegistry {
  const cells = new Map(options.cells.map((cell) => [cellId(cell), cell]));
  const unsupportedCells = Object.fromEntries(
    Object.entries(options.reviewedUnsupported ?? {}).filter(
      ([id, reason]) => cells.has(id) && reason.trim().length > 0,
    ),
  );
  const supportedCells = [...cells.keys()]
    .filter((id) => unsupportedCells[id] === undefined)
    .sort();
  return {
    supportedCells,
    unsupportedCells,
    create(cell, seed) {
      const id = cellId(cell);
      if (unsupportedCells[id] !== undefined)
        throw new Error(
          `unsupported campaign scenario: ${id}: ${unsupportedCells[id]}`,
        );
      if (!cells.has(id))
        throw new Error(`unsupported campaign scenario: ${id}`);
      return productionScenario(cell, seed, {
        defectivePolicy: options.defectIds?.has(id) === true,
        ...(options.recorder === undefined
          ? {}
          : { recorder: options.recorder }),
        latencyMultiplier: options.latencyMultiplier ?? 1,
        oracleBreak: options.oracleBreak ?? null,
      });
    },
  };
}
