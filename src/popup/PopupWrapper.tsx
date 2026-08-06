import { useMemoDeep } from "../common/hooks/useMemoDeep";
import type {
  Settings,
  VisibleTaskSettings,
  TaskSortType,
  TaskState,
  BadgeDisplayType,
} from "../common/state";
import { Popup } from "./Popup";
import { getClient } from "./popupClient";

interface Props {
  settings: Settings;
  cachedTasks: TaskState;
  updateSettings: (settings: Settings) => void;
}

export function PopupWrapper(props: Props) {
  const connection = props.settings.connection;
  const client = useMemoDeep(() => getClient(connection), [connection]);

  return (
    <Popup
      tasks={props.cachedTasks.tasks}
      taskFetchFailureReason={props.cachedTasks.taskFetchFailureReason}
      tasksLastInitiatedFetchTimestamp={props.cachedTasks.tasksLastInitiatedFetchTimestamp}
      tasksLastCompletedFetchTimestamp={props.cachedTasks.tasksLastCompletedFetchTimestamp}
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
