<script lang="ts">
  import {
    type State as ExtensionState,
    type Settings,
    type VisibleTaskSettings,
    type TaskSortType,
    type NotificationSettings,
    redactState,
    type BadgeDisplayType,
    type ConnectionSettings,
    BUG_REPORT_URL,
  } from "../common/state/defaults";
  import { SETTING_NAMES } from "../common/state/listen";
  import TaskFilterSettingsForm from "../common/components/TaskFilterSettingsForm.svelte";
  import SettingsList from "../common/components/SettingsList.svelte";
  import SettingsListCheckbox from "../common/components/SettingsListCheckbox.svelte";
  import ConnectionSettingsComponent from "./ConnectionSettings.svelte";
  import { typesafePick } from "../common/lang";
  import { SetLoginPassword } from "../common/apis/messages";
  import { DOWNLOAD_ONLY_PROTOCOLS } from "../common/apis/protocols";
  import type { Overwrite } from "../common/types";

  interface Props {
    extensionState: ExtensionState;
    saveSettings: (settings: Settings) => Promise<boolean>;
    lastSevereError?: string;
    clearError: () => void;
  }

  let {
    extensionState,
    saveSettings: saveSettingsProp,
    lastSevereError,
    clearError,
  }: Props = $props();

  let savesFailed = $state(false);
  let rawPollingInterval = $state(getInitialPollingInterval());

  function getInitialPollingInterval() {
    return extensionState.settings.notifications.completionPollingInterval.toString() || "60";
  }

  const POLL_MIN_INTERVAL = 15;
  const POLL_STEP = 15;

  function isValidPollingInterval(stringValue: string) {
    return !isNaN(+stringValue) && +stringValue >= POLL_MIN_INTERVAL;
  }

  async function doSaveSettings(settings: Partial<Settings>) {
    const success = await saveSettingsProp({
      ...typesafePick(extensionState.settings, ...SETTING_NAMES),
      ...settings,
    });
    savesFailed = savesFailed || !success;
  }

  function updateTaskTypeVisibility(taskType: keyof VisibleTaskSettings, visibility: boolean) {
    doSaveSettings({
      visibleTasks: { ...extensionState.settings.visibleTasks, [taskType]: visibility },
    });
  }

  function updateTaskSortType(taskSortType: TaskSortType) {
    doSaveSettings({ taskSortType });
  }

  function updateBadgeDisplayType(badgeDisplayType: BadgeDisplayType) {
    doSaveSettings({ badgeDisplayType });
  }

  function updateShowInactiveTasks(showInactiveTasks: boolean) {
    doSaveSettings({ showInactiveTasks });
  }

  async function updateConnectionSettings(
    connection: Overwrite<ConnectionSettings, { password: string }>,
  ) {
    if (connection.rememberPassword) {
      await doSaveSettings({ connection });
    } else {
      await doSaveSettings({ connection: { ...connection, password: undefined } });
    }
    await SetLoginPassword.send(connection.password);
  }

  function setNotificationSetting<K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K],
  ) {
    doSaveSettings({
      notifications: { ...extensionState.settings.notifications, [key]: value },
    });
  }

  let formattedDebugLogs = $derived.by(() => {
    if (!lastSevereError) return undefined;
    return `${lastSevereError}\n\nRedacted extension state: ${JSON.stringify(
      redactState(extensionState),
      null,
      2,
    )}`;
  });

  let completionNotificationsEnabled = $derived(
    extensionState.settings.notifications.enableCompletionNotifications,
  );
</script>

<div class="settings-form">
  {#if savesFailed}
    <div class="intent-error cannot-save">
      {browser.i18n.getMessage("Cannot_save_settings_This_is_a_bug_please_file_an_issue")}
    </div>
  {/if}

  <header>
    <h3>{browser.i18n.getMessage("Connection")}</h3>
    <p>
      {browser.i18n.getMessage(
        "Please_note_that_QuickConnect_IDs_and_twofactor_authentication_are_not_currently_supported",
      )}
    </p>
  </header>

  <ConnectionSettingsComponent
    connectionSettings={extensionState.settings.connection}
    saveConnectionSettings={updateConnectionSettings}
  />

  <div class="horizontal-separator"></div>

  <header>
    <h3>{browser.i18n.getMessage("Task_Display_Settings")}</h3>
    <p>{browser.i18n.getMessage("Display_these_task_types_in_the_popup_menu")}</p>
  </header>

  <TaskFilterSettingsForm
    visibleTasks={extensionState.settings.visibleTasks}
    taskSortType={extensionState.settings.taskSortType}
    badgeDisplayType={extensionState.settings.badgeDisplayType}
    showInactiveTasks={extensionState.settings.showInactiveTasks}
    {updateTaskTypeVisibility}
    {updateTaskSortType}
    {updateBadgeDisplayType}
    {updateShowInactiveTasks}
  />

  <div class="horizontal-separator"></div>

  <header>
    <h3>{browser.i18n.getMessage("Miscellaneous")}</h3>
  </header>

  <SettingsList>
    <SettingsListCheckbox
      checked={extensionState.settings.notifications.enableFeedbackNotifications}
      onChange={() =>
        setNotificationSetting(
          "enableFeedbackNotifications",
          !extensionState.settings.notifications.enableFeedbackNotifications,
        )}
      label={browser.i18n.getMessage("Notify_when_adding_downloads")}
    />
    <SettingsListCheckbox
      checked={completionNotificationsEnabled}
      onChange={() =>
        setNotificationSetting("enableCompletionNotifications", !completionNotificationsEnabled)}
      label={browser.i18n.getMessage("Notify_when_downloads_complete")}
    />

    <li>
      <span class="indent">
        {browser.i18n.getMessage("Check_for_completed_downloads_every")}
      </span>
      <input
        type="number"
        disabled={!completionNotificationsEnabled}
        class="polling-interval"
        min={POLL_MIN_INTERVAL}
        step={POLL_STEP}
        value={rawPollingInterval}
        oninput={(e) => {
          rawPollingInterval = e.currentTarget.value;
          if (isValidPollingInterval(rawPollingInterval)) {
            setNotificationSetting("completionPollingInterval", +rawPollingInterval);
          }
        }}
      />
      {browser.i18n.getMessage("seconds")}
      {#if !isValidPollingInterval(rawPollingInterval)}
        <span class="intent-error wrong-polling-interval">
          {browser.i18n.getMessage("at_least_15")}
        </span>
      {/if}
    </li>
    <SettingsListCheckbox
      checked={extensionState.settings.shouldHandleDownloadLinks}
      onChange={() =>
        doSaveSettings({
          shouldHandleDownloadLinks: !extensionState.settings.shouldHandleDownloadLinks,
        })}
      label={browser.i18n.getMessage("Handle_opening_downloadable_link_types_ZprotocolsZ", [
        DOWNLOAD_ONLY_PROTOCOLS.join(", "),
      ])}
    />
  </SettingsList>

  {#if formattedDebugLogs}
    <div class="horizontal-separator"></div>

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
          class="debugging-output"
          value={formattedDebugLogs}
          readonly
          onclick={(e) => e.currentTarget.select()}
        ></textarea>
      </li>
      <li>
        <button onclick={clearError}>
          {browser.i18n.getMessage("Clear_output")}
        </button>
      </li>
    </SettingsList>
  {/if}
</div>

<style>
  .settings-form {
    max-width: 450px;
    margin: auto;

    :global(.label-and-input) {
      flex: 1;
      display: flex;
      align-items: center;

      > :global(.label) {
        flex: 1;
        min-width: 100px;
        margin-right: 5px;
      }

      > :global(.input) {
        flex: 4;
        display: flex;

        input {
          flex: 1;
        }
      }
    }

    :global(.connection-settings) {
      :global(.host-settings .input) {
        display: flex;
        align-items: center;

        > :global(:not(select):not(input)) {
          margin: 0 3px;
        }
      }

      :global(button[type="submit"]) {
        margin-left: auto;
      }
    }

    :global(.host-setting) {
      flex: 1;
    }

    :global(.port-setting) {
      width: 80px;
      max-width: 80px;
    }

    :global(textarea.debugging-output) {
      width: calc(100% - 20px);
      height: 3em;
    }
  }

  .horizontal-separator {
    background-color: rgba(0, 0, 0, 0.15);
    height: 1px;
  }

  .polling-interval {
    width: 60px;
    margin: 0 5px;
  }

  .wrong-polling-interval {
    margin-left: 5px;
  }

  .cannot-save {
    display: flex;
    justify-content: center;
    margin: 2px;
    padding: 6px;
    border-radius: 3px;
    border: 1px solid var(--color-error);
    background-color: rgba(194, 48, 48, 0.2);
  }
</style>
