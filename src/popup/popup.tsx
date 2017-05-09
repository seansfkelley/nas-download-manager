import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as momentProxy from 'moment';
import * as classNamesProxy from 'classnames';

// https://github.com/rollup/rollup/issues/1267
const moment: typeof momentProxy = (momentProxy as any).default || momentProxy;
const classNames: typeof classNamesProxy = (classNamesProxy as any).default || classNamesProxy;

import { DownloadStationTask, DownloadStationTaskNormalStatus, DownloadStationTaskErrorStatus, ALL_TASK_ERROR_STATUSES, ALL_TASK_NORMAL_STATUSES } from '../api';
import { VisibleTaskSettings, onStoredStateChange, getHostUrl } from '../common';
import { TaskPoller } from '../taskPoller';

interface PopupProps {
  tasks: DownloadStationTask[];
  taskFilter: VisibleTaskSettings;
  failureMessage?: string;
  lastUpdateTimestamp?: number;
}

const EXPLICIT_TASK_FILTER_TO_NORMAL_TYPES: { [K in keyof VisibleTaskSettings]?: DownloadStationTaskNormalStatus[] } = {
  downloading: [ 'downloading', 'extracting', 'finishing', 'hash_checking', 'waiting' ],
  uploading: [ 'seeding' ],
  completed: [ 'finished' ]
};

const EXPLICITLY_SPECIFIED_TYPES = (Object.keys(EXPLICIT_TASK_FILTER_TO_NORMAL_TYPES) as (keyof VisibleTaskSettings)[])
    .reduce((acc, key) => acc.concat(EXPLICIT_TASK_FILTER_TO_NORMAL_TYPES[key]!), [] as DownloadStationTaskNormalStatus[]);

const ERRORED_TYPES = (ALL_TASK_ERROR_STATUSES as (DownloadStationTaskNormalStatus | DownloadStationTaskErrorStatus)[])
  .concat(ALL_TASK_NORMAL_STATUSES.filter(status => EXPLICITLY_SPECIFIED_TYPES.indexOf(status) === -1));

const OTHER_STATUSES = (ALL_TASK_ERROR_STATUSES as (DownloadStationTaskNormalStatus | DownloadStationTaskErrorStatus)[])
  .concat(ALL_TASK_NORMAL_STATUSES)
  .filter(status => EXPLICITLY_SPECIFIED_TYPES.indexOf(status as any) === -1 && ERRORED_TYPES.indexOf(status) === -1);

const TASK_FILTER_TO_TYPES: { [K in keyof VisibleTaskSettings]: (DownloadStationTaskNormalStatus | DownloadStationTaskErrorStatus)[] } = {
  downloading: [],
  uploading: [],
  completed: [],
  ...EXPLICIT_TASK_FILTER_TO_NORMAL_TYPES,
  errored: ERRORED_TYPES,
  other: OTHER_STATUSES
};

function matchesFilter(task: DownloadStationTask, filterName: keyof VisibleTaskSettings) {
  return TASK_FILTER_TO_TYPES[filterName].indexOf(task.status) !== -1;
}

function sortByName(task1: DownloadStationTask, task2: DownloadStationTask) {
  if (task1.title < task2.title) {
    return -1;
  } else if (task1.title > task2.title) {
    return 1;
  } else {
    return 0;
  }
}

class Popup extends React.PureComponent<PopupProps, void> {
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
      <header>
        <div className={classNames('description', classes)} title={tooltip}>
          <div className={classNames('fa fa-lg', icon)}/>
          {text}
        </div>
        <button onClick={() => { console.log('plus'); }}>
          <div className='fa fa-lg fa-plus'/>
        </button>
        <button onClick={() => { browser.runtime.openOptionsPage(); }}>
          <div className='fa fa-lg fa-cog'/>
        </button>
      </header>
    );
  }

  private renderBody() {
    if (this.props.lastUpdateTimestamp == null) {
      return (
        <div className='no-tasks'>
          ...
        </div>
      );
    } else if (this.props.tasks.length === 0) {
      return (
        <div className='no-tasks'>
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
          <div className='no-tasks'>
            Download tasks exist, but none match your filters.
          </div>
        );
      } else {
        return (
          <ul className='download-tasks'>
            {this.props.tasks.sort(sortByName).map(task => {
              const downloadedFraction = Math.round(task.additional!.transfer!.size_downloaded / task.size * 100) / 100;
              return (
                <li className='task' key={task.id}>
                  <div className='header'>
                    <div className='name-and-status'>
                      <div className='name'>{task.title}</div>
                      <div className='status'>{task.status} {'\u2013'} {task.additional!.transfer!.speed_upload} u / {task.additional!.transfer!.speed_download} d</div>
                    </div>
                    <div className='fa fa-times remove-button'/>
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
}

const poller = new TaskPoller({
  interval: 10,
  enabled: true
});

onStoredStateChange(storedState => {
  poller.updateSettings({
    hostname: getHostUrl(storedState.connection),
    sid: storedState.sid
  });

  ReactDOM.render(
    <Popup
      tasks={storedState.tasks}
      taskFilter={storedState.visibleTasks}
      failureMessage={storedState.tasksFetchFailureMessage || undefined}
      lastUpdateTimestamp={storedState.tasksFetchUpdateTimestamp || undefined}
    />
  , document.body);
});
