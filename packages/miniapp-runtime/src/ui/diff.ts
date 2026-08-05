import type { WidgetNode, WidgetTree } from "./schema.js";

export type WidgetPatch =
  | { readonly op: "replace"; readonly id: string; readonly node: WidgetNode }
  | { readonly op: "remove"; readonly id: string };

export function diffWidgetTrees(previous: WidgetTree | null, next: WidgetTree): ReadonlyArray<WidgetPatch> {
  if (previous === null || previous.root.id !== next.root.id) {
    return [{ op: "replace", id: next.root.id, node: next.root }];
  }

  const patches: WidgetPatch[] = [];
  diffNode(previous.root, next.root, patches);
  return patches;
}

function diffNode(previous: WidgetNode, next: WidgetNode, patches: WidgetPatch[]): void {
  if (previous.type !== next.type || JSON.stringify(previous.props ?? {}) !== JSON.stringify(next.props ?? {}) || JSON.stringify(previous.style ?? {}) !== JSON.stringify(next.style ?? {})) {
    patches.push({ op: "replace", id: next.id, node: next });
    return;
  }

  const previousChildren = previous.children ?? [];
  const nextChildren = next.children ?? [];
  const previousById = new Map(previousChildren.map((child) => [child.id, child]));
  const nextById = new Map(nextChildren.map((child) => [child.id, child]));

  for (const child of nextChildren) {
    const oldChild = previousById.get(child.id);
    if (oldChild === undefined) {
      patches.push({ op: "replace", id: child.id, node: child });
    } else {
      diffNode(oldChild, child, patches);
    }
  }

  for (const child of previousChildren) {
    if (!nextById.has(child.id)) {
      patches.push({ op: "remove", id: child.id });
    }
  }
}
