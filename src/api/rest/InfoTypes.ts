import { BaseRequest } from './shared';

export interface InfoQueryRequest extends BaseRequest {
  query: 'ALL' | string[];
}

export type InfoQueryResponse = Record<string, {
  minVersion: number;
  maxVersion: number;
  path: string;
  requestFormat: string;
}>;
