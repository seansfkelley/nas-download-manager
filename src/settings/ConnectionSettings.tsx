import "./connection-settings.css";

import { useId, useState } from "react";

import { testConnection } from "../common/apis/connection";
import { ClientRequestResult } from "../common/apis/synology";
import { disabledPropAndClassName, kludgeRefSetClassname } from "../common/classnameUtil";
import { LoginStatus, Status } from "../common/components/LoginStatus";
import { SettingsList } from "../common/components/SettingsList";
import { assert } from "../common/lang";
import {
  ConnectionSettings as ConnectionSettingsObject,
  PROTOCOLS,
  Protocol,
} from "../common/state";
import type { Overwrite } from "../common/types";

type ConnectionSettingsWithMandatoryPassword = Overwrite<
  ConnectionSettingsObject,
  { password: string }
>;

interface Props {
  connectionSettings: ConnectionSettingsObject;
  saveConnectionSettings: (settings: ConnectionSettingsWithMandatoryPassword) => void;
}

export function ConnectionSettings(props: Props) {
  const [changedSettings, setChangedSettings] = useState<
    Partial<ConnectionSettingsWithMandatoryPassword>
  >({});
  const [loginStatus, setLoginStatus] = useState<Status>("none");
  const checkboxId = useId();

  const canEditFields = loginStatus !== "in-progress";
  const mergedSettings = { ...props.connectionSettings, ...changedSettings };

  function setSetting<K extends keyof ConnectionSettingsWithMandatoryPassword>(
    key: K,
    value: ConnectionSettingsWithMandatoryPassword[K],
  ) {
    setLoginStatus("none");
    setChangedSettings((settings) => ({ ...settings, [key]: value }));
  }

  async function testConnectionAndSave(settings: ConnectionSettingsWithMandatoryPassword) {
    setLoginStatus("in-progress");

    const result = await testConnection(settings);

    setLoginStatus(result);

    if (!ClientRequestResult.isConnectionFailure(result) && result.success) {
      props.saveConnectionSettings(settings);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        assert(mergedSettings.password != null);
        testConnectionAndSave(mergedSettings as ConnectionSettingsWithMandatoryPassword);
      }}
      className="connection-settings"
    >
      <SettingsList>
        <li className="label-and-input host-settings">
          <span className="label">{browser.i18n.getMessage("Host")}</span>
          <div className="input">
            <select
              {...disabledPropAndClassName(!canEditFields)}
              value={mergedSettings.protocol}
              onChange={(e) => {
                setSetting("protocol", e.currentTarget.value as Protocol);
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
              value={mergedSettings.hostname}
              onChange={(e) => {
                setSetting("hostname", e.currentTarget.value.trim());
              }}
              ref={kludgeRefSetClassname("host-setting")}
            />
            <span>:</span>
            <input
              {...disabledPropAndClassName(!canEditFields)}
              type="number"
              value={mergedSettings.port === 0 ? "" : mergedSettings.port}
              onChange={(e) => {
                const port = +(e.currentTarget.value.replace(/[^0-9]/g, "") || 0);
                setSetting("port", port);
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
              value={mergedSettings.username}
              onChange={(e) => {
                setSetting("username", e.currentTarget.value);
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
              value={mergedSettings.password ?? ""}
              onChange={(e) => {
                setSetting("password", e.currentTarget.value);
              }}
            />
          </div>
        </li>

        <li className="label-and-input remember-me">
          <input
            type="checkbox"
            {...disabledPropAndClassName(!canEditFields)}
            id={checkboxId}
            checked={mergedSettings.rememberPassword}
            onChange={() => {
              setSetting("rememberPassword", !mergedSettings.rememberPassword);
            }}
          />
          <label htmlFor={checkboxId}>{browser.i18n.getMessage("Remember_Password")}</label>
        </li>

        <li>
          <LoginStatus status={loginStatus} />
          <button
            type="submit"
            {...disabledPropAndClassName(
              !canEditFields ||
                !mergedSettings.protocol ||
                !mergedSettings.hostname ||
                !mergedSettings.port ||
                !mergedSettings.username ||
                !mergedSettings.password ||
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
