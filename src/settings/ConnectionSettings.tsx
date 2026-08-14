import "./connection-settings.css";

import { useId, useState } from "react";

import { testConnection } from "../common/apis/connection";
import { ClientRequestResult } from "../common/apis/synology";
import { disabledPropAndClassName, kludgeRefSetClassname } from "../common/classnameUtil";
import { LoginStatus, Status } from "../common/components/LoginStatus";
import { SettingsList } from "../common/components/SettingsList";
import {
  ConnectionIdentifiers,
  ConnectionSecrets,
  ConnectionSettings as ConnectionSettingsObject,
  PROTOCOLS,
  Protocol,
} from "../common/state";
import type { Overwrite } from "../common/types";

type ConnectionSettingsWithSecrets = Overwrite<
  ConnectionSettingsObject,
  { secrets: ConnectionSecrets }
>;

interface Props {
  connectionSettings: ConnectionSettingsObject;
  saveConnectionSettings: (settings: ConnectionSettingsWithSecrets) => void;
}

export function ConnectionSettings(props: Props) {
  const [identifiers, setIdentifiers] = useState(props.connectionSettings.identifiers);
  const [password, setPassword] = useState(props.connectionSettings.secrets?.password ?? "");
  const [rememberSecrets, setRememberSecrets] = useState(props.connectionSettings.rememberSecrets);
  const [loginStatus, setLoginStatus] = useState<Status>("none");
  const [otpCode, setOtpCode] = useState("");
  const checkboxId = useId();

  const canEditFields = loginStatus !== "in-progress";

  function setIdentifier<K extends keyof ConnectionIdentifiers>(
    key: K,
    value: ConnectionIdentifiers[K],
  ) {
    setLoginStatus("none");
    setIdentifiers((identifiers) => ({ ...identifiers, [key]: value }));
  }

  async function testConnectionAndSave() {
    setLoginStatus("in-progress");

    const result = await testConnection(identifiers, password, otpCode || undefined);

    setLoginStatus(result);

    if (!ClientRequestResult.isConnectionFailure(result) && result.success) {
      props.saveConnectionSettings({
        identifiers,
        secrets: { password, deviceToken: result.data.did },
        rememberSecrets,
      });
      setOtpCode("");
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        testConnectionAndSave();
      }}
      className="connection-settings"
    >
      <SettingsList>
        <li className="label-and-input host-settings">
          <span className="label">{browser.i18n.getMessage("Host")}</span>
          <div className="input">
            <select
              {...disabledPropAndClassName(!canEditFields)}
              value={identifiers.protocol}
              onChange={(e) => {
                setIdentifier("protocol", e.currentTarget.value as Protocol);
              }}
              ref={kludgeRefSetClassname("protocol-setting")}
            >
              {PROTOCOLS.map((protocol) => (
                <option key={protocol} value={protocol}>
                  {protocol}
                </option>
              ))}
            </select>
            <span>://</span>
            <input
              type="text"
              {...disabledPropAndClassName(!canEditFields)}
              placeholder={browser.i18n.getMessage("hostname_or_IP_address")}
              value={identifiers.hostname}
              onChange={(e) => {
                setIdentifier("hostname", e.currentTarget.value.trim());
              }}
              ref={kludgeRefSetClassname("host-setting")}
            />
            <span>:</span>
            <input
              {...disabledPropAndClassName(!canEditFields)}
              type="number"
              value={identifiers.port === 0 ? "" : identifiers.port}
              onChange={(e) => {
                const port = +(e.currentTarget.value.replace(/[^0-9]/g, "") || 0);
                setIdentifier("port", port);
              }}
              ref={kludgeRefSetClassname("port-setting")}
            />
          </div>
        </li>

        <li className="label-and-input">
          <span className="label">{browser.i18n.getMessage("Username")}</span>
          <div className="input">
            <input
              type="text"
              {...disabledPropAndClassName(!canEditFields)}
              value={identifiers.username}
              onChange={(e) => {
                setIdentifier("username", e.currentTarget.value);
              }}
            />
          </div>
        </li>

        <li className="label-and-input">
          <span className="label">{browser.i18n.getMessage("Password")}</span>
          <div className="input">
            <input
              type="password"
              {...disabledPropAndClassName(!canEditFields)}
              value={password}
              onChange={(e) => {
                setLoginStatus("none");
                setPassword(e.currentTarget.value);
              }}
            />
          </div>
        </li>

        <li className="label-and-input remember-me">
          <input
            type="checkbox"
            {...disabledPropAndClassName(!canEditFields)}
            id={checkboxId}
            checked={rememberSecrets}
            onChange={() => {
              setLoginStatus("none");
              setRememberSecrets(!rememberSecrets);
            }}
          />
          <label htmlFor={checkboxId}>{browser.i18n.getMessage("Remember_Password")}</label>
        </li>

        <li className="label-and-input">
          <span className="label">
            {browser.i18n.getMessage("Twostep_verification_code_optional")}
          </span>
          <div className="input">
            <input
              type="text"
              autoComplete="one-time-code"
              {...disabledPropAndClassName(!canEditFields)}
              placeholder={browser.i18n.getMessage("Only_if_2step_verification_is_enabled")}
              value={otpCode}
              onChange={(e) => {
                setLoginStatus("none");
                setOtpCode(e.currentTarget.value.trim());
              }}
            />
          </div>
        </li>

        <li>
          <LoginStatus status={loginStatus} />
          <button
            type="submit"
            {...disabledPropAndClassName(
              !canEditFields ||
                !identifiers.protocol ||
                !identifiers.hostname ||
                !identifiers.port ||
                !identifiers.username ||
                !password ||
                (loginStatus !== "none" &&
                  !ClientRequestResult.isConnectionFailure(loginStatus) &&
                  loginStatus.success),
            )}
          >
            {browser.i18n.getMessage("Login")}
          </button>
        </li>
      </SettingsList>
    </form>
  );
}
