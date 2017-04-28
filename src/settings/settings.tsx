import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { Settings, ConnectionTestResult, loadSettings, saveSettings, testConnection, EMPTY_SETTINGS } from './utils';

interface SettingsFormProps {
  initialSettings: Settings;
  onCommit: (settings: Settings) => void;
}

interface SettingsFormState {
  settings: Settings;
  connectionTest?: 'in-progress' | ConnectionTestResult;
}

class SettingsForm extends React.Component<SettingsFormProps, SettingsFormState> {
  state: SettingsFormState = {
    settings: this.props.initialSettings
  };

  render() {
    return (
      <div className='settings-form'>
        <div className='option-group'>
          <div className='row'>
            <h3>Host and Authentication</h3>
          </div>
          <div className='row'>
            <label className='labeled-input'>
              Host
              <input
                type='text'
                disabled={this.state.connectionTest === 'in-progress'}
                value={this.state.settings.host}
                onChange={e => {
                  this.setSettingsState('host', e.currentTarget.value.trim());
                  this.clearConnectionTest();
                }}
              />
              {this.state.connectionTest &&
                (typeof this.state.connectionTest === 'string' ? this.state.connectionTest : this.state.connectionTest.failMessage)}
              {/*<span className='error-message'>
                Hostnames should be of the form <pre>http://your.host.name:1234</pre> (or <pre>https</pre>).
                Only hosts on the <pre>synology.me</pre> domain are currently allowed.
              </span>*/}
            </label>
          </div>
          <div className='row'>
            <label className='labeled-input'>
              Username
              <input
                type='text'
                disabled={this.state.connectionTest === 'in-progress'}
                value={this.state.settings.username}
                onChange={e => {
                  this.setSettingsState('username', e.currentTarget.value);
                  this.clearConnectionTest();
                }}
              />
            </label>

            <label className='labeled-input'>
              Password
              <input
                type='password'
                disabled={this.state.connectionTest === 'in-progress'}
                value={this.state.settings.password}
                onChange={e => {
                  this.setSettingsState('password', e.currentTarget.value);
                  this.clearConnectionTest();
                }}
              />
            </label>
          </div>

          <div className='row'>
            <button
              onClick={this.testConnection}
              disabled={!(this.state.connectionTest == null || this.state.connectionTest === 'good')}
            >
              Test Connection
            </button>
          </div>
        </div>

        <hr/>

        <div className='option-group'>
          <div className='row'>
            <h3>Downloads List</h3>
          </div>

          <span>Display tasks:</span>

          <div>
            <label>
              <input type='checkbox' checked/>
              Downloading
            </label>

            <label>
              <input type='checkbox' checked/>
              Uploading
            </label>

            <label>
              <input type='checkbox'/>
              Completed, not uploading
            </label>

            <label>
              <input type='checkbox' checked/>
              Errored
            </label>

            <label>
              <input type='checkbox'/>
              Other
            </label>
          </div>
        </div>

        <hr/>

        <div className='option-group'>
          <div className='row'>
            <h3>Notifications</h3>
          </div>

          <label>
            <input type='checkbox'/>
            Enabled Notifications
          </label>

          <label>
            Polling Interval
            <input type='number' min='5' max='3600' step='5'/>
          </label>
        </div>

        <hr/>

        <div className='option-group'>
          <button onClick={() => this.props.onCommit(this.state.settings)}>Save Settings</button>
        </div>
      </div>
    );
  }

  private clearConnectionTest() {
    this.setState({
      connectionTest: undefined
    });
  }

  private setSettingsState<K extends keyof Settings>(key: K, value: Settings[K]) {
    this.setState({
      settings: {
        ...this.state.settings,
        [key as string]: value
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
}

loadSettings()
  .then(settings => {
    console.log('successfully loaded settings');
    ReactDOM.render(
      <SettingsForm
        initialSettings={settings}
        onCommit={saveSettings}
      />, document.body);
  })
  .catch(error => {
    console.error('error while loading settings', error);
    ReactDOM.render(
      <SettingsForm
        initialSettings={EMPTY_SETTINGS}
        onCommit={saveSettings}
      />, document.body);
  })
