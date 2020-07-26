import * as React from "react";
import { ListDirectories, MessageResponse, Directory } from "../common/apis/messages";
import {
  DirectoryTree,
  DirectoryTreeFile,
  isUnloadedChild,
  isLoadedChild,
  isErrorChild,
  recursivelyUpdateDirectoryTree,
} from "./DirectoryTree";

const ROOT_PATH = "/";

export interface Props {
  selectedPath: string | undefined;
  onSelectPath: (path: string | undefined) => void;
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

  private unsubscribeCallback: (() => void) | undefined;
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

  private unsubscribeFromClient() {
    if (this.unsubscribeCallback) {
      this.unsubscribeCallback();
      this.unsubscribeCallback = undefined;
    }
  }

  // private subscribeToClient(client: ApiClient) {
  //   this.unsubscribeFromClient();
  //   this.unsubscribeCallback = client.onSettingsChange(this.loadTopLevelDirectories);
  // }

  componentDidMount() {
    // this.subscribeToClient(this.props.client);
    this.loadTopLevelDirectories();
  }

  componentWillUnmount() {
    this.unsubscribeFromClient();
  }

  componentWillReceiveProps(nextProps: Props) {
    // if (this.props.client !== nextProps.client) {
    //   this.unsubscribeFromClient();
    //   this.subscribeToClient(this.props.client);
    //   this.loadTopLevelDirectories();
    // }
  }

  private loadNestedDirectory = async (path: string) => {
    if (!isLoadedChild(this.state.directoryTree.children)) {
      console.error(
        `programmer error: cannot load nested directories when top-level directories are not in a valid state`,
      );
    } else {
      const stashedRequestVersion = (this.requestVersionByPath[path] =
        (this.requestVersionByPath[path] || 0) + 1);

      const response = await ListDirectories.send(path);

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
    const response = await ListDirectories.send();

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
