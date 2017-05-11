import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as momentProxy from 'moment';
import * as classNamesProxy from 'classnames';
import debounce from 'lodash-es/debounce';

// https://github.com/rollup/rollup/issues/1267
const moment: typeof momentProxy = (momentProxy as any).default || momentProxy;
const classNames: typeof classNamesProxy = (classNamesProxy as any).default || classNamesProxy;

import { SynologyResponse, DownloadStation, DownloadStationTask, errorMessageFromCode } from '../api';
import { VisibleTaskSettings, onStoredStateChange, getHostUrl } from '../common';
import { TaskPoller } from '../taskPoller';
import { matchesFilter } from './filtering';
import { formatMetric1024 } from '../format';

function sortByName(task1: DownloadStationTask, task2: DownloadStationTask) {
  if (task1.title < task2.title) {
    return -1;
  } else if (task1.title > task2.title) {
    return 1;
  } else {
    return 0;
  }
}

interface PopupProps {
  tasks: DownloadStationTask[];
  taskFilter: VisibleTaskSettings;
  failureMessage?: string;
  lastUpdateTimestamp?: number;
  openSynologyUi: () => void;
  pauseResumeTask?: (taskId: string, what: 'pause' | 'resume') => Promise<boolean>;
  deleteTask?: (taskId: string) => Promise<boolean>;
}

interface State {
  shouldShowDropShadow: boolean;
}

class Popup extends React.PureComponent<PopupProps, State> {
  private bodyRef?: HTMLElement;

  state: State = {
    shouldShowDropShadow: false
  };

  render() {
    return (
      <div className='popup'>
        {this.renderHeader()}
        {this.renderBody()}
      </div>
    );
  }

  private renderHeader() {
    let text: string;
    let tooltip: string;
    let classes: string | undefined = undefined;
    let icon: string;

    if (this.props.lastUpdateTimestamp == null) {
      text = 'Loading...';
      tooltip = 'Loading download tasks...';
      icon = 'fa-refresh fa-spin';
    } else if (this.props.failureMessage != null) {
      text = 'Error loading tasks...'
      tooltip = this.props.failureMessage;
      classes = 'error-message';
      icon = 'fa-exclamation-triangle';
    } else {
      text = `Updated ${moment(this.props.lastUpdateTimestamp).fromNow()}`;
      tooltip = moment(this.props.lastUpdateTimestamp).format('lll');
      classes = 'success-message';
      icon = 'fa-check';
    }

    return (
      <header className={classNames({ 'with-shadow': this.state.shouldShowDropShadow })}>
        <div className={classNames('description', classes)} title={tooltip}>
          <div className={classNames('fa fa-lg', icon)}/>
          {text}
        </div>
        <button
          onClick={() => { console.log('plus'); }}
          title='Add download...'
        >
          <div className='fa fa-lg fa-plus'/>
        </button>
        <button
          onClick={this.props.openSynologyUi}
          title='Open Synology UI...'
        >
          <div className='fa fa-lg fa-share-square-o'/>
        </button>
        <button
          onClick={() => { browser.runtime.openOptionsPage(); }}
          title='Open settings...'
        >
          <div className='fa fa-lg fa-cog'/>
        </button>
      </header>
    );
  }

  private renderBody() {
    if (this.props.lastUpdateTimestamp == null) {
      return (
        <div className='no-tasks popup-body'>
          ...
        </div>
      );
    } else if (this.props.tasks.length === 0) {
      return (
        <div className='no-tasks popup-body'>
          No download tasks.
        </div>
      );
    } else {
      const filteredTasks = this.props.tasks.filter(t =>
        (this.props.taskFilter.downloading && matchesFilter(t, 'downloading')) ||
        (this.props.taskFilter.uploading && matchesFilter(t, 'uploading')) ||
        (this.props.taskFilter.completed && matchesFilter(t, 'completed')) ||
        (this.props.taskFilter.errored && matchesFilter(t, 'errored')) ||
        (this.props.taskFilter.other && matchesFilter(t, 'other'))
      );
      if (filteredTasks.length === 0) {
        return (
          <div className='no-tasks popup-body'>
            Download tasks exist, but none match your filters.
          </div>
        );
      } else {
        return (
          <ul
            className='download-tasks popup-body'
            onScroll={this.onBodyScroll}
            ref={e => { this.bodyRef = e; }}
          >
            {this.props.tasks.sort(sortByName).map(task => {
              const downloadedFraction = Math.round(task.additional!.transfer!.size_downloaded / task.size * 100) / 100;
              return (
                <li className='task' key={task.id}>
                  <div className='header'>
                    <div className='name-and-status'>
                      <div className='name'>{task.title}</div>
                      <div className='status'>
                        {task.status}
                        {' '}
                        {'\u2013'}
                        {' '}
                        {formatMetric1024(task.additional!.transfer!.speed_upload)} u
                        {' '}
                        /
                        {' '}
                        {formatMetric1024(task.additional!.transfer!.speed_download)} d
                      </div>
                    </div>
                    <button
                      onClick={() => { console.log('remove!'); }}
                      title='Remove download'
                      disabled={true}
                      className={classNames('remove-button', { 'disabled': true })}
                    >
                      <div className='fa fa-times'/>
                    </button>
                  </div>
                  <div className='progress-bar'>
                    <div
                      className={classNames('bar-fill', {
                        'in-progress': matchesFilter(task, 'downloading' ),
                        'completed': matchesFilter(task, 'uploading') || matchesFilter(task, 'completed'),
                        'errored': matchesFilter(task, 'errored'),
                        'unknown': matchesFilter(task, 'other')
                      })}
                      style={{ width: `${downloadedFraction * 100}%` }}
                    />
                    <div className='bar-background'/>
                  </div>
                </li>
              );
            })}
          </ul>
        );
      }
    }
  }

  private onBodyScroll = debounce(() => {
    if (this.bodyRef) {
      this.setState({ shouldShowDropShadow: this.bodyRef.scrollTop !== 0 })
    } else {
      this.setState({ shouldShowDropShadow: false });
    }
  }, 100);
}

const poller = new TaskPoller({
  interval: 10,
  enabled: true
});

onStoredStateChange(storedState => {
  const hostUrl = getHostUrl(storedState.connection);

  poller.updateSettings({
    hostname: hostUrl,
    sid: storedState.sid
  });

  function booleanifyResponse(response: SynologyResponse<any>) {
    if (response.success) {
      return true;
    } else {
      console.error(`failed to delete task, reason: ${errorMessageFromCode(response.error.code, 'task')}`);
      return false;
    }
  }

  const openSynologyUi = () => {
    browser.tabs.create({ url: hostUrl, active: true });
  };

  const pauseResumeTask = storedState.sid
    ? (taskId: string, what: 'pause' | 'resume') => {
        return (what === 'pause'
          ? DownloadStation.Task.Pause
          : DownloadStation.Task.Resume
        )(hostUrl, storedState.sid!, {
          id: [ taskId ]
        }).then(booleanifyResponse);

      }
    : undefined;

  const deleteTask = storedState.sid
    ? (taskId: string) => {
        return DownloadStation.Task.Delete(hostUrl, storedState.sid!, {
          id: [ taskId ],
          force_complete: false
        }).then(booleanifyResponse);
      }
    : undefined;

  ReactDOM.render(
    <Popup
      tasks={storedState.tasks}
      taskFilter={storedState.visibleTasks}
      failureMessage={storedState.tasksFetchFailureMessage || undefined}
      lastUpdateTimestamp={storedState.tasksFetchUpdateTimestamp || undefined}
      openSynologyUi={openSynologyUi}
      pauseResumeTask={pauseResumeTask}
      deleteTask={deleteTask}
    />
  , document.body);
});
