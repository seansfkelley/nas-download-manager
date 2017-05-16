import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as momentProxy from 'moment';
import * as classNamesProxy from 'classnames';
import debounce from 'lodash-es/debounce';

// https://github.com/rollup/rollup/issues/1267
const moment: typeof momentProxy = (momentProxy as any).default || momentProxy;
const classNames: typeof classNamesProxy = (classNamesProxy as any).default || classNamesProxy;

import { SynologyResponse, DownloadStation, DownloadStationTask, errorMessageFromCode } from '../api';
import { VisibleTaskSettings, onStoredStateChange, getSharedObjects, getHostUrl } from '../common';
import { addDownloadTask, pollTasks } from '../apiActions';
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
  pollTasks: () => void;
  tasks: DownloadStationTask[];
  taskFilter: VisibleTaskSettings;
  failureMessage?: string;
  lastUpdateTimestamp?: number;
  openSynologyUi?: () => void;
  createTask?: (url: string) => Promise<void>;
  pauseResumeTask?: (taskId: string, what: 'pause' | 'resume') => Promise<CallbackResponse>;
  deleteTask?: (taskId: string) => Promise<CallbackResponse>;
}

interface State {
  shouldShowDropShadow: boolean;
  isAddingDownload: boolean;
}

class Popup extends React.PureComponent<PopupProps, State> {
  private bodyRef?: HTMLElement;
  private addDownloadUrlRef?: HTMLTextAreaElement;
  private pollingInterval?: number;

  state: State = {
    shouldShowDropShadow: false,
    isAddingDownload: false
  };

  render() {
    return (
      <div className='popup'>
        {this.renderHeader()}
        <div className={classNames('popup-body', { 'with-foreground': this.state.isAddingDownload })}>
          {this.renderBody()}
          {this.maybeRenderAddDownloadOverlay()}
        </div>
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
          onClick={() => { this.setState({ isAddingDownload: !this.state.isAddingDownload }); }}
          title='Add download...'
          {...disabledPropAndClassName(this.props.createTask == null)}
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
        <div className='no-tasks'>
          <span>...</span>
        </div>
      );
    } else if (this.props.tasks.length === 0) {
      return (
        <div className='no-tasks'>
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
          <div className='no-tasks'>
            <span>Download tasks exist, but none match your filters.</span>
          </div>
        );
      } else {
        return (
          <ul
            className='download-tasks'
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

  private maybeRenderAddDownloadOverlay() {
    if (this.state.isAddingDownload) {
      return (
        <div className='add-download-overlay'>
          <div className='backdrop'/>
          <div className='overlay-content'>
            <textarea
              ref={e => { this.addDownloadUrlRef = e; }}
            />
            <div className='buttons'>
              <button
                onClick={() => { this.setState({ isAddingDownload: false }); }}
                title='Cancel adding a new task'
              >
                <span className='fa fa-lg fa-times'/> Cancel
              </button>
              <button
                onClick={() => {
                  this.props.createTask!(this.addDownloadUrlRef!.value);
                  this.setState({ isAddingDownload: false });
                }}
                title='Add the above URL as a new download task'
              >
                <span className='fa fa-lg fa-plus'/> Add
              </button>
            </div>
          </div>
        </div>
      );
    } else {
      return null;
    }
  }

  private onBodyScroll = debounce(() => {
    if (this.bodyRef) {
      this.setState({ shouldShowDropShadow: this.bodyRef.scrollTop !== 0 })
    } else {
      this.setState({ shouldShowDropShadow: false });
    }
  }, 100);

  componentDidMount() {
    this.pollingInterval = setInterval(this.props.pollTasks, 10000);
  }

  componentWillUnmount() {
    clearInterval(this.pollingInterval!);
  }
}

getSharedObjects()
  .then(objects => {
    const { api } = objects!;

    onStoredStateChange(storedState => {
      function convertResponse(response: SynologyResponse<any>): CallbackResponse {
        if (response.success) {
          return 'success';
        } else {
          const reason = errorMessageFromCode(response.error.code, DownloadStation.Task.API_NAME);
          console.error(`API call failed, reason: ${reason}`);
          return { failMessage: reason };
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

      const createTask = hostUrl
        ? (url: string) => {
          return addDownloadTask(api, url)
            .then(() => { pollTasks(api); });
        }
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
          pollTasks={() => { pollTasks(api); }}
          tasks={storedState.tasks}
          taskFilter={storedState.visibleTasks}
          failureMessage={storedState.tasksFetchFailureMessage || undefined}
          lastUpdateTimestamp={storedState.tasksFetchUpdateTimestamp || undefined}
          openSynologyUi={openSynologyUi}
          createTask={createTask}
          pauseResumeTask={pauseResumeTask}
          deleteTask={deleteTask}
        />
      , document.body);
    });
});
