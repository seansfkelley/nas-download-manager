import "./footer.css";
import classNames from "classnames";

import { formatMetric1024, formatRelativeTime } from "../common/format";
import type { TaskState } from "../common/state";

export interface Props extends TaskState {}

export function Footer(props: Props) {
  if (
    props.taskFetchFailureReason === "missing-config" ||
    props.taskFetchFailureReason === "login-required"
  ) {
    return null;
  }

  const totalDownloadSpeed =
    props.tasks?.reduce((acc, t) => acc + t.additional!.transfer!.speed_download, 0) ?? 0;
  const totalUploadSpeed =
    props.tasks?.reduce((acc, t) => acc + t.additional!.transfer!.speed_upload, 0) ?? 0;

  let tooltip: string;
  let text: string | undefined = undefined;
  let intent: string | undefined = undefined;
  let icon: string;

  if (props.tasksLastCompletedFetchTimestamp == null) {
    tooltip = browser.i18n.getMessage("Updating_download_tasks");
    icon = "fa-sync fa-spin";
  } else if (props.taskFetchFailureReason != null) {
    text = browser.i18n.getMessage("Error_updating_tasks");
    tooltip = props.taskFetchFailureReason.failureMessage;
    intent = "intent-error";
    icon = "fa-info-circle";
  } else {
    tooltip = browser.i18n.getMessage("Updated_ZtimeZ", [
      formatRelativeTime(props.tasksLastCompletedFetchTimestamp),
    ]);
    icon = "fa-check";
  }

  if (
    props.tasksLastInitiatedFetchTimestamp != null &&
    props.tasksLastCompletedFetchTimestamp != null &&
    props.tasksLastInitiatedFetchTimestamp > props.tasksLastCompletedFetchTimestamp
  ) {
    icon = "fa-sync fa-spin";
    tooltip += " " + browser.i18n.getMessage("updating_now");
  }

  return (
    <footer>
      <span className="fa fa-arrow-down" /> {formatMetric1024(totalDownloadSpeed)}B/s
      <span className="spacer" />
      <span className="fa fa-arrow-up" /> {formatMetric1024(totalUploadSpeed)}B/s
      <span className={classNames("status", intent)} title={tooltip}>
        <span className={classNames("fa", icon)} />
        {text}
      </span>
    </footer>
  );
}
