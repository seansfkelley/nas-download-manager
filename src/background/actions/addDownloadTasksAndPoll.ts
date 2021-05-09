import {
  SynologyClient,
  ClientRequestResult,
  DownloadStation2,
  FormFile,
} from "../../common/apis/synology";
import { errorMessageFromCode } from "../../common/apis/errors";
import { saveLastSevereError } from "../../common/errorHandlers";
import { assertNever } from "../../common/lang";
import { notify } from "../../common/notify";
import {
  ALL_DOWNLOADABLE_PROTOCOLS,
  EMULE_PROTOCOL,
  startsWithAnyProtocol,
} from "../../common/apis/protocols";
import {
  resolveUrl,
  ResolvedUrl,
  UnexpectedErrorForUrl,
  sanitizeUrlForSynology,
  guessFileNameFromUrl,
} from "./urls";
import { pollTasks } from "./pollTasks";
import type { UnionByDiscriminant } from "../../common/types";
import type { AddTaskOptions } from "../../common/apis/messages";
import type { RequestManager } from "../requestManager";

type ArrayifyValues<T extends Record<string, any>> = {
  [K in keyof T]: T[K][];
};

type ResolvedUrlByType = ArrayifyValues<UnionByDiscriminant<ResolvedUrl, "type">>;

const UNEXPECTED_ERROR_REASON_TO_USER_MESSAGE: Record<UnexpectedErrorForUrl["reason"], string> = {
  "network-error": browser.i18n.getMessage(
    "Ensure_the_download_URL_is_valid_and_reachable_by_your_browser",
  ),
  timeout: browser.i18n.getMessage("The_download_URL_timed_out"),
  unknown: browser.i18n.getMessage("The_download_URL_failed_with_an_unknown_error"),
};

async function checkIfEMuleShouldBeEnabled(api: SynologyClient, urls: string[]) {
  if (urls.some((url) => startsWithAnyProtocol(url, EMULE_PROTOCOL))) {
    const result = await api.DownloadStation.Info.GetConfig();
    if (ClientRequestResult.isConnectionFailure(result)) {
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

function reportUnexpectedError(
  notificationId: string | undefined,
  e: any | undefined,
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
  { path, ftpUsername, ftpPassword, unzipPassword }: AddTaskOptions,
) {
  async function reportTaskAddResult(
    result: ClientRequestResult<unknown>,
    filename: string | undefined,
  ) {
    console.log("task add result", result);

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
          errorMessageFromCode(result.error.code, "DownloadStation.Task"),
          "failure",
          notificationId,
        );
      }
    }
  }

  const notificationId = showNonErrorNotifications
    ? notify(browser.i18n.getMessage("Adding_download"), guessFileNameFromUrl(url) ?? url)
    : undefined;

  const resolvedUrl = await resolveUrl(url, ftpUsername, ftpPassword);

  const commonCreateOptionsV1 = {
    destination: path,
    username: ftpUsername,
    password: ftpPassword,
    unzip_password: unzipPassword,
  };
  const commonCreateOptionsV2 = {
    destination: path,
    extract_password: unzipPassword,
  };

  if (resolvedUrl.type === "direct-download") {
    try {
      const result = await api.DownloadStation.Task.Create({
        uri: [sanitizeUrlForSynology(resolvedUrl.url)],
        ...commonCreateOptionsV1,
      });
      await reportTaskAddResult(result, guessFileNameFromUrl(url));
      await pollTasks(api, pollRequestManager);
    } catch (e) {
      reportUnexpectedError(notificationId, e, "error while adding direct-download task");
    }
  } else if (resolvedUrl.type === "metadata-file") {
    try {
      const supportsNewApiQueryResult = await api.Info.Query({
        query: [DownloadStation2.Task.API_NAME],
      });
      if (ClientRequestResult.isConnectionFailure(supportsNewApiQueryResult)) {
        await reportTaskAddResult(supportsNewApiQueryResult, resolvedUrl.filename);
      } else {
        const file: FormFile = { content: resolvedUrl.content, filename: resolvedUrl.filename };
        let result;
        if (
          supportsNewApiQueryResult.success &&
          supportsNewApiQueryResult.data[DownloadStation2.Task.API_NAME] != null
        ) {
          result = await api.DownloadStation2.Task.Create({
            type: "file",
            file,
            ...commonCreateOptionsV2,
          });
        } else {
          result = await api.DownloadStation.Task.Create({
            file,
            ...commonCreateOptionsV1,
          });
        }
        await reportTaskAddResult(result, resolvedUrl.filename);
        await pollTasks(api, pollRequestManager);
      }
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
  } else if (resolvedUrl.type === "error") {
    notify(
      browser.i18n.getMessage("Failed_to_add_download"),
      UNEXPECTED_ERROR_REASON_TO_USER_MESSAGE[resolvedUrl.reason],
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
  { path, ftpUsername, ftpPassword, unzipPassword }: AddTaskOptions,
) {
  const notificationId = showNonErrorNotifications
    ? notify(
        browser.i18n.getMessage("Adding_ZcountZ_downloads", [urls.length]),
        browser.i18n.getMessage("Please_be_patient_this_may_take_some_time"),
      )
    : undefined;

  const resolvedUrls = await Promise.all(
    urls.map((url) => resolveUrl(url, ftpUsername, ftpPassword)),
  );

  const groupedUrls: ResolvedUrlByType = {
    "direct-download": [],
    "metadata-file": [],
    "missing-or-illegal": [],
    error: [],
  };

  resolvedUrls.forEach((url) => {
    (groupedUrls[url.type] as typeof url[]).push(url);
  });

  let successes = 0;
  let failures = 0;

  function countResults(result: ClientRequestResult<unknown>, count: number) {
    console.log("task add result", result);

    if (ClientRequestResult.isConnectionFailure(result)) {
      failures += count;
    } else if (result.success) {
      // "success" doesn't mean the torrents are valid and downloading, it just means that the
      // operation requested was completed, which might have added invalid torrents. So this
      // is really just a best guess.
      successes += count;
    } else if (!result.success) {
      failures += count;
    } else {
      assertNever(result);
    }
  }

  if (groupedUrls["error"].length > 0) {
    const firstError = groupedUrls["error"][0];
    saveLastSevereError(
      firstError.error,
      `${groupedUrls["error"].length} error(s) while resolving URLs; first message: ${firstError.debugDescription}`,
    );
    failures += groupedUrls["error"].length;
  }

  failures += groupedUrls["missing-or-illegal"].length;

  const commonCreateOptionsV1 = {
    destination: path,
    username: ftpUsername,
    password: ftpPassword,
    unzip_password: unzipPassword,
  };

  const commonCreateOptionsV2 = {
    destination: path,
    extract_password: unzipPassword,
  };

  if (groupedUrls["direct-download"].length > 0) {
    const urls = groupedUrls["direct-download"].map(({ url }) => sanitizeUrlForSynology(url));
    try {
      const result = await api.DownloadStation.Task.Create({
        uri: urls,
        ...commonCreateOptionsV1,
      });
      countResults(result, urls.length);
    } catch (e) {
      failures += urls.length;
      saveLastSevereError(e, "error while adding multiple direct-download URLs");
    }
  }

  if (groupedUrls["metadata-file"].length > 0) {
    const supportsNewApiQueryResult = await api.Info.Query({
      query: [DownloadStation2.Task.API_NAME],
    });

    const results = groupedUrls["metadata-file"].map((file) => {
      if (ClientRequestResult.isConnectionFailure(supportsNewApiQueryResult)) {
        return Promise.resolve(supportsNewApiQueryResult);
      } else if (
        supportsNewApiQueryResult.success &&
        supportsNewApiQueryResult.data[DownloadStation2.Task.API_NAME] != null
      ) {
        return api.DownloadStation2.Task.Create({
          type: "file",
          file,
          ...commonCreateOptionsV2,
        });
      } else {
        return api.DownloadStation.Task.Create({
          file,
          ...commonCreateOptionsV1,
        });
      }
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

  pollTasks(api, pollRequestManager);
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
    // TODO: This seems wrong. Shouldn't this be ... ? path.slice(1) : path?
    path: options?.path?.startsWith("/") ? options?.path.slice(1) : undefined,
  };

  if (urls.length === 0) {
    notify(
      browser.i18n.getMessage("Failed_to_add_download"),
      browser.i18n.getMessage("No_downloadable_URLs_provided"),
      "failure",
    );
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
