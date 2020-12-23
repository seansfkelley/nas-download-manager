import "./footer.scss";
import * as React from "react";
import classNames from "classnames";
import { moment } from "../common/moment";
import type { CachedTasks } from "../common/state";
import { formatMetric1024 } from "../common/format";

export interface Props extends CachedTasks {}

export function Footer(props: Props) {
  if (props.taskFetchFailureReason === "missing-config") {
    return null;
  }

  const totalDownloadSpeed = props.tasks.reduce(
    (acc, t) => acc + t.additional!.transfer!.speed_download,
    0,
  );
  const totalUploadSpeed = props.tasks.reduce(
    (acc, t) => acc + t.additional!.transfer!.speed_upload,
    0,
  );

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
      moment(props.tasksLastCompletedFetchTimestamp).fromNow(),
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
      {/* Use the same icon as the spacer so that it's always the same size as the right icon. */}
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
