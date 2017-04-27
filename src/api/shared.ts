// https://global.download.synology.com/download/Document/DeveloperGuide/Synology_Download_Station_Web_API.pdf

import Axios from 'axios';
import { stringify } from 'query-string';

import { PROTOCOL, HOSTNAME, PORT } from './secrets';

export const BASE_URL = `${PROTOCOL}://${HOSTNAME}:${PORT}`;

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

export function get<I extends SynologyApiRequest, O>(cgi: string, request: I): Promise<SynologyResponse<O>> {
  const url = `${BASE_URL}/webapi/${cgi}.cgi?${stringify({
    ...(request as object),
    _sid: request.sid
  })}`;
  console.log(url);
  return Axios({ url }).then(response => response.data);
}
