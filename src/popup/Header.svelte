<script lang="ts">
  import Icon from "../common/components/Icon.svelte";

  interface Props {
    isAddingDownload: boolean;
    onClickAddDownload?: () => void;
    completedTaskCount: number;
    onClickClearTasks?: "pending" | (() => void);
    onClickOpenDownloadStationUi?: () => void;
    isShowingDisplaySettings: boolean;
    onClickDisplaySettings: () => void;
    isMissingConfig: boolean;
    showDropShadow: boolean;
    disabledLogo: boolean;
  }

  let {
    isAddingDownload,
    onClickAddDownload,
    completedTaskCount,
    onClickClearTasks,
    onClickOpenDownloadStationUi,
    isShowingDisplaySettings,
    onClickDisplaySettings,
    isMissingConfig,
    showDropShadow,
    disabledLogo,
  }: Props = $props();

  let addDisabled = $derived(onClickAddDownload == null);
  let clearDisabled = $derived(
    onClickClearTasks === "pending" || onClickClearTasks == null || completedTaskCount === 0,
  );
  let openDisabled = $derived(onClickOpenDownloadStationUi == null);
</script>

<header class:with-shadow={showDropShadow}>
  <img
    src={disabledLogo ? "/icons/icon-64-disabled.png" : "/icons/icon-64.png"}
    alt="NAS Download Manager"
  />
  <span class="extension-name">NAS Download Manager</span>
  <button
    onclick={onClickAddDownload}
    title={browser.i18n.getMessage("Add_download")}
    disabled={addDisabled}
    class:active={isAddingDownload}
  >
    <Icon name="plus" size="lg" />
  </button>
  <button
    onclick={onClickClearTasks === "pending" ? undefined : onClickClearTasks}
    title={browser.i18n.getMessage("Clear_ZcountZ_completed_and_not_uploading_tasks", [
      completedTaskCount,
    ])}
    disabled={clearDisabled}
  >
    {#if onClickClearTasks === "pending"}
      <Icon name="arrows-rotate" size="lg" spin />
    {:else}
      <Icon name="broom" size="lg" />
    {/if}
  </button>
  <button
    onclick={onClickOpenDownloadStationUi}
    title={browser.i18n.getMessage("Open_DownloadStation_UI")}
    disabled={openDisabled}
  >
    <Icon name="up-right-from-square" size="lg" />
  </button>
  <button
    onclick={onClickDisplaySettings}
    title={browser.i18n.getMessage("Show_task_display_settings")}
    class:active={isShowingDisplaySettings}
  >
    <Icon name="filter" size="lg" />
  </button>
  <button
    onclick={() => browser.runtime.openOptionsPage()}
    title={browser.i18n.getMessage("Open_settings")}
    class:called-out={isMissingConfig}
  >
    <Icon name="gear" size="lg" />
  </button>
</header>

<style>
  header {
    flex-shrink: 0;
    white-space: nowrap;
    display: flex;
    align-items: center;
    padding: 5px;
    transition: box-shadow 100ms;
    border-bottom: 1px solid rgba(0, 0, 0, 0.2);
    box-shadow: 0 1px 2px 2px rgba(0, 0, 0, 0);

    img {
      width: 24px;
      height: 24px;
      margin-right: 4px;
    }

    .extension-name {
      margin-right: auto;
      font-weight: 500;
    }

    button {
      margin-left: 2px;

      &.called-out {
        animation-name: shadow-glow;
        animation-duration: 1s;
        animation-iteration-count: infinite;
        animation-timing-function: ease-in-out;
        animation-direction: alternate;
      }
    }

    &.with-shadow {
      box-shadow: 0 1px 2px 2px rgba(0, 0, 0, 0.2);
    }
  }

  @keyframes shadow-glow {
    0% {
      box-shadow: 0 0 2px 2px rgba(19, 124, 189, 0);
    }
    100% {
      box-shadow: 0 0 2px 2px rgba(19, 124, 189, 0.7);
    }
  }
</style>
