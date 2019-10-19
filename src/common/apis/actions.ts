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
import { CachedTasks, State } from "../state";
import { onUnhandledError } from "../errorHandlers";
import { notify } from "./browserUtils";
import {
  ALL_DOWNLOADABLE_PROTOCOLS,
  AUTO_DOWNLOAD_TORRENT_FILE_PROTOCOLS,
  EMULE_PROTOCOL,
  MAGNET_PROTOCOL,
  startsWithAnyProtocol,
} from "./protocols";

type WithoutPromise<T> = T extends Promise<infer U> ? U : T;

export function clearCachedTasks() {
  const emptyState: CachedTasks = {
    tasks: [],
    taskFetchFailureReason: null,
    tasksLastCompletedFetchTimestamp: null,
    tasksLastInitiatedFetchTimestamp: null,
  };

  return browser.storage.local.set<Partial<State>>(emptyState);
}

function setCachedTasks(cachedTasks: Partial<CachedTasks>) {
  return browser.storage.local.set<Partial<State>>({
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
    await browser.storage.local.set<Partial<State>>(cachedTasksInit);

    // This type declaration shouldn't be necessary, but without it this bug happens:
    // https://github.com/microsoft/TypeScript/issues/33666
    let response: WithoutPromise<ReturnType<typeof api.DownloadStation.Task.List>>;

    try {
      // HELLO THERE
      //
      // When changing what this requests, you almost certainly want to update STATE_VERSION.
      response = await api.DownloadStation.Task.List({
        offset: 0,
        limit: -1,
        additional: ["transfer", "detail"],
        timeout: 20000,
      });
    } catch (e) {
      onUnhandledError(e, "error while fetching list of tasks");
      return;
    }

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
  return url.indexOf("?") !== -1 ? url.slice(0, url.indexOf("?")) : url;
}

function guessTorrentFileName(
  url: string,
  headers: Record<string, string>,
  metadataFileType: MetadataFileType,
) {
  const urlWithoutQuery = stripQueryString(url);

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
    if (e && e.response && e.response.status != null) {
      // If we got a response at all, then it wasn't a severe error, just something
      // that the remote server likely can't handle or disallows.
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
  // It should be safe to just blindly string-replace this. Commas are not URL-significant, but they
  // are significant to Synology. If we find a comma in a URL, then that URL is not technically
  // malformed but it will interfere with the way the Synology attempts to parse the result and as
  // such will cause the request to fail.
  //
  // We expect the url argument to be a single, downloadable URL. Since commas are used to separate
  // mutiple downloadable URLs, the function signature for that (if it happens) will be `string[]` so
  // it's clear who's responsible for comma-separating the arguments.
  //
  // https://github.com/seansfkelley/synology-download-manager/issues/118
  // https://github.com/seansfkelley/synology-download-manager/issues/126
  const sanitizedUrl = url.replace(/,/g, "%2C");

  const notificationId = showNonErrorNotifications
    ? notify("Adding download...", sanitizedUrl)
    : undefined;

  async function checkIfEMuleShouldBeEnabled() {
    if (startsWithAnyProtocol(sanitizedUrl, EMULE_PROTOCOL)) {
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

  function onUnexpectedError(e: any | undefined, message?: string) {
    onUnhandledError(e, message);
    notify(
      browser.i18n.getMessage("Failed_to_add_download"),
      browser.i18n.getMessage("Unexpected_error_please_check_your_settings_and_try_again"),
      "failure",
      notificationId,
    );
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
          filename || sanitizedUrl,
          "success",
          notificationId,
        );
      }
    } else {
      let shouldEMuleBeEnabled;
      try {
        shouldEMuleBeEnabled = await checkIfEMuleShouldBeEnabled();
      } catch (e) {
        onUnexpectedError(e, "error while checking emule settings");
        return;
      }

      if (shouldEMuleBeEnabled) {
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
    if (!sanitizedUrl) {
      notify(
        browser.i18n.getMessage("Failed_to_add_download"),
        browser.i18n.getMessage("URL_is_empty_or_missing"),
        "failure",
        notificationId,
      );
    } else if (startsWithAnyProtocol(sanitizedUrl, AUTO_DOWNLOAD_TORRENT_FILE_PROTOCOLS)) {
      let metadataFileType;

      try {
        metadataFileType = await getMetadataFileType(url);
      } catch (e) {
        onUnexpectedError(e, "error while trying to fetch metadata file type for download url");
        return;
      }

      if (metadataFileType != null) {
        let response;

        try {
          response = await Axios.get(sanitizedUrl, { responseType: "arraybuffer", timeout: 10000 });
        } catch (e) {
          onUnexpectedError(e, "error while trying to fetch metadata file");
          return;
        }

        const content = new Blob([response.data], { type: metadataFileType.mediaType });
        const filename = guessTorrentFileName(url, response.headers, metadataFileType);

        try {
          const result = await api.DownloadStation.Task.Create({
            file: { content, filename },
            destination,
          });
          await onTaskAddResult(result, filename);
          await pollTasks(api);
        } catch (e) {
          onUnexpectedError(e, "error while trying to create task from metadata file or fetch");
        }
      } else {
        try {
          const result = await api.DownloadStation.Task.Create({
            uri: [sanitizedUrl],
            destination,
          });
          await onTaskAddResult(result);
          await pollTasks(api);
        } catch (e) {
          onUnexpectedError(e, "error while trying to create task from metadata file url or fetch");
        }
      }
    } else if (startsWithAnyProtocol(sanitizedUrl, ALL_DOWNLOADABLE_PROTOCOLS)) {
      try {
        const result = await api.DownloadStation.Task.Create({
          uri: [sanitizedUrl],
          destination,
        });
        await onTaskAddResult(result, guessFileNameFromUrl(sanitizedUrl));
        await pollTasks(api);
      } catch (e) {
        onUnexpectedError(e, "error while trying to create task from url or fetch");
      }
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
    onUnexpectedError(e);
  }
}
