<script lang="ts">
  import Icon from "../common/components/Icon.svelte";
  import type { IconName } from "../common/components/Icon.svelte";
  import type { State } from "../common/state/defaults";
  import { formatMetric1024 } from "../common/format";

  const locale = browser.i18n.getUILanguage();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
    { amount: 60, unit: "second" },
    { amount: 60, unit: "minute" },
    { amount: 24, unit: "hour" },
    { amount: 7, unit: "day" },
    { amount: 4.345, unit: "week" },
    { amount: 12, unit: "month" },
    { amount: Infinity, unit: "year" },
  ];

  function fromNow(timestamp: number): string {
    let diff = (timestamp - Date.now()) / 1000;
    for (const { amount, unit } of DIVISIONS) {
      if (Math.abs(diff) < amount) {
        return rtf.format(Math.round(diff), unit);
      }
      diff /= amount;
    }
    return rtf.format(Math.round(diff), "year");
  }

  interface Props {
    tasks: State["tasks"];
    taskFetchFailureReason: State["taskFetchFailureReason"];
    tasksLastInitiatedFetchTimestamp: State["tasksLastInitiatedFetchTimestamp"];
    tasksLastCompletedFetchTimestamp: State["tasksLastCompletedFetchTimestamp"];
  }

  let {
    tasks,
    taskFetchFailureReason,
    tasksLastInitiatedFetchTimestamp,
    tasksLastCompletedFetchTimestamp,
  }: Props = $props();

  let totalDownloadSpeed = $derived(
    tasks.reduce((acc, t) => acc + (t.additional?.transfer?.speed_download ?? 0), 0),
  );
  let totalUploadSpeed = $derived(
    tasks.reduce((acc, t) => acc + (t.additional?.transfer?.speed_upload ?? 0), 0),
  );

  let statusInfo = $derived.by(() => {
    let tooltip: string;
    let text: string | undefined = undefined;
    let intent: string | undefined = undefined;
    let icon: IconName;
    let spin = false;

    if (tasksLastCompletedFetchTimestamp == null) {
      tooltip = browser.i18n.getMessage("Updating_download_tasks");
      icon = "arrows-rotate";
      spin = true;
    } else if (taskFetchFailureReason != null && typeof taskFetchFailureReason === "object") {
      text = browser.i18n.getMessage("Error_updating_tasks");
      tooltip = taskFetchFailureReason.failureMessage;
      intent = "intent-error";
      icon = "circle-info";
    } else {
      tooltip = browser.i18n.getMessage("Updated_ZtimeZ", [
        fromNow(tasksLastCompletedFetchTimestamp),
      ]);
      icon = "check";
    }

    if (
      tasksLastInitiatedFetchTimestamp != null &&
      tasksLastCompletedFetchTimestamp != null &&
      tasksLastInitiatedFetchTimestamp > tasksLastCompletedFetchTimestamp
    ) {
      icon = "arrows-rotate";
      spin = true;
      tooltip += " " + browser.i18n.getMessage("updating_now");
    }

    return { tooltip, text, intent, icon, spin };
  });
</script>

{#if taskFetchFailureReason !== "missing-config" && taskFetchFailureReason !== "login-required"}
  <footer>
    <Icon name="arrow-down" />
    {formatMetric1024(totalDownloadSpeed)}B/s
    <span class="spacer"></span>
    <Icon name="arrow-up" />
    {formatMetric1024(totalUploadSpeed)}B/s
    <span class="status {statusInfo.intent ?? ''}" title={statusInfo.tooltip}>
      <Icon name={statusInfo.icon} spin={statusInfo.spin} />
      {#if statusInfo.text}{statusInfo.text}{/if}
    </span>
  </footer>
{/if}

<style>
  footer {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    border-top: 1px solid rgba(0, 0, 0, 0.2);

    .spacer {
      margin-right: 8px;
    }

    .status {
      margin-left: auto;
    }
  }
</style>
