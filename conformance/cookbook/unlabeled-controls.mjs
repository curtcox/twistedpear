/**
 * Cookbook unlabeled-control findings for the AX-5 ratchet.
 *
 * Rejection-tier types (switch, slider, select, date) with no accessibilityLabel
 * count, as do text-inputs whose only name is a placeholder, views that handle an
 * event with no name, and large text with no heading.
 */
const NAMED_CONTROLS = new Set(["switch", "slider", "select", "date"]);
const LARGE_TEXT = new Set([24, 32]);

/**
 * @param {unknown} node
 * @returns {boolean}
 */
function isFinding(node) {
  if (node === null || typeof node !== "object") return false;
  const type = node.type;
  const props = node.props ?? {};
  const labeled = typeof props.accessibilityLabel === "string";
  if (NAMED_CONTROLS.has(type) && !labeled) return true;
  if (type === "text-input" && !labeled) return true;
  if (type === "view" && typeof props.event === "string" && !labeled) {
    return true;
  }
  if (
    type === "text" &&
    LARGE_TEXT.has(node.style?.fontSize) &&
    props.heading === undefined
  ) {
    return true;
  }
  return false;
}

/**
 * @param {{ root?: unknown } | null} tree
 * @returns {number}
 */
export function countUnlabeledControls(tree) {
  let count = 0;
  const visit = (node) => {
    if (isFinding(node)) count += 1;
    for (const child of node.children ?? []) visit(child);
  };
  if (tree?.root !== undefined) visit(tree.root);
  return count;
}
