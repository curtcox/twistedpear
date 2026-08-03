// @ts-nocheck
const TP_DOC_RE =
  /<!--\s*tp-doc\s*\n([\s\S]*?)\n\s*-->/;

const LIFECYCLES = new Set([
  "live",
  "planned",
  "historical",
  "reference",
  "generated"
]);

const REGISTERS = new Set([
  "complete",
  "software",
  "hardware",
  "release",
  "none"
]);

/**
 * @param {string} text
 * @returns {{ lifecycle: string; audited: string; register: string } | null}
 */
export function parseTpDoc(text) {
  const head = text.split("\n").slice(0, 25).join("\n");
  const m = head.match(TP_DOC_RE);
  if (!m) return null;
  /** @type {Record<string, string>} */
  const fields = {};
  for (const line of m[1].split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    fields[key] = value;
  }
  if (!fields.lifecycle || !fields.audited || !fields.register) return null;
  return {
    lifecycle: fields.lifecycle,
    audited: fields.audited,
    register: fields.register,
    ...(fields.counterpart ? { counterpart: fields.counterpart } : {})
  };
}

/**
 * @param {{ lifecycle: string; audited: string; register: string }} meta
 */
export function formatTpDoc(meta) {
  const counterpart = meta.counterpart ? `\ncounterpart: ${meta.counterpart}` : "";
  return `<!-- tp-doc
lifecycle: ${meta.lifecycle}
audited: ${meta.audited}
register: ${meta.register}${counterpart}
-->`;
}

/**
 * @param {{ lifecycle: string; audited: string; register: string }} meta
 * @returns {string[]}
 */
export function validateTpDoc(meta) {
  const errors = [];
  if (!LIFECYCLES.has(meta.lifecycle)) {
    errors.push(`invalid lifecycle: ${meta.lifecycle}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.audited)) {
    errors.push(`invalid audited date: ${meta.audited}`);
  }
  if (!REGISTERS.has(meta.register)) {
    errors.push(`invalid register: ${meta.register}`);
  }
  return errors;
}

/**
 * Insert or replace tp-doc block immediately after the first markdown title line.
 *
 * @param {string} text
 * @param {{ lifecycle: string; audited: string; register: string }} meta
 */
export function ensureTpDocBlock(text, meta) {
  const block = formatTpDoc(meta);
  const existing = parseTpDoc(text);
  if (existing) {
    return text.replace(TP_DOC_RE, block);
  }
  const lines = text.split("\n");
  let insertAt = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("#")) {
      insertAt = i + 1;
      break;
    }
  }
  while (insertAt < lines.length && lines[insertAt].trim() === "") {
    insertAt++;
  }
  const before = lines.slice(0, insertAt);
  const after = lines.slice(insertAt);
  return [...before, "", block, "", ...after].join("\n");
}

export { LIFECYCLES, REGISTERS, TP_DOC_RE };
