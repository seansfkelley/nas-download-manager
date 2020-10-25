export interface RequestToken {
  __requestTokenBrand: unknown;
}

// Without Bluebird cancellation, this is the simplest thing I can think of to prevent
// simultaneous requests from getting all out of order, when those requests can be issued
// from many different places.
export class RequestManager {
  private _token: number = 0;

  public startNewRequest() {
    return (++this._token as unknown) as RequestToken;
  }

  public isRequestLatest(token: RequestToken) {
    return ((token as unknown) as number) === this._token;
  }
}
