import { interpret, type EventClass, type Machine } from "@twistedpear/effects";

export type GrantParserPhase =
  | "expect-open"
  | "expect-appId-key" | "expect-appId-colon" | "expect-appId"
  | "expect-publisher-comma" | "expect-publisher-key" | "expect-publisher-colon" | "expect-publisher"
  | "expect-granted-comma" | "expect-granted-key" | "expect-granted-colon" | "expect-array-open"
  | "expect-capability-or-end" | "expect-capability-comma-or-end" | "expect-capability"
  | "expect-updated-comma" | "expect-updated-key" | "expect-updated-colon" | "expect-updated"
  | "expect-close" | "expect-eof" | "accept";

export type GrantParserToken =
  | { readonly kind: "open" | "close" | "colon" | "comma" | "array-open" | "array-close" | "eof" }
  | { readonly kind: "string"; readonly value: string }
  | { readonly kind: "integer"; readonly value: number };

export interface GrantParserState {
  readonly phase: GrantParserPhase;
  readonly appId?: string;
  readonly publisherPublicKey?: string;
  readonly granted: readonly string[];
  readonly updatedAt?: number;
}

const token = <K extends GrantParserToken["kind"]>(kind: K): EventClass<GrantParserToken> => ({
  name: kind,
  matches: (event) => event.kind === kind
});

export const grantParserTokenClasses = {
  open: token("open"), close: token("close"), colon: token("colon"), comma: token("comma"),
  arrayOpen: token("array-open"), arrayClose: token("array-close"), string: token("string"),
  integer: token("integer"), eof: token("eof")
} as const;

const t = grantParserTokenClasses;
const stringIs = (expected: string) => (_state: GrantParserState, event: GrantParserToken): boolean =>
  event.kind === "string" && event.value === expected;
const captureString = (field: "appId" | "publisherPublicKey") =>
  (state: GrantParserState, event: GrantParserToken): GrantParserState =>
    event.kind === "string" ? { ...state, [field]: event.value } : state;
const addCapability = (state: GrantParserState, event: GrantParserToken): GrantParserState =>
  event.kind === "string" ? { ...state, granted: [...state.granted, event.value] } : state;

export const grantParserMachine: Machine<GrantParserState, GrantParserToken> = {
  states: [
    "expect-open", "expect-appId-key", "expect-appId-colon", "expect-appId",
    "expect-publisher-comma", "expect-publisher-key", "expect-publisher-colon", "expect-publisher",
    "expect-granted-comma", "expect-granted-key", "expect-granted-colon", "expect-array-open",
    "expect-capability-or-end", "expect-capability-comma-or-end", "expect-capability",
    "expect-updated-comma", "expect-updated-key", "expect-updated-colon", "expect-updated",
    "expect-close", "expect-eof", "accept"
  ],
  events: [t.open, t.close, t.colon, t.comma, t.arrayOpen, t.arrayClose, t.string, t.integer, t.eof],
  initial: "expect-open",
  stateOf: (state) => state.phase,
  withState: (state, phase) => ({ ...state, phase: phase as GrantParserPhase }),
  table: [
    { from: "expect-open", on: t.open, to: "expect-appId-key" },
    { from: "expect-appId-key", on: t.string, to: "expect-appId-colon", guard: stringIs("appId") },
    { from: "expect-appId-colon", on: t.colon, to: "expect-appId" },
    { from: "expect-appId", on: t.string, to: "expect-publisher-comma", reduce: captureString("appId") },
    { from: "expect-publisher-comma", on: t.comma, to: "expect-publisher-key" },
    { from: "expect-publisher-key", on: t.string, to: "expect-publisher-colon", guard: stringIs("publisherPublicKey") },
    { from: "expect-publisher-colon", on: t.colon, to: "expect-publisher" },
    { from: "expect-publisher", on: t.string, to: "expect-granted-comma", reduce: captureString("publisherPublicKey") },
    { from: "expect-granted-comma", on: t.comma, to: "expect-granted-key" },
    { from: "expect-granted-key", on: t.string, to: "expect-granted-colon", guard: stringIs("granted") },
    { from: "expect-granted-colon", on: t.colon, to: "expect-array-open" },
    { from: "expect-array-open", on: t.arrayOpen, to: "expect-capability-or-end" },
    { from: "expect-capability-or-end", on: t.arrayClose, to: "expect-updated-comma" },
    { from: "expect-capability-or-end", on: t.string, to: "expect-capability-comma-or-end", reduce: addCapability },
    { from: "expect-capability-comma-or-end", on: t.arrayClose, to: "expect-updated-comma" },
    { from: "expect-capability-comma-or-end", on: t.comma, to: "expect-capability" },
    { from: "expect-capability", on: t.string, to: "expect-capability-comma-or-end", reduce: addCapability },
    { from: "expect-updated-comma", on: t.comma, to: "expect-updated-key" },
    { from: "expect-updated-key", on: t.string, to: "expect-updated-colon", guard: stringIs("updatedAt") },
    { from: "expect-updated-colon", on: t.colon, to: "expect-updated" },
    { from: "expect-updated", on: t.integer, to: "expect-close", reduce: (state, event) =>
      event.kind === "integer" ? { ...state, updatedAt: event.value } : state },
    { from: "expect-close", on: t.close, to: "expect-eof" },
    { from: "expect-eof", on: t.eof, to: "accept" }
  ]
};

export const stepGrantParser = interpret(grantParserMachine);

export function initialGrantParserState(): GrantParserState {
  return { phase: "expect-open", granted: [] };
}
