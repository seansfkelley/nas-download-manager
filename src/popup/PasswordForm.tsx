import "./password-form.css";

import { useState } from "react";

import { ClientRequestResult } from "../common/apis/synology";
import { LoginStatus, Status } from "../common/components/LoginStatus";
import type { ConnectionSecrets } from "../common/state";

import type { PopupClient } from "./popupClient";

export interface Props {
  client: PopupClient;
  logIn: (secrets: ConnectionSecrets) => Promise<void>;
}

export function PasswordForm(props: Props) {
  const [status, setStatus] = useState<Status>("none");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");

  return (
    <form
      className="password-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus("in-progress");
        const result = await props.client.testConnection(password, otpCode || undefined);
        setStatus(result);
        if (!ClientRequestResult.isConnectionFailure(result) && result.success) {
          await props.logIn({ password, deviceToken: result.data.did });
        }
      }}
    >
      <input
        type="password"
        placeholder={browser.i18n.getMessage("Password")}
        value={password}
        disabled={status === "in-progress"}
        onChange={(e) => {
          setStatus("none");
          setPassword(e.currentTarget.value);
        }}
      />
      <input
        type="text"
        autoComplete="one-time-code"
        placeholder={browser.i18n.getMessage("2FA_code_only_if_required")}
        value={otpCode}
        disabled={status === "in-progress"}
        onChange={(e) => {
          setStatus("none");
          setOtpCode(e.currentTarget.value.trim());
        }}
      />
      <button type="submit" disabled={password.length === 0 || status === "in-progress"}>
        {browser.i18n.getMessage("Login")}
      </button>
      <LoginStatus status={status} />
    </form>
  );
}
