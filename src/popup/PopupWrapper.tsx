import { useMemoDeep } from "../common/hooks/useMemoDeep";
import type {
  Settings,
  VisibleTaskSettings,
  TaskSortType,
  State as ExtensionState,
  BadgeDisplayType,
} from "../common/state";
import { Popup } from "./Popup";
import { getClient } from "./popupClient";

interface Props {
  state: ExtensionState;
  updateSettings: (settings: Settings) => void;
}

export function PopupWrapper(props: Props) {
  const connection = props.state.settings.connection;
  const client = useMemoDeep(() => getClient(connection), [connection]);

  return (
    <Popup
      tasks={props.state.tasks}
      taskFetchFailureReason={props.state.taskFetchFailureReason}
      tasksLastInitiatedFetchTimestamp={props.state.tasksLastInitiatedFetchTimestamp}
      tasksLastCompletedFetchTimestamp={props.state.tasksLastCompletedFetchTimestamp}
      visibleTasks={props.state.settings.visibleTasks}
      changeVisibleTasks={(visibleTasks: VisibleTaskSettings) => {
        props.updateSettings({ ...props.state.settings, visibleTasks });
      }}
      taskSort={props.state.settings.taskSortType}
      changeTaskSort={(taskSortType: TaskSortType) => {
        props.updateSettings({ ...props.state.settings, taskSortType });
      }}
      badgeDisplay={props.state.settings.badgeDisplayType}
      changeBadgeDisplay={(badgeDisplayType: BadgeDisplayType) => {
        props.updateSettings({ ...props.state.settings, badgeDisplayType });
      }}
      showInactiveTasks={props.state.settings.showInactiveTasks}
      changeShowInactiveTasks={(showInactiveTasks: boolean) => {
        props.updateSettings({ ...props.state.settings, showInactiveTasks });
      }}
      client={client}
    />
  );
}
