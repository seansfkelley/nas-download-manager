import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as classNamesProxy from 'classnames';

// https://github.com/rollup/rollup/issues/1267
const classNames: typeof classNamesProxy = (classNamesProxy as any).default || classNamesProxy;

import {
  Settings,
  Protocol,
  PROTOCOLS,
  ConnectionSettings,
  VisibleTaskSettings,
  TaskSortType,
  NotificationSettings,
  loadSettings,
  DEFAULT_SETTINGS,
} from '../common/state';
import {
  isErrorCodeResult,
  ConnectionTestResult,
  saveSettings,
  testConnection
} from './settingsUtils';
import { DOWNLOAD_ONLY_PROTOCOLS } from '../common/apis/actions';
import { errorMessageFromCode, errorMessageFromConnectionFailure } from '../common/apis/errors';
import { assertNever } from '../common/lang';
import { shimExtensionApi } from '../common/apis/browserShim';
import { TaskFilterSettingsForm } from '../common/components/TaskFilterSettingsForm';

shimExtensionApi();

interface SettingsFormProps {
  initialSettings: Settings;
  saveSettings: (settings: Settings) => Promise<boolean>;
}

interface SettingsFormState {
  settings: Settings;
  connectionTest?: 'in-progress' | ConnectionTestResult;
  savingStatus: 'unchanged' | 'pending-changes' | 'in-progress' | 'failed' | 'saved';
  rawPollingInterval: string;
}

const POLL_MIN_INTERVAL = 15;
const POLL_DEFAULT_INTERVAL = 60;
const POLL_STEP = 15;

// For some reason, (p)react in the Firefox settings page is incapable of setting the classname on <input>
// elements. So hax with this ref callback that does it by touching the DOM directly. I don't know who
// is at fault or why, but this workaround works.
function kludgeRefSetClassname(className: string) {
  return (e: HTMLElement | null) => {
    if (e != null) {
      e.className = className;
    }
  };
}

function isValidPollingInterval(stringValue: string) {
  return !isNaN(+stringValue) && +stringValue >= POLL_MIN_INTERVAL
}

class SettingsForm extends React.PureComponent<SettingsFormProps, SettingsFormState> {
  state: SettingsFormState = {
    settings: this.props.initialSettings,
    savingStatus: 'unchanged',
    rawPollingInterval: this.props.initialSettings.notifications.pollingInterval.toString() || POLL_DEFAULT_INTERVAL.toString()
  };

  render() {
    const connectionDisabledProps = this.disabledPropAndClassName(this.state.connectionTest === 'in-progress');
    return (
      <div className='settings-form'>
        <header>
          <h3>{browser.i18n.getMessage('Connection')}</h3>
          <p>{browser.i18n.getMessage('Please_note_that_QuickConnect_IDs_are_not_currently_supported')}</p>
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
                <span>://</span>
                <input
                  type='text'
                  {...connectionDisabledProps}
                  placeholder={browser.i18n.getMessage('hostname_or_IP_address')}
                  value={this.state.settings.connection.hostname}
                  onChange={e => {
                    this.setConnectionSetting('hostname', e.currentTarget.value.trim());
                  }}
                  ref={kludgeRefSetClassname('host-setting')}
                />
                <span>:</span>
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
              <span className='label'>{browser.i18n.getMessage('Username')}</span>
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
              <span className='label'>{browser.i18n.getMessage('Password')}</span>
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
                !this.state.settings.connection.port ||
                !this.state.settings.connection.username ||
                !this.state.settings.connection.password ||
                this.state.connectionTest === 'in-progress' ||
                this.state.connectionTest === 'good'
              )}
            >
              {browser.i18n.getMessage('Test_Connection')}
            </button>
            {this.renderConnectionTestResult()}
          </li>
        </ul>

        <div className='horizontal-separator'/>

        <header>
          <h3>{browser.i18n.getMessage('Task_Display_Settings')}</h3>
          <p>{browser.i18n.getMessage('Display_these_task_types_in_the_popup_menu')}</p>
        </header>

        <TaskFilterSettingsForm
          visibleTasks={this.state.settings.visibleTasks}
          taskSortType={this.state.settings.taskSortType}
          updateVisibleTasks={this.updateVisibleTaskSettings}
          updateTaskSortType={this.updateTaskSortType}
        />

        <div className='horizontal-separator'/>

        <header>
          <h3>{browser.i18n.getMessage('Miscellaneous')}</h3>
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
              {browser.i18n.getMessage('Notify_when_downloads_complete')}
            </label>
          </li>

          <li>
            <span className='indent'>
              {browser.i18n.getMessage('Check_for_completed_downloads_every')}
            </span>
            <input
              type='number'
              {...this.disabledPropAndClassName(!this.state.settings.notifications.enabled)}
              min={POLL_MIN_INTERVAL}
              step={POLL_STEP}
              value={this.state.rawPollingInterval}
              ref={kludgeRefSetClassname('polling-interval')}
              onChange={e => {
                const rawPollingInterval = e.currentTarget.value;
                this.setState({ rawPollingInterval });
                if (isValidPollingInterval(rawPollingInterval)) {
                  this.setNotificationSetting('pollingInterval', +rawPollingInterval);
                }
              }}
            />
            {browser.i18n.getMessage('seconds')}
            {isValidPollingInterval(this.state.rawPollingInterval)
              ? undefined
              : <span className='intent-error wrong-polling-interval'>{browser.i18n.getMessage('at_least_15')}</span>}
          </li>

          <li>
            <input
              id='handle-links-checkbox'
              type='checkbox'
              checked={this.state.settings.shouldHandleDownloadLinks}
              onChange={() => {
                this.toggleShouldHandleDownloadLinks();
              }}
            />
            <label htmlFor='handle-links-checkbox'>
              {browser.i18n.getMessage('Handle_opening_downloadable_link_types_$protocols$', DOWNLOAD_ONLY_PROTOCOLS.join(', '))}
            </label>
          </li>
        </ul>

        <div className='horizontal-separator'/>

        {this.renderSaveButtonFooter()}
      </div>
    );
  }

  private renderSaveButtonFooter() {
    let text: string | null;

    switch (this.state.savingStatus) {
      case 'in-progress':
        text = browser.i18n.getMessage('Checking_connection');
        break;
      case 'unchanged':
        text = browser.i18n.getMessage('No_changes_to_save');
        break;
      case 'saved':
        text = browser.i18n.getMessage('Changes_saved');
        break;
      case 'failed':
        text = browser.i18n.getMessage('Save_failed_check_your_connection_settings');
        break;
      case 'pending-changes':
        text = null;
        break;
      default:
        return assertNever(this.state.savingStatus);
    }

    const isDisabled = (
      this.state.savingStatus === 'in-progress' ||
      this.state.savingStatus === 'unchanged' ||
      this.state.savingStatus === 'saved'
    );

    return (
      <div className='save-settings-footer'>
        <span className={classNames('save-result', { 'intent-error': this.state.savingStatus === 'failed' })}>
          {text}
        </span>
        <button
          onClick={this.saveSettings}
          {...this.disabledPropAndClassName(isDisabled)}
        >
          {browser.i18n.getMessage('Save_Settings')}
        </button>
      </div>
    );
  }

  private renderConnectionTestResult() {
    function renderResult(text?: string, icon?: string, className?: string)  {
      return (
        <span className={classNames('connection-test-result', className )}>
          {icon && <span className={classNames('fa', icon)}/>}
          {text}
        </span>
      );
    }

    const { connectionTest } = this.state;

    if (!connectionTest) {
      return renderResult();
    } else if (connectionTest === 'in-progress') {
      return renderResult(browser.i18n.getMessage('Testing_connection'), 'fa-refresh fa-spin');
    } else if (connectionTest === 'good') {
      return renderResult(browser.i18n.getMessage('Connection_successful'), 'fa-check', 'intent-success');
    } else if (isErrorCodeResult(connectionTest)) {
      return renderResult(errorMessageFromCode(connectionTest.code, 'Auth'), 'fa-times', 'intent-error');
    } else {
      return renderResult(errorMessageFromConnectionFailure(connectionTest), 'fa-times', 'intent-error');
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

  private updateVisibleTaskSettings = (visibleTasks: VisibleTaskSettings) => {
    this.setState({
      savingStatus: 'pending-changes',
      settings: {
        ...this.state.settings,
        visibleTasks
      }
    });
  };

  private updateTaskSortType = (taskSortType: TaskSortType) => {
    this.setState({
      savingStatus: 'pending-changes',
      settings: {
        ...this.state.settings,
        taskSortType
      }
    });
  };

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

  private toggleShouldHandleDownloadLinks() {
    this.setState({
      savingStatus: 'pending-changes',
      settings: {
        ...this.state.settings,
        shouldHandleDownloadLinks: !this.state.settings.shouldHandleDownloadLinks
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
      .then(success => this.setState({
        savingStatus: success ? 'saved' : 'failed'
      }));
  };
}

const ELEMENT = document.getElementById('body')!;

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
