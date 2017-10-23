import * as React from 'react';
import { startCase, upperCase } from 'lodash-es';
import { DownloadStationTask } from 'synology-typescript-api';
import * as classNamesProxy from 'classnames';

// https://github.com/rollup/rollup/issues/1267
const classNames: typeof classNamesProxy = (classNamesProxy as any).default || classNamesProxy;

import { formatMetric1024 } from '../format';
import { CallbackResponse } from './popupTypes';
import { matchesFilter } from './filtering';

export interface Props {
  task: DownloadStationTask;
  onDelete?: (taskId: string) => Promise<CallbackResponse>;
  onPause?: (taskId: string) => Promise<CallbackResponse>;
  onResume?: (taskId: string) => Promise<CallbackResponse>;
}

export interface State {
  pauseResumeState: 'none' | 'in-progress' | { failMessage: string };
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
              <div className='name' title={this.props.task.title}>
                {this.props.task.title}
              </div>
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
      return browser.i18n.getMessage('$status$_$current$_of_$total$_downloaded_$speed$',
        upperCase(this.props.task.status),
        `${formatMetric1024(this.props.task.additional!.transfer!.size_downloaded)}B`,
        `${formatMetric1024(this.props.task.size)}B}`,
        `${formatMetric1024(this.props.task.additional!.transfer!.speed_download)}B/s`
      );
    } else if (matchesFilter(this.props.task, 'uploading')) {
      return browser.i18n.getMessage('$status$_$total$_uploaded_$speed$',
          upperCase(this.props.task.status),
          `${formatMetric1024(this.props.task.additional!.transfer!.size_uploaded)}B`,
          `${formatMetric1024(this.props.task.additional!.transfer!.speed_upload)}B/s`
      );
    } else if (matchesFilter(this.props.task, 'completed')) {
      return browser.i18n.getMessage('$status$_$total$_downloaded',
        upperCase(this.props.task.status),
        `${formatMetric1024(this.props.task.size)}B`
      );
    } else if (matchesFilter(this.props.task, 'errored')) {
      return (
        <span className='intent-error'>
          <span className='fa fa-exclamation-triangle error-icon'/>
          {upperCase(this.props.task.status)} {this.props.task.status_extra ? `\u2013 ${startCase(this.props.task.status_extra.error_detail)}` : ''}
        </span>
      );
    } else {
      return browser.i18n.getMessage('$status$_$current$_of_$total$_downloaded',
        upperCase(this.props.task.status),
        `${formatMetric1024(this.props.task.additional!.transfer!.size_downloaded)}B`,
        `${formatMetric1024(this.props.task.size)}B}`
      );
    }
  }

  private renderPauseResumeButton() {
    const renderButton = (title: string | undefined, state: 'resumable' | 'pausable' | 'in-progress' | 'failed') => {
      const isDisabled =
        this.props.onPause == null ||
        this.props.onResume == null ||
        this.state.deleteState === 'in-progress' ||
        this.state.pauseResumeState === 'in-progress' ||
        (this.state.pauseResumeState !== 'success' && this.state.pauseResumeState !== 'none');
      return (
        <button
          onClick={this.makePauseResume(state === 'resumable' ? 'resume' : 'pause')}
          title={title}
          disabled={isDisabled}
          className={classNames('pause-resume-button', { 'disabled': isDisabled })}
        >
          <div className={classNames('fa', {
            'fa-pause': state === 'pausable',
            'fa-play': state === 'resumable',
            'fa-refresh fa-spin': state === 'in-progress',
            'fa-exclamation': state === 'failed'
          })}/>
        </button>
      );
    };

    if (this.state.pauseResumeState === 'in-progress') {
      return renderButton(undefined, 'in-progress');
    } else if (this.state.pauseResumeState === 'none') {
      if (this.props.task.status === 'paused') {
        return renderButton(browser.i18n.getMessage('Resume'), 'resumable');
      } else if (this.props.task.status === 'finished') {
        return renderButton(browser.i18n.getMessage('Start_seeding'), 'resumable');
      } else {
        return renderButton(browser.i18n.getMessage('Pause'), 'pausable');
      }
    } else {
      return renderButton(this.state.pauseResumeState.failMessage, 'failed');
    }
  }

  private renderRemoveButton() {
    let title: string = '';
    let disabled: boolean = this.state.pauseResumeState === 'in-progress';
    if (this.deleteTask == null || this.state.deleteState === 'in-progress') {
      title = browser.i18n.getMessage('Remove_download');
      disabled = true;
    } else if (this.state.deleteState === 'none') {
      title = browser.i18n.getMessage('Remove_download');
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

  private makePauseResume(what: 'pause' | 'resume') {
    return () => {
      this.setState({
        pauseResumeState: 'in-progress'
      });

      (what === 'pause' ? this.props.onPause! : this.props.onResume!)(this.props.task.id)
        .then(response => {
          this.setState({
            // This is a little gross, but here we just unset the state and fall back onto whatever this.props.task states.
            pauseResumeState: response === 'success' ? 'none' : response
          });
        });
    };
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
4
