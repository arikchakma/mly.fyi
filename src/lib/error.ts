import { json } from './response';
import { stripQuotes } from '../utils/string';
import { logError } from './logger';
import Joi from 'joi';

interface ErrorBody {
  type: 'ValidationError' | 'InternalError' | 'NotFound' | 'Unauthorized';
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

export function renderValidationError(error: Joi.ValidationError): Response {
  const errorsList = error.details || [];

  return renderErrorResponse(
    {
      type: 'ValidationError',
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
      type: 'InternalError',
      message: err.message,
    },
    500,
  );
}

export function renderUnauthorized(): Response {
  return renderErrorResponse(
    {
      type: 'Unauthorized',
      message: 'Invalid credentials',
    },
    401,
  );
}

export function renderNotFound(): Response {
  return renderErrorResponse(
    {
      type: 'NotFound',
      message: 'Resource not found',
    },
    404,
  );
}
