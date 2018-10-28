import uniqueId from 'lodash-es/uniqueId';
import find from 'lodash-es/find';
import Axios from 'axios';
import { parse as parseQueryString } from 'query-string';
import { ApiClient, ConnectionFailure, isConnectionFailure, SynologyResponse } from 'synology-typescript-api';
import { errorMessageFromCode, errorMessageFromConnectionFailure } from './errors';
import { CachedTasks } from '../state';
import { onUnhandledError } from '../errorHandlers';
import { notify } from './browserUtils';
import {
  ALL_DOWNLOADABLE_PROTOCOLS,
  AUTO_DOWNLOAD_TORRENT_FILE_PROTOCOLS,
  EMULE_PROTOCOL,
  MAGNET_PROTOCOL,
  startsWithAnyProtocol
} from './protocols';

export function clearCachedTasks() {
  const emptyState: CachedTasks = {
    tasks: [],
    taskFetchFailureReason: null,
    tasksLastCompletedFetchTimestamp: null,
    tasksLastInitiatedFetchTimestamp: null,
  };

  return browser.storage.local.set(emptyState);
}

export function pollTasks(api: ApiClient): Promise<void> {
  const cachedTasksInit: Partial<CachedTasks> = {
    tasksLastInitiatedFetchTimestamp: Date.now(),
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
      timeout: 20000,
    }),
  ])
    .then(([ _, response ]) => {
      console.log(`(${pollId}) poll completed with response`, response);

      function setCachedTasksResponse(cachedTasks: Partial<CachedTasks>) {
        return browser.storage.local.set({
          tasksLastCompletedFetchTimestamp: Date.now(),
          ...cachedTasks,
        });
      }

      if (isConnectionFailure(response)) {
        if (response.type === 'missing-config') {
          return setCachedTasksResponse({
            taskFetchFailureReason: 'missing-config',
          });
        } else {
          return setCachedTasksResponse({
            taskFetchFailureReason: {
              failureMessage: errorMessageFromConnectionFailure(response),
            },
          });
        }
      } else if (response.success) {
        return setCachedTasksResponse({
          tasks: response.data.tasks,
          taskFetchFailureReason: null,
        });
      } else {
        return setCachedTasksResponse({
          taskFetchFailureReason: {
            failureMessage: errorMessageFromCode(response.error.code, 'DownloadStation.Task'),
          },
        });
      }
    })
    .catch(onUnhandledError);
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

const EMULE_FILENAME_REGEX = /\|file\|([^\|]+)\|/;

function guessFileNameFromUrl(url: string): string | undefined {
  if (startsWithAnyProtocol(url, MAGNET_PROTOCOL)) {
    return parseQueryString(url).dn || undefined;
  } else if (startsWithAnyProtocol(url, EMULE_PROTOCOL)) {
    const match = url.match(EMULE_FILENAME_REGEX);
    return match ? match[1] : undefined;
  } else {
    return undefined;
  }
}

export function addDownloadTaskAndPoll(api: ApiClient, showNonErrorNotifications: boolean, url: string, path?: string) {
  const notificationId = showNonErrorNotifications ? notify('Adding download...', url) : undefined;
  const destination = path && path.startsWith('/') ? path.slice(1) : undefined;

  function checkIfEMuleShouldBeEnabled() {
    if (startsWithAnyProtocol(url, EMULE_PROTOCOL)) {
      return api.DownloadStation.Info.GetConfig()
        .then(result => {
          if (isConnectionFailure(result)) {
            return Promise.resolve(false);
          } else if (result.success) {
            return Promise.resolve(!result.data.emule_enabled);
          } else {
            return Promise.resolve(false);
          }
        });
    } else {
      return Promise.resolve(false);
    }
  }

  function onTaskAddResult(filename?: string) {
    return (result: ConnectionFailure | SynologyResponse<{}>) => {
      console.log('task add result', result);
      if (isConnectionFailure(result)) {
        notify(
          browser.i18n.getMessage('Failed_to_connect_to_DiskStation'),
          browser.i18n.getMessage('Please_check_your_settings'),
          'failure',
          notificationId,
        );
      } else if (result.success) {
        if (showNonErrorNotifications) {
          notify(browser.i18n.getMessage('Download_added'), filename || url, 'success', notificationId);
        }
      } else {
        checkIfEMuleShouldBeEnabled()
          .then(shouldBeEnabled => {
            if (shouldBeEnabled) {
              notify(
                browser.i18n.getMessage('eMule_is_not_enabled'),
                browser.i18n.getMessage('Use_DSM_to_enable_eMule_downloads'),
                'failure',
                notificationId,
              );
            } else {
              notify(
                browser.i18n.getMessage('Failed_to_add_download'),
                errorMessageFromCode(result.error.code, 'DownloadStation.Task'),
                'failure',
                notificationId,
              );
            }
          })
          .catch(onUnexpectedError);
      }
    };
  }

  function onUnexpectedError(error: any) {
    onUnhandledError(error);
    notify(
      browser.i18n.getMessage('Failed_to_add_download'),
      browser.i18n.getMessage('Unexpected_error_please_check_your_settings_and_try_again'),
      'failure',
      notificationId,
    );
  }

  function pollOnResponse() {
    return pollTasks(api);
  }

  if (url) {
    if (startsWithAnyProtocol(url, AUTO_DOWNLOAD_TORRENT_FILE_PROTOCOLS)) {
      const urlWithoutQuery = url.indexOf('?') !== -1 ? url.slice(0, url.indexOf('?')) : url;

      return Axios.head(url, { timeout: 10000 })
        .then(response => {
          const contentType = (response.headers['content-type'] || '').toLowerCase();
          const contentLength = response.headers['content-length'];
          const metadataFileType = find(METADATA_FILE_TYPES, fileType =>
            contentType.includes(fileType.mediaType) || urlWithoutQuery.endsWith(fileType.extension)
          );
          return metadataFileType && !isNaN(+contentLength) && +contentLength < ARBITRARY_FILE_FETCH_SIZE_CUTOFF
            ? metadataFileType
            : undefined;
        })
        .catch(e => {
          if (e && e.response && e.response.status === 405) {
            return Promise.resolve(undefined);
          } else {
            throw e;
          }
        })
        .then(metadataFileType => {
          if (metadataFileType != null) {
            return Axios.get(url, { responseType: 'arraybuffer', timeout: 10000 })
              .then(response => {
                const content = new Blob([ response.data ], { type: metadataFileType.mediaType });
                const filename = guessTorrentFileName(urlWithoutQuery, response.headers, metadataFileType);
                return api.DownloadStation.Task.Create({
                  file: { content, filename },
                  destination,
                })
                  .then(onTaskAddResult(filename))
                  .then(pollOnResponse);
              });
          } else {
            return api.DownloadStation.Task.Create({
              uri: [ url ],
              destination,
            })
              .then(onTaskAddResult())
              .then(pollOnResponse);
          }
        })
        .catch(onUnexpectedError);
    } else if (startsWithAnyProtocol(url, ALL_DOWNLOADABLE_PROTOCOLS)) {
      return api.DownloadStation.Task.Create({
        uri: [ url ],
        destination,
      })
        .then(onTaskAddResult(guessFileNameFromUrl(url)))
        .then(pollOnResponse)
        .catch(onUnexpectedError);
    } else {
      notify(
        browser.i18n.getMessage('Failed_to_add_download'),
        browser.i18n.getMessage('URL_must_start_with_one_of_ZprotocolsZ', [ ALL_DOWNLOADABLE_PROTOCOLS.join(', ') ]),
        'failure',
        notificationId,
      );
      return Promise.resolve();
    }
  } else {
    notify(
      browser.i18n.getMessage('Failed_to_add_download'),
      browser.i18n.getMessage('URL_is_empty_or_missing'),
      'failure',
      notificationId,
    );
    return Promise.resolve();
  }
}
