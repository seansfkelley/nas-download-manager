import { testConnection } from "../common/apis/connection";
import { AddTaskOptions, Directory, Login, MessageResponse } from "../common/apis/messages";
import {
  AddTasks,
  DeleteTasks,
  GetConfig,
  ListDirectories,
  PauseTask,
  ResumeTask,
} from "../common/apis/messages";
import { ClientRequestResult } from "../common/apis/synology";
import type { DownloadStationInfoConfig } from "../common/apis/synology/DownloadStation/Info";
import { ConnectionSettings, PersistentState, getHostUrl } from "../common/state";

export interface PopupClient {
  openDownloadStationUi: () => void;
  createTasks: (urls: string[], options?: AddTaskOptions) => void;
  pauseTask: (taskId: string) => Promise<MessageResponse>;
  resumeTask: (taskId: string) => Promise<MessageResponse>;
  deleteTasks: (taskIds: string[]) => Promise<MessageResponse>;
  getConfig: () => Promise<MessageResponse<DownloadStationInfoConfig>>;
  listDirectories: (path?: string) => Promise<MessageResponse<Directory[]>>;
  testConnectionAndLogin: (password: string, otpCode?: string) => Promise<ClientRequestResult<{}>>;
}

// Written before handing the login off to the background, which reads it back out of persistent
// state to get past two-step verification without a code of its own.
async function saveDeviceToken(deviceToken: string) {
  const state = await PersistentState.get();
  if (state != null) {
    await PersistentState.set({
      settings: {
        ...state.settings,
        connection: { ...state.settings.connection, deviceToken },
      },
    });
  }
}

export function getClient(settings: ConnectionSettings): PopupClient | undefined {
  const hostUrl = getHostUrl(settings);
  if (hostUrl) {
    return {
      openDownloadStationUi: () => {
        browser.tabs.create({
          url: hostUrl + "/index.cgi?launchApp=SYNO.SDS.DownloadStation.Application",
          active: true,
        });
      },
      createTasks: AddTasks.send,
      pauseTask: PauseTask.send,
      resumeTask: ResumeTask.send,
      deleteTasks: DeleteTasks.send,
      getConfig: GetConfig.send,
      listDirectories: ListDirectories.send,
      testConnectionAndLogin: async (password: string, otpCode?: string) => {
        const result = await testConnection({ ...settings, password }, otpCode);
        if (!ClientRequestResult.isConnectionFailure(result) && result.success) {
          // A device token only comes back from a login that used a one-time password.
          if (result.data.did != null) {
            await saveDeviceToken(result.data.did);
          }
          await Login.send(password);
        }
        return result;
      },
    };
  } else {
    return undefined;
  }
}
