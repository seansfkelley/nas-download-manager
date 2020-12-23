import "./popup.scss";
import * as React from "react";
import classNames from "classnames";
import throttle from "lodash-es/throttle";
import type { DownloadStationTask } from "synology-typescript-api";

import type { VisibleTaskSettings, TaskSortType, BadgeDisplayType } from "../common/state";
import { sortTasks, filterTasks } from "../common/filtering";
import { TaskFilterSettingsForm } from "../common/components/TaskFilterSettingsForm";
import { NonIdealState } from "../common/components/NonIdealState";
import type { PopupClient } from "./popupClient";
import { AdvancedAddDownloadForm } from "./AdvancedAddDownloadForm";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Task } from "./Task";

export interface Props {
  tasks: DownloadStationTask[];
  taskFetchFailureReason: "missing-config" | { failureMessage: string } | null;
  tasksLastInitiatedFetchTimestamp: number | null;
  tasksLastCompletedFetchTimestamp: number | null;
  visibleTasks: VisibleTaskSettings;
  changeVisibleTasks: (visibleTasks: VisibleTaskSettings) => void;
  taskSort: TaskSortType;
  changeTaskSort: (sort: TaskSortType) => void;
  badgeDisplay: BadgeDisplayType;
  changeBadgeDisplay: (display: BadgeDisplayType) => void;
  client?: PopupClient;
}

interface State {
  isShowingDropShadow: boolean;
  isAddingDownload: boolean;
  isShowingDisplaySettings: boolean;
  isClearingCompletedTasks: boolean;
  // Bleh. If a popup grows larger in Firefox, it will leave it as such until the DOM changes and causes
  // a relayout. Therefore, after collapsing the filter panel, we want to force a layout to make it the right
  // size again. Unfortunately we can't do that by just reading a layout property like offsetHeight, we have
  // to actually change the DOM, hence we render this invisible nonce whenever we toggle the panel.
  firefoxRerenderNonce: number;
}

export class Popup extends React.PureComponent<Props, State> {
  private bodyRef?: HTMLElement;

  state: State = {
    isShowingDropShadow: false,
    isAddingDownload: false,
    isShowingDisplaySettings: false,
    isClearingCompletedTasks: false,
    firefoxRerenderNonce: 0,
  };

  render() {
    const completedTaskIds = this.props.tasks
      .filter((t) => t.status === "finished")
      .map((t) => t.id);
    const onClickClearTasks = this.props.client
      ? async () => {
          this.setState({ isClearingCompletedTasks: true });
          await this.props.client!.deleteTasks(completedTaskIds);
          this.setState({ isClearingCompletedTasks: false });
        }
      : undefined;

    return (
      <div className="popup">
        <Header
          isAddingDownload={this.state.isAddingDownload}
          onClickAddDownload={
            this.props.client != null
              ? () => {
                  this.setState({
                    isAddingDownload: !this.state.isAddingDownload,
                    isShowingDisplaySettings: false,
                  });
                }
              : undefined
          }
          completedTaskCount={completedTaskIds.length}
          onClickClearTasks={this.state.isClearingCompletedTasks ? "pending" : onClickClearTasks}
          onClickOpenDownloadStationUi={this.props.client?.openDownloadStationUi}
          isShowingDisplaySettings={this.state.isShowingDisplaySettings}
          onClickDisplaySettings={() => {
            this.setState({
              isShowingDisplaySettings: !this.state.isShowingDisplaySettings,
              isAddingDownload: false,
            });
          }}
          isMissingConfig={this.props.taskFetchFailureReason === "missing-config"}
          showDropShadow={this.state.isShowingDropShadow}
          disabledLogo={this.props.taskFetchFailureReason != null}
        />
        <div
          className={classNames("display-settings", {
            "is-visible": this.state.isShowingDisplaySettings,
          })}
        >
          <h4 className="title">{browser.i18n.getMessage("Task_Display_Settings")}</h4>
          <TaskFilterSettingsForm
            visibleTasks={this.props.visibleTasks}
            taskSortType={this.props.taskSort}
            badgeDisplayType={this.props.badgeDisplay}
            updateTaskTypeVisibility={this.updateTaskTypeVisibility}
            updateTaskSortType={this.props.changeTaskSort}
            updateBadgeDisplayType={this.props.changeBadgeDisplay}
          />
        </div>
        <div
          className={classNames("popup-body", { "with-foreground": this.state.isAddingDownload })}
          onScroll={this.onBodyScroll}
          ref={(e) => {
            this.bodyRef = e ?? undefined;
          }}
        >
          {this.renderTaskList()}
          {this.maybeRenderAddDownloadOverlay()}
        </div>
        <Footer
          tasks={this.props.tasks}
          taskFetchFailureReason={this.props.taskFetchFailureReason}
          tasksLastInitiatedFetchTimestamp={this.props.tasksLastInitiatedFetchTimestamp}
          tasksLastCompletedFetchTimestamp={this.props.tasksLastCompletedFetchTimestamp}
        />
        <div style={{ display: "none" }}>{this.state.firefoxRerenderNonce}</div>
      </div>
    );
  }

  private updateTaskTypeVisibility = (taskType: keyof VisibleTaskSettings, visibility: boolean) => {
    this.props.changeVisibleTasks({
      ...this.props.visibleTasks,
      [taskType]: visibility,
    });
  };

  private renderTaskList() {
    if (this.props.taskFetchFailureReason === "missing-config") {
      return (
        <NonIdealState
          icon="fa-cog"
          text={browser.i18n.getMessage(
            "Configure_your_hostname_username_and_password_in_settings",
          )}
        />
      );
    } else if (this.props.tasksLastCompletedFetchTimestamp == null) {
      return <NonIdealState icon="fa-sync fa-spin" />;
    } else if (this.props.tasks.length === 0) {
      return <NonIdealState text={browser.i18n.getMessage("No_download_tasks")} />;
    } else {
      const filteredTasks = filterTasks(this.props.tasks, this.props.visibleTasks);
      if (filteredTasks.length === 0) {
        return (
          <NonIdealState
            icon="fa-filter"
            text={browser.i18n.getMessage("Download_tasks_exist_but_none_match_your_filters")}
          />
        );
      } else {
        const hiddenTaskCount = this.props.tasks.length - filteredTasks.length;
        const deleteTask = this.props.client
          ? (taskId: string) => this.props.client!.deleteTasks([taskId])
          : undefined;
        return (
          <div className="download-tasks">
            <ul>
              {sortTasks(filteredTasks, this.props.taskSort).map((task) => (
                <Task
                  key={task.id}
                  task={task}
                  onDelete={deleteTask}
                  onPause={this.props.client?.pauseTask}
                  onResume={this.props.client?.resumeTask}
                />
              ))}
            </ul>
            {hiddenTaskCount > 0 && (
              <div
                className="hidden-count"
                onClick={() => {
                  this.setState({ isShowingDisplaySettings: true });
                }}
              >
                {browser.i18n.getMessage("and_ZcountZ_more_tasks_hidden_by_filters", [
                  hiddenTaskCount,
                ])}
              </div>
            )}
          </div>
        );
      }
    }
  }

  private maybeRenderAddDownloadOverlay() {
    if (this.state.isAddingDownload && this.props.client) {
      return (
        <div className="add-download-overlay">
          <div className="backdrop" />
          <div className="overlay-content">
            <AdvancedAddDownloadForm
              onClose={() => {
                this.setState({ isAddingDownload: false });
              }}
              client={this.props.client}
            />
          </div>
        </div>
      );
    } else {
      return null;
    }
  }

  private onBodyScroll = throttle(() => {
    if (this.bodyRef) {
      this.setState({ isShowingDropShadow: this.bodyRef.scrollTop !== 0 });
    } else {
      this.setState({ isShowingDropShadow: false });
    }
  }, 200);

  componentDidUpdate(_prevProps: Props, prevState: State) {
    if (prevState.isShowingDisplaySettings !== this.state.isShowingDisplaySettings) {
      setTimeout(() => {
        this.setState({ firefoxRerenderNonce: this.state.firefoxRerenderNonce + 1 });
      }, 350);
    }
  }
}
