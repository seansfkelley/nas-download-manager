import '../common/apis/browserShim';
import '../common/errorHandlers';
import pick from 'lodash-es/pick';
import merge from 'lodash-es/merge';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as classNamesProxy from 'classnames';

// https://github.com/rollup/rollup/issues/1267
const classNames: typeof classNamesProxy = (classNamesProxy as any).default || classNamesProxy;

import {
  Settings,
  Logging,
  Protocol,
  PROTOCOLS,
  ConnectionSettings,
  VisibleTaskSettings,
  TaskSortType,
  NotificationSettings,
  onStoredStateChange,
  SETTING_NAMES
} from '../common/state';
import { BUG_REPORT_URL } from '../common/constants';
import {
  ConnectionTestResult,
  saveSettings,
  testConnection
} from './settingsUtils';
import { DOWNLOAD_ONLY_PROTOCOLS } from '../common/apis/protocols';
import { assertNever } from '../common/lang';
import { TaskFilterSettingsForm } from '../common/components/TaskFilterSettingsForm';
import { SettingsList } from '../common/components/SettingsList';
import { SettingsListCheckbox } from '../common/components/SettingsListCheckbox';
import { ConnectionTestResultDisplay } from './ConnectionTestResultDisplay';

interface SettingsFormProps {
  initialSettings: Settings;
  saveSettings: (settings: Settings) => Promise<boolean>;
  lastSevereError?: any;
  clearError: () => void;
}

interface SettingsFormState {
  changedSettings: { [K in keyof Settings]?: Partial<Settings[K]> };
  connectionTest: 'none' | 'in-progress' | ConnectionTestResult;
  isConnectionTestSlow: boolean;
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

function disabledPropAndClassName(disabled: boolean, otherClassNames?: string) {
  return {
    disabled,
    className: classNames({ 'disabled': disabled }, otherClassNames)
  };
}

class SettingsForm extends React.PureComponent<SettingsFormProps, SettingsFormState> {
  private connectionTestSlowTimeout?: number;

  state: SettingsFormState = {
    changedSettings: {},
    savingStatus: 'unchanged',
    rawPollingInterval: this.props.initialSettings.notifications.completionPollingInterval.toString() || POLL_DEFAULT_INTERVAL.toString(),
    connectionTest: 'none',
    isConnectionTestSlow: false,
  };

  render() {
    const mergedSettings = this.computeMergedSettings();
    const connectionDisabledProps = disabledPropAndClassName(this.state.connectionTest === 'in-progress');
    return (
      <div className='settings-form'>
        <header>
          <h3>{browser.i18n.getMessage('Connection')}</h3>
          <p>{browser.i18n.getMessage('Please_note_that_QuickConnect_IDs_are_not_currently_supported')}</p>
        </header>

        <form onSubmit={e => {
          e.preventDefault();
          this.testConnection();
        }}>
          <ul className='settings-list'>
            <li>
              <div className='label-and-input connection-settings'>
                <span className='label'>Host</span>
                <div className='input'>
                  <select
                    {...connectionDisabledProps}
                    value={mergedSettings.connection.protocol}
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
                    value={mergedSettings.connection.hostname}
                    onChange={e => {
                      this.setConnectionSetting('hostname', e.currentTarget.value.trim());
                    }}
                    ref={kludgeRefSetClassname('host-setting')}
                  />
                  <span>:</span>
                  <input
                    {...connectionDisabledProps}
                    type='number'
                    value={mergedSettings.connection.port === 0 ? '' : mergedSettings.connection.port}
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
                  value={mergedSettings.connection.username}
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
                  value={mergedSettings.connection.password}
                  onChange={e => {
                    this.setConnectionSetting('password', e.currentTarget.value);
                  }}
                />
              </div>
            </li>

            <li>
              <button
                type='submit'
                {...disabledPropAndClassName(
                  !mergedSettings.connection.protocol ||
                  !mergedSettings.connection.hostname ||
                  !mergedSettings.connection.port ||
                  !mergedSettings.connection.username ||
                  !mergedSettings.connection.password ||
                  this.state.connectionTest === 'in-progress' ||
                  this.state.connectionTest === 'good'
                )}
              >
                {browser.i18n.getMessage('Test_Connection')}
              </button>
              <ConnectionTestResultDisplay
                testResult={this.state.connectionTest}
                reassureUser={this.state.isConnectionTestSlow}
              />
            </li>
          </ul>
        </form>

        <div className='horizontal-separator'/>

        <header>
          <h3>{browser.i18n.getMessage('Task_Display_Settings')}</h3>
          <p>{browser.i18n.getMessage('Display_these_task_types_in_the_popup_menu')}</p>
        </header>

        <TaskFilterSettingsForm
          visibleTasks={mergedSettings.visibleTasks}
          taskSortType={mergedSettings.taskSortType}
          updateTaskTypeVisibility={this.updateTaskTypeVisibility}
          updateTaskSortType={this.updateTaskSortType}
        />

        <div className='horizontal-separator'/>

        <header>
          <h3>{browser.i18n.getMessage('Miscellaneous')}</h3>
        </header>

        <SettingsList>
          <SettingsListCheckbox
            checked={mergedSettings.notifications.enableFeedbackNotifications}
            onChange={() => {
              this.setNotificationSetting('enableFeedbackNotifications', !mergedSettings.notifications.enableFeedbackNotifications);
            }}
            label={browser.i18n.getMessage('Notify_when_adding_downloads')}
          />
          <SettingsListCheckbox
            checked={mergedSettings.notifications.enableCompletionNotifications}
            onChange={() => {
              this.setNotificationSetting('enableCompletionNotifications', !mergedSettings.notifications.enableCompletionNotifications);
            }}
            label={browser.i18n.getMessage('Notify_when_downloads_complete')}
          />

          <li>
            <span className='indent'>
              {browser.i18n.getMessage('Check_for_completed_downloads_every')}
            </span>
            <input
              type='number'
              {...disabledPropAndClassName(!mergedSettings.notifications.enableCompletionNotifications)}
              min={POLL_MIN_INTERVAL}
              step={POLL_STEP}
              value={this.state.rawPollingInterval}
              ref={kludgeRefSetClassname('polling-interval')}
              onChange={e => {
                const rawPollingInterval = e.currentTarget.value;
                this.setState({ rawPollingInterval });
                if (isValidPollingInterval(rawPollingInterval)) {
                  this.setNotificationSetting('completionPollingInterval', +rawPollingInterval);
                }
              }}
            />
            {browser.i18n.getMessage('seconds')}
            {isValidPollingInterval(this.state.rawPollingInterval)
              ? undefined
              : <span className='intent-error wrong-polling-interval'>{browser.i18n.getMessage('at_least_15')}</span>}
          </li>

          <SettingsListCheckbox
            checked={mergedSettings.shouldHandleDownloadLinks}
            onChange={() => {
              this.setShouldHandleDownloadLinks(!mergedSettings.shouldHandleDownloadLinks);
            }}
            label={browser.i18n.getMessage(
              'Handle_opening_downloadable_link_types_ZprotocolsZ',
              [ DOWNLOAD_ONLY_PROTOCOLS.join(', ') ],
            )}
          />
        </SettingsList>

        {this.maybeRenderDebuggingOutputAndSeparator()}

        <div className='horizontal-separator'/>

        {this.renderSaveButtonFooter()}
      </div>
    );
  }

  private maybeRenderDebuggingOutputAndSeparator() {
    if (this.props.lastSevereError) {
      return (
        <>
          <div className='horizontal-separator'/>

          <header>
            <h3>{browser.i18n.getMessage('Debugging_Output')}</h3>
            <p>
              {browser.i18n.getMessage('Please_')}
              <a href={BUG_REPORT_URL}>
                {browser.i18n.getMessage('file_a_bug')}
              </a>
              {browser.i18n.getMessage('_and_include_the_information_below')}
            </p>
          </header>

          <SettingsList>
            <li>
              <textarea
                className='debugging-output'
                value={this.props.lastSevereError}
                readOnly={true}
                onClick={e => { e.currentTarget.select(); }}
              />
            </li>

            <li>
              <button onClick={this.props.clearError}>
                {browser.i18n.getMessage('Clear_output')}
              </button>
            </li>
          </SettingsList>
        </>
      );
    } else {
      return undefined;
    }
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
          {...disabledPropAndClassName(isDisabled)}
        >
          {browser.i18n.getMessage('Save_Settings')}
        </button>
      </div>
    );
  }

  private setConnectionSetting<K extends keyof ConnectionSettings>(key: K, value: ConnectionSettings[K]) {
    this.setState({
      savingStatus: 'pending-changes',
      connectionTest: 'none',
      isConnectionTestSlow: false,
      changedSettings: {
        ...this.state.changedSettings,
        connection: {
          ...this.state.changedSettings.connection,
          [key as string]: value
        }
      }
    });
  }

  private updateTaskTypeVisibility = (taskType: keyof VisibleTaskSettings, visibility: boolean) => {
    this.setState({
      savingStatus: 'pending-changes',
      changedSettings: {
        ...this.state.changedSettings,
        visibleTasks: {
          ...this.state.changedSettings.visibleTasks,
          [taskType]: visibility
        }
      }
    });
  };

  private updateTaskSortType = (taskSortType: TaskSortType) => {
    this.setState({
      savingStatus: 'pending-changes',
      changedSettings: {
        ...this.state.changedSettings,
        taskSortType
      }
    });
  };

  private setNotificationSetting<K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) {
    this.setState({
      savingStatus: 'pending-changes',
      changedSettings: {
        ...this.state.changedSettings,
        notifications: {
          ...this.state.changedSettings.notifications,
          [key as string]: value
        }
      }
    });
  }

  private setShouldHandleDownloadLinks(shouldHandleDownloadLinks: boolean) {
    this.setState({
      savingStatus: 'pending-changes',
      changedSettings: {
        ...this.state.changedSettings,
        shouldHandleDownloadLinks
      }
    });
  }

  private testConnection = () => {
    clearTimeout(this.connectionTestSlowTimeout!);

    this.setState({
      connectionTest: 'in-progress',
      isConnectionTestSlow: false
    });

    this.connectionTestSlowTimeout = setTimeout(() => {
      this.setState({
        isConnectionTestSlow: true
      });
    }, 5000) as any as number;

    testConnection(this.computeMergedSettings())
      .then(result => {
        clearTimeout(this.connectionTestSlowTimeout!);
        this.setState({
          connectionTest: result,
          isConnectionTestSlow: false
        });
      });
  };

  private saveSettings = () => {
    this.setState({
      savingStatus: 'in-progress'
    });

    this.props.saveSettings(this.computeMergedSettings())
      .then(success => this.setState({
        changedSettings: success ? {} : this.state.changedSettings,
        savingStatus: success ? 'saved' : 'failed'
      }));
  };

  private computeMergedSettings(): Settings {
    return merge({}, this.props.initialSettings, this.state.changedSettings);
  }

  componentWillUnmount() {
    clearTimeout(this.connectionTestSlowTimeout!);
  }
}

function clearError() {
  const clearedError: Logging = {
    lastSevereError: undefined,
  };
  browser.storage.local.set(clearedError);
}

const ELEMENT = document.getElementById('body')!;

onStoredStateChange(state => {
  ReactDOM.render(
    <SettingsForm
      initialSettings={pick(state, SETTING_NAMES) as Settings}
      saveSettings={saveSettings}
      lastSevereError={state.lastSevereError}
      clearError={clearError}
    />, ELEMENT);
});
