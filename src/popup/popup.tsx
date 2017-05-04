import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as momentProxy from 'moment';
import * as classNamesProxy from 'classnames';

// https://github.com/rollup/rollup/issues/1267
const moment: typeof momentProxy = (momentProxy as any).default || momentProxy;
const classNames: typeof classNamesProxy = (classNamesProxy as any).default || classNamesProxy;

import { DownloadStationTask, DownloadStationTaskNormalStatus, DownloadStationTaskErrorStatus } from '../api';
import { VisibleTaskSettings, onStoredStateChange, getHostUrl } from '../common';
import { TaskPoller } from '../taskPoller';

interface PopupProps {
  tasks: DownloadStationTask[];
  taskFilter: VisibleTaskSettings;
  failureMessage?: string;
  lastUpdateTimestamp?: number;
}

const TASK_FILTER_TO_TYPES: { [K in keyof VisibleTaskSettings]: (DownloadStationTaskNormalStatus | DownloadStationTaskErrorStatus)[] | true } = {
  downloading: [ 'downloading', 'extracting', 'finishing', 'hash_checking', 'waiting' ],
  uploading: [ 'seeding' ],
  completed: [ 'finished' ],
  // This is somewhat weird but there are far more error types than "other", so we enumerate these instead.
  other: [ 'paused', 'filehosting_waiting' ],
  errored: true
};

function matchesFilter(task: DownloadStationTask, filterName: keyof VisibleTaskSettings) {
  const filter = TASK_FILTER_TO_TYPES[filterName];
  // TODO: This will mark all tasks as errored.
  return filter === true ? true : filter.indexOf(task.status) !== -1;
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

    if (this.props.lastUpdateTimestamp == null) {
      text = 'Loading...';
      tooltip = 'Loading download tasks...';
    } else if (this.props.failureMessage != null) {
      text = tooltip = this.props.failureMessage;
      classes = 'error-message';
    } else {
      text = `Updated ${moment(this.props.lastUpdateTimestamp).fromNow()}`;
      tooltip = moment(this.props.lastUpdateTimestamp).format('lll');
    }

    return (
      <header>
        <span className={classes} title={tooltip}>
          {text}
        </span>
        <span
          className='fa fa-lg fa-plus'
          onClick={() => { console.log('plus'); }}
        />
        <span
          className='fa fa-lg fa-cog'
          onClick={() => { browser.runtime.openOptionsPage(); }}
        />
      </header>
    );
  }

  private renderBody() {
    if (this.props.lastUpdateTimestamp == null) {
      return (
        <div className='no-tasks'>
          Loading...
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
            {this.props.tasks.map(task => {
              const downloadedFraction = Math.round(task.additional!.transfer!.size_downloaded / task.size * 100) / 100;
              return (
                <li className='task' key={task.id}>
                  <span className='header'>
                    <span className='name'>{task.title}</span>
                    <span className='status'>{task.status}</span>
                    <span className='fa fa-times remove-button'/>
                  </span>
                  <span className='progress-bar'>
                    <span
                      className={classNames('bar-fill', {
                        'in-progress': matchesFilter(task, 'downloading' ),
                        'completed': matchesFilter(task, 'uploading') || matchesFilter(task, 'completed'),
                        'errored': matchesFilter(task, 'errored'),
                        'unknown': matchesFilter(task, 'other')
                      })}
                      style={{ width: downloadedFraction }}
                    />
                    <span className='bar-background'/>
                  </span>
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
