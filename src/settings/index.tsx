import '../common/apis/browserShim';
import pick from 'lodash-es/pick';
import merge from 'lodash-es/merge';
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
  onStoredStateChange,
  SETTING_NAMES
} from '../common/state';
import {
  isErrorCodeResult,
  ConnectionTestResult,
  saveSettings,
  testConnection
} from './settingsUtils';
import { DOWNLOAD_ONLY_PROTOCOLS } from '../common/apis/protocols';
import { errorMessageFromCode, errorMessageFromConnectionFailure } from '../common/apis/errors';
import { assertNever } from '../common/lang';
import { TaskFilterSettingsForm } from '../common/components/TaskFilterSettingsForm';

const ISSUE_32_URL = 'https://github.com/seansfkelley/synology-download-manager/issues/32';

interface SettingsFormProps {
  initialSettings: Settings;
  saveSettings: (settings: Settings) => Promise<boolean>;
}

interface SettingsFormState {
  changedSettings: { [K in keyof Settings]?: Partial<Settings[K]> };
  connectionTest?: 'in-progress' | ConnectionTestResult;
  isConnectionTestSlow?: boolean;
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
  private connectionTestSlowTimeout?: number;

  state: SettingsFormState = {
    changedSettings: {},
    savingStatus: 'unchanged',
    rawPollingInterval: this.props.initialSettings.notifications.completionPollingInterval.toString() || POLL_DEFAULT_INTERVAL.toString()
  };

  render() {
    const mergedSettings = this.computeMergedSettings();
    const connectionDisabledProps = this.disabledPropAndClassName(this.state.connectionTest === 'in-progress');
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
                {...this.disabledPropAndClassName(
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
              {this.renderConnectionTestResult()}
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

        <ul className='settings-list'>
          <li>
            <input
              id='feedback-checkbox'
              type='checkbox'
              checked={mergedSettings.notifications.enableFeedbackNotifications}
              onChange={() => {
                this.setNotificationSetting('enableFeedbackNotifications', !mergedSettings.notifications.enableFeedbackNotifications);
              }}
            />
            <label htmlFor='feedback-checkbox'>
              {browser.i18n.getMessage('Notify_when_adding_downloads')}
            </label>
          </li>

          <li>
            <input
              id='notifications-checkbox'
              type='checkbox'
              checked={mergedSettings.notifications.enableCompletionNotifications}
              onChange={() => {
                this.setNotificationSetting('enableCompletionNotifications', !mergedSettings.notifications.enableCompletionNotifications);
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
              {...this.disabledPropAndClassName(!mergedSettings.notifications.enableCompletionNotifications)}
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

          <li>
            <input
              id='handle-links-checkbox'
              type='checkbox'
              checked={mergedSettings.shouldHandleDownloadLinks}
              onChange={() => {
                this.setShouldHandleDownloadLinks(!mergedSettings.shouldHandleDownloadLinks);
              }}
            />
            <label htmlFor='handle-links-checkbox'>
              {browser.i18n.getMessage('Handle_opening_downloadable_link_types_ZprotocolsZ', [ DOWNLOAD_ONLY_PROTOCOLS.join(', ') ])}
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
    function renderResult(text?: React.ReactNode, icon?: string, className?: string)  {
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
      const text = this.state.isConnectionTestSlow
        ? browser.i18n.getMessage('Testing_connection_this_is_unusually_slow_is_your_NAS_asleep')
        : browser.i18n.getMessage('Testing_connection');
      return renderResult(text, 'fa-refresh fa-spin');
    } else if (connectionTest === 'good-and-modern') {
      return renderResult(browser.i18n.getMessage('Connection_successful'), 'fa-check', 'intent-success');
    } else if (connectionTest === 'good-and-legacy') {
      return renderResult([
        browser.i18n.getMessage('Connection_successful_but_may_interfere_with_existing_DSM_sessions_See_'),
        <a href={ISSUE_32_URL}>{browser.i18n.getMessage('issue_32')}</a>,
        browser.i18n.getMessage('_for_more_details')
      ], 'fa-exclamation-triangle', 'intent-warning');
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
      isConnectionTestSlow: undefined,
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
      isConnectionTestSlow: undefined
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
          isConnectionTestSlow: undefined
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

const ELEMENT = document.getElementById('body')!;

onStoredStateChange(state => {
  ReactDOM.render(
    <SettingsForm
      initialSettings={pick(state, SETTING_NAMES) as Settings}
      saveSettings={saveSettings}
    />, ELEMENT);
});
