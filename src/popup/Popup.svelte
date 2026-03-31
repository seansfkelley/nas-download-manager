<script lang="ts">
  import Icon from "../common/components/Icon.svelte";
  import type { DownloadStationTask } from "../common/apis/synology/DownloadStation/Task";
  import type {
    VisibleTaskSettings,
    TaskSortType,
    BadgeDisplayType,
  } from "../common/state/defaults";
  import { sortTasks, filterTasks } from "../common/filtering";
  import TaskFilterSettingsForm from "../common/components/TaskFilterSettingsForm.svelte";
  import NonIdealState from "../common/components/NonIdealState.svelte";
  import type { PopupClient } from "./popupClient";
  import AdvancedAddDownloadForm from "./AdvancedAddDownloadForm.svelte";
  import Header from "./Header.svelte";
  import Footer from "./Footer.svelte";
  import Task from "./Task.svelte";
  import PasswordForm from "./PasswordForm.svelte";

  interface Props {
    tasks: DownloadStationTask[];
    taskFetchFailureReason: "missing-config" | "login-required" | { failureMessage: string } | null;
    tasksLastInitiatedFetchTimestamp: number | null;
    tasksLastCompletedFetchTimestamp: number | null;
    visibleTasks: VisibleTaskSettings;
    changeVisibleTasks: (visibleTasks: VisibleTaskSettings) => void;
    taskSort: TaskSortType;
    changeTaskSort: (sort: TaskSortType) => void;
    badgeDisplay: BadgeDisplayType;
    changeBadgeDisplay: (display: BadgeDisplayType) => void;
    showInactiveTasks: boolean;
    changeShowInactiveTasks: (show: boolean) => void;
    client?: PopupClient;
  }

  let {
    tasks,
    taskFetchFailureReason,
    tasksLastInitiatedFetchTimestamp,
    tasksLastCompletedFetchTimestamp,
    visibleTasks,
    changeVisibleTasks,
    taskSort,
    changeTaskSort,
    badgeDisplay,
    changeBadgeDisplay,
    showInactiveTasks,
    changeShowInactiveTasks,
    client,
  }: Props = $props();

  let isShowingDropShadow = $state(false);
  let isAddingDownload = $state(false);
  let isShowingDisplaySettings = $state(false);
  let isClearingCompletedTasks = $state(false);
  let bodyRef: HTMLElement | undefined;
  let scrollTimer: ReturnType<typeof setTimeout> | undefined;

  let completedTaskIds = $derived(tasks.filter((t) => t.status === "finished").map((t) => t.id));

  let onClickClearTasks = $derived.by(() => {
    if (!client) return undefined;
    return async () => {
      isClearingCompletedTasks = true;
      await client!.deleteTasks(completedTaskIds);
      isClearingCompletedTasks = false;
    };
  });

  let canAddDownload = $derived(client != null && taskFetchFailureReason !== "login-required");

  let filteredTasks = $derived(filterTasks(tasks, visibleTasks, showInactiveTasks));
  let sortedTasks = $derived(sortTasks(filteredTasks, taskSort));
  let hiddenTaskCount = $derived(tasks.length - filteredTasks.length);

  function updateTaskTypeVisibility(taskType: keyof VisibleTaskSettings, visibility: boolean) {
    changeVisibleTasks({ ...visibleTasks, [taskType]: visibility });
  }

  function onBodyScroll() {
    if (scrollTimer != null) return;
    scrollTimer = setTimeout(() => {
      scrollTimer = undefined;
      isShowingDropShadow = bodyRef ? bodyRef.scrollTop !== 0 : false;
    }, 200);
  }

  // Cleanup scroll timer on destroy
  $effect(() => {
    return () => {
      clearTimeout(scrollTimer);
    };
  });

  function deleteTask(taskId: string) {
    return client!.deleteTasks([taskId]);
  }
</script>

<div class="popup">
  <Header
    {isAddingDownload}
    onClickAddDownload={canAddDownload
      ? () => {
          isAddingDownload = !isAddingDownload;
          isShowingDisplaySettings = false;
        }
      : undefined}
    completedTaskCount={completedTaskIds.length}
    onClickClearTasks={isClearingCompletedTasks ? "pending" : onClickClearTasks}
    onClickOpenDownloadStationUi={client?.openDownloadStationUi}
    {isShowingDisplaySettings}
    onClickDisplaySettings={() => {
      isShowingDisplaySettings = !isShowingDisplaySettings;
      isAddingDownload = false;
    }}
    isMissingConfig={taskFetchFailureReason === "missing-config"}
    showDropShadow={isShowingDropShadow}
    disabledLogo={taskFetchFailureReason != null}
  />
  <div class="display-settings" class:is-visible={isShowingDisplaySettings}>
    <h4 class="title">{browser.i18n.getMessage("Task_Display_Settings")}</h4>
    <TaskFilterSettingsForm
      {visibleTasks}
      taskSortType={taskSort}
      badgeDisplayType={badgeDisplay}
      {showInactiveTasks}
      {updateTaskTypeVisibility}
      updateTaskSortType={changeTaskSort}
      updateBadgeDisplayType={changeBadgeDisplay}
      updateShowInactiveTasks={changeShowInactiveTasks}
    />
  </div>
  <div
    class="popup-body"
    class:with-foreground={isAddingDownload}
    onscroll={onBodyScroll}
    bind:this={bodyRef}
  >
    <!-- Task list -->
    {#if taskFetchFailureReason === "missing-config"}
      <NonIdealState
        text={browser.i18n.getMessage("Configure_your_hostname_username_and_password_in_settings")}
      >
        {#snippet icon()}<Icon name="gear" size="2x" />{/snippet}
      </NonIdealState>
    {:else if taskFetchFailureReason === "login-required"}
      {#if !client}
        <NonIdealState />
      {:else}
        <NonIdealState text={browser.i18n.getMessage("Password_required")}>
          {#snippet icon()}<Icon name="lock" size="2x" />{/snippet}
          <PasswordForm {client} />
        </NonIdealState>
      {/if}
    {:else if tasksLastCompletedFetchTimestamp == null}
      <NonIdealState>
        {#snippet icon()}<Icon name="arrows-rotate" size="2x" spin />{/snippet}
      </NonIdealState>
    {:else if tasks.length === 0}
      <NonIdealState text={browser.i18n.getMessage("No_download_tasks")} />
    {:else if filteredTasks.length === 0}
      <NonIdealState
        text={browser.i18n.getMessage("Download_tasks_exist_but_none_match_your_filters")}
      >
        {#snippet icon()}<Icon name="filter" size="2x" />{/snippet}
      </NonIdealState>
    {:else}
      <div class="download-tasks">
        <ul>
          {#each sortedTasks as task (task.id)}
            <Task
              {task}
              onDelete={client ? deleteTask : undefined}
              onPause={client?.pauseTask}
              onResume={client?.resumeTask}
            />
          {/each}
        </ul>
        {#if hiddenTaskCount > 0}
          <div
            class="hidden-count"
            onclick={() => {
              isShowingDisplaySettings = true;
            }}
            role="button"
            tabindex="0"
            onkeydown={(e) => {
              if (e.key === "Enter") isShowingDisplaySettings = true;
            }}
          >
            {browser.i18n.getMessage("and_ZcountZ_more_tasks_hidden_by_filters", [hiddenTaskCount])}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Add download overlay -->
    {#if isAddingDownload && client}
      <div class="add-download-overlay">
        <div class="backdrop"></div>
        <div class="overlay-content">
          <AdvancedAddDownloadForm
            onClose={() => {
              isAddingDownload = false;
            }}
            {client}
          />
        </div>
      </div>
    {/if}
  </div>
  <Footer
    {tasks}
    {taskFetchFailureReason}
    {tasksLastInitiatedFetchTimestamp}
    {tasksLastCompletedFetchTimestamp}
  />
</div>

<style>
  .popup {
    display: flex;
    flex-direction: column;

    .display-settings {
      flex-shrink: 0;
      max-height: 0px;
      /* If Firefox fails to reflow after this transition, try:
         1. interpolate-size: allow-keywords on the container
         2. bind:clientHeight with explicit height instead of max-height
         3. As last resort, a nonce-based forced rerender via $effect */
      transition: max-height 300ms;
      overflow: hidden;

      &.is-visible {
        max-height: 1000px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.2);
      }

      h4 {
        margin-left: 15px;
      }

      :global(.task-filter-settings-form select) {
        margin-right: 15px;
      }
    }

    .popup-body {
      flex: 1;
      overflow-y: auto;
      position: relative;
      min-height: 50px;

      &.with-foreground {
        min-height: 400px;

        > :not(.add-download-overlay) {
          filter: blur(3px);
        }

        .download-tasks {
          overflow-y: hidden;
          height: 100%;
        }
      }
    }
  }

  .download-tasks {
    .hidden-count {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      margin-top: 5px;
      margin-bottom: 10px;

      &:hover {
        text-decoration: underline;
        cursor: pointer;
      }
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
  }

  .popup-body .add-download-overlay {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;

    .backdrop {
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.2);
      filter: blur(0.5px);
    }

    .overlay-content {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      padding: 10px;
    }

    :global(.advanced-add-download-form) {
      height: 100%;

      :global(.download-path) {
        flex: 1;
      }
    }
  }
</style>
