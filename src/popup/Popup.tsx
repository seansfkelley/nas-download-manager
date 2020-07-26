import * as React from "react";
import classNames from "classnames";
import debounce from "lodash-es/debounce";
import type { DownloadStationTask, ApiClient } from "synology-typescript-api";

import { moment } from "../common/moment";
import type { VisibleTaskSettings, TaskSortType, BadgeDisplayType } from "../common/state";
import { sortTasks, filterTasks } from "../common/filtering";
import { formatMetric1024 } from "../common/format";
import { AdvancedAddDownloadForm } from "./AdvancedAddDownloadForm";
import { TaskFilterSettingsForm } from "../common/components/TaskFilterSettingsForm";
import type { CallbackResponse, AddTaskOptions } from "../common/apis/messages";
import { Task } from "./Task";
import { NonIdealState } from "../common/components/NonIdealState";

function disabledPropAndClassName(disabled: boolean, className?: string) {
  return {
    disabled,
    className: classNames({ disabled: disabled }, className),
  };
}

export interface Props {
  api: ApiClient;
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
  openDownloadStationUi?: () => void;
  createTasks?: (urls: string[], options?: AddTaskOptions) => void;
  pauseTask?: (taskId: string) => Promise<CallbackResponse>;
  resumeTask?: (taskId: string) => Promise<CallbackResponse>;
  deleteTasks?: (taskIds: string[]) => Promise<CallbackResponse>;
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
    return (
      <div className="popup">
        {this.renderHeader()}
        {this.renderDisplaySettings()}
        <div
          className={classNames("popup-body", { "with-foreground": this.state.isAddingDownload })}
        >
          {this.renderTaskList()}
          {this.maybeRenderAddDownloadOverlay()}
        </div>
        {this.renderFooter()}
        <div style={{ display: "none" }}>{this.state.firefoxRerenderNonce}</div>
      </div>
    );
  }

  private renderHeader() {
    let text: string;
    let tooltip: string;
    let classes: string | undefined = undefined;
    let leftIcon: string;
    let rightIcon: string | undefined = undefined;

    if (this.props.taskFetchFailureReason === "missing-config") {
      text = browser.i18n.getMessage("Settings_unconfigured");
      tooltip = browser.i18n.getMessage("The_hostname_username_or_password_are_not_configured");
      leftIcon = "fa-cog";
    } else if (this.props.tasksLastCompletedFetchTimestamp == null) {
      text = browser.i18n.getMessage("Updating");
      tooltip = browser.i18n.getMessage("Updating_download_tasks");
      leftIcon = "fa-sync fa-spin";
    } else if (this.props.taskFetchFailureReason != null) {
      text = browser.i18n.getMessage("Error_updating_tasks");
      tooltip = this.props.taskFetchFailureReason.failureMessage;
      classes = "intent-error";
      leftIcon = "fa-exclamation-triangle";
      rightIcon = "fa-info-circle";
    } else {
      text = browser.i18n.getMessage("Updated_ZtimeZ", [
        moment(this.props.tasksLastCompletedFetchTimestamp).fromNow(),
      ]);
      tooltip = moment(this.props.tasksLastCompletedFetchTimestamp).format("ll LTS");
      classes = "intent-success";
      leftIcon = "fa-check";
    }

    if (
      this.props.tasksLastInitiatedFetchTimestamp != null &&
      this.props.tasksLastCompletedFetchTimestamp != null &&
      this.props.tasksLastInitiatedFetchTimestamp > this.props.tasksLastCompletedFetchTimestamp
    ) {
      leftIcon = "fa-sync fa-spin";
      tooltip += " " + browser.i18n.getMessage("updating_now");
    }

    return (
      <header className={classNames({ "with-shadow": this.state.isShowingDropShadow })}>
        <div className={classNames("description", classes)} title={tooltip}>
          <span className={classNames("left-icon fa", leftIcon)} />
          {text}
          {rightIcon && <span className={classNames("right-icon fa", rightIcon)} />}
        </div>
        <button
          onClick={() => {
            this.setState({ isAddingDownload: !this.state.isAddingDownload });
          }}
          title={browser.i18n.getMessage("Add_download")}
          {...disabledPropAndClassName(this.props.createTasks == null)}
        >
          <div className="fa fa-lg fa-plus" />
        </button>
        <button
          onClick={this.props.openDownloadStationUi}
          title={browser.i18n.getMessage("Open_DownloadStation_UI")}
          {...disabledPropAndClassName(this.props.openDownloadStationUi == null)}
        >
          <div className="fa fa-lg fa-external-link-alt" />
        </button>
        <button
          onClick={() => {
            this.setState({ isShowingDisplaySettings: !this.state.isShowingDisplaySettings });
          }}
          title={browser.i18n.getMessage("Show_task_display_settings")}
          className={classNames({ active: this.state.isShowingDisplaySettings })}
        >
          <div className="fa fa-lg fa-filter" />
        </button>
        <button
          onClick={() => {
            browser.runtime.openOptionsPage();
          }}
          title={browser.i18n.getMessage("Open_settings")}
          className={classNames({
            "called-out": this.props.taskFetchFailureReason === "missing-config",
          })}
        >
          <div className="fa fa-lg fa-cog" />
        </button>
      </header>
    );
  }

  private renderDisplaySettings() {
    const completedTaskIds = this.props.tasks
      .filter((t) => t.status === "finished")
      .map((t) => t.id);
    const deleteTasks = this.props.deleteTasks
      ? async () => {
          this.setState({ isClearingCompletedTasks: true });
          await this.props.deleteTasks!(completedTaskIds);
          this.setState({ isClearingCompletedTasks: false });
        }
      : undefined;
    return (
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
        <button
          onClick={deleteTasks}
          title={browser.i18n.getMessage(
            "Clear_tasks_that_are_completed_and_not_currently_uploading",
          )}
          {...disabledPropAndClassName(
            this.state.isClearingCompletedTasks ||
              deleteTasks == null ||
              completedTaskIds.length === 0,
            "clear-completed-tasks-button",
          )}
        >
          {browser.i18n.getMessage("Clear_ZcountZ_Completed_Tasks", [completedTaskIds.length])}
          {this.state.isClearingCompletedTasks && <span className="fa fa-sync fa-spin" />}
        </button>
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
          icon="fa-gear"
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
        const deleteTask = this.props.deleteTasks
          ? (taskId: string) => this.props.deleteTasks!([taskId])
          : undefined;
        return (
          <div className="download-tasks">
            <ul
              onScroll={this.onBodyScroll}
              ref={(e) => {
                this.bodyRef = e || undefined;
              }}
            >
              {sortTasks(filteredTasks, this.props.taskSort).map((task) => (
                <Task
                  key={task.id}
                  task={task}
                  onDelete={deleteTask}
                  onPause={this.props.pauseTask}
                  onResume={this.props.resumeTask}
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
    if (this.state.isAddingDownload) {
      return (
        <div className="add-download-overlay">
          <div className="backdrop" />
          <div className="overlay-content">
            <AdvancedAddDownloadForm
              client={this.props.api}
              onCancel={() => {
                this.setState({ isAddingDownload: false });
              }}
              onAddDownload={(urls, options) => {
                this.props.createTasks!(urls, options);
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

  private renderFooter() {
    if (this.props.tasks.length === 0) {
      return null;
    } else {
      const totalDownloadSpeed = this.props.tasks.reduce(
        (acc, t) => acc + t.additional!.transfer!.speed_download,
        0,
      );
      const totalUploadSpeed = this.props.tasks.reduce(
        (acc, t) => acc + t.additional!.transfer!.speed_upload,
        0,
      );

      return (
        <footer>
          <span className="fa fa-arrow-down" /> {formatMetric1024(totalDownloadSpeed)}B/s
          <span className="spacer" />
          <span className="fa fa-arrow-up" /> {formatMetric1024(totalUploadSpeed)}B/s
        </footer>
      );
    }
  }

  private onBodyScroll = debounce(() => {
    if (this.bodyRef) {
      this.setState({ isShowingDropShadow: this.bodyRef.scrollTop !== 0 });
    } else {
      this.setState({ isShowingDropShadow: false });
    }
  }, 100);

  componentDidUpdate(_prevProps: Props, prevState: State) {
    if (prevState.isShowingDisplaySettings !== this.state.isShowingDisplaySettings) {
      setTimeout(() => {
        this.setState({ firefoxRerenderNonce: this.state.firefoxRerenderNonce + 1 });
      }, 350);
    }
  }
}
