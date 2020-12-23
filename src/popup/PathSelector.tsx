import "./path-selector.scss";
import * as React from "react";
import type { MessageResponse, Directory } from "../common/apis/messages";
import {
  DirectoryTree,
  DirectoryTreeFile,
  isUnloadedChild,
  isLoadedChild,
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

export interface State {
  directoryTree: DirectoryTreeFile;
}

export class PathSelector extends React.PureComponent<Props, State> {
  state: State = {
    directoryTree: {
      name: "/",
      path: ROOT_PATH,
      children: "unloaded",
    },
  };

  private requestVersionByPath: Record<string, number> = {};

  render() {
    return <div className="path-selector">{this.renderContent()}</div>;
  }

  private renderContent() {
    if (isUnloadedChild(this.state.directoryTree.children)) {
      return <div className="no-content">{browser.i18n.getMessage("Loading_directories")}</div>;
    } else if (isErrorChild(this.state.directoryTree.children)) {
      return (
        <div className="no-content intent-error">
          <span className="fa fa-exclamation-triangle" />
          {this.state.directoryTree.children.failureMessage}
        </div>
      );
    } else if (this.state.directoryTree.children.length === 0) {
      return <div className="no-content">{browser.i18n.getMessage("No_directories")}</div>;
    } else {
      return (
        <div>
          {this.state.directoryTree.children.map((directory) => (
            <DirectoryTree
              key={directory.path}
              file={directory}
              requestLoad={this.loadNestedDirectory}
              selectedPath={this.props.selectedPath}
              onSelect={this.props.onSelectPath}
            />
          ))}
        </div>
      );
    }
  }

  componentDidMount() {
    this.loadTopLevelDirectories();
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.client !== prevProps.client) {
      this.props.onSelectPath(undefined);
      this.loadTopLevelDirectories();
    }
  }

  private loadNestedDirectory = async (path: string) => {
    if (!isLoadedChild(this.state.directoryTree.children)) {
      console.error(
        `programmer error: cannot load nested directories when top-level directories are not in a valid state`,
      );
    } else {
      const stashedRequestVersion = (this.requestVersionByPath[path] =
        (this.requestVersionByPath[path] || 0) + 1);

      const response = await this.props.client.listDirectories(path);

      if (stashedRequestVersion === this.requestVersionByPath[path]) {
        this.updateTreeWithResponse(path, response);
      }
    }
  };

  private loadTopLevelDirectories = async () => {
    this.setState({
      directoryTree: recursivelyUpdateDirectoryTree(
        this.state.directoryTree,
        ROOT_PATH,
        "unloaded",
      ),
    });
    const stashedRequestVersion = (this.requestVersionByPath[ROOT_PATH] =
      (this.requestVersionByPath[ROOT_PATH] || 0) + 1);
    const response = await this.props.client.listDirectories();

    if (stashedRequestVersion === this.requestVersionByPath[ROOT_PATH]) {
      this.updateTreeWithResponse(ROOT_PATH, response);
    }
  };

  private updateTreeWithResponse(path: string, response: MessageResponse<Directory[]>) {
    if (response.success) {
      this.setState({
        directoryTree: recursivelyUpdateDirectoryTree(
          this.state.directoryTree,
          path,
          response.result.map((c) => ({ ...c, children: "unloaded" })),
        ),
      });
    } else {
      this.setState({
        directoryTree: recursivelyUpdateDirectoryTree(this.state.directoryTree, path, {
          failureMessage: response.reason,
        }),
      });
    }
  }
}
