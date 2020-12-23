import "./footer.scss";
import * as React from "react";
import classNames from "classnames";
import { moment } from "../common/moment";
import type { CachedTasks } from "../common/state";
import { formatMetric1024 } from "../common/format";

export interface Props extends CachedTasks {}

export function Footer(props: Props) {
  const totalDownloadSpeed = props.tasks.reduce(
    (acc, t) => acc + t.additional!.transfer!.speed_download,
    0,
  );
  const totalUploadSpeed = props.tasks.reduce(
    (acc, t) => acc + t.additional!.transfer!.speed_upload,
    0,
  );

  let text: string;
  let tooltip: string;
  let classes: string | undefined = undefined;
  let leftIcon: string;
  let rightIcon: string | undefined = undefined;

  if (props.taskFetchFailureReason === "missing-config") {
    text = browser.i18n.getMessage("Settings_unconfigured");
    tooltip = browser.i18n.getMessage("The_hostname_username_or_password_are_not_configured");
    leftIcon = "fa-cog";
  } else if (props.tasksLastCompletedFetchTimestamp == null) {
    text = browser.i18n.getMessage("Updating");
    tooltip = browser.i18n.getMessage("Updating_download_tasks");
    leftIcon = "fa-sync fa-spin";
  } else if (props.taskFetchFailureReason != null) {
    text = browser.i18n.getMessage("Error_updating_tasks");
    tooltip = props.taskFetchFailureReason.failureMessage;
    classes = "intent-error";
    leftIcon = "fa-exclamation-triangle";
    rightIcon = "fa-info-circle";
  } else {
    text = browser.i18n.getMessage("Updated_ZtimeZ", [
      moment(props.tasksLastCompletedFetchTimestamp).fromNow(),
    ]);
    tooltip = moment(props.tasksLastCompletedFetchTimestamp).format("ll LTS");
    classes = "intent-success";
    leftIcon = "fa-check";
  }

  if (
    props.tasksLastInitiatedFetchTimestamp != null &&
    props.tasksLastCompletedFetchTimestamp != null &&
    props.tasksLastInitiatedFetchTimestamp > props.tasksLastCompletedFetchTimestamp
  ) {
    leftIcon = "fa-sync fa-spin";
    tooltip += " " + browser.i18n.getMessage("updating_now");
  }

  return (
    <footer>
      {props.tasks.length > 0 && (
        <>
          <span className="fa fa-arrow-down" /> {formatMetric1024(totalDownloadSpeed)}B/s
          <span className="spacer" />
          <span className="fa fa-arrow-up" /> {formatMetric1024(totalUploadSpeed)}B/s
        </>
      )}
      <div className={classNames("description", classes)} title={tooltip}>
        <span className={classNames("left-icon fa", leftIcon)} />
        {text}
        {rightIcon && <span className={classNames("right-icon fa", rightIcon)} />}
      </div>
    </footer>
  );
}
