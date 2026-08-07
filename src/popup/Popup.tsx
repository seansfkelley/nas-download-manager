import "./popup.css";
import classNames from "classnames";
import { default as throttle } from "lodash/throttle";
import { useMemo, useRef, useState } from "react";

import type { DownloadStationTask } from "../common/apis/synology/DownloadStation/Task";
import { NonIdealState } from "../common/components/NonIdealState";
import { TaskFilterSettingsForm } from "../common/components/TaskFilterSettingsForm";
import { sortTasks, filterTasks } from "../common/filtering";
import type { VisibleTaskSettings, TaskSortType, BadgeDisplayType } from "../common/state";

import { AdvancedAddDownloadForm } from "./AdvancedAddDownloadForm";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { PasswordForm } from "./PasswordForm";
import { Task } from "./Task";
import type { PopupClient } from "./popupClient";

export interface Props {
  tasks: DownloadStationTask[];
  taskFetchFailureReason:
    "missing-config" | "login-required" | { failureMessage: string } | undefined;
  tasksLastInitiatedFetchTimestamp: number | undefined;
  tasksLastCompletedFetchTimestamp: number | undefined;
  visibleTasks: VisibleTaskSettings;
  changeVisibleTasks: (visibleTasks: VisibleTaskSettings) => void;
  taskSort: TaskSortType;
  changeTaskSort: (sort: TaskSortType) => void;
  badgeDisplay: BadgeDisplayType;
  changeBadgeDisplay: (display: BadgeDisplayType) => void;
  showInactiveTasks: boolean;
  changeShowInactiveTasks: (show: boolean) => void;
  client?: PopupClient;
}

export function Popup(props: Props) {
  const [isShowingDropShadow, setIsShowingDropShadow] = useState(false);
  const [isAddingDownload, setIsAddingDownload] = useState(false);
  const [isShowingDisplaySettings, setIsShowingDisplaySettings] = useState(false);
  const [isClearingCompletedTasks, setIsClearingCompletedTasks] = useState(false);
  // Bleh. If a popup grows larger in Firefox, it will leave it as such until the DOM changes and
  // causes a relayout. Collapsing the filter panel only flips a class, and it does so at the start
  // of the animation while the panel is still full height, so nothing mutates once it has actually
  // shrunk. Reading a layout property like offsetHeight is not enough; the DOM has to change. Hence
  // this nonce, bumped when the panel finishes animating and rendered as an attribute nobody reads.
  const [firefoxRerenderNonce, setFirefoxRerenderNonce] = useState(0);

  const bodyRef = useRef<HTMLDivElement | null>(null);

  // Memoized so that throttling actually accumulates across scroll events instead of being reset
  // by every render.
  const onBodyScroll = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs -- the throttled callback only runs on scroll.
      throttle(() => {
        setIsShowingDropShadow(bodyRef.current != null && bodyRef.current.scrollTop !== 0);
      }, 200),
    [],
  );

  function renderTaskList() {
    if (props.taskFetchFailureReason === "missing-config") {
      return (
        <NonIdealState
          icon="fa-cog"
          text={browser.i18n.getMessage(
            "Configure_your_hostname_username_and_password_in_settings",
          )}
        />
      );
    } else if (props.taskFetchFailureReason === "login-required") {
      if (!props.client) {
        return <NonIdealState />;
      } else {
        return (
          <NonIdealState icon="fa-lock" text={browser.i18n.getMessage("Password_required")}>
            <PasswordForm client={props.client} />
          </NonIdealState>
        );
      }
    } else if (props.tasksLastCompletedFetchTimestamp == null) {
      return <NonIdealState icon="fa-sync fa-spin" />;
    } else if (props.tasks.length === 0) {
      return <NonIdealState text={browser.i18n.getMessage("No_download_tasks")} />;
    } else {
      const filteredTasks = filterTasks(props.tasks, props.visibleTasks, props.showInactiveTasks);
      if (filteredTasks.length === 0) {
        return (
          <NonIdealState
            icon="fa-filter"
            text={browser.i18n.getMessage("Download_tasks_exist_but_none_match_your_filters")}
          />
        );
      } else {
        const hiddenTaskCount = props.tasks.length - filteredTasks.length;
        const deleteTask = props.client
          ? (taskId: string) => props.client!.deleteTasks([taskId])
          : undefined;
        return (
          <div className="download-tasks">
            <ul>
              {sortTasks(filteredTasks, props.taskSort).map((task) => (
                <Task
                  key={task.id}
                  task={task}
                  onDelete={deleteTask}
                  onPause={props.client?.pauseTask}
                  onResume={props.client?.resumeTask}
                />
              ))}
            </ul>
            {hiddenTaskCount > 0 && (
              <div
                className="hidden-count"
                onClick={() => {
                  setIsShowingDisplaySettings(true);
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

  function maybeRenderAddDownloadOverlay() {
    if (isAddingDownload && props.client) {
      return (
        <div className="add-download-overlay">
          <div className="backdrop" />
          <div className="overlay-content">
            <AdvancedAddDownloadForm
              onClose={() => {
                setIsAddingDownload(false);
              }}
              client={props.client}
            />
          </div>
        </div>
      );
    } else {
      return null;
    }
  }

  const completedTaskIds = props.tasks.filter((t) => t.status === "finished").map((t) => t.id);
  const onClickClearTasks = props.client
    ? async () => {
        setIsClearingCompletedTasks(true);
        await props.client!.deleteTasks(completedTaskIds);
        setIsClearingCompletedTasks(false);
      }
    : undefined;

  return (
    <div className="popup" data-relayout={firefoxRerenderNonce}>
      <Header
        isAddingDownload={isAddingDownload}
        onClickAddDownload={
          // This is a bit of an abstraction break-y hack. I don't like the way props.client
          // is non-null if there is a hostname and that's used to indicate if the connection is
          // in a good state. You should not be able to add downloads if there's no password!
          props.client != null && props.taskFetchFailureReason !== "login-required"
            ? () => {
                setIsAddingDownload(!isAddingDownload);
                setIsShowingDisplaySettings(false);
              }
            : undefined
        }
        completedTaskCount={completedTaskIds.length}
        onClickClearTasks={isClearingCompletedTasks ? "pending" : onClickClearTasks}
        onClickOpenDownloadStationUi={props.client?.openDownloadStationUi}
        isShowingDisplaySettings={isShowingDisplaySettings}
        onClickDisplaySettings={() => {
          setIsShowingDisplaySettings(!isShowingDisplaySettings);
          setIsAddingDownload(false);
        }}
        isMissingConfig={props.taskFetchFailureReason === "missing-config"}
        showDropShadow={isShowingDropShadow}
        disabledLogo={props.taskFetchFailureReason != null}
      />
      <div
        className={classNames("display-settings", {
          "is-visible": isShowingDisplaySettings,
        })}
        // Any transition finishing here means the panel has settled at its new size. Deliberately
        // not filtered by property name: firing a few extra times is free, and silently doing
        // nothing because the animated property was renamed in the scss is not.
        onTransitionEnd={() => {
          setFirefoxRerenderNonce((nonce) => nonce + 1);
        }}
      >
        <h4 className="title">{browser.i18n.getMessage("Task_Display_Settings")}</h4>
        <TaskFilterSettingsForm
          visibleTasks={props.visibleTasks}
          taskSortType={props.taskSort}
          badgeDisplayType={props.badgeDisplay}
          showInactiveTasks={props.showInactiveTasks}
          updateTaskTypeVisibility={(taskType: keyof VisibleTaskSettings, visibility: boolean) => {
            props.changeVisibleTasks({
              ...props.visibleTasks,
              [taskType]: visibility,
            });
          }}
          updateTaskSortType={props.changeTaskSort}
          updateBadgeDisplayType={props.changeBadgeDisplay}
          updateShowInactiveTasks={props.changeShowInactiveTasks}
        />
      </div>
      <div
        className={classNames("popup-body", { "with-foreground": isAddingDownload })}
        onScroll={onBodyScroll}
        ref={bodyRef}
      >
        {renderTaskList()}
        {maybeRenderAddDownloadOverlay()}
      </div>
      <Footer
        tasks={props.tasks ?? []}
        taskFetchFailureReason={props.taskFetchFailureReason}
        tasksLastInitiatedFetchTimestamp={props.tasksLastInitiatedFetchTimestamp}
        tasksLastCompletedFetchTimestamp={props.tasksLastCompletedFetchTimestamp}
      />
    </div>
  );
}
