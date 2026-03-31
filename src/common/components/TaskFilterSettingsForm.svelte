<script lang="ts">
  import {
    type VisibleTaskSettings,
    type TaskSortType,
    type BadgeDisplayType,
    ORDERED_TASK_SORT_TYPE_NAMES,
    ORDERED_VISIBLE_TASK_TYPE_NAMES,
    ORDERED_BADGE_DISPLAY_TYPE_NAMES,
  } from "../state/defaults";
  import { recordKeys } from "../lang";
  import SettingsList from "./SettingsList.svelte";
  import SettingsListCheckbox from "./SettingsListCheckbox.svelte";

  interface Props {
    visibleTasks: VisibleTaskSettings;
    taskSortType: TaskSortType;
    badgeDisplayType: BadgeDisplayType;
    showInactiveTasks: boolean;
    updateTaskTypeVisibility: (taskType: keyof VisibleTaskSettings, visibility: boolean) => void;
    updateTaskSortType: (taskSortType: TaskSortType) => void;
    updateBadgeDisplayType: (badgeDisplayType: BadgeDisplayType) => void;
    updateShowInactiveTasks: (showInactiveTasks: boolean) => void;
  }

  let {
    visibleTasks,
    taskSortType,
    badgeDisplayType,
    showInactiveTasks,
    updateTaskTypeVisibility,
    updateTaskSortType,
    updateBadgeDisplayType,
    updateShowInactiveTasks,
  }: Props = $props();
</script>

<div class="task-filter-settings-form">
  <SettingsList>
    {#each recordKeys(ORDERED_VISIBLE_TASK_TYPE_NAMES) as type (type)}
      <SettingsListCheckbox
        checked={visibleTasks[type]}
        onChange={() => updateTaskTypeVisibility(type, !visibleTasks[type])}
        label={ORDERED_VISIBLE_TASK_TYPE_NAMES[type]}
      />
    {/each}
  </SettingsList>
  <div class="task-sort-type">
    <span class="label">{browser.i18n.getMessage("Order_tasks_by")}</span>
    <select
      value={taskSortType}
      onchange={(e) => updateTaskSortType(e.currentTarget.value as TaskSortType)}
    >
      {#each recordKeys(ORDERED_TASK_SORT_TYPE_NAMES) as type (type)}
        <option value={type}>{ORDERED_TASK_SORT_TYPE_NAMES[type]}</option>
      {/each}
    </select>
  </div>
  <div class="badge-display-type">
    <span class="label">{browser.i18n.getMessage("Badge_shows")}</span>
    <select
      value={badgeDisplayType}
      onchange={(e) => updateBadgeDisplayType(e.currentTarget.value as BadgeDisplayType)}
    >
      {#each recordKeys(ORDERED_BADGE_DISPLAY_TYPE_NAMES) as type (type)}
        <option value={type}>{ORDERED_BADGE_DISPLAY_TYPE_NAMES[type]}</option>
      {/each}
    </select>
  </div>
  <SettingsList>
    <SettingsListCheckbox
      checked={showInactiveTasks}
      onChange={() => updateShowInactiveTasks(!showInactiveTasks)}
      label={browser.i18n.getMessage("Show_inactive_tasks")}
      title={browser.i18n.getMessage("Tasks_with_nonzero_uploaddownload_speeds_are_active")}
    />
  </SettingsList>
</div>

<style>
  .task-filter-settings-form {
    margin-bottom: 13px;

    .badge-display-type,
    .task-sort-type {
      display: flex;
      align-items: center;
      margin-left: 15px;

      .label {
        margin-right: 6px;
      }

      select {
        flex: 1;
        max-width: 400px;
      }
    }

    .badge-display-type {
      margin-top: 8px;
    }
  }
</style>
