import * as React from "react";
import isEqual from "lodash-es/isEqual";
import type {
  Settings,
  VisibleTaskSettings,
  TaskSortType,
  State as ExtensionState,
  BadgeDisplayType,
} from "../common/state";
import { FatalErrorWrapper } from "./FatalErrorWrapper";
import { Popup } from "./Popup";
import { getClient, PopupClient } from "./popupClient";

interface Props {
  state: ExtensionState;
  updateSettings: (settings: Settings) => void;
}

interface State {
  client: PopupClient | undefined;
}

export class PopupWrapper extends React.PureComponent<Props> {
  state: State = {
    client: getClient(this.props.state.settings.connection),
  };

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
          client={this.state.client}
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

  UNSAFE_componentWillReceiveProps(nextProps: Props) {
    if (!isEqual(this.props.state.settings.connection, nextProps.state.settings.connection)) {
      this.setState({ client: getClient(nextProps.state.settings.connection) });
    }
  }
}
