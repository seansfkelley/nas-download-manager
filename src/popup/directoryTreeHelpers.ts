export type DirectoryTreeFileChildren =
  | "unloaded"
  | { failureMessage: string }
  | DirectoryTreeFile[];

export interface DirectoryTreeFile {
  name: string;
  path: string;
  children: DirectoryTreeFileChildren;
}

export function isUnloadedChild(children: DirectoryTreeFileChildren): children is "unloaded" {
  return children === "unloaded";
}

export function isErrorChild(
  children: DirectoryTreeFileChildren,
): children is { failureMessage: string } {
  return (children as { failureMessage: string }).failureMessage != null;
}

export function isLoadedChild(
  children: DirectoryTreeFileChildren,
): children is DirectoryTreeFile[] {
  return !isUnloadedChild(children) && !isErrorChild(children);
}

export function recursivelyUpdateDirectoryTree(
  currentNode: DirectoryTreeFile,
  path: string,
  newChildren: DirectoryTreeFileChildren,
): DirectoryTreeFile {
  if (currentNode.path === path) {
    return {
      ...currentNode,
      children: newChildren,
    };
  } else if (!isLoadedChild(currentNode.children)) {
    console.error(
      `programmer error: tried to update tree at ${path} but ancestor ${currentNode.path} has no valid children; ancestor:`,
      currentNode,
    );
    return currentNode;
  } else {
    return {
      ...currentNode,
      children: currentNode.children.map((child) => {
        if (path.startsWith(child.path)) {
          return recursivelyUpdateDirectoryTree(child, path, newChildren);
        } else {
          return child;
        }
      }),
    };
  }
}
