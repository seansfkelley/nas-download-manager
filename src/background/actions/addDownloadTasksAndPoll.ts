import {
  ApiClient,
  ConnectionFailure,
  isConnectionFailure,
  SynologyResponse,
} from "synology-typescript-api";
import { errorMessageFromCode } from "../../common/apis/errors";
import { onUnhandledError } from "../../common/errorHandlers";
import { assertNever } from "../../common/lang";
import { notify } from "../../common/notify";
import {
  ALL_DOWNLOADABLE_PROTOCOLS,
  EMULE_PROTOCOL,
  startsWithAnyProtocol,
} from "../../common/apis/protocols";
import { resolveUrl, ResolvedUrl, sanitizeUrlForSynology, guessFileNameFromUrl } from "./urls";
import { pollTasks } from "./pollTasks";

// https://stackoverflow.com/questions/50125893/typescript-derive-map-from-discriminated-union
type DiscriminateUnion<T, K extends keyof T, V extends T[K]> = T extends Record<K, V> ? T : never;

type MapDiscriminatedUnion<T extends Record<K, string>, K extends keyof T> = {
  [V in T[K]]: DiscriminateUnion<T, K, V>[];
};

type ResolvedUrlByType = MapDiscriminatedUnion<ResolvedUrl, "type">;

async function checkIfEMuleShouldBeEnabled(api: ApiClient, urls: string[]) {
  if (urls.some((url) => startsWithAnyProtocol(url, EMULE_PROTOCOL))) {
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

function reportUnexpectedError(
  notificationId: string | undefined,
  e: any | undefined,
  message?: string,
) {
  onUnhandledError(e, message);
  notify(
    browser.i18n.getMessage("Failed_to_add_download"),
    browser.i18n.getMessage("Unexpected_error_please_check_your_settings_and_try_again"),
    "failure",
    notificationId,
  );
}

async function addOneTask(
  api: ApiClient,
  showNonErrorNotifications: boolean,
  url: string,
  destination: string | undefined,
) {
  async function reportTaskAddResult(
    result: ConnectionFailure | SynologyResponse<{}>,
    filename: string | undefined,
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
      let shouldEMuleBeEnabled;
      try {
        shouldEMuleBeEnabled = await checkIfEMuleShouldBeEnabled(api, [url]);
      } catch (e) {
        reportUnexpectedError(e, "error while checking emule settings");
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

  const resolvedUrl = await resolveUrl(url);

  if (resolvedUrl.type === "direct-download") {
    try {
      const result = await api.DownloadStation.Task.Create({
        uri: [sanitizeUrlForSynology(resolvedUrl.url)],
        destination,
      });
      await reportTaskAddResult(result, guessFileNameFromUrl(url));
      await pollTasks(api);
    } catch (e) {
      reportUnexpectedError(notificationId, e, "error while adding direct-download task");
    }
  } else if (resolvedUrl.type === "metadata-file") {
    try {
      const result = await api.DownloadStation.Task.Create({
        file: { content: resolvedUrl.content, filename: resolvedUrl.filename },
        destination,
      });
      await reportTaskAddResult(result, resolvedUrl.filename);
      await pollTasks(api);
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
  } else if (resolvedUrl.type === "unexpected-error") {
    reportUnexpectedError(notificationId, resolvedUrl.error, resolvedUrl.description);
  } else {
    assertNever(resolvedUrl);
  }
}

async function addMultipleTasks(
  api: ApiClient,
  showNonErrorNotifications: boolean,
  urls: string[],
  destination: string | undefined,
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
    "unexpected-error": [],
  };

  resolvedUrls.forEach((url) => {
    (groupedUrls[url.type] as typeof url[]).push(url);
  });

  let successes = 0;
  let failures = 0;

  function countResults(result: SynologyResponse<{}> | ConnectionFailure, count: number) {
    console.log("task add result", result);

    if (isConnectionFailure(result)) {
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

  if (groupedUrls["unexpected-error"].length > 0) {
    const firstError = groupedUrls["unexpected-error"][0];
    onUnhandledError(
      firstError.error,
      `${groupedUrls["unexpected-error"].length} error(s) while resolving URLs; first message: ${firstError.description}`,
    );
    failures += groupedUrls["unexpected-error"].length;
  }

  failures += groupedUrls["missing-or-illegal"].length;

  if (groupedUrls["direct-download"].length > 0) {
    const urls = groupedUrls["direct-download"].map(({ url }) => sanitizeUrlForSynology(url));
    try {
      const result = await api.DownloadStation.Task.Create({
        uri: urls,
        destination,
      });
      countResults(result, urls.length);
    } catch (e) {
      failures += urls.length;
      onUnhandledError(e, "error while adding multiple direct-download URLs");
    }
  }

  if (groupedUrls["metadata-file"].length > 0) {
    const results = groupedUrls["metadata-file"].map(({ content, filename }) =>
      api.DownloadStation.Task.Create({
        file: { content, filename },
        destination,
      }),
    );

    await Promise.all(
      results.map(async (r) => {
        try {
          countResults(await r, 1);
        } catch (e) {
          failures += 1;
          onUnhandledError(e, "error while a adding a metadata-file URL");
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

  pollTasks(api);
}

export async function addDownloadTasksAndPoll(
  api: ApiClient,
  showNonErrorNotifications: boolean,
  urls: string[],
  path?: string,
): Promise<void> {
  const destination = path && path.startsWith("/") ? path.slice(1) : undefined;

  if (urls.length === 0) {
    notify(
      browser.i18n.getMessage("Failed_to_add_download"),
      browser.i18n.getMessage("No_downloadable_URLs_provided"),
      "failure",
    );
  } else if (urls.length === 1) {
    await addOneTask(api, showNonErrorNotifications, urls[0], destination);
  } else {
    await addMultipleTasks(api, showNonErrorNotifications, urls, destination);
  }
}
