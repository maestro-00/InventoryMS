import type { CategoryNode } from "./api/categories-api";

export interface FlatCategory {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
}

export function flattenCategories(
  nodes: readonly CategoryNode[],
  depth = 0,
  parentId: string | null = null,
): FlatCategory[] {
  return nodes.flatMap((node) => [
    { id: node.id, name: node.name, parentId: node.parentId ?? parentId, depth },
    ...flattenCategories(node.children, depth + 1, node.id),
  ]);
}

function findNode(
  nodes: readonly CategoryNode[],
  id: string,
): CategoryNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return undefined;
}

/** Every category below `id`, used to keep a reparent from swallowing its own subtree. */
export function descendantIds(nodes: readonly CategoryNode[], id: string): string[] {
  const node = findNode(nodes, id);
  if (!node) return [];
  return flattenCategories(node.children).map((child) => child.id);
}

export function wouldCreateCycle(
  nodes: readonly CategoryNode[],
  categoryId: string,
  parentId: string | null | undefined,
): boolean {
  if (!parentId) return false;
  if (parentId === categoryId) return true;
  return descendantIds(nodes, categoryId).includes(parentId);
}

/** Parent options that cannot produce a cycle for the category being edited. */
export function eligibleParents(
  nodes: readonly CategoryNode[],
  categoryId: string | null,
): FlatCategory[] {
  const flat = flattenCategories(nodes);
  if (!categoryId) return flat;
  const blocked = new Set([categoryId, ...descendantIds(nodes, categoryId)]);
  return flat.filter((category) => !blocked.has(category.id));
}
