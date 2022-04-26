import "./settings-form.scss";
import * as React from "react";

import {
  State as ExtensionState,
  Settings,
  VisibleTaskSettings,
  TaskSortType,
  NotificationSettings,
  redactState,
  SETTING_NAMES,
  BadgeDisplayType,
  ConnectionSettings,
} from "../common/state";
import { BUG_REPORT_URL } from "../common/constants";
import { DOWNLOAD_ONLY_PROTOCOLS } from "../common/apis/protocols";
import { TaskFilterSettingsForm } from "../common/components/TaskFilterSettingsForm";
import { SettingsList } from "../common/components/SettingsList";
import { SettingsListCheckbox } from "../common/components/SettingsListCheckbox";
import { ConnectionSettings as ConnectionSettingsComponent } from "./ConnectionSettings";
import { disabledPropAndClassName, kludgeRefSetClassname } from "../common/classnameUtil";
import { typesafePick } from "../common/lang";
import { SetLoginPassword } from "../common/apis/messages";
import type { Overwrite } from "../common/types";

export interface Props {
  extensionState: ExtensionState;
  saveSettings: (settings: Settings) => Promise<boolean>;
  lastSevereError?: string;
  clearError: () => void;
}

interface State {
  savesFailed: boolean;
  rawPollingInterval: string;
}

const POLL_MIN_INTERVAL = 15;
const POLL_DEFAULT_INTERVAL = 60;
const POLL_STEP = 15;

function isValidPollingInterval(stringValue: string) {
  return !isNaN(+stringValue) && +stringValue >= POLL_MIN_INTERVAL;
}

export class SettingsForm extends React.PureComponent<Props, State> {
  state: State = {
    savesFailed: false,
    rawPollingInterval:
      this.props.extensionState.settings.notifications.completionPollingInterval.toString() ||
      POLL_DEFAULT_INTERVAL.toString(),
  };

  render() {
    return (
      <div className="settings-form">
        {this.state.savesFailed ? (
          <div className="intent-error cannot-save">
            {browser.i18n.getMessage("Cannot_save_settings_This_is_a_bug_please_file_an_issue")}
          </div>
        ) : null}

        <header>
          <h3>{browser.i18n.getMessage("Connection")}</h3>
          <p>
            {browser.i18n.getMessage(
              "Please_note_that_QuickConnect_IDs_and_twofactor_authentication_are_not_currently_supported",
            )}
          </p>
        </header>

        <ConnectionSettingsComponent
          connectionSettings={this.props.extensionState.settings.connection}
          saveConnectionSettings={this.updateConnectionSettings}
        />

        <div className="horizontal-separator" />

        <header>
          <h3>{browser.i18n.getMessage("Task_Display_Settings")}</h3>
          <p>{browser.i18n.getMessage("Display_these_task_types_in_the_popup_menu")}</p>
        </header>

        <TaskFilterSettingsForm
          visibleTasks={this.props.extensionState.settings.visibleTasks}
          taskSortType={this.props.extensionState.settings.taskSortType}
          badgeDisplayType={this.props.extensionState.settings.badgeDisplayType}
          showInactiveTasks={this.props.extensionState.settings.showInactiveTasks}
          updateTaskTypeVisibility={this.updateTaskTypeVisibility}
          updateTaskSortType={this.updateTaskSortType}
          updateBadgeDisplayType={this.updateBadgeDisplayType}
          updateShowInactiveTasks={this.updateShowInactiveTasks}
        />

        <div className="horizontal-separator" />

        <header>
          <h3>{browser.i18n.getMessage("Miscellaneous")}</h3>
        </header>

        <SettingsList>
          <SettingsListCheckbox
            checked={this.props.extensionState.settings.notifications.enableFeedbackNotifications}
            onChange={() => {
              this.setNotificationSetting(
                "enableFeedbackNotifications",
                !this.props.extensionState.settings.notifications.enableFeedbackNotifications,
              );
            }}
            label={browser.i18n.getMessage("Notify_when_adding_downloads")}
          />
          <SettingsListCheckbox
            checked={this.props.extensionState.settings.notifications.enableCompletionNotifications}
            onChange={() => {
              this.setNotificationSetting(
                "enableCompletionNotifications",
                !this.props.extensionState.settings.notifications.enableCompletionNotifications,
              );
            }}
            label={browser.i18n.getMessage("Notify_when_downloads_complete")}
          />

          <li>
            <span className="indent">
              {browser.i18n.getMessage("Check_for_completed_downloads_every")}
            </span>
            <input
              type="number"
              {...disabledPropAndClassName(
                !this.props.extensionState.settings.notifications.enableCompletionNotifications,
              )}
              min={POLL_MIN_INTERVAL}
              step={POLL_STEP}
              value={this.state.rawPollingInterval}
              ref={kludgeRefSetClassname("polling-interval")}
              onChange={(e) => {
                const rawPollingInterval = e.currentTarget.value;
                this.setState({ rawPollingInterval });
                if (isValidPollingInterval(rawPollingInterval)) {
                  this.setNotificationSetting("completionPollingInterval", +rawPollingInterval);
                }
              }}
            />
            {browser.i18n.getMessage("seconds")}
            {isValidPollingInterval(this.state.rawPollingInterval) ? undefined : (
              <span className="intent-error wrong-polling-interval">
                {browser.i18n.getMessage("at_least_15")}
              </span>
            )}
          </li>

          <SettingsListCheckbox
            checked={this.props.extensionState.settings.shouldHandleDownloadLinks}
            onChange={() => {
              this.setShouldHandleDownloadLinks(
                !this.props.extensionState.settings.shouldHandleDownloadLinks,
              );
            }}
            label={browser.i18n.getMessage("Handle_opening_downloadable_link_types_ZprotocolsZ", [
              DOWNLOAD_ONLY_PROTOCOLS.join(", "),
            ])}
          />

          <span className="label">{browser.i18n.getMessage("Extension_list")}</span>
          <div className="input">
            <input
              type="text"
              value={this.props.extensionState.settings.interceptExtensions}
              onChange={(e) => {
                var interceptExtensions = e.currentTarget.value
                  .replace(/[\;\,\.]/g,' ')// unify various separators into spaces
                  .toLowerCase()
                  .split(' ')
                  .filter((s)=>{ return s; })
                  .join(' ');
                this.saveExtList("interceptExtensions", interceptExtensions);
              }}
            />
          </div>
        </SettingsList>

        {this.maybeRenderDebuggingOutputAndSeparator()}
      </div>
    );
  }

  private maybeRenderDebuggingOutputAndSeparator() {
    if (this.props.lastSevereError) {
      const formattedDebugLogs = `${
        this.props.lastSevereError
      }\n\nRedacted extension state: ${JSON.stringify(
        redactState(this.props.extensionState),
        null,
        2,
      )}`;

      return (
        <>
          <div className="horizontal-separator" />

          <header>
            <h3>{browser.i18n.getMessage("Debugging_Output")}</h3>
            <p>
              {browser.i18n.getMessage("Please_")}
              <a href={BUG_REPORT_URL}>{browser.i18n.getMessage("file_a_bug")}</a>
              {browser.i18n.getMessage("_and_include_the_information_below")}
            </p>
          </header>

          <SettingsList>
            <li>
              <textarea
                className="debugging-output"
                value={formattedDebugLogs}
                readOnly={true}
                onClick={(e) => {
                  e.currentTarget.select();
                }}
              />
            </li>

            <li>
              <button onClick={this.props.clearError}>
                {browser.i18n.getMessage("Clear_output")}
              </button>
            </li>
          </SettingsList>
        </>
      );
    } else {
      return undefined;
    }
  }

  private updateTaskTypeVisibility = (taskType: keyof VisibleTaskSettings, visibility: boolean) => {
    this.saveSettings({
      visibleTasks: {
        ...this.props.extensionState.settings.visibleTasks,
        [taskType]: visibility,
      },
    });
  };

  private updateTaskSortType = (taskSortType: TaskSortType) => {
    this.saveSettings({ taskSortType });
  };

  private updateBadgeDisplayType = (badgeDisplayType: BadgeDisplayType) => {
    this.saveSettings({ badgeDisplayType });
  };

  private updateShowInactiveTasks = (showInactiveTasks: boolean) => {
    this.saveSettings({ showInactiveTasks });
  };

  private updateConnectionSettings = async (
    connection: Overwrite<ConnectionSettings, { password: string }>,
  ) => {
    if (connection.rememberPassword) {
      await this.saveSettings({ connection });
    } else {
      await this.saveSettings({ connection: { ...connection, password: undefined } });
    }
    await SetLoginPassword.send(connection.password);
  };

  private setNotificationSetting<K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K],
  ) {
    this.saveSettings({
      notifications: {
        ...this.props.extensionState.settings.notifications,
        [key]: value,
      },
    });
  }

  private setShouldHandleDownloadLinks(shouldHandleDownloadLinks: boolean) {
    this.saveSettings({
      shouldHandleDownloadLinks,
    });
  }

  private saveExtList(interceptExtensions: string) {
    this.saveSettings({
      interceptExtensions,
    });
  }

  private saveSettings = async (settings: Partial<Settings>) => {
    const success = await this.props.saveSettings({
      ...typesafePick(this.props.extensionState.settings, ...SETTING_NAMES),
      ...settings,
    });

    this.setState({
      savesFailed: this.state.savesFailed || !success,
    });
  };
}
