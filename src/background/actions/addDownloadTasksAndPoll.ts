import { SynologyClient, ClientRequestResult } from "../../common/apis/synology/client";
import type { FormFile } from "../../common/apis/synology/shared";
import { getErrorForFailedResponse } from "../../common/apis/errors";
import { saveLastSevereError } from "../../common/errorHandlers";
import { assertNever } from "../../common/lang";
import { notify } from "../../common/notify";
import {
  ALL_DOWNLOADABLE_PROTOCOLS,
  AUTO_DOWNLOAD_TORRENT_FILE_PROTOCOLS,
  EMULE_PROTOCOL,
  MAGNET_PROTOCOL,
  startsWithAnyProtocol,
} from "../../common/apis/protocols";
import { pollTasks } from "./pollTasks";
import type { UnionByDiscriminant, OmitStrict } from "../../common/types";
import type { AddTaskOptions } from "../../common/apis/messages";
import type { RequestManager } from "../backgroundState";

// --- URL resolution (merged from urls.ts) ---

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

function guessDownloadFileName(url: URL, headers: Headers, metadataFileType: MetadataFileType) {
  let maybeFilename: string | undefined;
  const contentDisposition = headers.get("content-disposition");
  if (contentDisposition != null && contentDisposition.includes("filename=")) {
    const regexMatch = FILENAME_PROPERTY_REGEX.exec(contentDisposition);
    maybeFilename = (regexMatch && (regexMatch[2] || regexMatch[3])) || undefined;
  } else {
    maybeFilename = url.pathname.slice(url.pathname.lastIndexOf("/") + 1);
  }

  if (maybeFilename == null || maybeFilename.length === 0) {
    maybeFilename = "download";
  }

  return maybeFilename.endsWith(metadataFileType.extension)
    ? maybeFilename
    : maybeFilename + metadataFileType.extension;
}

async function fetchWithTimeout(
  url: URL,
  init: OmitStrict<RequestInit, "credentials" | "signal">,
  timeout: number,
): Promise<Response> {
  const abortController = new AbortController();
  const timeoutTimer = setTimeout(() => {
    abortController.abort();
  }, timeout);

  try {
    return await fetch(url.toString(), {
      ...init,
      credentials: "include",
      signal: abortController.signal,
    });
  } finally {
    clearTimeout(timeoutTimer);
  }
}

async function getMetadataFileType(url: URL) {
  const headResponse = await fetchWithTimeout(url, { method: "HEAD" }, 10000);

  if (!headResponse.ok) {
    return undefined;
  }

  const contentType = (headResponse.headers.get("content-type") ?? "").toLowerCase();
  const metadataFileType = METADATA_FILE_TYPES.find(
    (fileType) =>
      contentType.includes(fileType.mediaType) || url.pathname.endsWith(fileType.extension),
  );
  const rawContentLength = headResponse.headers.get("content-length");
  const contentLength =
    rawContentLength == null || isNaN(+rawContentLength) ? undefined : +rawContentLength;

  return metadataFileType &&
    // Optimistically assume that metadata files aren't ridiculously huge if their size is not reported.
    (contentLength == null || contentLength < ARBITRARY_FILE_FETCH_SIZE_CUTOFF)
    ? metadataFileType
    : undefined;
}

export const EMULE_FILENAME_REGEX = /\|file\|([^|]+)\|/;

function guessFileNameFromUrl(url: string): string | undefined {
  if (startsWithAnyProtocol(url, MAGNET_PROTOCOL)) {
    const match = url.match(/[?&]dn=([^&]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    } else {
      return undefined;
    }
  } else if (startsWithAnyProtocol(url, EMULE_PROTOCOL)) {
    return url.match(EMULE_FILENAME_REGEX)?.[1] || undefined;
  } else {
    return undefined;
  }
}

function sanitizeUrlForSynology(url: URL): URL {
  return new URL(url.toString().replaceAll(",", "%2C"));
}

interface DirectDownloadUrl {
  type: "direct-download";
  url: URL;
}

interface MetadataFileUrl {
  type: "metadata-file";
  url: URL;
  content: Blob;
  filename: string;
}

interface MissingOrIllegalUrl {
  type: "missing-or-illegal";
}

type ResolvedUrl = DirectDownloadUrl | MetadataFileUrl | MissingOrIllegalUrl;

async function resolveUrl(url: string): Promise<ResolvedUrl> {
  function bailAndAssumeDirectDownload(
    error: unknown,
    debugDescription: string,
  ): DirectDownloadUrl {
    let guessedReason;

    if (error instanceof DOMException && error.name === "AbortError") {
      guessedReason = "timeout";
    } else if (error instanceof Error && /networkerror/i.test(error.message)) {
      guessedReason = "network-error";
    } else {
      guessedReason = "unknown";
    }

    console.error(debugDescription, `(guessed reason: ${guessedReason})`, error);

    return {
      type: "direct-download",
      url: parsedUrl,
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (e) {
    if (e instanceof TypeError) {
      return {
        type: "missing-or-illegal",
      };
    } else {
      throw e;
    }
  }

  if (startsWithAnyProtocol(url, AUTO_DOWNLOAD_TORRENT_FILE_PROTOCOLS)) {
    let metadataFileType;

    try {
      metadataFileType = await getMetadataFileType(parsedUrl);
    } catch (e) {
      return bailAndAssumeDirectDownload(
        e,
        "error while trying to fetch metadata file type for download url",
      );
    }

    if (metadataFileType != null) {
      let response;

      try {
        response = await fetchWithTimeout(parsedUrl, {}, 10000);
      } catch (e) {
        return bailAndAssumeDirectDownload(e, "error while trying to fetch metadata file");
      }

      let bytes;
      try {
        bytes = await response.arrayBuffer();
      } catch (e) {
        return bailAndAssumeDirectDownload(e, "error while trying to get bytes for metadata file");
      }

      return {
        type: "metadata-file",
        url: parsedUrl,
        content: new Blob([bytes], { type: metadataFileType.mediaType }),
        filename: guessDownloadFileName(parsedUrl, response.headers, metadataFileType),
      };
    } else {
      return {
        type: "direct-download",
        url: parsedUrl,
      };
    }
  } else if (startsWithAnyProtocol(parsedUrl.toString(), ALL_DOWNLOADABLE_PROTOCOLS)) {
    return {
      type: "direct-download",
      url: parsedUrl,
    };
  } else {
    return {
      type: "missing-or-illegal",
    };
  }
}

type ArrayifyValues<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K][];
};

type ResolvedUrlByType = ArrayifyValues<UnionByDiscriminant<ResolvedUrl, "type">>;

async function checkIfEMuleShouldBeEnabled(api: SynologyClient, urls: string[]) {
  if (urls.some((url) => startsWithAnyProtocol(url, EMULE_PROTOCOL))) {
    const result = await api.DownloadStation.Info.GetConfig();
    if (ClientRequestResult.isConnectionFailure(result)) {
      return false;
    } else if (result.success) {
      return !result.data.enable_emule;
    } else {
      return false;
    }
  } else {
    return false;
  }
}

function reportUnexpectedError(
  notificationId: string | undefined,
  e: unknown,
  debugMessage?: string,
) {
  saveLastSevereError(e, debugMessage);
  notify(
    browser.i18n.getMessage("Failed_to_add_download"),
    browser.i18n.getMessage("Unexpected_error_please_check_your_settings_and_try_again"),
    "failure",
    notificationId,
  );
}

async function addOneTask(
  api: SynologyClient,
  pollRequestManager: RequestManager,
  showNonErrorNotifications: boolean,
  url: string,
  { path, unzipPassword }: AddTaskOptions,
) {
  async function reportTaskAddResult(
    result: ClientRequestResult<unknown>,
    filename: string | undefined,
  ) {
    console.log(
      "task add result:",
      ClientRequestResult.isConnectionFailure(result)
        ? `connection failure (${result.type})`
        : `success=${result.success}`,
    );

    if (ClientRequestResult.isConnectionFailure(result)) {
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
      let shouldEMuleBeEnabled;
      try {
        shouldEMuleBeEnabled = await checkIfEMuleShouldBeEnabled(api, [url]);
      } catch (e) {
        reportUnexpectedError(notificationId, e, "error while checking emule settings");
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
          getErrorForFailedResponse(result),
          "failure",
          notificationId,
        );
      }
    }
  }

  const notificationId = showNonErrorNotifications
    ? notify(browser.i18n.getMessage("Adding_download"), guessFileNameFromUrl(url) ?? url)
    : undefined;

  const resolvedUrl = await resolveUrl(url);

  const createOptions = {
    destination: path,
    extract_password: unzipPassword,
  };

  if (resolvedUrl.type === "direct-download") {
    try {
      const result = await api.DownloadStation.Task.Create({
        type: "url",
        url: [sanitizeUrlForSynology(resolvedUrl.url).toString()],
        ...createOptions,
      });
      await reportTaskAddResult(result, guessFileNameFromUrl(url));
      await pollTasks(api, pollRequestManager);
    } catch (e) {
      reportUnexpectedError(notificationId, e, "error while adding direct-download task");
    }
  } else if (resolvedUrl.type === "metadata-file") {
    try {
      const file: FormFile = { content: resolvedUrl.content, filename: resolvedUrl.filename };
      const result = await api.DownloadStation.Task.Create({
        type: "file",
        file,
        ...createOptions,
      });
      await reportTaskAddResult(result, resolvedUrl.filename);
      await pollTasks(api, pollRequestManager);
    } catch (e) {
      reportUnexpectedError(notificationId, e, "error while adding metadata-file task");
    }
  } else if (resolvedUrl.type === "missing-or-illegal") {
    notify(
      browser.i18n.getMessage("Failed_to_add_download"),
      browser.i18n.getMessage("URL_must_start_with_one_of_ZprotocolsZ", [
        ALL_DOWNLOADABLE_PROTOCOLS.join(", "),
      ]),
      "failure",
      notificationId,
    );
  } else {
    assertNever(resolvedUrl);
  }
}

async function addMultipleTasks(
  api: SynologyClient,
  pollRequestManager: RequestManager,
  showNonErrorNotifications: boolean,
  urls: string[],
  { path, unzipPassword }: AddTaskOptions,
) {
  const notificationId = showNonErrorNotifications
    ? notify(
        browser.i18n.getMessage("Adding_ZcountZ_downloads", [urls.length]),
        browser.i18n.getMessage("Please_be_patient_this_may_take_some_time"),
      )
    : undefined;

  const resolvedUrls = await Promise.all(urls.map((url) => resolveUrl(url)));

  const groupedUrls: ResolvedUrlByType = {
    "direct-download": [],
    "metadata-file": [],
    "missing-or-illegal": [],
  };

  resolvedUrls.forEach((url) => {
    (groupedUrls[url.type] as (typeof url)[]).push(url);
  });

  let successes = 0;
  let failures = 0;

  function countResults(result: ClientRequestResult<unknown>, count: number) {
    console.log(
      "task add result:",
      ClientRequestResult.isConnectionFailure(result)
        ? `connection failure (${result.type})`
        : `success=${result.success}`,
    );

    if (ClientRequestResult.isConnectionFailure(result)) {
      failures += count;
    } else if (result.success) {
      // "success" doesn't mean the torrents are valid and downloading, it just means that the
      // operation requested was completed, which might have added invalid torrents. So this
      // is really just a best guess.
      successes += count;
    } else {
      failures += count;
    }
  }

  failures += groupedUrls["missing-or-illegal"].length;

  const createOptions = {
    destination: path,
    extract_password: unzipPassword,
  };

  if (groupedUrls["direct-download"].length > 0) {
    const downloadUrls = groupedUrls["direct-download"].map(({ url }) =>
      sanitizeUrlForSynology(url),
    );
    try {
      const result = await api.DownloadStation.Task.Create({
        type: "url",
        url: downloadUrls.map((url) => url.toString()),
        ...createOptions,
      });
      countResults(result, downloadUrls.length);
    } catch (e) {
      failures += downloadUrls.length;
      saveLastSevereError(e, "error while adding multiple direct-download URLs");
    }
  }

  if (groupedUrls["metadata-file"].length > 0) {
    const results = groupedUrls["metadata-file"].map((file) => {
      return api.DownloadStation.Task.Create({
        type: "file",
        file,
        ...createOptions,
      });
    });

    await Promise.all(
      results.map(async (r) => {
        try {
          countResults(await r, 1);
        } catch (e) {
          failures += 1;
          saveLastSevereError(e, "error while a adding a metadata-file URL");
        }
      }),
    );
  }

  if (successes > 0 && failures === 0) {
    notify(
      browser.i18n.getMessage("ZcountZ_downloads_added", [successes]),
      undefined,
      "success",
      notificationId,
    );
  } else if (successes === 0 && failures > 0) {
    notify(
      browser.i18n.getMessage("Failed_to_add_ZcountZ_downloads", [failures]),
      browser.i18n.getMessage(
        "Try_adding_downloads_individually_andor_checking_your_URLs_or_settings",
      ),
      "failure",
      notificationId,
    );
  } else {
    notify(
      browser.i18n.getMessage("ZsuccessZ_downloads_added_ZfailedZ_failed", [successes, failures]),
      browser.i18n.getMessage(
        "Try_adding_downloads_individually_andor_checking_your_URLs_or_settings",
      ),
      "failure",
      notificationId,
    );
  }

  await pollTasks(api, pollRequestManager);
}

export async function addDownloadTasksAndPoll(
  api: SynologyClient,
  pollRequestManager: RequestManager,
  showNonErrorNotifications: boolean,
  urls: string[],
  options?: AddTaskOptions,
): Promise<void> {
  const normalizedOptions = {
    ...options,
    path: options?.path?.startsWith("/") ? options.path.slice(1) : options?.path,
  };

  if (urls.length === 0) {
    notify(
      browser.i18n.getMessage("Failed_to_add_download"),
      browser.i18n.getMessage("No_downloadable_URLs_provided"),
      "failure",
    );
    return;
  } else if (urls.length === 1) {
    await addOneTask(
      api,
      pollRequestManager,
      showNonErrorNotifications,
      urls[0],
      normalizedOptions,
    );
  } else {
    await addMultipleTasks(
      api,
      pollRequestManager,
      showNonErrorNotifications,
      urls,
      normalizedOptions,
    );
  }
}
