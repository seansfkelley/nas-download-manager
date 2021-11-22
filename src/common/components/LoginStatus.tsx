import "./login-status.scss";

import * as React from "react";
import classNames from "classnames";

import { ClientRequestResult } from "../apis/synology";
import { getErrorForConnectionFailure, getErrorForFailedResponse } from "../apis/errors";
import { assertNever } from "../lang";

export type Status = "none" | "in-progress" | ClientRequestResult<unknown>;

export interface Props {
  status: Status;
}

export function LoginStatus({ status }: Props) {
  const [isSlow, setIsSlow] = React.useState(false);

  React.useEffect(() => {
    if (status === "in-progress") {
      const timeout = setTimeout(() => {
        setIsSlow(true);
      }, 5000);
      return () => {
        clearTimeout(timeout);
      };
    } else {
      setIsSlow(false);
      return () => {}; // appease linter
    }
  }, [status]);

  if (status === "none") {
    return <StatusDisplay />;
  } else if (status === "in-progress") {
    const text = isSlow
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
