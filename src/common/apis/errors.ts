import { ConnectionFailure } from 'synology-typescript-api';
import { assertNever } from '../lang';

export const ERROR_CODES = {
  'common': {
    100: browser.i18n.getMessage('Unknown_error'),
    101: browser.i18n.getMessage('Invalid_parameter'),
    102: browser.i18n.getMessage('The_requested_API_does_not_exist'),
    103: browser.i18n.getMessage('The_requested_method_does_not_exist'),
    104: browser.i18n.getMessage('The_requested_version_does_not_support_this_functionality'),
    105: browser.i18n.getMessage('The_logged_in_session_does_not_have_permission'),
    106: browser.i18n.getMessage('Session_timeout'),
    107: browser.i18n.getMessage('Session_interrupted_by_duplicate_login'),
  } as Record<string, string>,
  'Auth': {
    400: browser.i18n.getMessage('No_such_username_or_incorrect_password'),
    401: browser.i18n.getMessage('Account_disabled'),
    402: browser.i18n.getMessage('Permission_denied'),
    403: browser.i18n.getMessage('Twostep_verification_needed'),
    404: browser.i18n.getMessage('Twostep_verification_failed'),
  } as Record<string, string>,
  'DownloadStation.Task': {
    400: browser.i18n.getMessage('File_upload_failed'),
    401: browser.i18n.getMessage('Max_number_of_tasks_reached'),
    402: browser.i18n.getMessage('Destination_denied'),
    403: browser.i18n.getMessage('Destination_does_not_exist'),
    404: browser.i18n.getMessage('Invalid_task_ID'),
    405: browser.i18n.getMessage('Invalid_task_action'),
    406: browser.i18n.getMessage('No_default_destination'),
    407: browser.i18n.getMessage('Set_destination_failed'),
    408: browser.i18n.getMessage('File_does_not_exist'),
  } as Record<string, string>,
  'FileStation': {
    // This one I discovered on my own and isn't documented!
    160: browser.i18n.getMessage('The_logged_in_session_does_not_have_permission'),
    400: browser.i18n.getMessage('Invalid_parameter_of_file_operation'),
    401: browser.i18n.getMessage('Unknown_error_of_file_operation'),
    402: browser.i18n.getMessage('System_is_too_busy'),
    403: browser.i18n.getMessage('Invalid_user_does_this_file_operation'),
    404: browser.i18n.getMessage('Invalid_group_does_this_file_operation'),
    405: browser.i18n.getMessage('Invalid_user_and_group_does_this_file_operation'),
    406: browser.i18n.getMessage('Cant_get_usergroup_information_from_the_account_server'),
    407: browser.i18n.getMessage('Operation_not_permitted'),
    408: browser.i18n.getMessage('No_such_file_or_directory'),
    409: browser.i18n.getMessage('Nonsupported_file_system_'),
    410: browser.i18n.getMessage('Failed_to_connect_internetbased_file_system_ex_CIFS'),
    411: browser.i18n.getMessage('Readonly_file_system'),
    412: browser.i18n.getMessage('Filename_too_long_in_the_nonencrypted_file_system'),
    413: browser.i18n.getMessage('Filename_too_long_in_the_encrypted_file_system'),
    414: browser.i18n.getMessage('File_already_exists'),
    415: browser.i18n.getMessage('Disk_quota_exceeded'),
    416: browser.i18n.getMessage('No_space_left_on_device'),
    417: browser.i18n.getMessage('Inputoutput_error'),
    418: browser.i18n.getMessage('Illegal_name_or_path'),
    419: browser.i18n.getMessage('Illegal_file_name'),
    420: browser.i18n.getMessage('Illegal_file_name_on_FAT_file_system'),
    421: browser.i18n.getMessage('Device_or_resource_busy'),
    599: browser.i18n.getMessage('No_such_task_of_the_file_operation'),
  } as Record<string, string>
};

export function errorMessageFromCode(code: number, secondaryType: keyof typeof ERROR_CODES): string;
export function errorMessageFromCode(code: number, secondaryType: keyof typeof ERROR_CODES, defaultMessage: string | null): string | undefined;

export function errorMessageFromCode(code: number, secondaryType: keyof typeof ERROR_CODES, defaultMessage: string | null = 'Unknown error.') {
  return ERROR_CODES.common[code] || ERROR_CODES[secondaryType][code] || defaultMessage || undefined;
}

export function errorMessageFromConnectionFailure(failure: ConnectionFailure) {
  switch (failure.type) {
    case 'missing-config':
      return browser.i18n.getMessage('Connection_failure_missing_connection_configuration');
    case 'probable-wrong-protocol':
      return browser.i18n.getMessage('Connection_failure_likely_wrong_protocol');
    case 'probable-wrong-url-or-no-connection-or-cert-error':
      return browser.i18n.getMessage('Connection_failure_likely_wrong_hostnameport_no_internet_connection_or_invalid_certificate');
    case 'timeout':
      return browser.i18n.getMessage('Connection_failure_timeout_check_your_hostnameport_settings_and_internet_connection');
    case 'unknown':
      return browser.i18n.getMessage('Connection_failure_unknown_reason');
    default:
      return assertNever(failure);
  }
}
