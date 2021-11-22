import * as React from "react";
import { default as uniqueId } from "lodash/uniqueId";

import type { ConnectionSettings as ConnectionSettingsObject } from "../common/state";
import { ClientRequestResult } from "../common/apis/synology";
import { SettingsList } from "../common/components/SettingsList";
import { LoginStatus } from "./LoginStatus";
import { disabledPropAndClassName, kludgeRefSetClassname } from "../common/classnameUtil";
import type { Overwrite } from "../common/types";
import { assert } from "../common/lang";
import { testConnection } from "../common/apis/connection";

type ConnectionSettingsWithMandatoryPassword = Overwrite<
  ConnectionSettingsObject,
  { password: string }
>;

interface Props {
  connectionSettings: ConnectionSettingsObject;
  saveConnectionSettings: (settings: ConnectionSettingsWithMandatoryPassword) => void;
}

interface State {
  changedSettings: Partial<ConnectionSettingsWithMandatoryPassword>;
  loginStatus: "none" | "in-progress" | ClientRequestResult<unknown>;
  isLoginSlow: boolean;
}

export class ConnectionSettings extends React.PureComponent<Props, State> {
  private loginSlowTimeout?: number;
  state: State = {
    changedSettings: {},
    loginStatus: "none",
    isLoginSlow: false,
  };

  render() {
    const connectionDisabledProps = disabledPropAndClassName(
      this.state.loginStatus === "in-progress",
    );
    const checkboxId = uniqueId("checkbox-id-");

    const mergedSettings = this.getMergedSettings();

    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          assert(mergedSettings.password != null);
          this.testConnectionAndSave(mergedSettings as ConnectionSettingsWithMandatoryPassword);
        }}
        className="connection-settings"
      >
        <SettingsList>
          <li className="label-and-input host-settings">
            <span className="label">{browser.i18n.getMessage("Host")}</span>
            <div className="input">
              <span>https://</span>
              <input
                type="text"
                {...connectionDisabledProps}
                placeholder={browser.i18n.getMessage("hostname_or_IP_address")}
                value={mergedSettings.hostname}
                onChange={(e) => {
                  this.setSetting("hostname", e.currentTarget.value.trim());
                }}
                ref={kludgeRefSetClassname("host-setting")}
              />
              <span>:</span>
              <input
                {...connectionDisabledProps}
                type="number"
                value={mergedSettings.port === 0 ? "" : mergedSettings.port}
                onChange={(e) => {
                  const port = +(e.currentTarget.value.replace(/[^0-9]/g, "") || 0);
                  this.setSetting("port", port);
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
                {...connectionDisabledProps}
                value={mergedSettings.username}
                onChange={(e) => {
                  this.setSetting("username", e.currentTarget.value);
                }}
              />
            </div>
          </li>

          <li className="label-and-input">
            <span className="label">{browser.i18n.getMessage("Password")}</span>
            <div className="input">
              <input
                type="password"
                {...connectionDisabledProps}
                value={mergedSettings.password}
                onChange={(e) => {
                  this.setSetting("password", e.currentTarget.value);
                }}
              />
            </div>
          </li>

          <li>
            <input
              type="checkbox"
              {...disabledPropAndClassName}
              id={checkboxId}
              checked={mergedSettings.rememberPassword}
              onChange={() => {
                this.setSetting("rememberPassword", !mergedSettings.rememberPassword);
              }}
            />
            <label htmlFor={checkboxId}>{browser.i18n.getMessage("Remember_Password")}</label>
          </li>

          <li>
            <LoginStatus status={this.state.loginStatus} reassureUser={this.state.isLoginSlow} />
            <button
              type="submit"
              {...disabledPropAndClassName(
                !mergedSettings.hostname ||
                  !mergedSettings.port ||
                  !mergedSettings.username ||
                  !mergedSettings.password ||
                  this.state.loginStatus === "in-progress" ||
                  (this.state.loginStatus !== "none" &&
                    !ClientRequestResult.isConnectionFailure(this.state.loginStatus) &&
                    this.state.loginStatus.success),
              )}
            >
              {browser.i18n.getMessage("Login")}
            </button>
          </li>
        </SettingsList>
      </form>
    );
  }

  private getMergedSettings() {
    return {
      ...this.props.connectionSettings,
      ...this.state.changedSettings,
    };
  }

  private setSetting<K extends keyof ConnectionSettingsWithMandatoryPassword>(
    key: K,
    value: ConnectionSettingsWithMandatoryPassword[K],
  ) {
    this.setState({
      loginStatus: "none",
      isLoginSlow: false,
      changedSettings: {
        ...this.state.changedSettings,
        [key]: value,
      },
    });
  }

  private testConnectionAndSave = async (settings: ConnectionSettingsWithMandatoryPassword) => {
    clearTimeout(this.loginSlowTimeout!);

    this.setState({
      loginStatus: "in-progress",
      isLoginSlow: false,
    });

    this.loginSlowTimeout = (setTimeout(() => {
      this.setState({
        isLoginSlow: true,
      });
    }, 5000) as any) as number;

    const result = await testConnection(settings);

    clearTimeout(this.loginSlowTimeout!);
    this.setState({
      loginStatus: result,
      isLoginSlow: false,
    });

    if (!ClientRequestResult.isConnectionFailure(result) && result.success) {
      this.props.saveConnectionSettings(settings);
    }
  };

  componentWillUnmount() {
    clearTimeout(this.loginSlowTimeout!);
  }
}
