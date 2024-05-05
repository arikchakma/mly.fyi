import type { APIContext } from 'astro';
import Joi from 'joi';
import { stripQuotes } from '../utils/string';
import type { HttpError, RateLimitError } from './http-error';
import { logError } from './logger';
import { json } from './response';

export const ERROR_CODE_BY_KEY = {
  bad_request: 400,
  validation_error: 400,
  internal_error: 500,
  not_found: 404,
  unauthorized: 401,
  forbidden: 403,
  conflict: 409,
  not_implemented: 501,
  user_not_verified: 400,
  rate_limited: 429,
} as const;

export type ErrorCodeKey = keyof typeof ERROR_CODE_BY_KEY;

export interface ErrorBody {
  type: ErrorCodeKey;
  status: number;
  message: string;
  errors?: {
    message: string;
    path: string;
  }[];
}

/**
 * Renders the error response
 * @param error Body of the error response
 * @param status Status code
 * @returns Response
 */
export function renderErrorResponse(error: ErrorBody, status: number) {
  return json(error, { status });
}

export function renderHttpError(error: HttpError): Response {
  return renderErrorResponse(
    {
      type: error.type || 'internal_error',
      status: error.status,
      message: error.message,
      errors:
        error?.errors?.map((err) => ({
          message: err.message,
          path: err.location,
        })) || [],
    },
    error.status,
  );
}

export function renderRateLimitError(e: RateLimitError): Response {
  return json(
    {
      type: e.type,
      status: e.status,
      message: e.message,
      errors: e.errors,
    },
    {
      status: e.status,
    },
  );
}

export function renderValidationError(error: Joi.ValidationError): Response {
  const errorsList = error.details || [];

  return renderErrorResponse(
    {
      type: 'validation_error',
      status: 400,
      message: stripQuotes(error.message),
      errors: errorsList.map((err) => ({
        message: stripQuotes(err.message),
        path: err.path.join('.'),
      })),
    },
    400,
  );
}

export function renderInternalError(err: Error): Response {
  if (err.stack) {
    logError(err.stack);
  }

  return renderErrorResponse(
    {
      type: 'internal_error',
      status: 500,
      message: err.message,
      errors: [],
    },
    500,
  );
}
