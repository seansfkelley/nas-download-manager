import { sortBy } from 'lodash-es';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as momentProxy from 'moment';
import * as classNamesProxy from 'classnames';
import debounce from 'lodash-es/debounce';
import { SynologyResponse, DownloadStationTask, ApiClient } from 'synology-typescript-api';

// https://github.com/rollup/rollup/issues/1267
const moment: typeof momentProxy = (momentProxy as any).default || momentProxy;
const classNames: typeof classNamesProxy = (classNamesProxy as any).default || classNamesProxy;

import { AdvancedAddDownloadForm } from '../common/AdvancedAddDownloadForm';
import { VisibleTaskSettings, onStoredStateChange, getHostUrl } from '../state';
import { getSharedObjects } from '../browserApi';
import { addDownloadTaskAndPoll, pollTasks } from '../apiActions';
import { CallbackResponse } from './popupTypes';
import { matchesFilter } from './filtering';
import { Task } from './Task';
import { errorMessageFromCode } from '../apiErrors';
import { shimExtensionApi } from '../apiShim';

shimExtensionApi();

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
  api: ApiClient;
  tasks: DownloadStationTask[];
  taskFetchFailureReason: 'missing-config' | { failureMessage: string } | null;
  tasksLastInitiatedFetchTimestamp: number | null;
  tasksLastCompletedFetchTimestamp: number | null;
  taskFilter: VisibleTaskSettings;
  openDownloadStationUi?: () => void;
  createTask?: (url: string, path?: string) => Promise<void>;
  pauseTask?: (taskId: string) => Promise<CallbackResponse>;
  resumeTask?: (taskId: string) => Promise<CallbackResponse>;
  deleteTask?: (taskId: string) => Promise<CallbackResponse>;
}

interface State {
  shouldShowDropShadow: boolean;
  isAddingDownload: boolean;
}

class Popup extends React.PureComponent<PopupProps, State> {
  private bodyRef?: HTMLElement;

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
      text = browser.i18n.getMessage('Settings_unconfigured');
      tooltip = browser.i18n.getMessage('The_hostname_username_or_password_are_not_configured');
      icon = 'fa-gear';
    } else if (this.props.tasksLastCompletedFetchTimestamp == null) {
      text = browser.i18n.getMessage('Updating');
      tooltip = browser.i18n.getMessage('Updating_download_tasks');
      icon = 'fa-refresh fa-spin';
    } else if (this.props.taskFetchFailureReason != null) {
      text = browser.i18n.getMessage('Error_updating_tasks');
      tooltip = this.props.taskFetchFailureReason.failureMessage;
      classes = 'intent-error';
      icon = 'fa-exclamation-triangle';
    } else {
      text = browser.i18n.getMessage('Updated_$time$', moment(this.props.tasksLastCompletedFetchTimestamp).fromNow());
      tooltip = moment(this.props.tasksLastCompletedFetchTimestamp).format('ll LTS');
      classes = 'intent-success';
      icon = 'fa-check';
    }

    if (
      this.props.tasksLastInitiatedFetchTimestamp != null &&
      this.props.tasksLastCompletedFetchTimestamp != null &&
      this.props.tasksLastInitiatedFetchTimestamp > this.props.tasksLastCompletedFetchTimestamp
    ) {
      icon = 'fa-refresh fa-spin';
      tooltip += ' ' + browser.i18n.getMessage('updating_now');
    }

    return (
      <header className={classNames({ 'with-shadow': this.state.shouldShowDropShadow })}>
        <div className={classNames('description', classes)} title={tooltip}>
          <div className={classNames('fa fa-lg', icon)}/>
          {text}
        </div>
        <button
          onClick={() => { this.setState({ isAddingDownload: !this.state.isAddingDownload }); }}
          title={browser.i18n.getMessage('Add_download')}
          {...disabledPropAndClassName(this.props.createTask == null)}
        >
          <div className='fa fa-lg fa-plus'/>
        </button>
        <button
          onClick={this.props.openDownloadStationUi}
          title={browser.i18n.getMessage('Open_DownloadStation_UI')}
          {...disabledPropAndClassName(this.props.openDownloadStationUi == null)}
        >
          <div className='fa fa-lg fa-share-square-o'/>
        </button>
        <button
          onClick={() => { browser.runtime.openOptionsPage(); }}
          title={browser.i18n.getMessage('Open_settings')}
          className={classNames({ 'called-out': this.props.taskFetchFailureReason === 'missing-config' })}
        >
          <div className='fa fa-lg fa-cog'/>
        </button>
      </header>
    );
  }

  private renderBody() {
    if (this.props.taskFetchFailureReason === 'missing-config') {
      return <NoTasks icon='fa-gear' text={browser.i18n.getMessage('Configure_your_hostname_username_and_password_in_settings')}/>;
    } else if (this.props.tasksLastCompletedFetchTimestamp == null) {
      return <NoTasks icon='fa-refresh fa-spin'/>;
    } else if (this.props.tasks.length === 0) {
      return <NoTasks icon='fa-circle-o' text={browser.i18n.getMessage('No_download_tasks')}/>;
    } else {
      const filteredTasks = this.props.tasks.filter(t =>
        (this.props.taskFilter.downloading && matchesFilter(t, 'downloading')) ||
        (this.props.taskFilter.uploading && matchesFilter(t, 'uploading')) ||
        (this.props.taskFilter.completed && matchesFilter(t, 'completed')) ||
        (this.props.taskFilter.errored && matchesFilter(t, 'errored')) ||
        (this.props.taskFilter.other && matchesFilter(t, 'other'))
      );
      if (filteredTasks.length === 0) {
        return <NoTasks icon='fa-filter' text={browser.i18n.getMessage('Download_tasks_exist_but_none_match_your_filters"')}/>;
      } else {
        const hiddenTaskCount = this.props.tasks.length - filteredTasks.length;
        return (
          <div className='download-tasks'>
            <ul
              onScroll={this.onBodyScroll}
              ref={e => { this.bodyRef = e; }}
            >
              {sortBy(filteredTasks, t => t.title.toLocaleLowerCase()).map(task => (
                <Task
                  key={task.id}
                  task={task}
                  onDelete={this.props.deleteTask}
                  onPause={this.props.pauseTask}
                  onResume={this.props.resumeTask}
                />
              ))}
            </ul>
            {hiddenTaskCount > 0 && (
              <div className='hidden-count' onClick={() => { browser.runtime.openOptionsPage(); }}>
                {browser.i18n.getMessage('and_$count$_more_hidden_tasks', hiddenTaskCount)}
              </div>)}
          </div>
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
            <AdvancedAddDownloadForm
              client={this.props.api}
              onCancel={() => { this.setState({ isAddingDownload: false }); }}
              onAddDownload={(url, path) => {
                this.props.createTask!(url, path);
                this.setState({ isAddingDownload: false });
              }}
            />
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

const ELEMENT = document.getElementById('body')!;

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
          const reason = errorMessageFromCode(response.error.code, 'DownloadStation.Task');
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
        ? (url: string, path?: string) => {
            return addDownloadTaskAndPoll(api, url, path);
          }
        : undefined;

      const pauseTask = hostUrl
        ? (taskId: string) => {
            return api.DownloadStation.Task.Pause({ id: [ taskId ] })
              .then(convertResponse)
              .then(reloadOnSuccess);
          }
        : undefined;

      const resumeTask = hostUrl
        ? (taskId: string) => {
            return api.DownloadStation.Task.Resume({ id: [ taskId ] })
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
          api={api}
          tasks={storedState.tasks}
          taskFetchFailureReason={storedState.taskFetchFailureReason}
          tasksLastInitiatedFetchTimestamp={storedState.tasksLastInitiatedFetchTimestamp}
          tasksLastCompletedFetchTimestamp={storedState.tasksLastCompletedFetchTimestamp}
          taskFilter={storedState.visibleTasks}
          openDownloadStationUi={openDownloadStationUi}
          createTask={createTask}
          pauseTask={pauseTask}
          resumeTask={resumeTask}
          deleteTask={deleteTask}
        />
      , ELEMENT);
    });
});
