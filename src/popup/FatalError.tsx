import "./fatal-error.css";
import type { ErrorInfo } from "react";

import { NonIdealState } from "../common/components/NonIdealState";
import { BUG_REPORT_URL } from "../common/constants";
import { redactSettings, Settings } from "../common/state";

export interface Props {
  error: unknown;
  errorInfo?: ErrorInfo | undefined;
  settings?: Settings;
  lastSevereError?: string;
}

export function FatalError(props: Props) {
  let redactedSettings;

  try {
    redactedSettings = props.settings != null ? redactSettings(props.settings) : undefined;
  } catch (e) {
    redactedSettings = undefined;
  }

  const formattedError =
    props.error instanceof Error
      ? `${props.error.name}: '${props.error.message}'\n${
          props.error.stack ? "Error stack trace: " + props.error.stack.trim() : "(no Error stack)"
        }`
      : JSON.stringify(props.error, null, 2);

  const formattedDebugLogs = `${props.lastSevereError ?? "(no severe error provided)"}

${
  redactedSettings
    ? "Redacted extension settings: " + JSON.stringify(redactedSettings, null, 2)
    : "(no state provided)"
}

${formattedError}

${props.errorInfo ? "React stack trace:" + props.errorInfo.componentStack : "(no React stack)"}`;

  return (
    <div className="popup fatal-error">
      <NonIdealState
        icon="fa-exclamation-triangle"
        text={browser.i18n.getMessage("Unknown_error_displaying_tasks")}
      >
        <span className="further-explanation">
          {browser.i18n.getMessage("Your_download_tasks_are_not_affected")}
        </span>
        <span className="further-explanation">
          {browser.i18n.getMessage("Please_")}
          <a href={BUG_REPORT_URL}>{browser.i18n.getMessage("file_a_bug")}</a>
          {browser.i18n.getMessage("_and_include_the_information_below")}
        </span>
        <textarea
          value={formattedDebugLogs}
          readOnly={true}
          onClick={(e) => {
            e.currentTarget.select();
          }}
        />
      </NonIdealState>
    </div>
  );
}
