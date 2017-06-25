import { ConnectionFailure } from 'synology-typescript-api';
import { assertNever } from './lang';

export const ERROR_CODES = {
  'common': {
    100: 'Unknown error.',
    101: 'Invalid parameter.',
    102: 'The requested API does not exist.',
    103: 'The requested method does not exist.',
    104: 'The requested version does not support this functionality.',
    105: 'The logged in session does not have permission.',
    106: 'Session timeout.',
    107: 'Session interrupted by duplicate login.'
  } as Record<string, string>,
  'Auth': {
    400: 'No such username or incorrect password.',
    401: 'Account disabled.',
    402: 'Permission denied.',
    403: 'Two-step verification needed.',
    404: 'Two-step verification failed.'
  } as Record<string, string>,
  'DownloadStation.Task': {
    400: 'File upload failed.',
    401: 'Max number of tasks reached.',
    402: 'Destination denied.',
    403: 'Destination does not exist.',
    404: 'Invalid task ID.',
    405: 'Invalid task action.',
    406: 'No default destination.',
    407: 'Set destination failed.',
    408: 'File does not exist.'
  } as Record<string, string>,
  'FileStation': {
    160: 'The logged in session does not have permission.', // This one I discovered on my own and isn't documented!
    400: 'Invalid parameter of file operation',
    401: 'Unknown error of file operation',
    402: 'System is too busy',
    403: 'Invalid user does this file operation',
    404: 'Invalid group does this file operation',
    405: 'Invalid user and group does this file operation',
    406: 'Can’t get user/group information from the account server',
    407: 'Operation not permitted',
    408: 'No such file or directory',
    409: 'Non-supported file system ',
    410: 'Failed to connect internet-based file system (ex: CIFS)',
    411: 'Read-only file system',
    412: 'Filename too long in the non-encrypted file system',
    413: 'Filename too long in the encrypted file system',
    414: 'File already exists',
    415: 'Disk quota exceeded',
    416: 'No space left on device',
    417: 'Input/output error',
    418: 'Illegal name or path',
    419: 'Illegal file name',
    420: 'Illegal file name on FAT file system',
    421: 'Device or resource busy',
    599: 'No such task of the file operation'
  } as Record<string, string>
};

export function errorMessageFromCode(code: number, secondaryType: keyof typeof ERROR_CODES): string;
export function errorMessageFromCode(code: number, secondaryType: keyof typeof ERROR_CODES, defaultMessage: string | null): string | undefined;

export function errorMessageFromCode(code: number, secondaryType: keyof typeof ERROR_CODES, defaultMessage: string | null = 'Unknown error.') {
  return ERROR_CODES.common[code] || ERROR_CODES[secondaryType][code] || defaultMessage || undefined;
}

export function errorMessageFromConnectionFailure(failure: ConnectionFailure) {
  switch (failure.type) {
    case 'missing-config': return 'Connection failure (missing connection configuration).';
    case 'probable-wrong-protocol': return 'Connection failure (likely wrong protocol).';
    case 'probable-wrong-url-or-no-connection': return 'Connection failure (likely wrong hostname/port or no internet connection).';
    case 'timeout': return 'Connection failure (timeout; check your hostname/port settings and internet connection).';
    case 'unknown': return 'Connection failure (unknown reason).';
    default: return assertNever(failure);
  }
}
