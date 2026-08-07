import { useMemoDeep } from "../common/hooks/useMemoDeep";
import type {
  Settings,
  VisibleTaskSettings,
  TaskSortType,
  BadgeDisplayType,
  TaskState,
} from "../common/state";

import { Popup } from "./Popup";
import { getClient } from "./popupClient";

interface Props {
  settings: Settings;
  tasks: TaskState;
  updateSettings: (settings: Settings) => void;
}

export function PopupWrapper(props: Props) {
  const connection = props.settings.connection;
  const client = useMemoDeep(() => getClient(connection), [connection]);

  return (
    <Popup
      tasks={props.tasks.tasks ?? []}
      taskFetchFailureReason={props.tasks.taskFetchFailureReason}
      tasksLastInitiatedFetchTimestamp={props.tasks.tasksLastInitiatedFetchTimestamp}
      tasksLastCompletedFetchTimestamp={props.tasks.tasksLastCompletedFetchTimestamp}
      visibleTasks={props.settings.visibleTasks}
      changeVisibleTasks={(visibleTasks: VisibleTaskSettings) => {
        props.updateSettings({ ...props.settings, visibleTasks });
      }}
      taskSort={props.settings.taskSortType}
      changeTaskSort={(taskSortType: TaskSortType) => {
        props.updateSettings({ ...props.settings, taskSortType });
      }}
      badgeDisplay={props.settings.badgeDisplayType}
      changeBadgeDisplay={(badgeDisplayType: BadgeDisplayType) => {
        props.updateSettings({ ...props.settings, badgeDisplayType });
      }}
      showInactiveTasks={props.settings.showInactiveTasks}
      changeShowInactiveTasks={(showInactiveTasks: boolean) => {
        props.updateSettings({ ...props.settings, showInactiveTasks });
      }}
      client={client}
    />
  );
}
