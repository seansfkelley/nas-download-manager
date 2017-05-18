// https://global.download.synology.com/download/Document/DeveloperGuide/Synology_Download_Station_Web_API.pdf

import { uniqueId } from 'lodash-es';
import Axios from 'axios';
import { stringify } from 'query-string';

export interface SynologyFile {
  content: Blob;
  filename: string;
}

export function isFile(f?: any): f is SynologyFile {
  return f && (f as SynologyFile).content instanceof Blob && (f as SynologyFile).filename != null;
}

export type SynologyResponse<S> = {
  success: true;
  data: S;
} | {
  success: false;
  error: {
    code: number;
  };
};

export interface SynologyApiRequest {
  api: string;
  version: number;
  method: string;
  sid?: string;
}

function nextRequestId() {
  return uniqueId('request-');
}

export function get<I extends SynologyApiRequest, O>(baseUrl: string, cgi: string, request: I): Promise<SynologyResponse<O>> {
  const url = `${baseUrl}/webapi/${cgi}.cgi?${stringify({
    ...(request as object),
    _sid: request.sid
  })}`;

  const id = nextRequestId();

  console.log('GET', `(${id})`, url);
  return Axios.get(url).then(response => {
    console.log('(response)', `(${id})`, response.data);
    return response.data;
  });
}

export function post<I extends SynologyApiRequest, O>(baseUrl: string, cgi: string, request: I): Promise<SynologyResponse<O>> {
  const url = `${baseUrl}/webapi/${cgi}.cgi`;
  const id = nextRequestId();

  const formData = new FormData();

  Object.keys(request).forEach((k: keyof typeof request) => {
    const v = request[k];
    if (v !== undefined && !isFile(v)) {
      formData.append(k, v);
    }
  });

  formData.append('_sid', request.sid);

  Object.keys(request).forEach((k: keyof typeof request) => {
    const v = request[k];
    if (v !== undefined && isFile(v)) {
      formData.append(k, v.content, v.filename);
    }
  });

  console.log('POST', `(${id})`, url, request);
  return Axios.post(url, formData).then(response => {
    console.log('(response)', `(${id})`, response.data);
    return response.data;
  });
}
