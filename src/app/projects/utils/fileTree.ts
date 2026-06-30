export function filterFileTree(tree: any[], query: string): any[] {
  if (!query) return tree;

  const matchesQuery = (name: string) =>
    name.toLowerCase().includes(query.toLowerCase());

  return tree
    .map((node) => {
      if (node.type === "file" && matchesQuery(node.name)) {
        return node;
      }
      if (node.type === "folder" && node.children) {
        const filteredChildren = filterFileTree(node.children, query);
        if (filteredChildren.length > 0) {
          return { ...node, children: filteredChildren };
        }
      }
      return null;
    })
    .filter(Boolean);
}

export function findSelectedFileNode(
  tree: any[],
  selectedPath: any,
): any | null {
  if (!tree) {
    return null;
  }

  for (const node of tree) {
    if (node.type === "file" && node.fullPath === selectedPath) {
      return node;
    } else if (node.type === "folder" && node.children) {
      const found = findSelectedFileNode(node.children, selectedPath);
      if (found) return found;
    }
  }
  return null;
}

export function findReadmePath(tree: any[]): string | null {
  if (!tree) {
    return null;
  }
  for (const node of tree) {
    if (node.type === "file" && node.name.toLowerCase() === "\\readme.md") {
      return node.fullPath;
    } else if (node.type === "folder" && node.children) {
      const found = findReadmePath(node.children);
      if (found) return found;
    }
  }
  return null;
}
