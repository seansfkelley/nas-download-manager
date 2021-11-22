import "./password-form.scss";

import * as React from "react";
import type { PopupClient } from "./popupClient";

export interface Props {
  client: PopupClient;
}

export function PasswordForm(props: Props) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [password, setPassword] = React.useState("");

  return (
    <form
      className="password-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setIsLoading(true);
        await props.client.testConnectionAndLogin(password);
        setIsLoading(false);
      }}
    >
      <input
        type="password"
        value={password}
        disabled={isLoading}
        onChange={(e) => {
          setPassword(e.currentTarget.value);
        }}
      />
      <button type="submit" disabled={password.length === 0 || isLoading}>
        {browser.i18n.getMessage("Login")}
      </button>
    </form>
  );
}
