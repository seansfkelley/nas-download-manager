import "./password-form.scss";

import * as React from "react";
import type { PopupClient } from "./popupClient";
import { LoginStatus, Status } from "../common/components/LoginStatus";

export interface Props {
  client: PopupClient;
}

export function PasswordForm(props: Props) {
  const [status, setStatus] = React.useState<Status>("none");
  const [password, setPassword] = React.useState("");

  return (
    <form
      className="password-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus("in-progress");
        setStatus(await props.client.testConnectionAndLogin(password));
      }}
    >
      <div className="centering-wrapper">
        <input
          type="password"
          value={password}
          disabled={status === "in-progress"}
          onChange={(e) => {
            setStatus("none");
            setPassword(e.currentTarget.value);
          }}
        />
        <button type="submit" disabled={password.length === 0 || status === "in-progress"}>
          {browser.i18n.getMessage("Login")}
        </button>
      </div>
      <LoginStatus status={status} />
    </form>
  );
}
