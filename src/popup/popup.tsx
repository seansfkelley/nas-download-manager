import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as momentProxy from 'moment';
import * as classNamesProxy from 'classnames';
import debounce from 'lodash-es/debounce';

// https://github.com/rollup/rollup/issues/1267
const moment: typeof momentProxy = (momentProxy as any).default || momentProxy;
const classNames: typeof classNamesProxy = (classNamesProxy as any).default || classNamesProxy;

import { DownloadStationTask } from '../api';
import { VisibleTaskSettings, onStoredStateChange, getHostUrl } from '../common';
import { TaskPoller } from '../taskPoller';
import { matchesFilter } from './filtering';

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
  hostUrl: string;
  tasks: DownloadStationTask[];
  taskFilter: VisibleTaskSettings;
  failureMessage?: string;
  lastUpdateTimestamp?: number;
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
          onClick={() => { browser.tabs.create({ url: this.props.hostUrl, active: true }) }}
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

  ReactDOM.render(
    <Popup
      hostUrl={hostUrl}
      tasks={storedState.tasks}
      taskFilter={storedState.visibleTasks}
      failureMessage={storedState.tasksFetchFailureMessage || undefined}
      lastUpdateTimestamp={storedState.tasksFetchUpdateTimestamp || undefined}
    />
  , document.body);
});
