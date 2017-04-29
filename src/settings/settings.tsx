import * as React from 'react';
import * as ReactDOM from 'react-dom';

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
  savingStatus?: 'in-progress' | 'failed' | 'finished';
}

const ORDERED_VISIBLE_TASK_TYPE_NAMES: Record<keyof VisibleTaskSettings, string> = {
  downloading: 'Downloading',
  uploading: 'Uploading',
  completed: 'Completed (not uploading)',
  errored: 'Errored',
  other: 'Other'
};

class SettingsForm extends React.Component<SettingsFormProps, SettingsFormState> {
  state: SettingsFormState = {
    settings: this.props.initialSettings
  };

  render() {
    console.log(this.state.settings);
    return (
      <div className='settings-form'>
        <div className='option-group'>
          <header className='row'>
            <h3>Connection</h3>
            <p>The hostname should be a URL of the form <pre>http://your.host.name:1234</pre> (or <pre>https</pre>, as appropriate).</p>
          </header>
          <div className='row'>
            <label className='labeled-input'>
              Host
              <input
                type='text'
                disabled={this.state.connectionTest === 'in-progress'}
                value={this.state.settings.connection.host}
                onChange={e => {
                  this.setConnectionSetting('host', e.currentTarget.value.trim());
                }}
              />
            </label>
          </div>
          <div className='row'>
            <label className='labeled-input'>
              Username
              <input
                type='text'
                disabled={this.state.connectionTest === 'in-progress'}
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
                disabled={this.state.connectionTest === 'in-progress'}
                value={this.state.settings.connection.password}
                onChange={e => {
                  this.setConnectionSetting('password', e.currentTarget.value);
                }}
              />
            </label>
          </div>

          <div className='row'>
            <button
              onClick={this.testConnection}
              disabled={
                !this.state.settings.connection.host ||
                !this.state.settings.connection.username ||
                !this.state.settings.connection.password ||
                this.state.connectionTest === 'in-progress' ||
                this.state.connectionTest === 'good'
              }
            >
              Test Connection
            </button>
            {this.renderConnectionTestResult()}
          </div>
        </div>

        <hr/>

        <div className='option-group'>
          <header className='row'>
            <h3>Downloads List</h3>
            <p>Display these task types in the popup menu</p>
          </header>


          <div>
            {Object.keys(ORDERED_VISIBLE_TASK_TYPE_NAMES).map((type: keyof VisibleTaskSettings) => (
              <label key={type}>
                <input
                  type='checkbox'
                  checked={this.state.settings.visibleTasks[type]}
                  onChange={() => {
                    this.toggleVisibilitySetting(type)
                  }}
                />
                {ORDERED_VISIBLE_TASK_TYPE_NAMES[type]}
              </label>
            ))}
          </div>
        </div>

        <hr/>

        <div className='option-group'>
          <div className='row'>
            <h3>Notifications</h3>
          </div>

          <label>
            <input
              type='checkbox'
              checked={this.state.settings.notifications.enabled}
              onChange={() => {
                this.setNotificationSetting('enabled', !this.state.settings.notifications.enabled);
              }}
            />
            Enable Notifications
          </label>

          <label>
            Polling Interval
            <input
              type='number'
              disabled={!this.state.settings.notifications.enabled}
              min='5'
              max='3600'
              step='5'
              value={this.state.settings.notifications.pollingInterval}
              onChange={e => {
                this.setNotificationSetting('pollingInterval', +e.currentTarget.value);
              }}
            />
          </label>
        </div>

        <hr/>

        <div className='option-group'>
          <button
            onClick={this.saveSettings}
            disabled={this.state.savingStatus === 'in-progress'}
          >
            Save Settings
          </button>
          {this.state.savingStatus === 'failed' && (
            <div className='error-message'>
              Failed to save settings!
            </div>
          )}
        </div>
      </div>
    );
  }

  private renderConnectionTestResult() {
    switch (this.state.connectionTest) {
      case null:
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

  private setConnectionSetting<K extends keyof ConnectionSettings>(key: K, value: ConnectionSettings[K]) {
    this.setState({
      settings: {
        ...this.state.settings,
        connectionTest: undefined,
        connection: {
          ...this.state.settings.connection,
          [key as string]: value
        }
      }
    });
  }

  private toggleVisibilitySetting<K extends keyof VisibleTaskSettings>(key: K) {
    this.setState({
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
        savingStatus: 'finished'
      }))
      .catch(() => this.setState({
        savingStatus: 'failed'
      }));
  };
}

loadSettings()
  .then(settings => {
    console.log('successfully loaded settings');
    ReactDOM.render(
      <SettingsForm
        initialSettings={settings}
        saveSettings={saveSettings}
      />, document.body);
  })
  .catch(error => {
    console.error('error while loading settings', error);
    ReactDOM.render(
      <SettingsForm
        initialSettings={DEFAULT_SETTINGS}
        saveSettings={saveSettings}
      />, document.body);
  })
