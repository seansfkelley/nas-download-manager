import "./password-form.css";

import { useState } from "react";

import { LoginStatus, Status } from "../common/components/LoginStatus";

import type { PopupClient } from "./popupClient";

export interface Props {
  client: PopupClient;
}

export function PasswordForm(props: Props) {
  const [status, setStatus] = useState<Status>("none");
  const [password, setPassword] = useState("");

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
