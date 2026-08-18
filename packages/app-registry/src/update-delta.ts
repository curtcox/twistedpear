/** Capability delta between an installed version and an update. */

export interface NamedCapabilityDelta {
  readonly id: string;
  readonly riskClass: string;
}

export interface CapabilityUpdateDelta {
  readonly added: ReadonlyArray<NamedCapabilityDelta>;
  readonly removed: ReadonlyArray<NamedCapabilityDelta>;
  readonly retained: ReadonlyArray<string>;
}

function unique(ids: ReadonlyArray<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function named(
  ids: ReadonlyArray<string>,
  riskClassFor: (id: string) => string,
): NamedCapabilityDelta[] {
  return ids.map((id) => ({ id, riskClass: riskClassFor(id) }));
}

/**
 * Compare the signed capability lists of two versions of the same app.
 * Newly declared capabilities are named with their risk class and are never
 * implied to be granted.
 */
export function capabilityUpdateDelta(
  previousDeclared: ReadonlyArray<string>,
  nextDeclared: ReadonlyArray<string>,
  riskClassFor: (id: string) => string,
): CapabilityUpdateDelta {
  const previous = unique(previousDeclared);
  const next = unique(nextDeclared);
  const previousSet = new Set(previous);
  const nextSet = new Set(next);
  const added = next.filter((id) => !previousSet.has(id));
  const removed = previous.filter((id) => !nextSet.has(id));
  const retained = next.filter((id) => previousSet.has(id));
  return {
    added: named(added, riskClassFor),
    removed: named(removed, riskClassFor),
    retained,
  };
}

/**
 * Grants that survive an update: still declared, never newly added.
 * An update that introduces a capability does not auto-activate it.
 */
export function grantsPreservedAcrossUpdate(
  previouslyGranted: ReadonlyArray<string>,
  nextDeclared: ReadonlyArray<string>,
): string[] {
  const declared = new Set(nextDeclared);
  return unique(previouslyGranted).filter((id) => declared.has(id));
}
