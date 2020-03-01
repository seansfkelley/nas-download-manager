import * as React from "react";
import { ApiClient } from "synology-typescript-api";

import {
  Settings,
  VisibleTaskSettings,
  TaskSortType,
  State as ExtensionState,
  getHostUrl,
  BadgeDisplayType,
} from "../common/state";
import { pollTasks } from "../common/apis/actions";
import { FatalErrorWrapper } from "./FatalErrorWrapper";
import { Popup, Props as PopupProps } from "./Popup";
import { CallbackResponse } from "./popupTypes";
import { AddTasksMessage } from "../common/apis/messages";

interface Props {
  api: ApiClient;
  state: ExtensionState;
  updateSettings: (settings: Settings) => void;
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
          visibleTasks={this.props.state.settings.visibleTasks}
          changeVisibleTasks={this.changeVisibleTasks}
          taskSort={this.props.state.settings.taskSortType}
          changeTaskSort={this.changeSortType}
          badgeDisplay={this.props.state.settings.badgeDisplayType}
          changeBadgeDisplay={this.changeBadgeDisplay}
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
    this.props.updateSettings({ ...this.props.state.settings, visibleTasks });
  };

  private changeSortType = (taskSortType: TaskSortType) => {
    this.props.updateSettings({ ...this.props.state.settings, taskSortType });
  };

  private changeBadgeDisplay = (badgeDisplayType: BadgeDisplayType) => {
    this.props.updateSettings({ ...this.props.state.settings, badgeDisplayType });
  };

  private makeCallbacks(): Partial<PopupProps> {
    const hostUrl = getHostUrl(this.props.state.settings.connection);
    if (hostUrl) {
      return {
        openDownloadStationUi: () => {
          browser.tabs.create({
            url: hostUrl + "/index.cgi?launchApp=SYNO.SDS.DownloadStation.Application",
            active: true,
          });
        },
        createTasks: (urls: string[], path?: string) => AddTasksMessage.send(urls, path),
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
