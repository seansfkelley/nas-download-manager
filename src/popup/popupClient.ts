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
import { ConnectionSettings, getHostUrl } from "../common/state";

export interface PopupClient {
  openDownloadStationUi: () => void;
  createTasks: (urls: string[], options?: AddTaskOptions) => void;
  pauseTask: (taskId: string) => Promise<MessageResponse>;
  resumeTask: (taskId: string) => Promise<MessageResponse>;
  deleteTasks: (taskIds: string[]) => Promise<MessageResponse>;
  getConfig: () => Promise<MessageResponse<DownloadStationInfoConfig>>;
  listDirectories: (path?: string) => Promise<MessageResponse<Directory[]>>;
  testConnectionAndLogin: (
    password: string,
    otpCode: string | undefined,
  ) => Promise<ClientRequestResult<{}>>;
}

export function getClient(connection: ConnectionSettings): PopupClient | undefined {
  const hostUrl = getHostUrl(connection.identifiers);
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
      testConnectionAndLogin: async (password: string, otpCode: string | undefined) => {
        const result = await testConnection(connection.identifiers, password, otpCode);
        if (!ClientRequestResult.isConnectionFailure(result) && result.success) {
          await Login.send({ password, deviceToken: result.data.did });
        }
        return result;
      },
    };
  } else {
    return undefined;
  }
}
