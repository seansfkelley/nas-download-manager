import * as React from "react";
import { ApiClient } from "synology-typescript-api";

import {
  Settings,
  VisibleTaskSettings,
  TaskSortType,
  State as ExtensionState,
  getHostUrl,
} from "../common/state";
import { pollTasks, addDownloadTaskAndPoll } from "../common/apis/actions";
import { FatalErrorWrapper } from "./FatalErrorWrapper";
import { Popup, Props as PopupProps } from "./Popup";
import { CallbackResponse } from "./popupTypes";

interface Props {
  api: ApiClient;
  state: ExtensionState;
  updateSettings: (settings: Partial<Settings>) => void;
}

export class PopupWrapper extends React.PureComponent<Props> {
  render() {
    return (
      <FatalErrorWrapper state={this.props.state}>
        <Popup
          api={this.props.api}
          tasks={this.props.state.tasks}
          taskFetchFailureReason={this.props.state.taskFetchFailureReason}
          tasksLastInitiatedFetchTimestamp={this.props.state.tasksLastInitiatedFetchTimestamp}
          tasksLastCompletedFetchTimestamp={this.props.state.tasksLastCompletedFetchTimestamp}
          visibleTasks={this.props.state.visibleTasks}
          changeVisibleTasks={this.changeVisibleTasks}
          taskSort={this.props.state.taskSortType}
          changeTaskSort={this.changeSortType}
          {...this.makeCallbacks()}
        />
      </FatalErrorWrapper>
    );
  }

  private async reloadOnSuccess(response: CallbackResponse): Promise<CallbackResponse> {
    if (response === "success") {
      await pollTasks(this.props.api);
    }
    return response;
  }

  private changeVisibleTasks = (visibleTasks: VisibleTaskSettings) => {
    this.props.updateSettings({ visibleTasks });
  };

  private changeSortType = (taskSortType: TaskSortType) => {
    this.props.updateSettings({ taskSortType });
  };

  private makeCallbacks(): Partial<PopupProps> {
    const hostUrl = getHostUrl(this.props.state.connection);
    if (hostUrl) {
      return {
        openDownloadStationUi: () => {
          browser.tabs.create({
            url: hostUrl + "/index.cgi?launchApp=SYNO.SDS.DownloadStation.Application",
            active: true,
          });
        },
        createTask: (url: string, path?: string) =>
          addDownloadTaskAndPoll(
            this.props.api,
            this.props.state.notifications.enableFeedbackNotifications,
            url,
            path,
          ),
        pauseTask: async (taskId: string) =>
          this.reloadOnSuccess(
            CallbackResponse.from(
              await this.props.api.DownloadStation.Task.Pause({ id: [taskId] }),
            ),
          ),
        resumeTask: async (taskId: string) =>
          this.reloadOnSuccess(
            CallbackResponse.from(
              await this.props.api.DownloadStation.Task.Resume({ id: [taskId] }),
            ),
          ),
        deleteTasks: async (taskIds: string[]) =>
          this.reloadOnSuccess(
            CallbackResponse.from(
              await this.props.api.DownloadStation.Task.Delete({
                id: taskIds,
                force_complete: false,
              }),
            ),
          ),
      };
    } else {
      return {};
    }
  }
}
