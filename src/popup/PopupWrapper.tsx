import * as React from "react";

import {
  Settings,
  VisibleTaskSettings,
  TaskSortType,
  State as ExtensionState,
  getHostUrl,
  BadgeDisplayType,
} from "../common/state";
import { FatalErrorWrapper } from "./FatalErrorWrapper";
import { Popup, Props as PopupProps } from "./Popup";
import { AddTasks, PauseTask, ResumeTask, DeleteTasks } from "../common/apis/messages";

interface Props {
  state: ExtensionState;
  updateSettings: (settings: Settings) => void;
}

export class PopupWrapper extends React.PureComponent<Props> {
  render() {
    return (
      <FatalErrorWrapper state={this.props.state}>
        <Popup
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
        createTasks: AddTasks.send,
        pauseTask: PauseTask.send,
        resumeTask: ResumeTask.send,
        deleteTasks: DeleteTasks.send,
      };
    } else {
      return {};
    }
  }
}
