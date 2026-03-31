<script lang="ts">
  import { store } from "../common/state/store.svelte";
  import { getClient } from "./popupClient";
  import Popup from "./Popup.svelte";
  import type {
    Settings,
    VisibleTaskSettings,
    TaskSortType,
    BadgeDisplayType,
  } from "../common/state/defaults";

  let state = $derived(store.current);
  let settings = $derived(state?.settings);
  let client = $derived(settings?.connection ? getClient(settings.connection) : undefined);

  function updateSettings(patch: Partial<Settings>) {
    if (!settings) return;
    browser.storage.local.set({ settings: { ...settings, ...patch } });
  }
</script>

{#if state?.settings}
  <Popup
    tasks={state.tasks ?? []}
    taskFetchFailureReason={state.taskFetchFailureReason ?? null}
    tasksLastInitiatedFetchTimestamp={state.tasksLastInitiatedFetchTimestamp ?? null}
    tasksLastCompletedFetchTimestamp={state.tasksLastCompletedFetchTimestamp ?? null}
    visibleTasks={state.settings.visibleTasks}
    changeVisibleTasks={(visibleTasks: VisibleTaskSettings) => updateSettings({ visibleTasks })}
    taskSort={state.settings.taskSortType}
    changeTaskSort={(taskSortType: TaskSortType) => updateSettings({ taskSortType })}
    badgeDisplay={state.settings.badgeDisplayType}
    changeBadgeDisplay={(badgeDisplayType: BadgeDisplayType) =>
      updateSettings({ badgeDisplayType })}
    showInactiveTasks={state.settings.showInactiveTasks}
    changeShowInactiveTasks={(showInactiveTasks: boolean) => updateSettings({ showInactiveTasks })}
    {client}
  />
{/if}
