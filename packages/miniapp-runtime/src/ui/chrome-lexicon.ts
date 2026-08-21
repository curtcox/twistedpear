/**
 * CHROME-R8 / CHROME-R9 — structural render oracle over the widget tree.
 * Returns a violation message or null; validate.ts throws INVALID_WIDGET.
 */
import { CAPABILITY_DEFINITIONS } from "../capabilities.js";
import type { WidgetNode, WidgetTree } from "./schema.js";

const AFFIRM_LABELS: ReadonlySet<string> = new Set(["approve", "allow"]);
const REJECT_LABELS: ReadonlySet<string> = new Set(["deny", "not now"]);

const AUTHORITY_CLAIMS: ReadonlyArray<RegExp> = [
  /twistedpear has verified/,
  /twistedpear has confirmed/,
  /verified by twistedpear/,
  /twistedpear security/,
  /trusted host chrome/,
  /host update required/,
  /update required.{0,40}approve/,
  /package and sign an app\?/,
  /publish an app to other users\?/,
  /install an app\?/,
  /trust a new publisher\?/,
  /allow a device session\?/,
  /this app needs .{0,40}permission/,
  /grant (the )?permissions?/,
];

const SECRET_SOLICITATION: ReadonlyArray<RegExp> = [
  /recovery phrase/,
  /recovery words/,
  /seed phrase/,
  /seed words/,
  /identity backup/,
  /backup phrase/,
  /type your recovery/,
  /enter your (24|twelve|12)[- ]?words/,
  /paste (this |your )?identity string/,
  /\bmnemonic\b/,
];

const STRING_PROPS = [
  "value",
  "label",
  "placeholder",
  "alt",
  "caption",
  "accessibilityLabel",
] as const;

let cachedDescriptions: ReadonlyArray<string> | undefined;

function capabilityDescriptions(): ReadonlyArray<string> {
  cachedDescriptions ??= CAPABILITY_DEFINITIONS.map((entry) =>
    normalize(entry.description),
  ).filter((text) => text.length >= 24);
  return cachedDescriptions;
}

function normalizeChromeText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalize(value: string): string {
  return normalizeChromeText(value);
}

export function chromeLexiconViolation(tree: WidgetTree): string | null {
  return visitChrome(tree.root);
}

function visitChrome(node: WidgetNode): string | null {
  const texts = collectTexts(node);
  for (const text of texts) {
    const secret = matchAny(text, SECRET_SOLICITATION);
    if (secret !== null) {
      return `CHROME-R9 secret solicitation: ${secret}`;
    }
    const claim = matchAny(text, AUTHORITY_CLAIMS);
    if (claim !== null) {
      return `CHROME-R8 reserved lexicon: ${claim}`;
    }
    for (const description of capabilityDescriptions()) {
      if (text.includes(description)) {
        return "CHROME-R8 reserved lexicon: canonical capability description";
      }
    }
  }
  if (imitatesGrantScreen(node)) {
    return "CHROME-R8 reserved lexicon: grant-screen layout";
  }
  for (const child of node.children ?? []) {
    const nested = visitChrome(child);
    if (nested !== null) return nested;
  }
  return null;
}

function matchAny(
  text: string,
  patterns: ReadonlyArray<RegExp>,
): string | null {
  for (const pattern of patterns) {
    const hit = text.match(pattern);
    if (hit !== null) return hit[0];
  }
  return null;
}

function collectTexts(node: WidgetNode): string[] {
  const texts: string[] = [];
  const props = node.props ?? {};
  for (const key of STRING_PROPS) {
    const value = props[key];
    if (typeof value === "string" && value.length > 0) {
      texts.push(normalize(value));
    }
  }
  if (Array.isArray(props.items)) {
    for (const item of props.items) {
      if (typeof item === "string" && item.length > 0) {
        texts.push(normalize(item));
      }
    }
  }
  return texts;
}

function imitatesGrantScreen(node: WidgetNode): boolean {
  const labels = (node.children ?? [])
    .filter((child) => child.type === "button")
    .map((child) =>
      typeof child.props?.label === "string"
        ? normalize(child.props.label)
        : "",
    )
    .filter((label) => label.length > 0);
  const hasAffirm = labels.some((label) => AFFIRM_LABELS.has(label));
  const hasReject = labels.some((label) => REJECT_LABELS.has(label));
  return hasAffirm && hasReject;
}
