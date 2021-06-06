import { ApiBuilder, BaseRequest, FormFile, RestApiResponse, get, post } from "../shared";

export type DownloadStationTaskAdditionalType = "detail" | "transfer" | "file" | "tracker" | "peer";

export interface DownloadStationTaskListRequest extends BaseRequest {
  offset?: number;
  limit?: number;
  additional?: DownloadStationTaskAdditionalType[];
}

export interface DownloadStationTaskListResponse {
  // total is the number of results that came back, NOT the total number that exist on the remote.
  total: number;
  offset: number;
  tasks: DownloadStationTask[];
}

export interface DownloadStationTaskDetail {
  completed_time: number;
  connected_leechers: number;
  connected_peers: number;
  connected_seeders: number;
  create_time: number;
  destination: string;
  seedelapsed: number;
  started_time: number;
  total_peers: number;
  total_pieces: number;
  unzip_password: string;
  uri: string;
  waiting_seconds: number;
}

export interface DownloadStationTaskFile {
  filename: string;
  index: number;
  priority: "skip" | "low" | "normal" | "high";
  size: number;
  size_downloaded: number;
  wanted: boolean;
}

export interface DownloadStationTaskPeer {
  address: string;
  agent: string;
  progress: number;
  speed_download: number;
  speed_upload: number;
}

export interface DownloadStationTaskTracker {
  peers: number;
  seeds: number;
  status: string;
  update_timer: number;
  url: string;
}

export interface DownloadStationTaskTransfer {
  downloaded_pieces: number;
  size_downloaded: number;
  size_uploaded: number;
  speed_download: number;
  speed_upload: number;
}

export const __taskNormalStatuses = {
  downloading: true,
  error: true,
  extracting: true,
  filehosting_waiting: true,
  finished: true,
  finishing: true,
  hash_checking: true,
  paused: true,
  seeding: true,
  waiting: true,
};

export type DownloadStationTaskNormalStatus = keyof typeof __taskNormalStatuses;
export const ALL_TASK_NORMAL_STATUSES = Object.keys(
  __taskNormalStatuses,
) as DownloadStationTaskNormalStatus[];

export const __taskErrorStatuses = {
  broken_link: true,
  destination_denied: true,
  destination_not_exist: true,
  disk_full: true,
  encrypted_name_too_long: true,
  exceed_max_destination_size: true,
  exceed_max_file_system_size: true,
  exceed_max_temp_size: true,
  extract_failed_disk_full: true,
  extract_failed_invalid_archive: true,
  extract_failed_quota_reached: true,
  extract_failed_wrong_password: true,
  extract_failed: true,
  file_not_exist: true,
  ftp_encryption_not_supported_type: true,
  missing_python: true,
  name_too_long: true,
  not_supported_type: true,
  private_video: true,
  quota_reached: true,
  required_premium_account: true,
  encryption: true,
  timeout: true,
  torrent_duplicate: true,
  try_it_later: true,
  unknown: true,
};

export type DownloadStationTaskErrorStatus = keyof typeof __taskErrorStatuses;
export const ALL_TASK_ERROR_STATUSES = Object.keys(
  __taskErrorStatuses,
) as DownloadStationTaskErrorStatus[];

export interface DownloadStationTask {
  id: string;
  // The docs have these properly cased, but I'm pretty sure they all end up on the wire lowercased.
  type: "bt" | "nzb" | "http" | "ftp" | "emule";
  username: string;
  title: string;
  size: number;
  status: DownloadStationTaskNormalStatus;
  status_extra?: {
    error_detail: DownloadStationTaskErrorStatus;
    unzip_progress?: number;
  };
  // It's unclear to me if the values of these keys are a function of the type of task.
  // I also don't know what the optionality of these are -- it's not documented, so this is
  // guesswork from experimental results.
  additional?: {
    detail?: DownloadStationTaskDetail;
    file?: DownloadStationTaskFile[];
    peer?: DownloadStationTaskPeer[];
    tracker?: DownloadStationTaskTracker[];
    transfer?: DownloadStationTaskTransfer;
  };
}

export interface DownloadStationTaskGetInfoRequest extends BaseRequest {
  id: string[];
  additional?: DownloadStationTaskAdditionalType[];
}

export interface DownloadStationTaskGetInfoResponse {
  tasks: DownloadStationTask[];
}

export interface DownloadStationTaskCreateRequest extends BaseRequest {
  uri?: string[];
  file?: FormFile;
  username?: string;
  password?: string;
  unzip_password?: string;
  destination?: string;
}

export interface DownloadStationTaskDeleteRequest extends BaseRequest {
  id: string[];
  force_complete: boolean;
}

export type DownloadStationTaskActionResponse = {
  id: string;
  error: number;
}[];

export interface DownloadStationTaskPauseResumeRequest extends BaseRequest {
  id: string[];
}

export interface DownloadStationTaskEditRequest extends BaseRequest {
  id: string[];
  destination?: string;
}

const CGI_NAME = "DownloadStation/task";
const API_NAME = "SYNO.DownloadStation.Task";

const taskBuilder = new ApiBuilder(CGI_NAME, API_NAME, {
  apiGroup: "DownloadStation",
  apiSubgroup: "DownloadStation.Task",
});

function Task_Create(
  baseUrl: string,
  sid: string,
  options: DownloadStationTaskCreateRequest,
): Promise<RestApiResponse<{}>> {
  if (options.file && options.uri) {
    throw new Error("cannot specify both a file and a uri argument to Create");
  }
  const commonOptions = {
    ...options,
    api: API_NAME,
    version: 1,
    method: "create",
    sid,
    meta: {
      apiGroup: "DownloadStation",
      apiSubgroup: "DownloadStation.Task",
    },
    file: undefined,
    uri: undefined,
  };

  if (options.file) {
    return post(baseUrl, CGI_NAME, {
      ...commonOptions,
      file: options.file,
    });
  } else {
    return get(baseUrl, CGI_NAME, {
      ...commonOptions,
      uri: options.uri?.length ? options.uri.join(",") : undefined,
    });
  }
}

function fixTaskNumericTypes(task: DownloadStationTask): DownloadStationTask {
  function sideEffectCastNumbers<T extends object, K extends keyof T>(
    obj: T | null | undefined,
    keys: Extract<keyof T, T[K] extends number ? K : never>[],
  ): void {
    if (obj != null) {
      keys.forEach((k) => {
        if (obj[k] != null) {
          // We don't expect any of these values to be greater than Number.MAX_SAFE_INTEGER, so this is safe.
          // If they are, so be it: you have a 9 quadrillion byte download, so you probably have other problems.
          obj[k] = +obj[k] as any;
        }
      });
    }
  }

  const output = { ...task };
  sideEffectCastNumbers(output, ["size"]);
  if (output.additional) {
    sideEffectCastNumbers(output.additional.detail, [
      "completed_time",
      "connected_leechers",
      "connected_peers",
      "connected_seeders",
      "create_time",
      "seedelapsed",
      "started_time",
      "total_peers",
      "total_pieces",
      "waiting_seconds",
    ]);
    if (output.additional.file) {
      output.additional.file.forEach((f) => {
        sideEffectCastNumbers(f, ["index", "size", "size_downloaded"]);
      });
    }
    if (output.additional.peer) {
      output.additional.peer.forEach((p) => {
        sideEffectCastNumbers(p, ["progress", "speed_download", "speed_upload"]);
      });
    }
    if (output.additional.tracker) {
      output.additional.tracker.forEach((t) => {
        sideEffectCastNumbers(t, ["peers", "seeds", "update_timer"]);
      });
    }
    sideEffectCastNumbers(output.additional.transfer, [
      "downloaded_pieces",
      "size_downloaded",
      "size_uploaded",
      "speed_download",
      "speed_upload",
    ]);
  }
  return output;
}

export const Task = {
  API_NAME,
  List: taskBuilder.makeGet<DownloadStationTaskListRequest, DownloadStationTaskListResponse>(
    "list",
    (o) => ({
      ...o,
      additional: o?.additional?.length ? o.additional.join(",") : undefined,
    }),
    (r) => ({ ...r, tasks: (r.tasks || []).map(fixTaskNumericTypes) }),
    true,
  ),
  GetInfo: taskBuilder.makeGet<
    DownloadStationTaskGetInfoRequest,
    DownloadStationTaskGetInfoResponse
  >("getinfo", (o) => ({
    ...o,
    id: o.id.join(","),
    additional: o?.additional?.length ? o.additional.join(",") : undefined,
  })),
  Create: Task_Create,
  Delete: taskBuilder.makeGet<DownloadStationTaskDeleteRequest, DownloadStationTaskActionResponse>(
    "delete",
    (o) => ({ ...o, id: o.id.join(",") }),
  ),
  Pause: taskBuilder.makeGet<
    DownloadStationTaskPauseResumeRequest,
    DownloadStationTaskActionResponse
  >("pause", (o) => ({ ...o, id: o.id.join(",") })),
  Resume: taskBuilder.makeGet<
    DownloadStationTaskPauseResumeRequest,
    DownloadStationTaskActionResponse
  >("resume", (o) => ({ ...o, id: o.id.join(",") })),
  Edit: taskBuilder.makeGet<DownloadStationTaskEditRequest, DownloadStationTaskActionResponse>(
    "edit",
    (o) => ({ ...o, id: o.id.join(",") }),
  ),
};
