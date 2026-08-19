import { getErrorForConnectionFailure, getErrorForFailedResponse } from "../../common/apis/errors";
import type { AddTaskOptions } from "../../common/apis/messages";
import {
  ALL_DOWNLOADABLE_PROTOCOLS,
  EMULE_PROTOCOL,
  startsWithAnyProtocol,
} from "../../common/apis/protocols";
import {
  ClientRequestResult,
  ConnectionFailure,
  DownloadStation2,
  FormFile,
  SynologyClient,
} from "../../common/apis/synology";
import { saveLastSevereError } from "../../common/errorHandlers";
import { assertNever } from "../../common/lang";
import { NotificationType, sendNotification } from "../../common/sendNotification";
import { PersistentState } from "../../common/state";
import type { UnionByDiscriminant } from "../../common/types";

import { fetchTasks } from "./fetchTasks";
import { ResolvedUrl, guessFileNameFromUrl, resolveUrl, sanitizeUrlForSynology } from "./urls";

type ArrayifyValues<T extends Record<string, any>> = {
  [K in keyof T]: T[K][];
};

type ResolvedUrlByType = ArrayifyValues<UnionByDiscriminant<ResolvedUrl, "type">>;

async function checkIfEMuleShouldBeEnabled(client: SynologyClient, urls: string[]) {
  if (urls.some((url) => startsWithAnyProtocol(url, EMULE_PROTOCOL))) {
    const result = await client.DownloadStation.Info.GetConfig();
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

const SLOW_ADD_NOTIFICATION_DELAY_MS = 3000;

// Stateful API to make it easier to not flood the user or hit notification frequency limits imposed
// by the browser.
//
// Sends at most 1 update and 1 completion. Updates are silently dropped if any update or completion
// has been sent. Only the first completion will be sent.
class NotificationDeduplicator {
  private notificationId: string | undefined;
  private didSendCompletion = false;

  sendUpdate(title: string, message?: string) {
    if (this.notificationId == null) {
      this.notificationId = sendNotification(title, message);
    } else {
      console.warn(`ignoring redundant update notification with title "${title}"`);
    }
  }

  sendCompletion(title: string, message: string | undefined, type: NotificationType) {
    if (!this.didSendCompletion) {
      this.didSendCompletion = true;
      this.notificationId = sendNotification(title, message, type, this.notificationId);
    } else {
      console.warn(`ignoring redundant completion notification with title "${title}"`);
    }
  }
}

function reportUnexpectedError(
  notifier: NotificationDeduplicator,
  e: any | undefined,
  debugMessage?: string,
) {
  saveLastSevereError(e, debugMessage);
  notifier.sendCompletion(
    browser.i18n.getMessage("Failed_to_add_download"),
    browser.i18n.getMessage("Unexpected_error_please_check_your_settings_and_try_again"),
    "failure",
  );
}

async function reportTaskAddResult(
  notifier: NotificationDeduplicator,
  client: SynologyClient,
  enableFeedbackNotifications: boolean,
  url: string,
  result: ClientRequestResult<unknown>,
  filename: string | undefined,
) {
  console.log("task add result", result);

  if (ClientRequestResult.isConnectionFailure(result)) {
    notifier.sendCompletion(
      browser.i18n.getMessage("Failed_to_connect_to_DiskStation"),
      browser.i18n.getMessage("Please_check_your_settings"),
      "failure",
    );
  } else if (result.success) {
    if (enableFeedbackNotifications) {
      notifier.sendCompletion(
        browser.i18n.getMessage("Download_added"),
        filename || url,
        "success",
      );
    }
  } else {
    // Assume it's not enabled so we hit the generic failure message if the API call fails.
    let shouldEMuleBeEnabled = false;
    try {
      shouldEMuleBeEnabled = await checkIfEMuleShouldBeEnabled(client, [url]);
    } catch (e) {
      saveLastSevereError(e, "error while checking emule settings");
    }

    if (shouldEMuleBeEnabled) {
      notifier.sendCompletion(
        browser.i18n.getMessage("eMule_is_not_enabled"),
        browser.i18n.getMessage("Use_DSM_to_enable_eMule_downloads"),
        "failure",
      );
    } else {
      notifier.sendCompletion(
        browser.i18n.getMessage("Failed_to_add_download"),
        getErrorForFailedResponse(result),
        "failure",
      );
    }
  }
}

async function addOneTask(
  client: SynologyClient,
  enableFeedbackNotifications: boolean,
  url: string,
  { path, ftpUsername, ftpPassword, unzipPassword }: AddTaskOptions,
) {
  const notifier = new NotificationDeduplicator();

  if (enableFeedbackNotifications) {
    // No need to cancel this; once the add finishes, the notifier drops the update on the floor.
    setTimeout(() => {
      notifier.sendUpdate(
        browser.i18n.getMessage("Adding_this_download_is_taking_a_while"),
        guessFileNameFromUrl(url) ?? url,
      );
    }, SLOW_ADD_NOTIFICATION_DELAY_MS);
  }

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
      const result = await client.DownloadStation.Task.Create({
        uri: [sanitizeUrlForSynology(resolvedUrl.url).toString()],
        ...commonCreateOptionsV1,
      });
      await reportTaskAddResult(
        notifier,
        client,
        enableFeedbackNotifications,
        url,
        result,
        guessFileNameFromUrl(url),
      );
      await fetchTasks(client);
    } catch (e) {
      reportUnexpectedError(notifier, e, "error while adding direct-download task");
    }
  } else if (resolvedUrl.type === "metadata-file") {
    try {
      const supportsNewApiQueryResult = await client.Info.Query({
        query: [DownloadStation2.Task.API_NAME],
      });
      if (ClientRequestResult.isConnectionFailure(supportsNewApiQueryResult)) {
        await reportTaskAddResult(
          notifier,
          client,
          enableFeedbackNotifications,
          url,
          supportsNewApiQueryResult,
          resolvedUrl.filename,
        );
      } else {
        const file: FormFile = { content: resolvedUrl.content, filename: resolvedUrl.filename };
        let result;
        if (
          supportsNewApiQueryResult.success &&
          // Synology seems to have some bizarre malformed implementation of this that has a
          // maxVersion of 1. Note that the implementation of Create is haredcoded to version 2,
          // probably for this reason.
          (supportsNewApiQueryResult.data[DownloadStation2.Task.API_NAME]?.maxVersion ?? 0) >= 2
        ) {
          result = await client.DownloadStation2.Task.Create({
            type: "file",
            file,
            ...commonCreateOptionsV2,
          });
        } else {
          result = await client.DownloadStation.Task.Create({
            file,
            ...commonCreateOptionsV1,
          });
        }
        await reportTaskAddResult(
          notifier,
          client,
          enableFeedbackNotifications,
          url,
          result,
          resolvedUrl.filename,
        );
        await fetchTasks(client);
      }
    } catch (e) {
      reportUnexpectedError(notifier, e, "error while adding metadata-file task");
    }
  } else if (resolvedUrl.type === "missing-or-illegal") {
    notifier.sendCompletion(
      browser.i18n.getMessage("Failed_to_add_download"),
      browser.i18n.getMessage("URL_must_start_with_one_of_ZprotocolsZ", [
        ALL_DOWNLOADABLE_PROTOCOLS.join(", "),
      ]),
      "failure",
    );
  } else {
    assertNever(resolvedUrl);
  }
}

async function addMultipleTasks(
  client: SynologyClient,
  enableFeedbackNotifications: boolean,
  urls: string[],
  { path, ftpUsername, ftpPassword, unzipPassword }: AddTaskOptions,
) {
  const notifier = new NotificationDeduplicator();

  if (enableFeedbackNotifications) {
    // No need to cancel this; once the adds finish, the notifier drops the update on the floor.
    setTimeout(() => {
      notifier.sendUpdate(
        browser.i18n.getMessage("Adding_ZcountZ_downloads_is_taking_a_while", [urls.length]),
        browser.i18n.getMessage("Please_be_patient_this_may_take_some_time"),
      );
    }, SLOW_ADD_NOTIFICATION_DELAY_MS);
  }

  const resolvedUrls = await Promise.all(
    urls.map((url) => resolveUrl(url, ftpUsername, ftpPassword)),
  );

  const groupedUrls: ResolvedUrlByType = {
    "direct-download": [],
    "metadata-file": [],
    "missing-or-illegal": [],
  };

  for (const url of resolvedUrls) {
    (groupedUrls[url.type] as (typeof url)[]).push(url);
  }

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
      const result = await client.DownloadStation.Task.Create({
        uri: urls.map((url) => url.toString()),
        ...commonCreateOptionsV1,
      });
      countResults(result, urls.length);
    } catch (e) {
      failures += urls.length;
      saveLastSevereError(e, "error while adding multiple direct-download URLs");
    }
  }

  if (groupedUrls["metadata-file"].length > 0) {
    const supportsNewApiQueryResult = await client.Info.Query({
      query: [DownloadStation2.Task.API_NAME],
    });

    const results = groupedUrls["metadata-file"].map((file) => {
      if (ClientRequestResult.isConnectionFailure(supportsNewApiQueryResult)) {
        return Promise.resolve(supportsNewApiQueryResult);
      } else if (
        supportsNewApiQueryResult.success &&
        supportsNewApiQueryResult.data[DownloadStation2.Task.API_NAME] != null
      ) {
        return client.DownloadStation2.Task.Create({
          type: "file",
          file,
          ...commonCreateOptionsV2,
        });
      } else {
        return client.DownloadStation.Task.Create({
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
    notifier.sendCompletion(
      browser.i18n.getMessage("ZcountZ_downloads_added", [successes]),
      undefined,
      "success",
    );
  } else if (successes === 0 && failures > 0) {
    notifier.sendCompletion(
      browser.i18n.getMessage("Failed_to_add_ZcountZ_downloads", [failures]),
      browser.i18n.getMessage(
        "Try_adding_downloads_individually_andor_checking_your_URLs_or_settings",
      ),
      "failure",
    );
  } else {
    notifier.sendCompletion(
      browser.i18n.getMessage("ZsuccessZ_downloads_added_ZfailedZ_failed", [successes, failures]),
      browser.i18n.getMessage(
        "Try_adding_downloads_individually_andor_checking_your_URLs_or_settings",
      ),
      "failure",
    );
  }

  fetchTasks(client);
}

export async function addDownloadTasksAndFetch(
  client: SynologyClient,
  urls: string[],
  options?: AddTaskOptions,
): Promise<void> {
  const enableFeedbackNotifications =
    (await PersistentState.get())?.settings.notifications.enableFeedbackNotifications ?? false;

  const normalizedOptions = {
    ...options,
    // TODO: This seems wrong. Shouldn't this be ... ? path.slice(1) : path?
    path: options?.path?.startsWith("/") ? options?.path.slice(1) : undefined,
  };

  if (urls.length === 0) {
    sendNotification(
      browser.i18n.getMessage("Failed_to_add_download"),
      browser.i18n.getMessage("No_downloadable_URLs_provided"),
      "failure",
    );
    return;
  }

  // The client would report this itself, but only per-request and in less specific words, so pre-empt it.
  const login = await client.getLoginParameters();

  if (ConnectionFailure.is(login)) {
    sendNotification(
      browser.i18n.getMessage("Failed_to_add_download"),
      getErrorForConnectionFailure(login),
      "failure",
    );
  } else if (urls.length === 1) {
    await addOneTask(client, enableFeedbackNotifications, urls[0], normalizedOptions);
  } else {
    await addMultipleTasks(client, enableFeedbackNotifications, urls, normalizedOptions);
  }
}
