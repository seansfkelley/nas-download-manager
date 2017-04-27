export const ERROR_CODES = {
  'common': {
    100: 'Unknown error.',
    101: 'Invalid parameter.',
    102: 'The requested API does not exist.',
    103: 'The requested method does not exist.',
    104: 'The requested version does not support the functionality.',
    105: 'The logged in session does not have permission.',
    106: 'Session timeout.',
    107: 'Session interrupted by duplicate login.'
  },
  'login': {
    400: 'No such username or incorrect password.',
    401: 'Account disabled.',
    402: 'Permission denied.',
    403: 'Two-step verification needed.',
    404: 'Two-step verification failed.'
  }
};
