import * as React from 'react';
import { last } from 'lodash-es';
import { ApiClient } from 'synology-typescript-api';
import * as classNamesProxy from 'classnames';

// https://github.com/rollup/rollup/issues/1267
const classNames: typeof classNamesProxy = (classNamesProxy as any).default || classNamesProxy;

import { PathSelector } from './PathSelector';

export interface Props {
  client: ApiClient;
  onAddDownload: (url: string, path: string | undefined) => void;
  onCancel: () => void;
}

export interface State {
  selectedPath: string | undefined;
  downloadUrl: string;
}

export class AdvancedAddDownloadForm extends React.PureComponent<Props, State> {
  state: State = {
    selectedPath: undefined,
    downloadUrl: ''
  };

  render() {
    const hasDownloadUrl = this.state.downloadUrl.length > 0;

    return (
      <div className='advanced-add-download-form'>
        <input
          type='text'
          placeholder='URL to download...'
          value={this.state.downloadUrl}
          onChange={e => { this.setState({ downloadUrl: e.currentTarget.value }); }}
          className='url-input card'
        />
        <div className='download-path card'>
          <div className='path-display' title={this.state.selectedPath}>
            Download to
            <span className={classNames('path', { 'faded': !this.state.selectedPath })}>
              {this.state.selectedPath ? last(this.state.selectedPath.split('/')) : 'default location'}
            </span>
          </div>
          <PathSelector
            client={this.props.client}
            onSelectPath={this.setSelectedPath}
            selectedPath={this.state.selectedPath}
          />
        </div>
        <div className='buttons'>
          <button
            onClick={this.props.onCancel}
            title={'Don\'t add a new task'}
          >
            <span className='fa fa-lg fa-times'/> Cancel
          </button>
          <button
            onClick={this.addDownload}
            title='Download the above URL to the specified location'
            disabled={!hasDownloadUrl}
            className={classNames({ 'disabled': !hasDownloadUrl })}
          >
            <span className='fa fa-lg fa-plus'/> Add
          </button>
        </div>
      </div>
    );
  }

  private addDownload = () => {
    this.props.onAddDownload(this.state.downloadUrl, this.state.selectedPath);
  };

  private setSelectedPath = (selectedPath: string) => {
    this.setState({ selectedPath });
  };
}
