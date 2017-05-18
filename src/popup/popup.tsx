import { sortBy } from 'lodash-es';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as momentProxy from 'moment';
import * as classNamesProxy from 'classnames';
import debounce from 'lodash-es/debounce';

// https://github.com/rollup/rollup/issues/1267
const moment: typeof momentProxy = (momentProxy as any).default || momentProxy;
const classNames: typeof classNamesProxy = (classNamesProxy as any).default || classNamesProxy;

import { SynologyResponse, DownloadStation, DownloadStationTask, errorMessageFromCode } from '../api';
import { VisibleTaskSettings, onStoredStateChange, getHostUrl } from '../state';
import { getSharedObjects } from '../browserApi';
import { addDownloadTask, pollTasks } from '../apiActions';
import { CallbackResponse } from './popupTypes';
import { matchesFilter } from './filtering';
import { Task } from './Task';

function disabledPropAndClassName(disabled: boolean, className?: string) {
  return {
    disabled,
    className: classNames({ 'disabled': disabled }, className)
  };
}

const NoTasks = (props: { icon: string; text?: string; }) => (
  <div className='no-tasks'>
    <span className={classNames('fa fa-2x', props.icon )}/>
    {props.text && <span className='explanation'>{props.text}</span>}
  </div>
);

interface PopupProps {
  tasks: DownloadStationTask[];
  taskFetchFailureReason: 'missing-config' | { failureMessage: string } | null;
  tasksLastInitiatedFetchTimestamp: number | null;
  tasksLastCompletedFetchTimestamp: number | null;
  taskFilter: VisibleTaskSettings;
  openDownloadStationUi?: () => void;
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

    if (this.props.taskFetchFailureReason === 'missing-config') {
      text = 'Settings unconfigured';
      tooltip = 'The hostname, username or password are not configured.';
      icon = 'fa-gear';
    } else if (this.props.tasksLastCompletedFetchTimestamp == null) {
      text = 'Loading...';
      tooltip = 'Loading download tasks...';
      icon = 'fa-refresh fa-spin';
    } else if (this.props.taskFetchFailureReason != null) {
      text = 'Error loading tasks'
      tooltip = this.props.taskFetchFailureReason.failureMessage;
      classes = 'error-message';
      icon = 'fa-exclamation-triangle';
    } else {
      text = `Updated ${moment(this.props.tasksLastCompletedFetchTimestamp).fromNow()}`;
      tooltip = moment(this.props.tasksLastCompletedFetchTimestamp).format('ll LTS');
      classes = 'success-message';
      icon = 'fa-check';
    }

    if (
      this.props.tasksLastInitiatedFetchTimestamp != null &&
      this.props.tasksLastCompletedFetchTimestamp != null &&
      this.props.tasksLastInitiatedFetchTimestamp > this.props.tasksLastCompletedFetchTimestamp
    ) {
      icon = 'fa-refresh fa-spin';
      tooltip += ' (updating now)'
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
          onClick={this.props.openDownloadStationUi}
          title='Open DownloadStation UI...'
          {...disabledPropAndClassName(this.props.openDownloadStationUi == null)}
        >
          <div className='fa fa-lg fa-share-square-o'/>
        </button>
        <button
          onClick={() => { browser.runtime.openOptionsPage(); }}
          title='Open settings...'
          className={classNames({ 'called-out': this.props.taskFetchFailureReason === 'missing-config' })}
        >
          <div className='fa fa-lg fa-cog'/>
        </button>
      </header>
    );
  }

  private renderBody() {
    if (this.props.taskFetchFailureReason === 'missing-config') {
      return <NoTasks icon='fa-gear' text='Configure your hostname, username and password in settings.'/>;
    } else if (this.props.tasksLastCompletedFetchTimestamp == null) {
      return <NoTasks icon='fa-refresh fa-spin'/>;
    } else if (this.props.tasks.length === 0) {
      return <NoTasks icon='fa-circle-o' text='No download tasks.'/>;
    } else {
      const filteredTasks = this.props.tasks.filter(t =>
        (this.props.taskFilter.downloading && matchesFilter(t, 'downloading')) ||
        (this.props.taskFilter.uploading && matchesFilter(t, 'uploading')) ||
        (this.props.taskFilter.completed && matchesFilter(t, 'completed')) ||
        (this.props.taskFilter.errored && matchesFilter(t, 'errored')) ||
        (this.props.taskFilter.other && matchesFilter(t, 'other'))
      );
      if (filteredTasks.length === 0) {
        return <NoTasks icon='fa-filter' text='Download tasks exist, but none match your filters.'/>;
      } else {
        return (
          <ul
            className='download-tasks'
            onScroll={this.onBodyScroll}
            ref={e => { this.bodyRef = e; }}
          >
            {sortBy(this.props.tasks, t => t.title).map(task => (
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
}

getSharedObjects()
  .then(objects => {
    const { api } = objects!;

    pollTasks(api);
    setInterval(() => { pollTasks(api); }, 10000);

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

      const openDownloadStationUi = hostUrl
        ? () => {
          browser.tabs.create({
            url: hostUrl + '/index.cgi?launchApp=SYNO.SDS.DownloadStation.Application',
            active: true
          });
        }
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
          tasks={storedState.tasks}
          taskFetchFailureReason={storedState.taskFetchFailureReason}
          tasksLastInitiatedFetchTimestamp={storedState.tasksLastInitiatedFetchTimestamp}
          tasksLastCompletedFetchTimestamp={storedState.tasksLastCompletedFetchTimestamp}
          taskFilter={storedState.visibleTasks}
          openDownloadStationUi={openDownloadStationUi}
          createTask={createTask}
          pauseResumeTask={pauseResumeTask}
          deleteTask={deleteTask}
        />
      , document.body);
    });
});
