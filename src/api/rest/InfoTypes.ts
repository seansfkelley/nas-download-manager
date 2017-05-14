export type QueryResponse = Record<string, {
  minVersion: number;
  maxVersion: number;
  path: string;
  requestFormat: string;
}>;
