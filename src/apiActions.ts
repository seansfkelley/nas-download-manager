import { uniqueId, find } from 'lodash-es';
import Axios from 'axios';
import { ApiClient, ConnectionFailure, isConnectionFailure, SynologyResponse } from 'synology-typescript-api';
import { errorMessageFromCode, errorMessageFromConnectionFailure } from './apiErrors';
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
      additional: [ 'transfer' ],
      timeout: 20000
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
          cachedTasks.taskFetchFailureReason = {
            failureMessage: errorMessageFromConnectionFailure(response)
          };
        }
      } else if (response.success) {
        cachedTasks.tasks = response.data.tasks;
        cachedTasks.taskFetchFailureReason = null;
      } else {
        cachedTasks.taskFetchFailureReason = {
          failureMessage: errorMessageFromCode(response.error.code, 'DownloadStation.Task')
        };
      }

      return browser.storage.local.set(cachedTasks);
    })
    .catch(error => {
      console.error('unexpected error while trying to poll for new tasks; will not attempt to set anything in browser state', error);
    });
}

const AUTO_DOWNLOAD_TORRENT_FILE_PROTOCOLS = [
  'http',
  'https'
];

const DOWNLOADABLE_PROTOCOLS = [
  'http',
  'https',
  'ftp',
  'ftps',
  'magnet',
  'thunder',
  'flashget',
  'qqdl'
];

interface MetadataFileType {
  mediaType: string;
  extension: string;
}

const METADATA_FILE_TYPES: MetadataFileType[] = [
  { mediaType: 'application/x-bittorrent', extension: '.torrent' },
  { mediaType: 'application/x-nzb', extension: '.nzb' },
];

const ARBITRARY_FILE_FETCH_SIZE_CUTOFF = 1024 * 1024 * 5;

function startsWithAnyProtocol(url: string, protocols: string[]) {
  return protocols.some(protocol => url.startsWith(`${protocol}:`));
}

const FILENAME_PROPERTY_REGEX = /filename=("([^"]+)"|([^"][^ ]+))/;

function guessFileName(urlWithoutQuery: string, headers: Record<string, string>, metadataFileType: MetadataFileType) {
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

  return maybeFilename.endsWith(metadataFileType.extension) ? maybeFilename : maybeFilename + metadataFileType.extension ;
}

export function addDownloadTask(api: ApiClient, url: string, path?: string) {
  const notificationId = notify('Adding download...', url);
  const destination = path && path.startsWith('/') ? path.slice(1) : undefined;

  function notifyTaskAddResult(filename?: string) {
    return (result: ConnectionFailure | SynologyResponse<{}>) => {
      if (isConnectionFailure(result)) {
        notify('Failed to connection to DiskStation', 'Please check your settings.', notificationId);
      } else if (result.success) {
        notify('Download added', filename || url, notificationId);
      } else {
        notify('Failed to add download', errorMessageFromCode(result.error.code, 'DownloadStation.Task'), notificationId);
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
          const metadataFileType = find(METADATA_FILE_TYPES, fileType =>
            contentType === fileType.mediaType || urlWithoutQuery.endsWith(fileType.extension)
          );
          if (metadataFileType && !isNaN(+contentLength) && +contentLength < ARBITRARY_FILE_FETCH_SIZE_CUTOFF) {
            return Axios.get(url, { responseType: 'arraybuffer', timeout: 10000 })
              .then(response => {
                const content = new Blob([ response.data ], { type: metadataFileType.mediaType });
                const filename = guessFileName(urlWithoutQuery, response.headers, metadataFileType);
                return api.DownloadStation.Task.Create({
                  file: { content, filename },
                  destination
                })
                  .then(notifyTaskAddResult(filename));
              });
          } else {
            return api.DownloadStation.Task.Create({
              uri: [ url ],
              destination
            })
              .then(notifyTaskAddResult());
          }
        })
        .catch(notifyUnexpectedError);
    } else if (startsWithAnyProtocol(url, DOWNLOADABLE_PROTOCOLS)) {
      return api.DownloadStation.Task.Create({
        uri: [ url ],
        destination
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
