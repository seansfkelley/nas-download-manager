import { useState } from "react";
import { default as isEqual } from "lodash/isEqual";
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

  // Compared by value, and the connection it was built from is stored alongside it. getClient
  // returns a new object every call, AdvancedAddDownloadForm refetches its config whenever the
  // client identity changes, and stored state arrives as a fresh object on every poll -- so
  // comparing by identity would refetch every few seconds for as long as the form is open.
  const [client, setClient] = useState(() => ({
    connection,
    value: getClient(connection),
  }));

  if (!isEqual(client.connection, connection)) {
    setClient({ connection, value: getClient(connection) });
  }

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
      client={client.value}
    />
  );
}
