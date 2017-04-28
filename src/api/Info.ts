import { SynologyResponse, get } from './shared';

const CGI_NAME = 'query';
const API_NAME = 'SYNO.API.Info';

export type QueryResponse = SynologyResponse<Record<string, {
  minVersion: number;
  maxVersion: number;
  path: string;
  requestFormat: string;
}>>;

function Query(baseUrl: string, query: 'ALL' | string[] = 'ALL'): Promise<QueryResponse> {
  return get(baseUrl, CGI_NAME, {
    api: API_NAME,
    version: 1,
    method: 'query',
    query: query === 'ALL' ? query : query.join(',')
  });
}

export const Info = {
  Query
};
