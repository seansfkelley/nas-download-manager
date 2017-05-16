import { SynologyResponse, get, post } from '../shared';
import {
  DownloadStationTaskActionResponse,
  DownloadStationTaskCreateRequest,
  DownloadStationTaskDeleteRequest,
  DownloadStationTaskGetInfoRequest,
  DownloadStationTaskGetInfoResponse,
  DownloadStationTaskListRequest,
  DownloadStationTaskListResponse
} from './TaskTypes';

const CGI_NAME = 'DownloadStation/task';
const API_NAME = 'SYNO.DownloadStation.Task';

function List(baseUrl: string, sid: string, options?: DownloadStationTaskListRequest): Promise<SynologyResponse<DownloadStationTaskListResponse>> {
  return get(baseUrl, CGI_NAME, {
    api: API_NAME,
    version: 1,
    method: 'list',
    sid,
    ...options,
    additional: options && options.additional && options.additional.length ? options.additional.join(',') : undefined
  });
}

function GetInfo(baseUrl: string, sid: string, options: DownloadStationTaskGetInfoRequest): Promise<SynologyResponse<DownloadStationTaskGetInfoResponse>> {
  return get(baseUrl, CGI_NAME, {
    api: API_NAME,
    version: 1,
    method: 'getinfo',
    sid,
    ...options,
    id: options.id.join(','),
    additional: options.additional && options.additional.length ? options.additional.join(',') : undefined
  });
}

function Create(baseUrl: string, sid: string, options: DownloadStationTaskCreateRequest): Promise<SynologyResponse<{}>> {
  return post(baseUrl, CGI_NAME, {
    api: API_NAME,
    version: 1,
    method: 'create',
    sid,
    ...options,
    uri: options.uri && options.uri.length ? options.uri.join(',') : undefined
  });
}

function Delete(baseUrl: string, sid: string, options: DownloadStationTaskDeleteRequest): Promise<SynologyResponse<DownloadStationTaskActionResponse>> {
  return get(baseUrl, CGI_NAME, {
    api: API_NAME,
    version: 1,
    method: 'delete',
    sid,
    ...options,
    id: options.id.length ? options.id.join(',') : undefined
  });
}

function Pause(baseUrl: string, sid: string, options: { id: string[]; }): Promise<SynologyResponse<DownloadStationTaskActionResponse>> {
  return get(baseUrl, CGI_NAME, {
    api: API_NAME,
    version: 1,
    method: 'pause',
    sid,
    ...options,
    id: options.id.length ? options.id.join(',') : undefined
  });
}

function Resume(baseUrl: string, sid: string, options: { id: string[]; }): Promise<SynologyResponse<DownloadStationTaskActionResponse>> {
  return get(baseUrl, CGI_NAME, {
    api: API_NAME,
    version: 1,
    method: 'resume',
    sid,
    ...options,
    id: options.id.length ? options.id.join(',') : undefined
  });
}

function Edit(baseUrl: string, sid: string, options: { id: string[]; destination?: string; }): Promise<SynologyResponse<DownloadStationTaskActionResponse>> {
  return get(baseUrl, CGI_NAME, {
    api: API_NAME,
    version: 1,
    method: 'edit',
    sid,
    ...options,
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
