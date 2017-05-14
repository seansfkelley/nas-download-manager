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
import { CallbackResponse } from './popupTypes';
import { matchesFilter } from './filtering';
import { Task } from './Task';

function sortByName(task1: DownloadStationTask, task2: DownloadStationTask) {
  if (task1.title < task2.title) {
    return -1;
  } else if (task1.title > task2.title) {
    return 1;
  } else {
    return 0;
  }
}

function disabledPropAndClassName(disabled: boolean, className?: string) {
  return {
    disabled,
    className: classNames({ 'disabled': disabled }, className)
  };
}

interface PopupProps {
  tasks: DownloadStationTask[];
  taskFilter: VisibleTaskSettings;
  failureMessage?: string;
  lastUpdateTimestamp?: number;
  hasCreds: boolean;
  openSynologyUi?: () => void;
  createTask?: () => Promise<CallbackResponse>;
  pauseResumeTask?: (taskId: string, what: 'pause' | 'resume') => Promise<CallbackResponse>;
  deleteTask?: (taskId: string) => Promise<CallbackResponse>;
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

    if (!this.props.hasCreds) {
      text = 'Not logged in!';
      tooltip = 'Please check the settings page'
      classes = 'warning-message'
      icon = 'fa-exclamation-triangle'
    } else if (this.props.lastUpdateTimestamp == null) {
      text = 'Loading...';
      tooltip = 'Loading download tasks...';
      icon = 'fa-refresh fa-spin';
    } else if (this.props.failureMessage != null) {
      text = 'Error loading tasks'
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
          {...disabledPropAndClassName(this.props.openSynologyUi == null)}
        >
          <div className='fa fa-lg fa-plus'/>
        </button>
        <button
          onClick={this.props.openSynologyUi}
          title='Open Synology UI...'
          {...disabledPropAndClassName(this.props.openSynologyUi == null)}
        >
          <div className='fa fa-lg fa-share-square-o'/>
        </button>
        <button
          onClick={() => { browser.runtime.openOptionsPage(); }}
          title='Open settings...'
          className={classNames({ 'click-me': !this.props.hasCreds })}
        >
          <div className='fa fa-lg fa-cog'/>
        </button>
      </header>
    );
  }

  private renderBody() {
    if (!this.props.hasCreds) {
      return (
        <div className='no-tasks popup-body'>
          <span>
            You aren't logged in; please check the settings page.
          </span>
        </div>
      );
    } else if (this.props.lastUpdateTimestamp == null) {
      return (
        <div className='no-tasks popup-body'>
          <span>...</span>
        </div>
      );
    } else if (this.props.tasks.length === 0) {
      return (
        <div className='no-tasks popup-body'>
          <span>No download tasks.</span>
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
            <span>Download tasks exist, but none match your filters.</span>
          </div>
        );
      } else {
        return (
          <ul
            className='download-tasks popup-body'
            onScroll={this.onBodyScroll}
            ref={e => { this.bodyRef = e; }}
          >
            {this.props.tasks.sort(sortByName).map(task => (
              <Task
                task={task}
                onDelete={this.props.deleteTask}
                onPauseResume={this.props.pauseResumeTask}
              />
            ))}
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

  function convertResponse(response: SynologyResponse<any>) {
    if (response.success) {
      return 'success';
    } else {
      console.error(`failed to delete task, reason: ${errorMessageFromCode(response.error.code, 'task')}`);
      return { failMessage: errorMessageFromCode(response.error.code, 'task') };
    }
  }

  const openSynologyUi = hostUrl
    ? () => { browser.tabs.create({ url: hostUrl, active: true }); }
    : undefined;

  const pauseResumeTask = hostUrl && storedState.sid
    ? (taskId: string, what: 'pause' | 'resume') => {
        return (what === 'pause'
          ? DownloadStation.Task.Pause
          : DownloadStation.Task.Resume
        )(hostUrl, storedState.sid!, {
          id: [ taskId ]
        }).then(convertResponse);

      }
    : undefined;

  const deleteTask = hostUrl && storedState.sid
    ? (taskId: string) => {
        return DownloadStation.Task.Delete(hostUrl, storedState.sid!, {
          id: [ taskId ],
          force_complete: false
        }).then(convertResponse);
      }
    : undefined;

  ReactDOM.render(
    <Popup
      tasks={storedState.tasks}
      taskFilter={storedState.visibleTasks}
      failureMessage={storedState.tasksFetchFailureMessage || undefined}
      lastUpdateTimestamp={storedState.tasksFetchUpdateTimestamp || undefined}
      hasCreds={!!storedState.sid}
      openSynologyUi={openSynologyUi}
      createTask={undefined}
      pauseResumeTask={pauseResumeTask}
      deleteTask={deleteTask}
    />
  , document.body);
});
