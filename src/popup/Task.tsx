import "./task.css";
import classNames from "classnames";
import { default as startCase } from "lodash/startCase";
import { default as upperCase } from "lodash/upperCase";
import { useState, type ReactNode } from "react";

import { MessageResponse, FailureMessageResponse } from "../common/apis/messages";
import type { DownloadStationTask } from "../common/apis/synology/DownloadStation/Task";
import { matchesFilter } from "../common/filtering";
import { formatMetric1024, formatTime, formatPercentage } from "../common/format";

export interface Props {
  task: DownloadStationTask;
  onDelete?: (taskId: string) => Promise<MessageResponse>;
  onPause?: (taskId: string) => Promise<MessageResponse>;
  onResume?: (taskId: string) => Promise<MessageResponse>;
}

type PauseResumeState = "none" | "in-progress" | FailureMessageResponse;
type DeleteState = "none" | "in-progress" | MessageResponse;

export function Task(props: Props) {
  const [pauseResumeState, setPauseResumeState] = useState<PauseResumeState>("none");
  const [deleteState, setDeleteState] = useState<DeleteState>("none");

  function computeFractionComplete() {
    const fractionComplete =
      Math.floor((props.task.additional!.transfer!.size_downloaded / props.task.size) * 100) / 100;
    return Number.isFinite(fractionComplete) ? fractionComplete : 0;
  }

  function computeSecondsRemaining(): number | undefined {
    const secondsRemaining = Math.round(
      (props.task.size - props.task.additional!.transfer!.size_downloaded) /
        props.task.additional!.transfer!.speed_download,
    );
    return Number.isFinite(secondsRemaining) ? secondsRemaining : undefined;
  }

  function renderStatus() {
    const renderStatusLine = (iconName: string, subtitle: ReactNode) => {
      return (
        <span title={startCase(props.task.status)}>
          <span className={classNames("status-icon", iconName)} />
          <span className="text">{subtitle}</span>
        </span>
      );
    };

    if (matchesFilter(props.task, "downloading")) {
      const fraction = computeFractionComplete();
      const eta = computeSecondsRemaining();
      return renderStatusLine(
        "fa fa-arrow-down",
        browser.i18n.getMessage("ZpercentZ_ZestimateZ_ZcurrentZ_of_ZtotalZ_at_ZspeedZ", [
          formatPercentage(fraction),
          eta != null
            ? browser.i18n.getMessage("ZetaZ_remaining", [formatTime(eta)])
            : browser.i18n.getMessage("no_estimate"),
          `${formatMetric1024(props.task.additional!.transfer!.size_downloaded)}B`,
          `${formatMetric1024(props.task.size)}B`,
          `${formatMetric1024(props.task.additional!.transfer!.speed_download)}B/s`,
        ]),
      );
    } else if (matchesFilter(props.task, "uploading")) {
      return renderStatusLine(
        "fa fa-arrow-up",
        browser.i18n.getMessage("ZratioZ_ratio_ZtotalZ_uploaded_at_ZspeedZ", [
          `${(props.task.additional!.transfer!.size_uploaded / props.task.size).toFixed(2)}`,
          `${formatMetric1024(props.task.additional!.transfer!.size_uploaded)}B`,
          `${formatMetric1024(props.task.additional!.transfer!.speed_upload)}B/s`,
        ]),
      );
    } else if (matchesFilter(props.task, "completed")) {
      return renderStatusLine(
        "fa fa-check",
        browser.i18n.getMessage("100_ZtotalZ_downloaded", [
          `${formatMetric1024(props.task.size)}B`,
        ]),
      );
    } else if (matchesFilter(props.task, "errored")) {
      return (
        <span className="intent-error">
          <span className="fa fa-exclamation-triangle error-icon" />
          {upperCase(props.task.status)}{" "}
          {props.task.status_extra
            ? `\u2013 ${startCase(props.task.status_extra.error_detail)}`
            : ""}
        </span>
      );
    } else {
      const fraction = computeFractionComplete();
      return renderStatusLine(
        "fa fa-clock",
        browser.i18n.getMessage("ZstatusZ_ZpercentZ_ZcurrentZ_of_ZtotalZ_downloaded", [
          upperCase(props.task.status),
          formatPercentage(fraction),
          `${formatMetric1024(props.task.additional!.transfer!.size_downloaded)}B`,
          `${formatMetric1024(props.task.size)}B`,
        ]),
      );
    }
  }

  function makePauseResume(what: "pause" | "resume") {
    return async () => {
      setPauseResumeState("in-progress");

      const response = await (what === "pause" ? props.onPause! : props.onResume!)(props.task.id);

      // This is a little gross, but here we just unset the state and fall back onto whatever
      // props.task states.
      setPauseResumeState(response.success ? "none" : response);
    };
  }

  function renderPauseResumeButton() {
    const renderButton = (
      title: string | undefined,
      state: "resumable" | "pausable" | "in-progress" | "failed",
    ) => {
      const isDisabled =
        props.onPause == null ||
        props.onResume == null ||
        deleteState === "in-progress" ||
        pauseResumeState === "in-progress" ||
        ((!MessageResponse.is(deleteState) || !deleteState.success) && pauseResumeState !== "none");
      return (
        <button
          onClick={makePauseResume(state === "resumable" ? "resume" : "pause")}
          title={title}
          disabled={isDisabled}
          className={classNames("pause-resume-button", { disabled: isDisabled })}
        >
          <div
            className={classNames("fa", {
              "fa-pause": state === "pausable",
              "fa-play": state === "resumable",
              "fa-sync fa-spin": state === "in-progress",
              "fa-exclamation": state === "failed",
            })}
          />
        </button>
      );
    };

    if (pauseResumeState === "in-progress") {
      return renderButton(undefined, "in-progress");
    } else if (pauseResumeState === "none") {
      if (props.task.status === "paused" || props.task.status === "error") {
        return renderButton(browser.i18n.getMessage("Resume"), "resumable");
      } else if (props.task.status === "finished") {
        return renderButton(browser.i18n.getMessage("Start_seeding"), "resumable");
      } else {
        return renderButton(browser.i18n.getMessage("Pause"), "pausable");
      }
    } else {
      return renderButton(pauseResumeState.reason, "failed");
    }
  }

  function renderRemoveButton() {
    let title: string = "";
    let disabled: boolean = pauseResumeState === "in-progress";
    if (props.onDelete == null || deleteState === "in-progress") {
      title = browser.i18n.getMessage("Remove_download");
      disabled = true;
    } else if (deleteState === "none") {
      title = browser.i18n.getMessage("Remove_download");
    } else if (!deleteState.success) {
      title = deleteState.reason;
      disabled = true;
    }
    return (
      <button
        onClick={async () => {
          setDeleteState("in-progress");
          setDeleteState(await props.onDelete!(props.task.id));
        }}
        title={title}
        disabled={disabled}
        className={classNames("remove-button", { disabled: disabled })}
      >
        <div
          className={classNames("fa", {
            "fa-times": deleteState !== "in-progress",
            "fa-sync fa-spin": deleteState === "in-progress",
          })}
        />
      </button>
    );
  }

  if (MessageResponse.is(deleteState) && deleteState.success) {
    return null;
  }

  const isErrored = matchesFilter(props.task, "errored");

  return (
    <li className="task">
      <div className="header">
        <div className="name-and-status">
          <div className="name" title={props.task.title}>
            {props.task.title}
          </div>
          <div className="status">{renderStatus()}</div>
        </div>
        {renderPauseResumeButton()}
        {renderRemoveButton()}
      </div>
      <div className="progress-bar">
        <div
          className={classNames("bar-fill", {
            "in-progress": matchesFilter(props.task, "downloading"),
            completed:
              matchesFilter(props.task, "uploading") || matchesFilter(props.task, "completed"),
            errored: isErrored,
            unknown: matchesFilter(props.task, "other"),
          })}
          style={{ width: `${(isErrored ? 1 : computeFractionComplete()) * 100}%` }}
        />
        <div className="bar-background" />
      </div>
    </li>
  );
}
