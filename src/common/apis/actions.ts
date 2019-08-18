import uniqueId from "lodash-es/uniqueId";
import Axios from "axios";
import { parse as parseQueryString } from "query-string";
import {
  ApiClient,
  ConnectionFailure,
  isConnectionFailure,
  SynologyResponse,
} from "synology-typescript-api";
import { errorMessageFromCode, errorMessageFromConnectionFailure } from "./errors";
import { CachedTasks } from "../state";
import { onUnhandledError } from "../errorHandlers";
import { notify } from "./browserUtils";
import {
  ALL_DOWNLOADABLE_PROTOCOLS,
  AUTO_DOWNLOAD_TORRENT_FILE_PROTOCOLS,
  EMULE_PROTOCOL,
  MAGNET_PROTOCOL,
  startsWithAnyProtocol,
} from "./protocols";

const METHOD_NOT_ALLOWED_CODE = 405;

export function clearCachedTasks() {
  const emptyState: CachedTasks = {
    tasks: [],
    taskFetchFailureReason: null,
    tasksLastCompletedFetchTimestamp: null,
    tasksLastInitiatedFetchTimestamp: null,
  };

  return browser.storage.local.set(emptyState);
}

function setCachedTasks(cachedTasks: Partial<CachedTasks>) {
  return browser.storage.local.set({
    tasksLastCompletedFetchTimestamp: Date.now(),
    ...cachedTasks,
  });
}

export async function pollTasks(api: ApiClient): Promise<void> {
  const cachedTasksInit: Partial<CachedTasks> = {
    tasksLastInitiatedFetchTimestamp: Date.now(),
  };

  const pollId = uniqueId("poll-");
  console.log(`(${pollId}) polling for tasks...`);

  try {
    await browser.storage.local.set(cachedTasksInit);

    // HELLO THERE
    //
    // When changing what this requests, you almost certainly want to update STATE_VERSION.
    const response = await api.DownloadStation.Task.List({
      offset: 0,
      limit: -1,
      additional: ["transfer", "detail"],
      timeout: 20000,
    });

    console.log(`(${pollId}) poll completed with response`, response);

    if (isConnectionFailure(response)) {
      if (response.type === "missing-config") {
        await setCachedTasks({
          taskFetchFailureReason: "missing-config",
        });
      } else {
        await setCachedTasks({
          taskFetchFailureReason: {
            failureMessage: errorMessageFromConnectionFailure(response),
          },
        });
      }
    } else if (response.success) {
      await setCachedTasks({
        tasks: response.data.tasks,
        taskFetchFailureReason: null,
      });
    } else {
      await setCachedTasks({
        taskFetchFailureReason: {
          failureMessage: errorMessageFromCode(response.error.code, "DownloadStation.Task"),
        },
      });
    }
  } catch (e) {
    onUnhandledError(e);
  }
}

interface MetadataFileType {
  mediaType: string;
  extension: string;
}

const METADATA_FILE_TYPES: MetadataFileType[] = [
  { mediaType: "application/x-bittorrent", extension: ".torrent" },
  { mediaType: "application/x-nzb", extension: ".nzb" },
];

const ARBITRARY_FILE_FETCH_SIZE_CUTOFF = 1024 * 1024 * 5;

const FILENAME_PROPERTY_REGEX = /filename=("([^"]+)"|([^"][^ ]+))/;

function stripQueryString(url: string) {
  return [url].indexOf("?") !== -1 ? url.slice(0, url.indexOf("?")) : url;
}

function guessTorrentFileName(
  urlWithoutQuery: string,
  headers: Record<string, string>,
  metadataFileType: MetadataFileType,
) {
  let maybeFilename: string | undefined;
  const contentDisposition = headers["content-disposition"];
  if (contentDisposition && contentDisposition.indexOf("filename=") !== -1) {
    const regexMatch = FILENAME_PROPERTY_REGEX.exec(contentDisposition);
    maybeFilename = (regexMatch && (regexMatch[2] || regexMatch[3])) || undefined;
  } else {
    maybeFilename = urlWithoutQuery.slice(urlWithoutQuery.lastIndexOf("/") + 1);
  }

  if (maybeFilename == null || maybeFilename.length === 0) {
    maybeFilename = "download";
  }

  return maybeFilename.endsWith(metadataFileType.extension)
    ? maybeFilename
    : maybeFilename + metadataFileType.extension;
}

async function getMetadataFileType(url: string) {
  let headResponse;

  try {
    headResponse = await Axios.head(url, { timeout: 10000 });
  } catch (e) {
    if (e && e.response && e.response.status === METHOD_NOT_ALLOWED_CODE) {
      return undefined;
    } else {
      throw e;
    }
  }

  const contentType = (headResponse.headers["content-type"] || "").toLowerCase();
  const contentLength = headResponse.headers["content-length"];
  const metadataFileType = METADATA_FILE_TYPES.find(
    fileType =>
      contentType.includes(fileType.mediaType) ||
      stripQueryString(url).endsWith(fileType.extension),
  );
  return metadataFileType &&
    !isNaN(+contentLength) &&
    +contentLength < ARBITRARY_FILE_FETCH_SIZE_CUTOFF
    ? metadataFileType
    : undefined;
}

const EMULE_FILENAME_REGEX = /\|file\|([^\|]+)\|/;

function guessFileNameFromUrl(url: string): string | undefined {
  if (startsWithAnyProtocol(url, MAGNET_PROTOCOL)) {
    const dn = parseQueryString(url).dn;
    if (dn) {
      return typeof dn === "string" ? dn : dn[0];
    } else {
      return undefined;
    }
  } else if (startsWithAnyProtocol(url, EMULE_PROTOCOL)) {
    const match = url.match(EMULE_FILENAME_REGEX);
    return match ? match[1] : undefined;
  } else {
    return undefined;
  }
}

export async function addDownloadTaskAndPoll(
  api: ApiClient,
  showNonErrorNotifications: boolean,
  url: string,
  path?: string,
): Promise<void> {
  const notificationId = showNonErrorNotifications ? notify("Adding download...", url) : undefined;

  async function checkIfEMuleShouldBeEnabled() {
    if (startsWithAnyProtocol(url, EMULE_PROTOCOL)) {
      const result = await api.DownloadStation.Info.GetConfig();
      if (isConnectionFailure(result)) {
        return false;
      } else if (result.success) {
        return !result.data.emule_enabled;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  async function onTaskAddResult(
    result: ConnectionFailure | SynologyResponse<{}>,
    filename?: string,
  ) {
    console.log("task add result", result);

    if (isConnectionFailure(result)) {
      notify(
        browser.i18n.getMessage("Failed_to_connect_to_DiskStation"),
        browser.i18n.getMessage("Please_check_your_settings"),
        "failure",
        notificationId,
      );
    } else if (result.success) {
      if (showNonErrorNotifications) {
        notify(
          browser.i18n.getMessage("Download_added"),
          filename || url,
          "success",
          notificationId,
        );
      }
    } else {
      if (await checkIfEMuleShouldBeEnabled()) {
        notify(
          browser.i18n.getMessage("eMule_is_not_enabled"),
          browser.i18n.getMessage("Use_DSM_to_enable_eMule_downloads"),
          "failure",
          notificationId,
        );
      } else {
        notify(
          browser.i18n.getMessage("Failed_to_add_download"),
          errorMessageFromCode(result.error.code, "DownloadStation.Task"),
          "failure",
          notificationId,
        );
      }
    }
  }

  const destination = path && path.startsWith("/") ? path.slice(1) : undefined;

  try {
    if (!url) {
      notify(
        browser.i18n.getMessage("Failed_to_add_download"),
        browser.i18n.getMessage("URL_is_empty_or_missing"),
        "failure",
        notificationId,
      );
    } else if (startsWithAnyProtocol(url, AUTO_DOWNLOAD_TORRENT_FILE_PROTOCOLS)) {
      const urlWithoutQuery = url.indexOf("?") !== -1 ? url.slice(0, url.indexOf("?")) : url;
      const metadataFileType = await getMetadataFileType(urlWithoutQuery);

      if (metadataFileType != null) {
        const response = await Axios.get(url, { responseType: "arraybuffer", timeout: 10000 });
        const content = new Blob([response.data], { type: metadataFileType.mediaType });
        const filename = guessTorrentFileName(urlWithoutQuery, response.headers, metadataFileType);
        const result = await api.DownloadStation.Task.Create({
          file: { content, filename },
          destination,
        });
        await onTaskAddResult(result, filename);
        await pollTasks(api);
      } else {
        const result = await api.DownloadStation.Task.Create({
          uri: [url],
          destination,
        });
        await onTaskAddResult(result);
        await pollTasks(api);
      }
    } else if (startsWithAnyProtocol(url, ALL_DOWNLOADABLE_PROTOCOLS)) {
      const result = await api.DownloadStation.Task.Create({
        uri: [url],
        destination,
      });
      await onTaskAddResult(result, guessFileNameFromUrl(url));
      await pollTasks(api);
    } else {
      notify(
        browser.i18n.getMessage("Failed_to_add_download"),
        browser.i18n.getMessage("URL_must_start_with_one_of_ZprotocolsZ", [
          ALL_DOWNLOADABLE_PROTOCOLS.join(", "),
        ]),
        "failure",
        notificationId,
      );
    }
  } catch (e) {
    onUnhandledError(e);
    notify(
      browser.i18n.getMessage("Failed_to_add_download"),
      browser.i18n.getMessage("Unexpected_error_please_check_your_settings_and_try_again"),
      "failure",
      notificationId,
    );
  }
}
