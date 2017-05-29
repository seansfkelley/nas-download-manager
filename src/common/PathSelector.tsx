import * as React from 'react';
import { ApiClient, isConnectionFailure } from 'synology-typescript-api';
import { errorMessageFromConnectionFailure, errorMessageFromCode } from '../apiErrors';
import { DirectoryTree, DirectoryTreeFileChildren, isErrorChild } from './DirectoryTree';

export interface Props {
  client: ApiClient;
}

export interface State {
  directoryTree: DirectoryTreeFileChildren;
}

export class PathSelector extends React.PureComponent<Props, State> {
  state: State = {
    directoryTree: 'unloaded'
  };

  private unsubscribeCallback: (() => void) | undefined;
  private requestVersion: number = 0;

  render() {
    return (
      <div className='path-selector'>
        {this.renderContent()}
      </div>
    );
  }

  private renderContent() {
    if (this.state.directoryTree == 'unloaded') {
      return 'Loading...';
    } else if (isErrorChild(this.state.directoryTree)) {
      return this.state.directoryTree.failureMessage;
    } else if (this.state.directoryTree.length === 0) {
      return 'No folders to show!';
    } else {
      return (
        <div>
          {this.state.directoryTree.map(directory => (
            <DirectoryTree
              key={directory.path}
              file={directory}
              requestLoad={console.log.bind(console)}
              onSelect={console.log.bind(console)}
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

  private subscribeToClient(client: ApiClient) {
    this.unsubscribeFromClient();
    this.unsubscribeCallback = client.onSettingsChange(this.loadTopLevelDirectories);
  }

  componentDidMount() {
    this.subscribeToClient(this.props.client);
    this.loadTopLevelDirectories();
  }

  componentWillUnmount() {
    this.unsubscribeFromClient();
  }

  componentWillReceiveProps(nextProps: Props) {
    if (this.props.client !== nextProps.client) {
      this.unsubscribeFromClient();
      this.subscribeToClient(this.props.client);
      this.loadTopLevelDirectories();
    }
  }

  private loadTopLevelDirectories = () => {
    this.setState({ directoryTree: 'unloaded' });
    const stashedRequestVersion = ++this.requestVersion;
    this.props.client.FileStation.List.list_share()
      .then(response => {
        if (stashedRequestVersion === this.requestVersion) {
          if (isConnectionFailure(response)) {
            this.setState({
              directoryTree: {
                failureMessage: errorMessageFromConnectionFailure(response)
              }
            });
          } else if (!response.success) {
            this.setState({
              directoryTree: {
                failureMessage: errorMessageFromCode(response.error.code, 'FileStation')
              }
            });
          } else {
            this.setState({
              directoryTree: response.data.shares.map(d => ({
                name: d.name,
                path: d.path,
                children: 'unloaded' as 'unloaded'
              }))
            });
          }
        }
      });
  };
}
