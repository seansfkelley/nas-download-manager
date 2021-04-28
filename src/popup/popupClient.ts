import { getHostUrl, ConnectionSettings } from "../common/state";
import type { DownloadStationInfoConfig } from "../common/apis/synology";
import type { MessageResponse, AddTaskOptions, Directory } from "../common/apis/messages";
import {
  AddTasks,
  PauseTask,
  ResumeTask,
  DeleteTasks,
  GetConfig,
  ListDirectories,
} from "../common/apis/messages";

export interface PopupClient {
  openDownloadStationUi: () => void;
  createTasks: (urls: string[], options?: AddTaskOptions) => void;
  pauseTask: (taskId: string) => Promise<MessageResponse>;
  resumeTask: (taskId: string) => Promise<MessageResponse>;
  deleteTasks: (taskIds: string[]) => Promise<MessageResponse>;
  getConfig: () => Promise<MessageResponse<DownloadStationInfoConfig>>;
  listDirectories: (path?: string) => Promise<MessageResponse<Directory[]>>;
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
    };
  } else {
    return undefined;
  }
}
