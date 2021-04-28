import { stringify } from "query-string";

export class BadResponseError extends Error {
  constructor(public response: Response) {
    super();
  }
}
export class TimeoutError extends Error {}
export class NetworkError extends Error {}

export const SessionName = {
  DownloadStation: "DownloadStation" as const,
  FileStation: "FileStation" as const,
};

export type SessionName = keyof typeof SessionName;

export interface FormFile {
  content: Blob;
  filename: string;
}

export function isFormFile(f?: any): f is FormFile {
  return f && (f as FormFile).content != null && (f as FormFile).filename != null;
}

export interface SynologySuccessResponse<S> {
  success: true;
  data: S;
}

export interface SynologyFailureResponse {
  success: false;
  error: {
    code: number;
    errors?: any[];
  };
}

export type SynologyResponse<S> = SynologySuccessResponse<S> | SynologyFailureResponse;

export interface BaseRequest {
  timeout?: number;
}

export interface SynologyApiRequest {
  api: string;
  version: number;
  method: string;
  sid?: string;
  timeout?: number;
  [key: string]: string | number | boolean | FormFile | undefined;
}

const DEFAULT_TIMEOUT = 60000;

async function fetchWithErrorHandling(
  url: string,
  init: RequestInit,
  timeout: number | undefined,
): Promise<unknown> {
  const abortController = new AbortController();
  const timeoutTimer = setTimeout(() => {
    abortController.abort();
  }, timeout ?? DEFAULT_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...init,
      credentials: "omit",
      signal: abortController.signal,
    });
    if (!response.ok) {
      throw new BadResponseError(response);
    } else {
      return response.json();
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new TimeoutError();
    } else if (/networkerror/i.test(e?.message)) {
      throw new NetworkError();
    } else {
      throw e;
    }
  } finally {
    clearTimeout(timeoutTimer);
  }
}

export async function get<O extends object>(
  baseUrl: string,
  cgi: string,
  request: SynologyApiRequest,
): Promise<SynologyResponse<O>> {
  const url = `${baseUrl}/webapi/${cgi}.cgi?${stringify({
    ...request,
    _sid: request.sid,
    timeout: undefined,
  })}`;

  return fetchWithErrorHandling(url, { method: "GET" }, request.timeout) as Promise<
    SynologyResponse<O>
  >;
}

export async function post<O extends object>(
  baseUrl: string,
  cgi: string,
  request: SynologyApiRequest,
): Promise<SynologyResponse<O>> {
  const formData = new FormData();

  Object.keys(request).forEach((k) => {
    const v = request[k];
    if (k !== "timeout" && v !== undefined && !isFormFile(v)) {
      // String() !== new String(). This produces lowercase-s strings, not capital-S Strings.
      formData.append(k, String(v));
    }
  });

  if (request.sid) {
    formData.append("_sid", request.sid);
  }

  Object.keys(request).forEach((k) => {
    const v = request[k];
    if (k !== "timeout" && v !== undefined && isFormFile(v)) {
      formData.append(k, v.content, v.filename);
    }
  });

  const url = `${baseUrl}/webapi/${cgi}.cgi?${stringify({ _sid: request.sid })}`;

  return fetchWithErrorHandling(
    url,
    { method: "POST", body: formData },
    request.timeout,
  ) as Promise<SynologyResponse<O>>;
}

export class ApiBuilder {
  constructor(private cgiName: string, private apiName: string) {}

  makeGet<I extends BaseRequest, O>(
    methodName: string,
    preprocess?: (options: I) => object,
    postprocess?: (response: O) => O,
  ): (baseUrl: string, sid: string, options: I) => Promise<SynologyResponse<O>>;
  makeGet<I extends BaseRequest, O>(
    methodName: string,
    preprocess: ((options?: I) => object) | undefined,
    postprocess: ((response: O) => O) | undefined,
    optional: true,
  ): (baseUrl: string, sid: string, options?: I) => Promise<SynologyResponse<O>>;

  makeGet(
    methodName: string,
    preprocess?: (options: object) => object,
    postprocess?: (response: object) => object,
    _optional?: true,
  ) {
    return this.makeApiRequest(get, methodName, preprocess, postprocess);
  }

  makePost<I extends BaseRequest, O>(
    methodName: string,
    preprocess?: (options: I) => object,
    postprocess?: (response: O) => O,
  ): (baseUrl: string, sid: string, options: I) => Promise<SynologyResponse<O>>;
  makePost<I extends BaseRequest, O>(
    methodName: string,
    preprocess: ((options?: I) => object) | undefined,
    postprocess: ((response: O) => O) | undefined,
    optional: true,
  ): (baseUrl: string, sid: string, options?: I) => Promise<SynologyResponse<O>>;

  makePost(
    methodName: string,
    preprocess?: (options: object) => object,
    postprocess?: (response: object) => object,
    _optional?: true,
  ) {
    return this.makeApiRequest(post, methodName, preprocess, postprocess);
  }

  private makeApiRequest(
    method: typeof get | typeof post,
    methodName: string,
    preprocess?: (options: object) => object,
    postprocess?: (response: object) => object,
  ) {
    preprocess = preprocess || ((o) => o);
    postprocess = postprocess || ((r) => r);
    return async (baseUrl: string, sid: string, options?: object) => {
      const response = await method(baseUrl, this.cgiName, {
        ...preprocess!(options || {}),
        api: this.apiName,
        version: 1,
        method: methodName,
        sid,
      });
      if (response.success) {
        return { ...response, data: postprocess!(response.data) };
      } else {
        return response;
      }
    };
  }
}
