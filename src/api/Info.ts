import { SynologyResponse, get } from './shared';

const CGI_NAME = 'query';

export type QueryResponse = SynologyResponse<Record<string, {
  minVersion: number;
  maxVersion: number;
  path: string;
  requestFormat: string;
}>>;

function Query(query: 'ALL' | string[] = 'ALL'): Promise<QueryResponse> {
  return get(CGI_NAME, {
    api: 'SYNO.API.Info',
    version: 1,
    method: 'query',
    query: query === 'ALL' ? query : query.join(',')
  });
}

export const Info = {
  Query
};
