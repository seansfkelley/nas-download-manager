import "./settings-form.css";
import { useState } from "react";

import {
  PersistentState,
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
import { typesafePick } from "../common/lang";
import { SetLoginPassword } from "../common/apis/messages";
import type { Overwrite } from "../common/types";

export interface Props {
  extensionState: PersistentState;
  saveSettings: (settings: Settings) => Promise<boolean>;
  lastSevereError?: string;
  clearError: () => void;
}

export function SettingsForm(props: Props) {
  const [savesFailed, setSavesFailed] = useState(false);

  async function saveSettings(settings: Partial<Settings>) {
    const success = await props.saveSettings({
      ...typesafePick(props.extensionState.settings, ...SETTING_NAMES),
      ...settings,
    });

    setSavesFailed((failed) => failed || !success);
  }

  function setNotificationSetting<K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K],
  ) {
    saveSettings({
      notifications: {
        ...props.extensionState.settings.notifications,
        [key]: value,
      },
    });
  }

  async function updateConnectionSettings(
    connection: Overwrite<ConnectionSettings, { password: string }>,
  ) {
    if (connection.rememberPassword) {
      await saveSettings({ connection });
    } else {
      await saveSettings({ connection: { ...connection, password: undefined } });
    }
    await SetLoginPassword.send(connection.password);
  }

  function maybeRenderDebuggingOutputAndSeparator() {
    if (props.lastSevereError) {
      const formattedDebugLogs = `${
        props.lastSevereError
      }\n\nRedacted extension state: ${JSON.stringify(redactState(props.extensionState), null, 2)}`;

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
              <button onClick={props.clearError}>{browser.i18n.getMessage("Clear_output")}</button>
            </li>
          </SettingsList>
        </>
      );
    } else {
      return undefined;
    }
  }

  return (
    <div className="settings-form">
      {savesFailed ? (
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
        connectionSettings={props.extensionState.settings.connection}
        saveConnectionSettings={updateConnectionSettings}
      />

      <div className="horizontal-separator" />

      <header>
        <h3>{browser.i18n.getMessage("Task_Display_Settings")}</h3>
        <p>{browser.i18n.getMessage("Display_these_task_types_in_the_popup_menu")}</p>
      </header>

      <TaskFilterSettingsForm
        visibleTasks={props.extensionState.settings.visibleTasks}
        taskSortType={props.extensionState.settings.taskSortType}
        badgeDisplayType={props.extensionState.settings.badgeDisplayType}
        showInactiveTasks={props.extensionState.settings.showInactiveTasks}
        updateTaskTypeVisibility={(taskType: keyof VisibleTaskSettings, visibility: boolean) => {
          saveSettings({
            visibleTasks: {
              ...props.extensionState.settings.visibleTasks,
              [taskType]: visibility,
            },
          });
        }}
        updateTaskSortType={(taskSortType: TaskSortType) => {
          saveSettings({ taskSortType });
        }}
        updateBadgeDisplayType={(badgeDisplayType: BadgeDisplayType) => {
          saveSettings({ badgeDisplayType });
        }}
        updateShowInactiveTasks={(showInactiveTasks: boolean) => {
          saveSettings({ showInactiveTasks });
        }}
      />

      <div className="horizontal-separator" />

      <header>
        <h3>{browser.i18n.getMessage("Miscellaneous")}</h3>
      </header>

      <SettingsList>
        <SettingsListCheckbox
          checked={props.extensionState.settings.notifications.enableFeedbackNotifications}
          onChange={() => {
            setNotificationSetting(
              "enableFeedbackNotifications",
              !props.extensionState.settings.notifications.enableFeedbackNotifications,
            );
          }}
          label={browser.i18n.getMessage("Notify_when_adding_downloads")}
        />
        <SettingsListCheckbox
          checked={props.extensionState.settings.notifications.enableCompletionNotifications}
          onChange={() => {
            setNotificationSetting(
              "enableCompletionNotifications",
              !props.extensionState.settings.notifications.enableCompletionNotifications,
            );
          }}
          label={browser.i18n.getMessage("Notify_when_downloads_complete")}
          subtitle={browser.i18n.getMessage(
            "This_polls_your_NAS_every_30_seconds_and_may_keep_it_awake",
          )}
        />

        <SettingsListCheckbox
          checked={props.extensionState.settings.shouldHandleDownloadLinks}
          onChange={() => {
            saveSettings({
              shouldHandleDownloadLinks: !props.extensionState.settings.shouldHandleDownloadLinks,
            });
          }}
          label={browser.i18n.getMessage("Handle_opening_downloadable_link_types_ZprotocolsZ", [
            DOWNLOAD_ONLY_PROTOCOLS.join(", "),
          ])}
        />
      </SettingsList>

      {maybeRenderDebuggingOutputAndSeparator()}
    </div>
  );
}
