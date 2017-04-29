import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as classNamesProxy from 'classnames';

const classNames: ClassNamesFn = (classNamesProxy as any).default || classNamesProxy;

import {
  Settings,
  ConnectionSettings,
  VisibleTaskSettings,
  NotificationSettings,
  ConnectionTestResult,
  loadSettings,
  saveSettings,
  testConnection,
  DEFAULT_SETTINGS
} from './utils';

interface SettingsFormProps {
  initialSettings: Settings;
  saveSettings: (settings: Settings) => Promise<void>;
}

interface SettingsFormState {
  settings: Settings;
  connectionTest?: 'in-progress' | ConnectionTestResult;
  savingStatus: 'unchanged' | 'pending-changes' | 'in-progress' | 'failed' | 'saved';
}

const ORDERED_VISIBLE_TASK_TYPE_NAMES: Record<keyof VisibleTaskSettings, string> = {
  downloading: 'Downloading',
  uploading: 'Completed, uploading',
  completed: 'Completed, not uploading',
  errored: 'Errored',
  other: 'Other'
};

class SettingsForm extends React.Component<SettingsFormProps, SettingsFormState> {
  state: SettingsFormState = {
    settings: this.props.initialSettings,
    savingStatus: 'unchanged'
  };

  render() {
    console.log(this.state.settings);

    return (
      <div className='settings-form'>
        <header>
          <h3>Connection</h3>
          <p className={classNames({ 'error-message': this.state.connectionTest === 'invalid-host' })}>
            The hostname must be a URL of the form <pre>http(s)://{'<hostname>:<port>'}</pre>.
          </p>
        </header>

        <ul className='settings-list'>
          <li>
            <label className='labeled-input'>
              Host
              <input
                type='text'
                {...this.disabledPropAndClassName(this.state.connectionTest === 'in-progress')}
                value={this.state.settings.connection.host}
                onChange={e => {
                  this.setConnectionSetting('host', e.currentTarget.value.trim());
                }}
              />
            </label>
          </li>

          <li>
            <label className='labeled-input'>
              Username
              <input
                type='text'
                {...this.disabledPropAndClassName(this.state.connectionTest === 'in-progress')}
                value={this.state.settings.connection.username}
                onChange={e => {
                  this.setConnectionSetting('username', e.currentTarget.value);
                }}
              />
            </label>

            <label className='labeled-input'>
              Password
              <input
                type='password'
                {...this.disabledPropAndClassName(this.state.connectionTest === 'in-progress')}
                value={this.state.settings.connection.password}
                onChange={e => {
                  this.setConnectionSetting('password', e.currentTarget.value);
                }}
              />
            </label>
          </li>

          <li>
            <button
              onClick={this.testConnection}
              {...this.disabledPropAndClassName(
                !this.state.settings.connection.host ||
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

        <div className='panel-section-separator'/>

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

        <div className='panel-section-separator'/>

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
            <label>
              Enable Notifications
            </label>
          </li>

          <li>
            Polling Interval
            <input
              type='number'
              {...this.disabledPropAndClassName(!this.state.settings.notifications.enabled)}
              min='5'
              max='3600'
              step='5'
              value={this.state.settings.notifications.pollingInterval}
              onChange={e => {
                this.setNotificationSetting('pollingInterval', +e.currentTarget.value);
              }}
            />
          </li>
        </ul>

        <div className='panel-section-separator'/>

        <div className='option-group'>
          <button
            onClick={this.saveSettings}
            {...this.disabledPropAndClassName(this.state.savingStatus === 'in-progress' || this.state.savingStatus === 'unchanged' || this.state.savingStatus === 'saved')}
          >
            Save Settings
          </button>
          {this.state.savingStatus === 'failed' && (
            <div className='error-message'>
              Failed to save settings!
            </div>
          )}
          {this.state.savingStatus === 'saved' && (
            <div className='success-message'>
              Saved settings!
            </div>
          )}
        </div>
      </div>
    );
  }

  private renderConnectionTestResult() {
    switch (this.state.connectionTest) {
      case undefined:
        return null;

      case 'in-progress':
        return <span>in progress...</span>;

      case 'good':
        return <span>good!</span>;

      case 'invalid-host':
      case 'unknown-error':
      case 'bad-credentials':
        return <span>{this.state.connectionTest}</span>;

      default:
        return this.state.connectionTest.failMessage;
    }

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
