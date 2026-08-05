import "./directory-tree.css";
import { memo, useState, type ReactNode } from "react";
import classNames from "classnames";

export type DirectoryTreeFileChildren =
  "unloaded" | { failureMessage: string } | DirectoryTreeFile[];

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

export interface Props {
  file: DirectoryTreeFile;
  selectedPath?: string;
  requestLoad: (path: string) => void;
  onSelect: (path: string | undefined) => void;
}

function DirectoryTreeNode(props: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  // A directory that failed to load cannot stay open, because there is nothing left to show
  // underneath it and its chevron becomes a warning icon.
  if (isExpanded && isErrorChild(props.file.children)) {
    setIsExpanded(false);
  }

  function toggleExpanded() {
    setIsExpanded(!isExpanded);
    if (!isExpanded && isUnloadedChild(props.file.children)) {
      props.requestLoad(props.file.path);
    }

    if (isExpanded && props.selectedPath && props.selectedPath.startsWith(props.file.path)) {
      props.onSelect(undefined);
    }
  }

  function renderChildren(): ReactNode {
    if (isExpanded) {
      if (isUnloadedChild(props.file.children)) {
        return <div className="children loading">{browser.i18n.getMessage("Loading")}</div>;
      } else if (isErrorChild(props.file.children)) {
        return null;
      } else if (props.file.children.length === 0) {
        return null;
      } else {
        return (
          <ul className="children loaded">
            {props.file.children.map((child) => (
              <DirectoryTree
                key={child.path}
                file={child}
                requestLoad={props.requestLoad}
                selectedPath={props.selectedPath}
                onSelect={props.onSelect}
              />
            ))}
          </ul>
        );
      }
    } else {
      return null;
    }
  }

  const isPlaceholder = isLoadedChild(props.file.children) && props.file.children.length === 0;

  return (
    <div className="directory-tree">
      <div
        className={classNames("directory-header", {
          "is-selected": props.selectedPath === props.file.path,
        })}
      >
        <div
          className={classNames("directory-icon-wrapper", {
            placeholder: isPlaceholder,
            disabled: isErrorChild(props.file.children),
          })}
          onClick={isErrorChild(props.file.children) ? undefined : toggleExpanded}
          title={
            isErrorChild(props.file.children)
              ? props.file.children.failureMessage
              : browser.i18n.getMessage("Expandcollapse_directory")
          }
        >
          <span
            className={classNames("fa", {
              "fa-chevron-right expand-collapse":
                isUnloadedChild(props.file.children) ||
                (!isErrorChild(props.file.children) && props.file.children.length > 0),
              "fa-exclamation-triangle intent-warning": isErrorChild(props.file.children),
              "fa-fighter-jet": isPlaceholder,
              "is-expanded": isExpanded,
            })}
          />
        </div>
        <div
          className="name"
          onClick={() => {
            props.onSelect(props.file.path);
          }}
          title={props.file.name}
        >
          {props.file.name}
        </div>
      </div>
      {renderChildren()}
    </div>
  );
}

// Memoized to preserve the bailout the PureComponent used to give. recursivelyUpdateDirectoryTree
// keeps the identity of every subtree it did not touch, so loading one directory re-renders only
// that branch rather than the whole tree. PathSelector holds requestLoad stable for the same
// reason. Named separately from the inner function because a named function expression binds its
// own name in its body, which would make the recursive usage above skip the memo.
export const DirectoryTree = memo(DirectoryTreeNode);
