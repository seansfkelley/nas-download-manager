import * as React from "react";
import isEqual from "lodash-es/isEqual";
import {
  Settings,
  VisibleTaskSettings,
  TaskSortType,
  State as ExtensionState,
  BadgeDisplayType,
  onStoredStateChange,
} from "../common/state";
import { Popup } from "./Popup";
import { getClient, PopupClient } from "./popupClient";
import { Downloads, LoadTasks, TryGetCachedTasks } from "../common/apis/messages";
import { assert } from "../common/lang";
import { FatalErrorWrapper } from "./FatalErrorWrapper";

interface State {
  settings: Settings | undefined;
  downloads: Downloads | undefined;
  client: PopupClient | undefined;
}

export class PopupWrapper extends React.PureComponent<{}, State> {
  state: State = {
    settings: undefined,
    downloads: undefined,
    client: undefined,
  };

  render() {
    if (this.state.settings && this.state.downloads && this.state.client) {
      return (
        <FatalErrorWrapper settings={this.state.settings} downloads={this.state.downloads}>
          <Popup
            tasks={this.state.downloads.tasks}
            taskFetchFailureReason={this.state.downloads.taskFetchFailureReason}
            tasksLastInitiatedFetchTimestamp={this.state.downloads.tasksLastInitiatedFetchTimestamp}
            tasksLastCompletedFetchTimestamp={this.state.downloads.tasksLastCompletedFetchTimestamp}
            visibleTasks={this.state.settings.visibleTasks}
            changeVisibleTasks={this.changeVisibleTasks}
            taskSort={this.state.settings.taskSortType}
            changeTaskSort={this.changeSortType}
            badgeDisplay={this.state.settings.badgeDisplayType}
            changeBadgeDisplay={this.changeBadgeDisplay}
            client={this.state.client}
          />
        </FatalErrorWrapper>
      );
    } else {
      // This should only happen once at the beginning for basically no time. Should we render anything?
      return null;
    }
  }

  private changeVisibleTasks = (visibleTasks: VisibleTaskSettings) => {
    assert(this.state.settings);
    updateSettings({ ...this.state.settings, visibleTasks });
  };

  private changeSortType = (taskSortType: TaskSortType) => {
    assert(this.state.settings);
    updateSettings({ ...this.state.settings, taskSortType });
  };

  private changeBadgeDisplay = (badgeDisplayType: BadgeDisplayType) => {
    assert(this.state.settings);
    updateSettings({ ...this.state.settings, badgeDisplayType });
  };

  async componentDidMount() {
    // TODO: Clear these listeners on unmount?
    onStoredStateChange(({ settings }) => {
      if (!isEqual(this.state.settings?.connection, settings.connection)) {
        this.setState({ client: getClient(settings.connection) });
      }
      this.setState({ settings });
    });

    this.setState({ downloads: await TryGetCachedTasks.send() });
    this.pollTasks();
  }

  pollTasks = async () => {
    this.setState({ downloads: await LoadTasks.send() });
    setTimeout(this.pollTasks, 10000);
  };
}

function updateSettings(settings: Settings) {
  browser.storage.local.set<Partial<ExtensionState>>({ settings });
}
