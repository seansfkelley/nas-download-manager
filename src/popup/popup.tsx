import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as momentProxy from 'moment';
import * as classNamesProxy from 'classnames';
import debounce from 'lodash-es/debounce';

// https://github.com/rollup/rollup/issues/1267
const moment: typeof momentProxy = (momentProxy as any).default || momentProxy;
const classNames: typeof classNamesProxy = (classNamesProxy as any).default || classNamesProxy;

import { SynologyResponse, DownloadStationTask, errorMessageFromCode } from '../api';
import { VisibleTaskSettings, onStoredStateChange, getSharedObjects, getHostUrl } from '../common';
import { pollTasks } from '../pollTasks';
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

    if (this.props.lastUpdateTimestamp == null) {
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
      tooltip = moment(this.props.lastUpdateTimestamp).format('ll LTS');
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

getSharedObjects()
  .then(objects => {
    const { api } = objects!;

    onStoredStateChange(storedState => {
      function convertResponse(response: SynologyResponse<any>): CallbackResponse {
        if (response.success) {
          return 'success';
        } else {
          console.error(`API call failed, reason: ${errorMessageFromCode(response.error.code, 'task')}`);
          return { failMessage: errorMessageFromCode(response.error.code, 'task') };
        }
      }

      function reloadOnSuccess(response: CallbackResponse) {
        if (response === 'success') {
          return pollTasks(api)
            .then(() => response);
        } else {
          return response;
        }
      }

      const hostUrl = getHostUrl(storedState.connection);

      const openSynologyUi = hostUrl
        ? () => { browser.tabs.create({ url: hostUrl, active: true }); }
        : undefined;

      const pauseResumeTask = hostUrl
        ? (taskId: string, what: 'pause' | 'resume') => {
            return (what === 'pause'
              ? api.DownloadStation.Task.Pause
              : api.DownloadStation.Task.Resume
            )({
              id: [ taskId ]
            })
              .then(convertResponse)
              .then(reloadOnSuccess);
          }
        : undefined;

      const deleteTask = hostUrl
        ? (taskId: string) => {
            return api.DownloadStation.Task.Delete({
              id: [ taskId ],
              force_complete: false
            })
              .then(convertResponse)
              .then(reloadOnSuccess);
          }
        : undefined;

      ReactDOM.render(
        <Popup
          tasks={storedState.tasks}
          taskFilter={storedState.visibleTasks}
          failureMessage={storedState.tasksFetchFailureMessage || undefined}
          lastUpdateTimestamp={storedState.tasksFetchUpdateTimestamp || undefined}
          openSynologyUi={openSynologyUi}
          createTask={undefined}
          pauseResumeTask={pauseResumeTask}
          deleteTask={deleteTask}
        />
      , document.body);
    });
});
