import "./path-selector.scss";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUpdateEffect } from "../common/hooks/useUpdateEffect";
import type { MessageResponse, Directory } from "../common/apis/messages";
import {
  DirectoryTree,
  DirectoryTreeFile,
  isUnloadedChild,
  isErrorChild,
  recursivelyUpdateDirectoryTree,
} from "./DirectoryTree";
import type { PopupClient } from "./popupClient";

const ROOT_PATH = "/";

export interface Props {
  selectedPath: string | undefined;
  onSelectPath: (path: string | undefined) => void;
  client: PopupClient;
}

export function PathSelector(props: Props) {
  const [directoryTree, setDirectoryTree] = useState<DirectoryTreeFile>({
    name: "/",
    path: ROOT_PATH,
    children: "unloaded",
  });

  const requestVersionByPath = useRef<Record<string, number>>({});

  function updateTreeWithResponse(path: string, response: MessageResponse<Directory[]>) {
    // Updated as a function of the current tree rather than the one this render closed over,
    // because every caller reads it back after awaiting a response, by which time a sibling
    // request may already have replaced it.
    if (response.success) {
      setDirectoryTree((tree) =>
        recursivelyUpdateDirectoryTree(
          tree,
          path,
          response.result.map((c) => ({ ...c, children: "unloaded" })),
        ),
      );
    } else {
      setDirectoryTree((tree) =>
        recursivelyUpdateDirectoryTree(tree, path, { failureMessage: response.reason }),
      );
    }
  }

  // Both loaders are held stable so that DirectoryTree's memoization keeps working; see the note
  // there. Neither reads the tree, so the client is their only dependency.
  const loadNestedDirectory = useCallback(
    async (path: string) => {
      const stashedRequestVersion = (requestVersionByPath.current[path] =
        (requestVersionByPath.current[path] || 0) + 1);

      const response = await props.client.listDirectories(path);

      if (stashedRequestVersion === requestVersionByPath.current[path]) {
        updateTreeWithResponse(path, response);
      }
    },
    [props.client],
  );

  const loadTopLevelDirectories = useCallback(async () => {
    setDirectoryTree((tree) => recursivelyUpdateDirectoryTree(tree, ROOT_PATH, "unloaded"));

    const stashedRequestVersion = (requestVersionByPath.current[ROOT_PATH] =
      (requestVersionByPath.current[ROOT_PATH] || 0) + 1);

    const response = await props.client.listDirectories();

    if (stashedRequestVersion === requestVersionByPath.current[ROOT_PATH]) {
      updateTreeWithResponse(ROOT_PATH, response);
    }
  }, [props.client]);

  useEffect(() => {
    loadTopLevelDirectories();
  }, [loadTopLevelDirectories]);

  // Not on mount, where there is no stale selection to clear.
  useUpdateEffect(() => {
    props.onSelectPath(undefined);
  }, [props.client]);

  function renderContent() {
    if (isUnloadedChild(directoryTree.children)) {
      return <div className="no-content">{browser.i18n.getMessage("Loading_directories")}</div>;
    } else if (isErrorChild(directoryTree.children)) {
      return (
        <div className="no-content intent-error">
          <span className="fa fa-exclamation-triangle" />
          {directoryTree.children.failureMessage}
        </div>
      );
    } else if (directoryTree.children.length === 0) {
      return <div className="no-content">{browser.i18n.getMessage("No_directories")}</div>;
    } else {
      return (
        <div>
          {directoryTree.children.map((directory) => (
            <DirectoryTree
              key={directory.path}
              file={directory}
              requestLoad={loadNestedDirectory}
              selectedPath={props.selectedPath}
              onSelect={props.onSelectPath}
            />
          ))}
        </div>
      );
    }
  }

  return <div className="path-selector">{renderContent()}</div>;
}
