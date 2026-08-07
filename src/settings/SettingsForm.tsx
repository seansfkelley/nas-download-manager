import "./settings-form.css";
import { useState } from "react";

import {
  Settings,
  VisibleTaskSettings,
  TaskSortType,
  NotificationSettings,
  BadgeDisplayType,
  ConnectionSettings,
  redactSettings,
} from "../common/state";
import { BUG_REPORT_URL } from "../common/constants";
import { DOWNLOAD_ONLY_PROTOCOLS } from "../common/apis/protocols";
import { TaskFilterSettingsForm } from "../common/components/TaskFilterSettingsForm";
import { SettingsList } from "../common/components/SettingsList";
import { SettingsListCheckbox } from "../common/components/SettingsListCheckbox";
import { ConnectionSettings as ConnectionSettingsComponent } from "./ConnectionSettings";
import { disabledPropAndClassName, kludgeRefSetClassname } from "../common/classnameUtil";
import { SetLoginPassword } from "../common/apis/messages";
import type { Overwrite } from "../common/types";

export interface Props {
  settings: Settings;
  saveSettings: (settings: Settings) => Promise<boolean>;
  lastSevereError?: string;
  clearError: () => void;
}

const POLL_MIN_INTERVAL = 15;
const POLL_DEFAULT_INTERVAL = 60;
const POLL_STEP = 15;

function isValidPollingInterval(stringValue: string) {
  return !isNaN(+stringValue) && +stringValue >= POLL_MIN_INTERVAL;
}

export function SettingsForm(props: Props) {
  const [savesFailed, setSavesFailed] = useState(false);
  const [rawPollingInterval, setRawPollingInterval] = useState(
    () =>
      props.settings.notifications.completionPollingInterval.toString() ||
      POLL_DEFAULT_INTERVAL.toString(),
  );

  async function saveSettings(settings: Partial<Settings>) {
    const success = await props.saveSettings({
      ...props.settings,
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
        ...props.settings.notifications,
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
      }\n\nRedacted extension settings: ${JSON.stringify(redactSettings(props.settings), null, 2)}`;

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
        connectionSettings={props.settings.connection}
        saveConnectionSettings={updateConnectionSettings}
      />

      <div className="horizontal-separator" />

      <header>
        <h3>{browser.i18n.getMessage("Task_Display_Settings")}</h3>
        <p>{browser.i18n.getMessage("Display_these_task_types_in_the_popup_menu")}</p>
      </header>

      <TaskFilterSettingsForm
        visibleTasks={props.settings.visibleTasks}
        taskSortType={props.settings.taskSortType}
        badgeDisplayType={props.settings.badgeDisplayType}
        showInactiveTasks={props.settings.showInactiveTasks}
        updateTaskTypeVisibility={(taskType: keyof VisibleTaskSettings, visibility: boolean) => {
          saveSettings({
            visibleTasks: {
              ...props.settings.visibleTasks,
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
          checked={props.settings.notifications.enableFeedbackNotifications}
          onChange={() => {
            setNotificationSetting(
              "enableFeedbackNotifications",
              !props.settings.notifications.enableFeedbackNotifications,
            );
          }}
          label={browser.i18n.getMessage("Notify_when_adding_downloads")}
        />
        <SettingsListCheckbox
          checked={props.settings.notifications.enableCompletionNotifications}
          onChange={() => {
            setNotificationSetting(
              "enableCompletionNotifications",
              !props.settings.notifications.enableCompletionNotifications,
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
              !props.settings.notifications.enableCompletionNotifications,
            )}
            min={POLL_MIN_INTERVAL}
            step={POLL_STEP}
            value={rawPollingInterval}
            ref={kludgeRefSetClassname("polling-interval")}
            onChange={(e) => {
              const interval = e.currentTarget.value;
              setRawPollingInterval(interval);
              if (isValidPollingInterval(interval)) {
                setNotificationSetting("completionPollingInterval", +interval);
              }
            }}
          />
          {browser.i18n.getMessage("seconds")}
          {isValidPollingInterval(rawPollingInterval) ? undefined : (
            <span className="intent-error wrong-polling-interval">
              {browser.i18n.getMessage("at_least_15")}
            </span>
          )}
        </li>

        <SettingsListCheckbox
          checked={props.settings.shouldHandleDownloadLinks}
          onChange={() => {
            saveSettings({
              shouldHandleDownloadLinks: !props.settings.shouldHandleDownloadLinks,
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
