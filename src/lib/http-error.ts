import { ERROR_CODE_BY_KEY, type ErrorCodeKey } from './error';

export type HttpErrorItem = {
  message: string;
  location: string;
};

export class HttpError<ErrorType = HttpErrorItem> extends Error {
  status: number;
  constructor(
    public type: ErrorCodeKey,
    public message: string,
    public errors: ErrorType[] = [],
  ) {
    super(message);
    this.status = ERROR_CODE_BY_KEY[type];
  }

  static isHttpError(error: any): error is HttpError {
    return error instanceof HttpError;
  }
}

export class RateLimitError<
  ErrorType = HttpErrorItem,
> extends HttpError<ErrorType> {
  constructor(
    message: string,
    public limit: number,
    public remaining: number,
    public reset: number,
    errors?: ErrorType[],
  ) {
    super('rate_limited', message, errors);
  }

  static isRateLimitError(error: any): error is RateLimitError {
    return error instanceof RateLimitError;
  }
}
