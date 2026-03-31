<script lang="ts">
  import Icon from "../common/components/Icon.svelte";
  import { formatMetric1024, formatTime, formatPercentage } from "../common/format";
  import { matchesFilter } from "../common/filtering";
  import type { DownloadStationTask } from "../common/apis/synology/DownloadStation/Task";
  import { MessageResponse, type FailureMessageResponse } from "../common/apis/messages";

  function toStartCase(s: string): string {
    return s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function toUpperCase(s: string): string {
    return s.replace(/[_-]+/g, " ").toUpperCase();
  }

  interface Props {
    task: DownloadStationTask;
    onDelete?: (taskId: string) => Promise<MessageResponse>;
    onPause?: (taskId: string) => Promise<MessageResponse>;
    onResume?: (taskId: string) => Promise<MessageResponse>;
  }

  let { task, onDelete, onPause, onResume }: Props = $props();

  let pauseResumeState = $state<"none" | "in-progress" | FailureMessageResponse>("none");
  let deleteState = $state<"none" | "in-progress" | MessageResponse>("none");

  let isErrored = $derived(matchesFilter(task, "errored"));

  function computeFractionComplete() {
    const transfer = task.additional?.transfer;
    if (!transfer || !task.size) return 0;
    const fractionComplete = Math.floor((transfer.size_downloaded / task.size) * 100) / 100;
    return Number.isFinite(fractionComplete) ? fractionComplete : 0;
  }

  function computeSecondsRemaining(): number | undefined {
    const transfer = task.additional?.transfer;
    if (!transfer || !transfer.speed_download) return undefined;
    const secondsRemaining = Math.round(
      (task.size - transfer.size_downloaded) / transfer.speed_download,
    );
    return Number.isFinite(secondsRemaining) ? secondsRemaining : undefined;
  }

  async function handlePauseResume(what: "pause" | "resume") {
    pauseResumeState = "in-progress";
    const response = await (what === "pause" ? onPause! : onResume!)(task.id);
    pauseResumeState = response.success ? "none" : response;
  }

  async function handleDelete() {
    deleteState = "in-progress";
    deleteState = await onDelete!(task.id);
  }

  // Pause/resume button state
  let pauseResumeDisabled = $derived(
    onPause == null ||
      onResume == null ||
      deleteState === "in-progress" ||
      pauseResumeState === "in-progress" ||
      ((!MessageResponse.is(deleteState) || !deleteState.success) && pauseResumeState !== "none"),
  );

  // Delete button state
  let deleteDisabled = $derived(
    onDelete == null ||
      deleteState === "in-progress" ||
      pauseResumeState === "in-progress" ||
      (MessageResponse.is(deleteState) && !deleteState.success),
  );

  let deleteTitle = $derived(
    MessageResponse.is(deleteState) && !deleteState.success
      ? deleteState.reason
      : browser.i18n.getMessage("Remove_download"),
  );
</script>

{#if !(MessageResponse.is(deleteState) && deleteState.success)}
  <li class="task">
    <div class="header">
      <div class="name-and-status">
        <div class="name" title={task.title}>{task.title}</div>
        <div class="status">
          {#if matchesFilter(task, "downloading")}
            {@const fraction = computeFractionComplete()}
            {@const eta = computeSecondsRemaining()}
            <span title={toStartCase(task.status)}>
              <Icon name="arrow-down" className="status-icon" />
              <span class="text">
                {browser.i18n.getMessage("ZpercentZ_ZestimateZ_ZcurrentZ_of_ZtotalZ_at_ZspeedZ", [
                  formatPercentage(fraction),
                  eta != null
                    ? browser.i18n.getMessage("ZetaZ_remaining", [formatTime(eta)])
                    : browser.i18n.getMessage("no_estimate"),
                  `${formatMetric1024(task.additional?.transfer?.size_downloaded ?? 0)}B`,
                  `${formatMetric1024(task.size)}B`,
                  `${formatMetric1024(task.additional?.transfer?.speed_download ?? 0)}B/s`,
                ])}
              </span>
            </span>
          {:else if matchesFilter(task, "uploading")}
            <span title={toStartCase(task.status)}>
              <Icon name="arrow-up" className="status-icon" />
              <span class="text">
                {browser.i18n.getMessage("ZratioZ_ratio_ZtotalZ_uploaded_at_ZspeedZ", [
                  `${task.size > 0 ? ((task.additional?.transfer?.size_uploaded ?? 0) / task.size).toFixed(2) : "0.00"}`,
                  `${formatMetric1024(task.additional?.transfer?.size_uploaded ?? 0)}B`,
                  `${formatMetric1024(task.additional?.transfer?.speed_upload ?? 0)}B/s`,
                ])}
              </span>
            </span>
          {:else if matchesFilter(task, "completed")}
            <span title={toStartCase(task.status)}>
              <Icon name="check" className="status-icon" />
              <span class="text">
                {browser.i18n.getMessage("100_ZtotalZ_downloaded", [
                  `${formatMetric1024(task.size)}B`,
                ])}
              </span>
            </span>
          {:else if matchesFilter(task, "errored")}
            <span class="intent-error">
              <Icon name="triangle-exclamation" className="error-icon" />
              {toUpperCase(task.status)}
              {task.status_extra ? `\u2013 ${toStartCase(task.status_extra.error_detail)}` : ""}
            </span>
          {:else}
            {@const fraction = computeFractionComplete()}
            <span title={toStartCase(task.status)}>
              <Icon name="clock" className="status-icon" />
              <span class="text">
                {browser.i18n.getMessage("ZstatusZ_ZpercentZ_ZcurrentZ_of_ZtotalZ_downloaded", [
                  toUpperCase(task.status),
                  formatPercentage(fraction),
                  `${formatMetric1024(task.additional?.transfer?.size_downloaded ?? 0)}B`,
                  `${formatMetric1024(task.size)}B`,
                ])}
              </span>
            </span>
          {/if}
        </div>
      </div>
      <!-- Pause/Resume button -->
      {#if pauseResumeState === "in-progress"}
        <button disabled={pauseResumeDisabled} class="pause-resume-button">
          <Icon name="arrows-rotate" spin />
        </button>
      {:else if pauseResumeState === "none"}
        {#if task.status === "paused" || task.status === "error"}
          <button
            onclick={() => handlePauseResume("resume")}
            title={browser.i18n.getMessage("Resume")}
            disabled={pauseResumeDisabled}
            class="pause-resume-button"
          >
            <Icon name="play" />
          </button>
        {:else if task.status === "finished"}
          <button
            onclick={() => handlePauseResume("resume")}
            title={browser.i18n.getMessage("Start_seeding")}
            disabled={pauseResumeDisabled}
            class="pause-resume-button"
          >
            <Icon name="play" />
          </button>
        {:else}
          <button
            onclick={() => handlePauseResume("pause")}
            title={browser.i18n.getMessage("Pause")}
            disabled={pauseResumeDisabled}
            class="pause-resume-button"
          >
            <Icon name="pause" />
          </button>
        {/if}
      {:else}
        <button
          title={pauseResumeState.reason}
          disabled={pauseResumeDisabled}
          class="pause-resume-button"
        >
          <Icon name="exclamation" />
        </button>
      {/if}
      <!-- Delete button -->
      <button
        onclick={handleDelete}
        title={deleteTitle}
        disabled={deleteDisabled}
        class="remove-button"
      >
        <Icon
          name={deleteState === "in-progress" ? "arrows-rotate" : "xmark"}
          spin={deleteState === "in-progress"}
        />
      </button>
    </div>
    <div class="progress-bar">
      <div
        class="bar-fill"
        class:in-progress={matchesFilter(task, "downloading")}
        class:completed={matchesFilter(task, "uploading") || matchesFilter(task, "completed")}
        class:errored={isErrored}
        class:unknown={matchesFilter(task, "other")}
        style:width="{(isErrored ? 1 : computeFractionComplete()) * 100}%"
      ></div>
      <div class="bar-background"></div>
    </div>
  </li>
{/if}

<style>
  .task {
    padding: 8px;

    .header {
      display: flex;
      align-items: center;
      margin-bottom: 5px;

      .name-and-status {
        padding-right: 5px;
        margin-right: auto;
        overflow: hidden;

        .name,
        .status {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .name {
          font-weight: 500;
        }

        .status {
          font-size: 0.8em;
          color: var(--color-text-faded);

          :global(.error-icon) {
            margin-right: 3px;
          }
        }
      }

      .remove-button {
        color: var(--color-error);
      }

      .remove-button,
      .pause-resume-button {
        &:not(:last-child) {
          margin-right: 3px;
        }
      }
    }

    :global(.status-icon) {
      margin-right: 4px;
    }

    .progress-bar {
      height: 5px;
      border-radius: 2px;
      position: relative;

      .bar-fill {
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        border-radius: inherit;

        &.in-progress {
          background-color: var(--color-loading);
        }

        &.completed {
          background-color: var(--color-success);
        }

        &.errored {
          background-color: var(--color-error);
        }

        &.unknown {
          background-color: var(--color-indeterminate);
        }
      }

      .bar-background {
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        background-color: rgba(0, 0, 0, 0.1);
      }
    }

    &:not(:hover) .header {
      .remove-button,
      .pause-resume-button {
        display: none;
      }
    }
  }
</style>
