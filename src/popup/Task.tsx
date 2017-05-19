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
  pauseResumeState: 'none' | 'in-progress' | CallbackResponse;
  deleteState: 'none' | 'in-progress' | CallbackResponse;
}

export class Task extends React.PureComponent<Props, State> {
  state: State = {
    pauseResumeState: 'none',
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
                {this.renderStatus()}
              </div>
            </div>
            {this.renderPauseResumeButton()}
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

  private renderStatus() {
    if (matchesFilter(this.props.task, 'downloading')) {
      return (
        `${this.props.task.status.toUpperCase()} \u2013 ` +
        `${formatMetric1024(this.props.task.additional!.transfer!.size_downloaded)}B of ` +
        `${formatMetric1024(this.props.task.size)}B downloaded ` +
        `(${formatMetric1024(this.props.task.additional!.transfer!.speed_download)}B/s)`
      );
    } else if (matchesFilter(this.props.task, 'uploading')) {
      return (
        `${this.props.task.status.toUpperCase()} \u2013 ` +
        `${formatMetric1024(this.props.task.additional!.transfer!.size_uploaded)}B uploaded ` +
        `(${formatMetric1024(this.props.task.additional!.transfer!.speed_upload)}B/s)`
      );
    } else if (matchesFilter(this.props.task, 'completed')) {
      return (
        `${this.props.task.status.toUpperCase()} \u2013 ` +
        `${formatMetric1024(this.props.task.size)} downloaded `
      );
    } else if (matchesFilter(this.props.task, 'errored')) {
      return (
        <span className='intent-error'>
          <span className='fa fa-exclamation-triangle'/>
          {this.props.task.status.toUpperCase()} {this.props.task.status_extra ? `${this.props.task.status_extra}` : ''}
        </span>
      );
    } else {
      return (
        `${this.props.task.status.toUpperCase()} \u2013 ` +
        `${formatMetric1024(this.props.task.additional!.transfer!.size_downloaded)}B of ` +
        `${formatMetric1024(this.props.task.size)}B downloaded`
      );
    }
  }

  private renderPauseResumeButton() {
    let title: string = '';
    let disabled: boolean = this.state.deleteState === 'in-progress';
    if (this.props.onPauseResume == null || this.state.pauseResumeState === 'in-progress') {
      title = this.props.task.status === 'paused' ? 'Resume download' : 'Pause download';
      disabled = true;
    } else if (this.state.pauseResumeState === 'none') {
      title = this.props.task.status === 'paused' ? 'Resume download' : 'Pause download';
    } else if (this.state.pauseResumeState !== 'success') {
      title = this.state.pauseResumeState.failMessage;
      disabled = true;
    }
    return (
      <button
        onClick={this.pauseResumeTask}
        title={title}
        disabled={disabled}
        className={classNames('pause-resume-button', { 'disabled': disabled })}
      >
        <div className={classNames('fa', {
          'fa-pause': this.state.pauseResumeState !== 'in-progress' && this.props.task.status !== 'paused',
          'fa-play': this.state.pauseResumeState !== 'in-progress' && this.props.task.status === 'paused',
          'fa-refresh fa-spin': this.state.pauseResumeState === 'in-progress'
        })}/>
      </button>
    );
  }

  private renderRemoveButton() {
    let title: string = '';
    let disabled: boolean = this.state.pauseResumeState === 'in-progress';
    if (this.deleteTask == null || this.state.deleteState === 'in-progress') {
      title = 'Remove download';
      disabled = true;
    } else if (this.state.deleteState === 'none') {
      title = 'Remove download';
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

  private pauseResumeTask = () => {
    this.setState({
      pauseResumeState: 'in-progress'
    });

    this.props.onPauseResume!(this.props.task.id, this.props.task.status === 'paused' ? 'resume' : 'pause')
      .then(response => {
        this.setState({
          // This is a little gross, but here we just unset the state and fall back onto whatever this.props.task states.
          pauseResumeState: response === 'success' ? 'none' : response
        });
      });
  };

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
