import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as classNamesProxy from 'classnames';

// https://github.com/rollup/rollup/issues/1267
const classNames: ClassNamesFn = (classNamesProxy as any).default || classNamesProxy;

import {
  Settings,
  Protocol,
  PROTOCOLS,
  ConnectionSettings,
  VisibleTaskSettings,
  NotificationSettings,
  ConnectionTestResult,
  loadSettings,
  saveSettings,
  testConnection,
  assertNever,
  DEFAULT_SETTINGS
} from './utils';

import { SYNOLOGY_HOST_DOMAINS } from '../api';

interface SettingsFormProps {
  initialSettings: Settings;
  saveSettings: (settings: Settings) => Promise<void>;
}

interface SettingsFormState {
  settings: Settings;
  connectionTest?: 'in-progress' | ConnectionTestResult;
  savingStatus: 'unchanged' | 'pending-changes' | 'in-progress' | 'failed' | 'saved';
  rawPollingInterval: string;
}

const ORDERED_VISIBLE_TASK_TYPE_NAMES: Record<keyof VisibleTaskSettings, string> = {
  downloading: 'Downloading',
  uploading: 'Completed, uploading',
  completed: 'Completed, not uploading',
  errored: 'Errored',
  other: 'Other'
};

const POLL_MIN_INTERVAL = 5;
const POLL_DEFAULT_INTERVAL = 60;
const POLL_MAX_INTERVAL = 3600;
const POLL_STEP = 5;

// For some reason, (p)react in the Firefox settings page is incapable of setting the classname on <input>
// elements. So hax with this ref callback that does it by touching the DOM directly. I don't know who
// is at fault or why, but this workaround works.
function kludgeRefSetClassname(className: string) {
  return (e?: HTMLElement) => {
    if (e) {
      e.className = className;
    }
  };
}

class SettingsForm extends React.Component<SettingsFormProps, SettingsFormState> {
  state: SettingsFormState = {
    settings: this.props.initialSettings,
    savingStatus: 'unchanged',
    rawPollingInterval: this.props.initialSettings.notifications.pollingInterval.toString()
  };

  render() {
    console.log(this.state.settings);

    const connectionDisabledProps = this.disabledPropAndClassName(this.state.connectionTest === 'in-progress');

    return (
      <div className='settings-form'>
        <header>
          <h3>Connection</h3>
          <p>Please note that QuickConnect IDs are not currently supported.</p>
        </header>

        <ul className='settings-list'>
          <li>
            <div className='label-and-input connection-settings'>
              <span className='label'>Host</span>
              <div className='input'>
                <select
                  {...connectionDisabledProps}
                  value={this.state.settings.connection.protocol}
                  onChange={e => {
                    this.setConnectionSetting('protocol', e.currentTarget.value as Protocol);
                  }}
                  ref={kludgeRefSetClassname('protocol-setting')}
                >
                  {PROTOCOLS.map(protocol => (
                    <option key={protocol} value={protocol}>{protocol}</option>
                  ))}
                </select>
                ://
                <input
                  type='text'
                  {...connectionDisabledProps}
                  value={this.state.settings.connection.hostname}
                  onChange={e => {
                    this.setConnectionSetting('hostname', e.currentTarget.value.trim());
                  }}
                  ref={kludgeRefSetClassname('host-setting')}
                />
                .
                <select
                  {...connectionDisabledProps}
                  value={this.state.settings.connection.domain}
                  onChange={e => {
                    this.setConnectionSetting('domain', e.currentTarget.value);
                  }}
                  ref={kludgeRefSetClassname('domain-setting')}
                >
                  {SYNOLOGY_HOST_DOMAINS.map(domain => (
                    <option key={domain} value={domain}>{domain}</option>
                  ))}
                </select>
                :
                <input
                  {...connectionDisabledProps}
                  type='number'
                  value={this.state.settings.connection.port === 0 ? '' : this.state.settings.connection.port}
                  onChange={e => {
                    const port = +(e.currentTarget.value.replace(/[^0-9]/g, '') || 0);
                    this.setConnectionSetting('port', port);
                  }}
                  ref={kludgeRefSetClassname('port-setting')}
                />
              </div>
            </div>
          </li>

          <li>
            <div className='label-and-input'>
              <span className='label'>Username</span>
              <input
                type='text'
                {...connectionDisabledProps}
                value={this.state.settings.connection.username}
                onChange={e => {
                  this.setConnectionSetting('username', e.currentTarget.value);
                }}
              />
            </div>
          </li>

          <li>
            <div className='label-and-input'>
              <span className='label'>Password</span>
              <input
                type='password'
                {...connectionDisabledProps}
                value={this.state.settings.connection.password}
                onChange={e => {
                  this.setConnectionSetting('password', e.currentTarget.value);
                }}
              />
            </div>
          </li>

          <li>
            <button
              onClick={this.testConnection}
              {...this.disabledPropAndClassName(
                !this.state.settings.connection.protocol ||
                !this.state.settings.connection.hostname ||
                !this.state.settings.connection.domain ||
                !this.state.settings.connection.port ||
                !this.state.settings.connection.username ||
                !this.state.settings.connection.password ||
                this.state.connectionTest === 'in-progress' ||
                this.state.connectionTest === 'good'
              )}
            >
              Test Connection
            </button>
            {this.renderConnectionTestResult()}
          </li>
        </ul>

        <div className='horizontal-separator'/>

        <header>
          <h3>Downloads List</h3>
          <p>Display these task types in the popup menu.</p>
        </header>

        <ul className='settings-list'>
          {Object.keys(ORDERED_VISIBLE_TASK_TYPE_NAMES).map((type: keyof VisibleTaskSettings) => (
            <li key={type}>
              <input
                id={`${type}-input`}
                type='checkbox'
                checked={this.state.settings.visibleTasks[type]}
                onChange={() => {
                  this.toggleVisibilitySetting(type)
                }}
              />
              <label htmlFor={`${type}-input`}>
                {ORDERED_VISIBLE_TASK_TYPE_NAMES[type]}
              </label>
            </li>
          ))}
        </ul>

        <div className='horizontal-separator'/>

        <header>
          <h3>Notifications</h3>
        </header>

        <ul className='settings-list'>
          <li>
            <input
              id='notifications-checkbox'
              type='checkbox'
              checked={this.state.settings.notifications.enabled}
              onChange={() => {
                this.setNotificationSetting('enabled', !this.state.settings.notifications.enabled);
              }}
            />
            <label htmlFor='notifications-checkbox'>
              Enable Notifications
            </label>
          </li>

          <li>
            Check every
            <input
              type='number'
              {...this.disabledPropAndClassName(!this.state.settings.notifications.enabled)}
              min={POLL_MIN_INTERVAL}
              max={POLL_MAX_INTERVAL}
              step={POLL_STEP}
              value={this.state.rawPollingInterval}
              onChange={e => {
                this.setState({ rawPollingInterval: e.currentTarget.value });
              }}
              onBlur={() => {
                let value = +this.state.rawPollingInterval;
                if (isNaN(value)) {
                  value = POLL_DEFAULT_INTERVAL;
                } else if (value < POLL_MIN_INTERVAL) {
                  value = POLL_MIN_INTERVAL;
                } else if (value > POLL_MAX_INTERVAL) {
                  value = POLL_MAX_INTERVAL;
                }
                this.setState({ rawPollingInterval: value.toString() });
                this.setNotificationSetting('pollingInterval', value);
              }}
              ref={kludgeRefSetClassname('polling-interval')}
            />
            seconds
          </li>
        </ul>

        <div className='horizontal-separator'/>

        <div className='save-settings-footer'>
          {this.renderSaveButton()}
        </div>
      </div>
    );
  }

  private renderSaveButton() {
    let text;
    switch (this.state.savingStatus) {
      case 'in-progress': text = 'Saving...'; break;
      case 'unchanged': text = 'No Changes to Save'; break;
      case 'saved': text = 'Changes Saved'; break;
      case 'failed': text = 'Save Failed'; break;
      case 'pending-changes': text = 'Save Changes'; break;
      default: return assertNever(this.state.savingStatus);
    }

    const isDisabled = (
      this.state.savingStatus === 'in-progress' ||
      this.state.savingStatus === 'unchanged' ||
      this.state.savingStatus === 'saved'
    );

    return (
      <button
        onClick={this.saveSettings}
        {...this.disabledPropAndClassName(isDisabled)}
      >
        {text}
      </button>
    );
  }

  private renderConnectionTestResult() {
    let content: React.ReactChild | null;
    switch (this.state.connectionTest) {
      case undefined:
        content = null; break;
      case 'in-progress':
        content = 'Testing...'; break;
      case 'good':
        content = 'Connection successful!'; break;
      case 'unknown-error':
        content = 'An unexpected error occured -- check your host settings and internet connection.'; break;
      default:
        return this.state.connectionTest.failMessage;
    }
    return content;
  }

  private disabledPropAndClassName(disabled: boolean, otherClassNames?: string) {
    return {
      disabled,
      className: classNames({ 'disabled': disabled }, otherClassNames)
    };
  }

  private setConnectionSetting<K extends keyof ConnectionSettings>(key: K, value: ConnectionSettings[K]) {
    this.setState({
      savingStatus: 'pending-changes',
      connectionTest: undefined,
      settings: {
        ...this.state.settings,
        connection: {
          ...this.state.settings.connection,
          [key as string]: value
        }
      }
    });
  }

  private toggleVisibilitySetting<K extends keyof VisibleTaskSettings>(key: K) {
    this.setState({
      savingStatus: 'pending-changes',
      settings: {
        ...this.state.settings,
        visibleTasks: {
          ...this.state.settings.visibleTasks,
          [key as string]: !this.state.settings.visibleTasks[key]
        }
      }
    });
  }

  private setNotificationSetting<K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) {
    this.setState({
      savingStatus: 'pending-changes',
      settings: {
        ...this.state.settings,
        notifications: {
          ...this.state.settings.notifications,
          [key as string]: value
        }
      }
    });
  }

  private testConnection = () => {
    this.setState({
      connectionTest: 'in-progress'
    });

    testConnection(this.state.settings)
      .then(result => this.setState({
        connectionTest: result
      }));
  };

  private saveSettings = () => {
    this.setState({
      savingStatus: 'in-progress'
    });

    this.props.saveSettings(this.state.settings)
      .then(() => this.setState({
        savingStatus: 'saved'
      }))
      .catch(() => this.setState({
        savingStatus: 'failed'
      }));
  };
}

const ELEMENT = document.body;

/*ReactDOM.render(
  <SettingsForm
    initialSettings={settings}
    saveSettings={saveSettings}
  />, ELEMENT);
);*/

loadSettings()
  .then(settings => {
    console.log('successfully loaded settings');
    ReactDOM.render(
      <SettingsForm
        initialSettings={settings}
        saveSettings={saveSettings}
      />, ELEMENT);
  })
  .catch(error => {
    console.error('error while loading settings', error);
    ReactDOM.render(
      <SettingsForm
        initialSettings={DEFAULT_SETTINGS}
        saveSettings={saveSettings}
      />, ELEMENT);
  })
