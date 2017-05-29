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
}

export class AdvancedAddDownloadForm extends React.PureComponent<Props, State> {
  state: State = {
    selectedPath: undefined
  };

  private addDownloadUrlRef?: HTMLTextAreaElement;

  render() {
    return (
      <div className='advanced-add-download-form'>
        <textarea
          ref={e => { this.addDownloadUrlRef = e; }}
          placeholder='Enter URL here...'
        />
        <div className='download-path-display' title={this.state.selectedPath}>
          Downloading to
          <span className={classNames('path', { 'faded': !this.state.selectedPath })}>
            {this.state.selectedPath ? last(this.state.selectedPath.split('/')) : 'default location'}
          </span>
        </div>
        <PathSelector
          client={this.props.client}
          onSelectPath={this.setSelectedPath}
          selectedPath={this.state.selectedPath}
        />
        <div className='buttons'>
          <button
            onClick={this.props.onCancel}
            title='Cancel adding a new task'
          >
            <span className='fa fa-lg fa-times'/> Cancel
          </button>
          <button
            onClick={this.addDownload}
            title='Add the above URL as a new download task'
          >
            <span className='fa fa-lg fa-plus'/> Add
          </button>
        </div>
      </div>
    );
  }

  private addDownload = () => {
    this.props.onAddDownload(this.addDownloadUrlRef!.value, this.state.selectedPath);
  };

  private setSelectedPath = (selectedPath: string) => {
    this.setState({ selectedPath });
  };
}
