import { SynologyResponse, get, post } from '../shared';
import {
  DownloadStationTaskActionResponse,
  DownloadStationTaskCreateRequest,
  DownloadStationTaskDeleteRequest,
  DownloadStationTaskGetInfoRequest,
  DownloadStationTaskGetInfoResponse,
  DownloadStationTaskListRequest,
  DownloadStationTaskListResponse,
  DownloadStationTaskPauseResumeRequest,
  DownloadStationTaskEditRequest
} from './TaskTypes';

const CGI_NAME = 'DownloadStation/task';
const API_NAME = 'SYNO.DownloadStation.Task';

function List(baseUrl: string, sid: string, options?: DownloadStationTaskListRequest): Promise<SynologyResponse<DownloadStationTaskListResponse>> {
  return get(baseUrl, CGI_NAME, {
    ...options,
    api: API_NAME,
    version: 1,
    method: 'list',
    sid,
    additional: options && options.additional && options.additional.length ? options.additional.join(',') : undefined
  });
}

function GetInfo(baseUrl: string, sid: string, options: DownloadStationTaskGetInfoRequest): Promise<SynologyResponse<DownloadStationTaskGetInfoResponse>> {
  return get(baseUrl, CGI_NAME, {
    ...options,
    api: API_NAME,
    version: 1,
    method: 'getinfo',
    sid,
    id: options.id.join(','),
    additional: options.additional && options.additional.length ? options.additional.join(',') : undefined
  });
}

function Create(baseUrl: string, sid: string, options: DownloadStationTaskCreateRequest): Promise<SynologyResponse<{}>> {
  if (options.file && options.uri) {
    throw new Error('cannot specify both a file and a uri argument to Create');
  }
  const commonOptions = {
    ...options,
    api: API_NAME,
    version: 1,
    method: 'create',
    sid,
    file: undefined,
    uri: undefined
  };

  if (options.file) {
    return post(baseUrl, CGI_NAME, {
      ...commonOptions,
      file: options.file
    });
  } else {
    return get(baseUrl, CGI_NAME, {
      ...commonOptions,
      uri: options.uri && options.uri.length ? options.uri.join(',') : undefined
    })
  }
}

function Delete(baseUrl: string, sid: string, options: DownloadStationTaskDeleteRequest): Promise<SynologyResponse<DownloadStationTaskActionResponse>> {
  return get(baseUrl, CGI_NAME, {
    ...options,
    api: API_NAME,
    version: 1,
    method: 'delete',
    sid,
    id: options.id.length ? options.id.join(',') : undefined
  });
}

function Pause(baseUrl: string, sid: string, options: DownloadStationTaskPauseResumeRequest): Promise<SynologyResponse<DownloadStationTaskActionResponse>> {
  return get(baseUrl, CGI_NAME, {
    ...options,
    api: API_NAME,
    version: 1,
    method: 'pause',
    sid,
    id: options.id.length ? options.id.join(',') : undefined
  });
}

function Resume(baseUrl: string, sid: string, options: DownloadStationTaskPauseResumeRequest): Promise<SynologyResponse<DownloadStationTaskActionResponse>> {
  return get(baseUrl, CGI_NAME, {
    ...options,
    api: API_NAME,
    version: 1,
    method: 'resume',
    sid,
    id: options.id.length ? options.id.join(',') : undefined
  });
}

function Edit(baseUrl: string, sid: string, options: DownloadStationTaskEditRequest): Promise<SynologyResponse<DownloadStationTaskActionResponse>> {
  return get(baseUrl, CGI_NAME, {
    ...options,
    api: API_NAME,
    version: 1,
    method: 'edit',
    sid,
    id: options.id.length ? options.id.join(',') : undefined
  });
}

export const Task = {
  API_NAME: API_NAME as typeof API_NAME,
  List,
  GetInfo,
  Create,
  Delete,
  Pause,
  Resume,
  Edit
};
