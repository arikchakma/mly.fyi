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
  limit: number;
  remaining: number;
  constructor(
    message: string,
    limit: number,
    remaining: number,
    errors?: ErrorType[],
  ) {
    super('rate_limited', message, errors);
    this.limit = limit;
    this.remaining = remaining;
  }

  static isRateLimitError(error: any): error is RateLimitError {
    return error instanceof RateLimitError;
  }
}
