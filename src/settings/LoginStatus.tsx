import "./login-status.scss";
import * as React from "react";
import classNames from "classnames";

import { ClientRequestResult } from "../common/apis/synology";
import { getErrorForFailedResponse, getErrorForConnectionFailure } from "../common/apis/errors";
import { assertNever } from "../common/lang";

export interface Props {
  status: "none" | "in-progress" | ClientRequestResult<unknown>;
  reassureUser: boolean;
}

export function LoginStatus({ status, reassureUser }: Props) {
  if (status === "none") {
    return <StatusDisplay />;
  } else if (status === "in-progress") {
    const text = reassureUser
      ? browser.i18n.getMessage("Logging_in_this_is_unusually_slow_is_your_NAS_asleep")
      : browser.i18n.getMessage("Logging_in");
    return <StatusDisplay text={text} icon="fa-sync fa-spin" />;
  } else if (ClientRequestResult.isConnectionFailure(status)) {
    return (
      <StatusDisplay
        text={getErrorForConnectionFailure(status)}
        icon="fa-times"
        className="intent-error"
      />
    );
  } else if (status.success) {
    return (
      <StatusDisplay
        text={browser.i18n.getMessage("Login_successful")}
        icon="fa-check"
        className="intent-success"
      />
    );
  } else if (!status.success) {
    return (
      <StatusDisplay
        text={getErrorForFailedResponse(status)}
        icon="fa-times"
        className="intent-error"
      />
    );
  } else {
    return assertNever(status);
  }
}

function StatusDisplay({
  text,
  icon,
  className,
}: {
  text?: string;
  icon?: string;
  className?: string;
}) {
  return (
    <span className={classNames("login-status-display", className)}>
      {icon && <span className={classNames("fa", icon)} />}
      {text}
    </span>
  );
}
