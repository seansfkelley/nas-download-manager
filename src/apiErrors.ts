import { Auth, DownloadStation } from './api/rest';
import { ConnectionFailure } from './api/client';
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
  [Auth.API_NAME]: {
    400: 'No such username or incorrect password.',
    401: 'Account disabled.',
    402: 'Permission denied.',
    403: 'Two-step verification needed.',
    404: 'Two-step verification failed.'
  } as Record<string, string>,
  [DownloadStation.Task.API_NAME]: {
    400: 'File upload failed.',
    401: 'Max number of tasks reached.',
    402: 'Destination denied.',
    403: 'Destination does not exist.',
    404: 'Invalid task ID.',
    405: 'Invalid task action.',
    406: 'No default destination.',
    407: 'Set destination failed.',
    408: 'File does not exist.'
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
