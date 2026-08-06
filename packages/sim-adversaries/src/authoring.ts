import type {
  DolevYaoPower,
  TransportAdversaryAction,
} from "@twistedpear/effects";
import {
  compileAttackProposal,
  type AttackProposal,
  type CompiledAdversary,
} from "./adversary.js";

export interface AttackAuthoringContext {
  readonly objective: string;
  readonly allowedPowers: readonly DolevYaoPower[];
  readonly nodes: readonly string[];
  readonly channels: readonly string[];
  readonly maxProposals?: number;
}

export interface AttackAuthoringResult {
  readonly accepted: readonly CompiledAdversary[];
  readonly rejected: readonly {
    readonly index: number;
    readonly reason: string;
  }[];
  readonly rawResponse: string;
}

export type StrategyModel = (prompt: string) => Promise<string>;

/** Put a model in the authoring loop; only compiler-approved strategies leave it. */
export async function authorAttackStrategies(
  model: StrategyModel,
  context: AttackAuthoringContext,
): Promise<AttackAuthoringResult> {
  const rawResponse = await model(authoringPrompt(context));
  let candidates: unknown;
  try {
    candidates = JSON.parse(rawResponse);
  } catch {
    throw new Error("strategy model returned invalid JSON");
  }
  // JSON-constrained local model runners sometimes return the single requested
  // proposal directly. Treat that as a one-element response while preserving
  // the same strict proposal validation and compiler power checks.
  if (
    isRecord(candidates) &&
    typeof candidates.name === "string" &&
    Array.isArray(candidates.actions)
  ) {
    candidates = [candidates];
  }
  if (!Array.isArray(candidates))
    throw new Error(
      "strategy model response must be an array or proposal object",
    );
  const accepted: CompiledAdversary[] = [];
  const rejected: Array<{ index: number; reason: string }> = [];
  for (const [index, candidate] of candidates
    .slice(0, context.maxProposals ?? 16)
    .entries()) {
    try {
      accepted.push(
        compileAttackProposal(parseProposal(candidate), context.allowedPowers),
      );
    } catch (error) {
      rejected.push({
        index,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { accepted, rejected, rawResponse };
}

export function authoringPrompt(context: AttackAuthoringContext): string {
  return JSON.stringify({
    role: "deterministic abuse-strategy author",
    objective: context.objective,
    constraints: {
      allowedPowers: context.allowedPowers,
      nodes: context.nodes,
      channels: context.channels,
      output:
        "JSON array only; each item has name and actions; action has power, source, destination, optional channel, optional payloadHex, optional delayMs",
    },
  });
}

function parseProposal(value: unknown): AttackProposal {
  if (
    !isRecord(value) ||
    typeof value.name !== "string" ||
    !Array.isArray(value.actions)
  )
    throw new Error("proposal has invalid shape");
  return {
    name: value.name,
    actions: value.actions.map((action): TransportAdversaryAction => {
      if (
        !isRecord(action) ||
        typeof action.power !== "string" ||
        typeof action.source !== "string" ||
        typeof action.destination !== "string"
      )
        throw new Error("proposal action has invalid shape");
      if (action.power === "inject") {
        if (typeof action.channel !== "string")
          throw new Error("inject action needs a channel");
        const payload = hexBytes(action.payloadHex);
        return {
          power: "inject",
          source: action.source,
          destination: action.destination,
          channel: action.channel,
          payload,
          ...(typeof action.delayMs === "number" &&
          Number.isFinite(action.delayMs)
            ? { delayMs: action.delayMs }
            : {}),
        };
      }
      if (action.power === "delay") {
        if (
          typeof action.delayMs !== "number" ||
          !Number.isFinite(action.delayMs)
        )
          throw new Error("delay action needs delayMs");
        return {
          power: "delay",
          source: action.source,
          destination: action.destination,
          delayMs: action.delayMs,
        };
      }
      if (
        action.power === "drop" ||
        action.power === "reorder" ||
        action.power === "duplicate"
      )
        return {
          power: action.power,
          source: action.source,
          destination: action.destination,
        };
      throw new Error(`unknown adversary power: ${action.power}`);
    }),
  };
}

function hexBytes(value: unknown): Uint8Array {
  if (
    typeof value !== "string" ||
    value.length % 2 !== 0 ||
    /[^0-9a-f]/i.test(value)
  )
    throw new Error("payloadHex must be even-length hexadecimal");
  return Uint8Array.from({ length: value.length / 2 }, (_, index) =>
    Number.parseInt(value.slice(index * 2, index * 2 + 2), 16),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
