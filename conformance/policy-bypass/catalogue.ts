/**
 * The bypass catalogue of `docs/user-policy-plan.md` §9.3, as data.
 *
 * The table there is the specification of this suite; `catalogue.test.ts`
 * parses it out of the document and checks that this list still matches it and
 * that every entry has a test somewhere in this directory. A row nobody
 * attacked is the failure mode a policy language dies of.
 */
export type BypassEntry = {
  readonly id: string;
  readonly attack: string;
};

export const BYPASS_CATALOGUE: readonly BypassEntry[] = [
  { id: "B1", attack: "Gate self-removal" },
  { id: "B2", attack: "Ladder" },
  { id: "B3", attack: "Evidence starvation" },
  { id: "B4", attack: "Clock attack" },
  { id: "B5", attack: "Approval replay" },
  { id: "B6", attack: "Approver substitution" },
  { id: "B7", attack: "Sibling laundering" },
  { id: "B8", attack: "Backup laundering" },
  { id: "B9", attack: "Disk tamper and rollback" },
  { id: "B10", attack: "App-initiated amendment" },
  { id: "B11", attack: "Host downgrade" },
  { id: "B12", attack: "Adapter substitution" },
  { id: "B13", attack: "Collapse laddering" },
  { id: "B14", attack: "Self-lockout" },
];
