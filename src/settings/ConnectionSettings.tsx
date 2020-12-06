import * as React from "react";

import {
  Protocol,
  PROTOCOLS,
  ConnectionSettings as ConnectionSettingsObject,
} from "../common/state";
import { SettingsList } from "../common/components/SettingsList";
import { ConnectionTestResultDisplay } from "./ConnectionTestResultDisplay";
import { ConnectionTestResult, testConnection } from "./settingsUtils";
import { disabledPropAndClassName, kludgeRefSetClassname } from "./classnameUtil";

interface Props {
  connectionSettings: ConnectionSettingsObject;
  saveConnectionSettings: (settings: ConnectionSettingsObject) => void;
}

interface State {
  changedSettings: Partial<ConnectionSettingsObject>;
  connectionTest: "none" | "in-progress" | ConnectionTestResult;
  isConnectionTestSlow: boolean;
}

export class ConnectionSettings extends React.PureComponent<Props, State> {
  private connectionTestSlowTimeout?: number;
  state: State = {
    changedSettings: {},
    connectionTest: "none",
    isConnectionTestSlow: false,
  };

  render() {
    const connectionDisabledProps = disabledPropAndClassName(
      this.state.connectionTest === "in-progress",
    );

    const mergedSettings = this.getMergedSettings();

    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          this.testConnectionAndSave();
        }}
        className="connection-settings"
      >
        <SettingsList>
          <li className="label-and-input host-settings">
            <span className="label">{browser.i18n.getMessage("Host")}</span>
            <div className="input">
              <select
                {...connectionDisabledProps}
                value={mergedSettings.protocol}
                onChange={(e) => {
                  this.setSetting("protocol", e.currentTarget.value as Protocol);
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
            <ConnectionTestResultDisplay
              testResult={this.state.connectionTest}
              reassureUser={this.state.isConnectionTestSlow}
            />
            <button
              type="submit"
              {...disabledPropAndClassName(
                !mergedSettings.protocol ||
                  !mergedSettings.hostname ||
                  !mergedSettings.port ||
                  !mergedSettings.username ||
                  !mergedSettings.password ||
                  this.state.connectionTest === "in-progress" ||
                  this.state.connectionTest === "good-and-modern" ||
                  this.state.connectionTest === "good-and-legacy",
              )}
            >
              {browser.i18n.getMessage("Test_Connection_and_Save")}
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

  private setSetting<K extends keyof ConnectionSettingsObject>(
    key: K,
    value: ConnectionSettingsObject[K],
  ) {
    this.setState({
      connectionTest: "none",
      isConnectionTestSlow: false,
      changedSettings: {
        ...this.state.changedSettings,
        [key]: value,
      },
    });
  }

  private testConnectionAndSave = async () => {
    clearTimeout(this.connectionTestSlowTimeout!);

    this.setState({
      connectionTest: "in-progress",
      isConnectionTestSlow: false,
    });

    this.connectionTestSlowTimeout = (setTimeout(() => {
      this.setState({
        isConnectionTestSlow: true,
      });
    }, 5000) as any) as number;

    const mergedSettings = this.getMergedSettings();
    const result = await testConnection(mergedSettings);

    clearTimeout(this.connectionTestSlowTimeout!);
    this.setState({
      connectionTest: result,
      isConnectionTestSlow: false,
    });

    if (result === "good-and-modern" || result === "good-and-legacy") {
      this.props.saveConnectionSettings(mergedSettings);
    }
  };

  componentWillUnmount() {
    clearTimeout(this.connectionTestSlowTimeout!);
  }
}
