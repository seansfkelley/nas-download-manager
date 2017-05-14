// https://global.download.synology.com/download/Document/DeveloperGuide/Synology_Download_Station_Web_API.pdf

import Axios from 'axios';
import { stringify } from 'query-string';

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

export function get<I extends SynologyApiRequest, O>(baseUrl: string, cgi: string, request: I): Promise<SynologyResponse<O>> {
  const url = `${baseUrl}/webapi/${cgi}.cgi?${stringify({
    ...(request as object),
    _sid: request.sid
  })}`;
  console.log(url);
  return Axios({ url }).then(response => {
    console.log(response.data);
    return response.data;
  });
}
