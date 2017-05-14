import * as React from 'react';
import * as classNamesProxy from 'classnames';

// https://github.com/rollup/rollup/issues/1267
const classNames: typeof classNamesProxy = (classNamesProxy as any).default || classNamesProxy;

import { DownloadStationTask } from '../api';
import { formatMetric1024 } from '../format';
import { CallbackResponse } from './popupTypes';
import { matchesFilter } from './filtering';

export interface Props {
  task: DownloadStationTask;
  onDelete?: (taskId: string) => Promise<CallbackResponse>;
  onPauseResume?: (taskId: string, what: 'pause' | 'resume') => Promise<CallbackResponse>;
}

export interface State {
  deleteState: 'none' | 'in-progress' | CallbackResponse;
}

export class Task extends React.PureComponent<Props, State> {
  state: State = {
    deleteState: 'none'
  };

  render() {
    if (this.state.deleteState === 'success') {
      return null;
    } else {
      const downloadedFraction = Math.round(this.props.task.additional!.transfer!.size_downloaded / this.props.task.size * 100) / 100;
      return (
        <li className='task' key={this.props.task.id}>
          <div className='header'>
            <div className='name-and-status'>
              <div className='name'>{this.props.task.title}</div>
              <div className='status'>
                {this.props.task.status}
                {' '}
                {'\u2013'}
                {' '}
                {formatMetric1024(this.props.task.additional!.transfer!.speed_upload)} u
                {' '}
                /
                {' '}
                {formatMetric1024(this.props.task.additional!.transfer!.speed_download)} d
              </div>
            </div>
            {this.renderRemoveButton()}
          </div>
          <div className='progress-bar'>
            <div
              className={classNames('bar-fill', {
                'in-progress': matchesFilter(this.props.task, 'downloading' ),
                'completed': matchesFilter(this.props.task, 'uploading') || matchesFilter(this.props.task, 'completed'),
                'errored': matchesFilter(this.props.task, 'errored'),
                'unknown': matchesFilter(this.props.task, 'other')
              })}
              style={{ width: `${downloadedFraction * 100}%` }}
            />
            <div className='bar-background'/>
          </div>
        </li>
      );
    }
  }

  private renderRemoveButton() {
    let title: string = '';
    let disabled: boolean = false;
    if (this.state.deleteState === 'none') {
      title = 'Remove download';
    } else if (this.state.deleteState === 'in-progress') {
      title = 'Remove download';
      disabled = true;
    } else if (this.state.deleteState !== 'success') {
      title = this.state.deleteState.failMessage;
      disabled = true;
    }
    return (
      <button
        onClick={this.deleteTask}
        title={title}
        disabled={disabled}
        className={classNames('remove-button', { 'disabled': disabled })}
      >
        <div className={classNames('fa', {
          'fa-times': this.state.deleteState !== 'in-progress',
          'fa-refresh fa-spin': this.state.deleteState === 'in-progress'
        })}/>
      </button>
    );
  }

  private deleteTask = () => {
    this.setState({
      deleteState: 'in-progress'
    });
    this.props.onDelete!(this.props.task.id)
      .then(response => {
        this.setState({
          deleteState: response
        });
      })
  };
}
