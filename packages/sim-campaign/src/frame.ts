import { CAPABILITY_DEFINITIONS, type MiniappCapability } from "@twistedpear/miniapp-runtime";

export type AttackerPosition =
  | "malicious-app"
  | "malicious-peer"
  | "malicious-relay"
  | "colluding-pair"
  | "compromised-host";

export type AbuseVerb = "exfiltrate" | "spoof" | "deny" | "drain" | "correlate";
export type ThreatTaxonomy = "STRIDE" | "LINDDUN";

export interface AbuseDefinition {
  readonly verb: AbuseVerb;
  readonly mappings: readonly { readonly taxonomy: ThreatTaxonomy; readonly category: string }[];
}

export interface CoverageCell {
  readonly capability: MiniappCapability;
  readonly position: AttackerPosition;
  readonly abuse: AbuseDefinition;
}

/** The production manifest validator is the source of this axis. */
export const CAPABILITIES = CAPABILITY_DEFINITIONS.map((definition) => definition.id);

export const ATTACKER_POSITIONS: readonly AttackerPosition[] = [
  "malicious-app",
  "malicious-peer",
  "malicious-relay",
  "colluding-pair",
  "compromised-host"
];

export const ABUSE_VERBS: readonly AbuseDefinition[] = [
  { verb: "exfiltrate", mappings: [{ taxonomy: "STRIDE", category: "Information Disclosure" }, { taxonomy: "LINDDUN", category: "Disclosure of Information" }] },
  { verb: "spoof", mappings: [{ taxonomy: "STRIDE", category: "Spoofing" }, { taxonomy: "LINDDUN", category: "Non-repudiation" }] },
  { verb: "deny", mappings: [{ taxonomy: "STRIDE", category: "Denial of Service" }, { taxonomy: "LINDDUN", category: "Unawareness" }] },
  { verb: "drain", mappings: [{ taxonomy: "STRIDE", category: "Denial of Service" }] },
  { verb: "correlate", mappings: [{ taxonomy: "LINDDUN", category: "Linkability" }, { taxonomy: "LINDDUN", category: "Detectability" }] }
];

export function coverageFrame(options: {
  readonly capabilities?: readonly MiniappCapability[];
  readonly positions?: readonly AttackerPosition[];
  readonly verbs?: readonly AbuseVerb[];
} = {}): readonly CoverageCell[] {
  const capabilities = options.capabilities ?? CAPABILITIES;
  const positions = options.positions ?? ATTACKER_POSITIONS;
  const verbs = options.verbs === undefined
    ? ABUSE_VERBS
    : ABUSE_VERBS.filter((definition) => options.verbs!.includes(definition.verb));
  return capabilities.flatMap((capability) =>
    positions.flatMap((position) =>
      verbs.map((abuse) => ({ capability, position, abuse }))
    )
  );
}

export function cellId(cell: CoverageCell): string {
  return `${cell.capability}|${cell.position}|${cell.abuse.verb}`;
}
