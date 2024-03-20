import { json } from './response';
import { stripQuotes } from '../utils/string';
import { logError } from './logger';
import Joi from 'joi';
import type { HttpError } from './http-error';

export const ERROR_CODE_BY_KEY = {
  bad_request: 400,
  validation_error: 400,
  internal_error: 500,
  not_found: 404,
  unauthorized: 401,
  forbidden: 403,
  conflict: 409,
} as const;

export type ErrorCodeKey = keyof typeof ERROR_CODE_BY_KEY;

export interface ErrorBody {
  type: ErrorCodeKey;
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

export function renderValidationError(error: Joi.ValidationError): Response {
  const errorsList = error.details || [];

  return renderErrorResponse(
    {
      type: 'validation_error',
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
      message: err.message,
      errors: [],
    },
    500,
  );
}

export function renderUnauthorized(): Response {
  return renderErrorResponse(
    {
      type: 'unauthorized',
      message: 'Invalid credentials',
      errors: [],
    },
    401,
  );
}

export function renderNotFound(): Response {
  return renderErrorResponse(
    {
      type: 'not_found',
      message: 'Resource not found',
      errors: [],
    },
    404,
  );
}
