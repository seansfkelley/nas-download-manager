import { uniqueId } from 'lodash-es';
import Axios from 'axios';
import { ApiClient, ConnectionFailure, isConnectionFailure, errorMessageFromCode, DownloadStation, SynologyResponse } from './api';
import { CachedTasks } from './state';
import { notify } from './browserApi';

export function clearCachedTasks() {
  const emptyState: CachedTasks = {
    tasks: [],
    taskFetchFailureReason: null,
    tasksLastCompletedFetchTimestamp: null,
    tasksLastInitiatedFetchTimestamp: null
  };

  return browser.storage.local.set(emptyState);
}

export function pollTasks(api: ApiClient) {
  const cachedTasks: Partial<CachedTasks> = {
    tasksLastInitiatedFetchTimestamp: Date.now()
  };

  const pollId = uniqueId('poll-');
  console.log(`(${pollId}) polling for tasks...`);

  return Promise.all([
    browser.storage.local.set(cachedTasks),
    api.DownloadStation.Task.List({
      offset: 0,
      limit: -1,
      additional: [ 'transfer' ]
    })
  ])
    .then(([ _, response ]) => {
      console.log(`(${pollId}) poll completed with response`, response);

      const cachedTasks: Partial<CachedTasks> = {
        tasksLastCompletedFetchTimestamp: Date.now()
      };

      if (isConnectionFailure(response)) {
        if (response.type === 'missing-config') {
          cachedTasks.taskFetchFailureReason = 'missing-config';
        } else {
          cachedTasks.taskFetchFailureReason = { failureMessage: response.failureMessage };
        }
      } else if (response.success) {
        cachedTasks.tasks = response.data.tasks;
        cachedTasks.taskFetchFailureReason = null;
      } else {
        cachedTasks.taskFetchFailureReason = {
          failureMessage: errorMessageFromCode(response.error.code, DownloadStation.Task.API_NAME)
        };
      }

      return browser.storage.local.set(cachedTasks);
    });
}

const AUTO_DOWNLOAD_TORRENT_FILE_PROTOCOLS = [
  'http',
  'https',
  'ftp',
  'ftps'
];

const DOWNLOADABLE_PROTOCOLS = [
  'http',
  'https',
  'ftp',
  'ftps',
  'magnet'
];

const TORRENT_CONTENT_TYPE = 'application/x-bittorrent';

const ARBITRARY_FILE_FETCH_SIZE_CUTOFF = 1024 * 1024 * 5;

function startsWithAnyProtocol(url: string, protocols: string[]) {
  return protocols.some(protocol => url.startsWith(`${protocol}://`));
}

const FILENAME_PROPERTY_REGEX = /filename=("([^"]+)"|([^"][^ ]+))/;

function guessFileName(urlWithoutQuery: string, headers: Record<string, string>) {
  let maybeFilename: string | undefined;
  const contentDisposition = headers['content-disposition'];
  if (contentDisposition && contentDisposition.indexOf('filename=') !== -1) {
    const regexMatch = FILENAME_PROPERTY_REGEX.exec(contentDisposition);
    maybeFilename = (regexMatch && (regexMatch[2] || regexMatch[3])) || undefined;
  } else {
    maybeFilename = urlWithoutQuery.slice(urlWithoutQuery.lastIndexOf('/') + 1);
  }

  if (maybeFilename == null || maybeFilename.length === 0) {
    maybeFilename = 'download';
  }

  return maybeFilename.endsWith('.torrent') ? maybeFilename : maybeFilename + '.torrent';
}

export function addDownloadTask(api: ApiClient, url: string) {
  const notificationId = notify('Adding download...', url);

  function notifyTaskAddResult(filename?: string) {
    return (result: ConnectionFailure | SynologyResponse<{}>) => {
      if (isConnectionFailure(result)) {
        notify('Failed to connection to DiskStation', 'Please check your settings.', notificationId);
      } else if (result.success) {
        notify('Download added', filename || url, notificationId);
      } else {
        notify('Failed to add download', errorMessageFromCode(result.error.code, DownloadStation.Task.API_NAME), notificationId);
      }
    };
  }

  function notifyUnexpectedError(error: any) {
    console.log('unexpected error while trying to add a download task', error);
    notify('Failed to add download', 'Unexpected error; please check your settings and try again', notificationId);
  }

  if (url) {
    if (startsWithAnyProtocol(url, AUTO_DOWNLOAD_TORRENT_FILE_PROTOCOLS)) {
      return Axios.head(url, { timeout: 10000 })
        .then(response => {
          const contentType = response.headers['content-type'].toLowerCase();
          const contentLength = response.headers['content-length'];
          const urlWithoutQuery = url.indexOf('?') !== -1 ? url.slice(0, url.indexOf('?')) : url;
          if (((contentType === TORRENT_CONTENT_TYPE) || urlWithoutQuery.endsWith('.torrent')) && !isNaN(contentLength) && contentLength < ARBITRARY_FILE_FETCH_SIZE_CUTOFF) {
            return Axios.get(url, { responseType: 'arraybuffer', timeout: 10000 })
              .then(response => {
                const content = new Blob([ response.data ], { type: TORRENT_CONTENT_TYPE });
                const filename = guessFileName(urlWithoutQuery, response.headers);
                return api.DownloadStation.Task.Create({
                    file: { content, filename }
                  })
                  .then(notifyTaskAddResult(filename));
              });
          } else {
            return api.DownloadStation.Task.Create({
              uri: [ url ]
            })
              .then(notifyTaskAddResult());
          }
        })
        .catch(notifyUnexpectedError);
    } else if (startsWithAnyProtocol(url, DOWNLOADABLE_PROTOCOLS)) {
      return api.DownloadStation.Task.Create({
        uri: [ url ]
      })
        .then(notifyTaskAddResult())
        .catch(notifyUnexpectedError);
    } else {
      notify('Failed to add download', `URL must start with one of ${DOWNLOADABLE_PROTOCOLS.join(', ')}`, notificationId);
      return Promise.resolve();
    }
  } else {
    notify('Failed to add download', 'No URL to download given', notificationId);
    return Promise.resolve();
  }
}
