import uniqueId from 'lodash-es/uniqueId';
import find from 'lodash-es/find';
import Axios from 'axios';
import { parse as parseQueryString } from 'query-string';
import { ApiClient, ConnectionFailure, isConnectionFailure, SynologyResponse } from 'synology-typescript-api';
import { errorMessageFromCode, errorMessageFromConnectionFailure } from './errors';
import { CachedTasks } from '../state';
import { notify } from './browserUtils';
import {
  ALL_DOWNLOADABLE_PROTOCOLS,
  AUTO_DOWNLOAD_TORRENT_FILE_PROTOCOLS,
  startsWithAnyProtocol
} from './protocols';

export function clearCachedTasks() {
  const emptyState: CachedTasks = {
    tasks: [],
    taskFetchFailureReason: null,
    tasksLastCompletedFetchTimestamp: null,
    tasksLastInitiatedFetchTimestamp: null
  };

  return browser.storage.local.set(emptyState);
}

export function pollTasks(api: ApiClient): Promise<void> {
  const cachedTasksInit: Partial<CachedTasks> = {
    tasksLastInitiatedFetchTimestamp: Date.now()
  };

  const pollId = uniqueId('poll-');
  console.log(`(${pollId}) polling for tasks...`);

  return Promise.all([
    browser.storage.local.set(cachedTasksInit),
    // HELLO THERE
    //
    // When changing what this requests, you almost certainly want to update STATE_VERSION.
    api.DownloadStation.Task.List({
      offset: 0,
      limit: -1,
      additional: [ 'transfer', 'detail' ],
      timeout: 20000
    }),
  ])
    .then(([ _, response ]) => {
      console.log(`(${pollId}) poll completed with response`, response);

      function setCachedTasksResponse(cachedTasks: Partial<CachedTasks>) {
        return browser.storage.local.set({
          tasksLastCompletedFetchTimestamp: Date.now(),
          ...cachedTasks
        });
      }

      if (isConnectionFailure(response)) {
        if (response.type === 'missing-config') {
          return setCachedTasksResponse({
            taskFetchFailureReason: 'missing-config'
          });
        } else {
          return setCachedTasksResponse({
            taskFetchFailureReason: {
              failureMessage: errorMessageFromConnectionFailure(response)
            }
          });
        }
      } else if (response.success) {
        return setCachedTasksResponse({
          tasks: response.data.tasks,
          taskFetchFailureReason: null
        });
      } else {
        return setCachedTasksResponse({
          taskFetchFailureReason: {
            failureMessage: errorMessageFromCode(response.error.code, 'DownloadStation.Task')
          }
        });
      }
    })
    .catch(error => {
      console.error('unexpected error while trying to poll for new tasks; will not attempt to set anything in browser state', error);
    });
}

interface MetadataFileType {
  mediaType: string;
  extension: string;
}

const METADATA_FILE_TYPES: MetadataFileType[] = [
  { mediaType: 'application/x-bittorrent', extension: '.torrent' },
  { mediaType: 'application/x-nzb', extension: '.nzb' },
];

const ARBITRARY_FILE_FETCH_SIZE_CUTOFF = 1024 * 1024 * 5;

const FILENAME_PROPERTY_REGEX = /filename=("([^"]+)"|([^"][^ ]+))/;

function guessTorrentFileName(urlWithoutQuery: string, headers: Record<string, string>, metadataFileType: MetadataFileType) {
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

const ED2K_FILENAME_REGEX = /\|file\|([^\|]+)\|/;

function guessFileNameFromUrl(url: string): string | undefined {
  if (url.startsWith('magnet:')) {
    return parseQueryString(url).dn;
  } else if (url.startsWith('ed2k:')) {
    const match = url.match(ED2K_FILENAME_REGEX);
    return match ? match[1] : undefined;
  } else {
    return undefined;
  }
}

export function addDownloadTaskAndPoll(api: ApiClient, showNonErrorNotifications: boolean, url: string, path?: string) {
  const notificationId = showNonErrorNotifications ? notify('Adding download...', url) : undefined;
  const destination = path && path.startsWith('/') ? path.slice(1) : undefined;

  function notifyTaskAddResult(filename?: string) {
    return (result: ConnectionFailure | SynologyResponse<{}>) => {
      console.log('task add result', result);
      if (isConnectionFailure(result)) {
        notify('Failed to connection to DiskStation', 'Please check your settings.', 'failure', notificationId);
      } else if (result.success) {
        if (showNonErrorNotifications) {
          notify('Download added', filename || url, 'success', notificationId);
        }
      } else {
        notify('Failed to add download', errorMessageFromCode(result.error.code, 'DownloadStation.Task'), 'failure', notificationId);
      }
    };
  }

  function notifyUnexpectedError(error: any) {
    console.log('unexpected error while trying to add a download task', error);
    notify('Failed to add download', 'Unexpected error; please check your settings and try again', 'failure', notificationId);
  }

  function pollOnResponse() {
    return pollTasks(api);
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
                const filename = guessTorrentFileName(urlWithoutQuery, response.headers, metadataFileType);
                return api.DownloadStation.Task.Create({
                  file: { content, filename },
                  destination
                })
                  .then(notifyTaskAddResult(filename))
                  .then(pollOnResponse);
              });
          } else {
            return api.DownloadStation.Task.Create({
              uri: [ url ],
              destination
            })
              .then(notifyTaskAddResult())
              .then(pollOnResponse);
          }
        })
        .catch(notifyUnexpectedError);
    } else if (startsWithAnyProtocol(url, ALL_DOWNLOADABLE_PROTOCOLS)) {
      return api.DownloadStation.Task.Create({
        uri: [ url ],
        destination
      })
        .then(notifyTaskAddResult(guessFileNameFromUrl(url)))
        .then(pollOnResponse)
        .catch(notifyUnexpectedError);
    } else {
      notify('Failed to add download', `URL must start with one of ${ALL_DOWNLOADABLE_PROTOCOLS.join(', ')}`, 'failure', notificationId);
      return Promise.resolve();
    }
  } else {
    notify('Failed to add download', 'No URL to download given', 'failure', notificationId);
    return Promise.resolve();
  }
}
