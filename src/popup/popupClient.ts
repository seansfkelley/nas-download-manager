import { getHostUrl, ConnectionSettings } from "../common/state";
import type { DownloadStationInfoConfig } from "../common/apis/synology/DownloadStation/Info";
import {
  MessageResponse,
  AddTaskOptions,
  Directory,
  SetLoginPassword,
} from "../common/apis/messages";
import {
  AddTasks,
  PauseTask,
  ResumeTask,
  DeleteTasks,
  GetConfig,
  ListDirectories,
} from "../common/apis/messages";
import { ClientRequestResult } from "../common/apis/synology";
import { testConnection } from "../common/apis/connection";

export interface PopupClient {
  openDownloadStationUi: () => void;
  createTasks: (urls: string[], options?: AddTaskOptions) => void;
  pauseTask: (taskId: string) => Promise<MessageResponse>;
  resumeTask: (taskId: string) => Promise<MessageResponse>;
  deleteTasks: (taskIds: string[]) => Promise<MessageResponse>;
  getConfig: () => Promise<MessageResponse<DownloadStationInfoConfig>>;
  listDirectories: (path?: string) => Promise<MessageResponse<Directory[]>>;
  testConnectionAndLogin: (password: string) => Promise<ClientRequestResult<{}>>;
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
      testConnectionAndLogin: async (password: string) => {
        const result = await testConnection({ ...settings, password });
        if (!ClientRequestResult.isConnectionFailure(result) && result.success) {
          await SetLoginPassword.send(password);
        }
        return result;
      },
    };
  } else {
    return undefined;
  }
}
